import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronLeft, Check, Loader2, Download } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  CalculatorState,
  INITIAL_STATE,
  convertHeightToCm,
  convertWeightToKg,
} from '@/lib/calculator'
import { getIngredients, getCategories, getCategoryTranslationKey } from '@/lib/ingredients'

const TOTAL_STEPS = 4

export default function MealPlan() {
  const { t, i18n } = useTranslation()
  const { user, profile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [state, setState] = useState<CalculatorState>(() => {
    const allIds = getCategories().flatMap(cat => getIngredients(cat).map(ing => ing.id))
    const lang = (i18n.language || 'da') as 'da' | 'se' | 'en'
    const units = lang === 'en' ? 'imperial' : 'metric'
    return {
      ...INITIAL_STATE,
      language: lang,
      units,
      selectedIngredients: allIds,
    }
  })
  const [submitting, setSubmitting] = useState(false)
  const [generatedMealPlan, setGeneratedMealPlan] = useState<string | null>(null)
  const [mealPlanError, setMealPlanError] = useState<string | null>(null)
  const mealPlanRef = useRef<HTMLDivElement>(null)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'meat', 'fish', 'dairy', 'vegetables', 'nuts', 'fats', 'herbs',
  ])
  const [manualCalories, setManualCalories] = useState<number | ''>('')

  // Load user data if logged in
  useEffect(() => {
    if (user && profile) {
      setState(prev => ({
        ...prev,
        email: profile.email || '',
        name: profile.name || '',
        gender: (profile.gender as 'male' | 'female') || prev.gender,
        age: profile.age || prev.age,
        weight: profile.weight || prev.weight,
        height: profile.height || prev.height,
        activityLevel: (profile.activity_level as any) || prev.activityLevel,
        language: (profile.language as 'da' | 'se' | 'en') || prev.language,
      }))
      if (profile.daily_calories) {
        setManualCalories(profile.daily_calories)
      }
    }
  }, [user, profile])

  const handleNext = () => {
    if (validateMealPlanStep(state, currentStep)) {
      if (currentStep === TOTAL_STEPS - 1) {
        handleSubmit()
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const validateMealPlanStep = (state: CalculatorState, step: number): boolean => {
    switch (step) {
      case 0: // Meals, prep time, budget
        return state.mealsPerDay !== '' && state.prepTime !== '' && state.budget !== ''
      case 1: // Ingredients & health preferences
        return state.selectedIngredients.length > 0
      case 2: // Days & leftovers strategy
        return state.daysPerWeek !== '' && state.leftoversStrategy !== ''
      case 3: // Summary & email
        return state.email !== '' && state.gdprConsent === true
      default:
        return false
    }
  }

  const handleSubmit = async () => {
    if (!validateMealPlanStep(state, 3)) {
      alert(t('calculator.errors.completionRequired') || 'Please complete all required fields')
      return
    }

    setSubmitting(true)
    setMealPlanError(null)
    setGeneratedMealPlan(null)

    try {
      const heightCm = state.height ? convertHeightToCm(state.height as number, state.units) : null
      const weightKg = state.weight ? convertWeightToKg(state.weight as number, state.units) : null

      // Determine daily calories: from profile OR manual input
      let dailyCalories = manualCalories as number || 1800
      if (profile?.daily_calories) {
        dailyCalories = profile.daily_calories
      }

      // Map prep_time values to DB-compatible values
      const prepTimeMap: Record<string, string> = {
        quick: 'quick',
        medium: 'medium',
        long: 'long',
        mix: 'mix',
      }

      // Map activity level number back to string for DB
      const activityLevelStr = state.activityLevel
        ? ({ 1.2: 'sedentary', 1.375: 'light', 1.55: 'moderate', 1.725: 'active', 1.9: 'very_active' } as Record<number, string>)[state.activityLevel as number]
        : 'moderate'

      const profileData: Record<string, unknown> = {
        email: state.email,
        name: state.name,
        gender: state.gender || 'female',
        age: state.age || 30,
        weight: weightKg || 70,
        height: heightCm || 170,
        units: state.units || 'metric',
        language: state.language,
        activity_level: activityLevelStr,
        meals_per_day: state.mealsPerDay || null,
        prep_time: state.prepTime ? (prepTimeMap[state.prepTime] || state.prepTime) : null,
        selected_ingredients: state.selectedIngredients,
        gdpr_consent: state.gdprConsent,
        marketing_consent: state.gdprConsent,
        source: 'meal_plan',
        profile_type: 'meal_plan',
        daily_calories: dailyCalories,
      }

      // Save profile data if logged in
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)

        if (error) {
          console.error('Error saving profile:', error)
        }
      } else {
        // Not logged in: send Magic Link to create account/sign in
        const { error: signUpError } = await supabase.auth.signInWithOtp({
          email: state.email,
          options: {
            data: { name: state.name },
            emailRedirectTo: `${window.location.origin}/meal-plan`,
          },
        })

        if (signUpError) {
          console.error('Error sending magic link:', signUpError)
          throw new Error(t('calculator.errors.magicLinkFailed') || 'Kunne ikke sende login-link. Prøv igen.')
        }

        // User needs to verify email first — can't generate meal plan without auth
        setMealPlanError(null)
        setGeneratedMealPlan(null)
        setSubmitting(false)
        alert(t('calculator.mealPlan.checkEmail') || 'Vi har sendt dig et login-link på email. Klik på linket for at logge ind, og generer derefter din kostplan.')
        return
      }

      // Build excluded ingredients list from deselected ingredients
      const allIds = getCategories().flatMap(cat => getIngredients(cat).map(ing => ing.id))
      const deselected = allIds.filter(id => !state.selectedIngredients.includes(id))

      const mealPlanBody = {
        name: state.name || 'Klient',
        language: state.language || 'da',
        gender: state.gender || 'female',
        age: state.age || 30,
        weight: weightKg || 70,
        height: heightCm || 170,
        activity: activityLevelStr || 'moderate',
        daily_calories: dailyCalories,
        meals_per_day: state.mealsPerDay || 3,
        num_days: state.daysPerWeek || 7,
        prep_time: state.prepTime || 'medium',
        leftovers: state.leftoversStrategy === 'batch' || state.leftoversStrategy === 'mixed',
        leftovers_strategy: state.leftoversStrategy || 'daily',
        excluded_ingredients: deselected.length > 0 ? JSON.stringify(deselected) : '',
        diet_type: 'Custom Keto',
        budget: state.budget || 'medium',
        health_anti_inflammatory: state.healthPreferences?.antiInflammatory || false,
        health_avoid_processed: state.healthPreferences?.avoidProcessed || false,
        weight_goal: state.weightGoal ?? 0,
        units: state.units || 'metric',
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hllprmlkuchhfmexzpad.supabase.co'

      // Ensure we have a valid session before calling the Edge Function
      let { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        // Try refreshing
        const { data: refreshData } = await supabase.auth.refreshSession()
        session = refreshData.session
      }
      if (!session?.access_token) {
        throw new Error('Din session er udløbet. Log ud og ind igen for at generere en kostplan.')
      }

      const resp = await fetch(`${supabaseUrl}/functions/v1/generate-mealplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(mealPlanBody),
      })

      const respData = await resp.json()

      if (!resp.ok || respData.error) {
        throw new Error(respData.error || `Fejl ved generering: ${resp.status}`)
      }

      setGeneratedMealPlan(respData.mealPlan)

      // Scroll to meal plan result
      setTimeout(() => {
        mealPlanRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 200)
    } catch (error: unknown) {
      console.error('Error generating meal plan:', error)
      const msg = error instanceof Error ? error.message : 'Failed to generate meal plan'
      setMealPlanError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  // Simple markdown-to-HTML converter for the meal plan display
  const renderMealPlanHTML = (markdown: string): string => {
    return markdown
      .replace(/^### (.+)$/gm, '<h3 class="text-lg font-bold text-charcoal mt-4 mb-1">$1</h3>')
      .replace(/^## (.+)$/gm, '<h2 class="text-xl font-serif font-bold text-charcoal mt-6 mb-2 border-b border-gray-200 pb-1">$1</h2>')
      .replace(/^# (.+)$/gm, '<h1 class="text-2xl font-serif font-bold text-charcoal mt-6 mb-3">$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-sm">$1</li>')
      .replace(/^(\d+)\. (.+)$/gm, '<li class="ml-4 list-decimal text-sm">$2</li>')
      .replace(/^---$/gm, '<hr class="my-4 border-gray-200" />')
      .replace(/\n{2,}/g, '</p><p class="text-sm text-charcoal/80 mb-2">')
      .replace(/^(?!<[h|l|u|o|s|p|d])(.*\S.*)$/gm, '<p class="text-sm text-charcoal/80 mb-1">$1</p>')
  }

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    )
  }

  const toggleIngredient = (ingredientId: string) => {
    setState(prev => ({
      ...prev,
      selectedIngredients: prev.selectedIngredients.includes(ingredientId)
        ? prev.selectedIngredients.filter(id => id !== ingredientId)
        : [...prev.selectedIngredients, ingredientId],
    }))
  }

  const selectAllInCategory = (category: string) => {
    const categoryIngredients = getIngredients(category).map(ing => ing.id)
    setState(prev => ({
      ...prev,
      selectedIngredients: Array.from(new Set([...prev.selectedIngredients, ...categoryIngredients])),
    }))
  }

  const deselectAllInCategory = (category: string) => {
    const categoryIngredients = getIngredients(category).map(ing => ing.id)
    setState(prev => ({
      ...prev,
      selectedIngredients: prev.selectedIngredients.filter(id => !categoryIngredients.includes(id)),
    }))
  }

  const getCategoryCount = (category: string): number => {
    return getIngredients(category).filter(ing => state.selectedIngredients.includes(ing.id)).length
  }

  // Progress calculation
  const getStepProgress = () => {
    return ((currentStep + 1) / TOTAL_STEPS) * 100
  }

  // Shared button style helper
  const cardBtn = (isActive: boolean) =>
    `py-4 px-3 rounded-lg border-2 font-sans font-bold text-sm transition-all text-center ${
      isActive
        ? 'border-primary bg-primary text-white'
        : 'border-gray-300 bg-white text-charcoal hover:border-primary'
    }`

  // ═══════════════════════════════════════════
  // MEAL PLAN RESULT SCREEN
  // ═══════════════════════════════════════════
  if (generatedMealPlan) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-charcoal mb-2">
              {t('calculator.mealPlan.title') || 'Din personaliserede kostplan'}
            </h1>
            <p className="text-charcoal/60">
              {t('calculator.mealPlan.subtitle') || 'Baseret på dine præferencer'}
            </p>
          </div>

          {/* Meal Plan Content */}
          <div
            ref={mealPlanRef}
            className="bg-white rounded-lg border border-gray-200 p-8 mb-8 max-w-full"
          >
            <div
              dangerouslySetInnerHTML={{ __html: renderMealPlanHTML(generatedMealPlan) }}
              className="prose prose-sm max-w-none"
            />
          </div>

          {/* Download Button */}
          <div className="flex justify-center mb-8">
            <button
              onClick={() => {
                const element = document.createElement('a')
                const file = new Blob([generatedMealPlan], { type: 'text/plain' })
                element.href = URL.createObjectURL(file)
                element.download = `mealplan_${Date.now()}.txt`
                document.body.appendChild(element)
                element.click()
                document.body.removeChild(element)
              }}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 transition-all"
            >
              <Download size={20} />
              {t('calculator.mealPlan.download') || 'Download kostplan'}
            </button>
          </div>

          {/* Back to Meal Plan Button */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => {
                setGeneratedMealPlan(null)
                setCurrentStep(0)
              }}
              className="px-6 py-3 bg-charcoal text-white rounded-lg font-bold hover:bg-charcoal/90 transition-all"
            >
              {t('calculator.mealPlan.createNew') || 'Lav ny kostplan'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // MEAL PLAN FORM (Steps 0-3)
  // ═══════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-serif font-bold text-charcoal mb-2">
            {t('calculator.mealPlan.createTitle') || 'Opret din kostplan'}
          </h1>
          <p className="text-charcoal/60 mb-4">
            {t('calculator.mealPlan.createSubtitle') || 'Få personaliserede måltider baseret på dine præferencer'}
          </p>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
          <div className="text-sm text-charcoal/60 mt-2">
            {t('calculator.step')} {currentStep + 1} {t('calculator.of')} {TOTAL_STEPS}
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-8 mb-8">
          {/* STEP 0: Meals, Prep Time, Budget */}
          {currentStep === 0 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal mb-6">
                {t('calculator.steps.4.title') || 'Måltider og tidsbudget'}
              </h2>

              {/* Meals per day */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.4.mealsPerDay') || 'Hvor mange måltider per dag?'}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 1, label: t('calculator.mealOptions.one') || '1 måltid' },
                    { value: 2, label: t('calculator.mealOptions.two') || '2 måltider' },
                    { value: 3, label: t('calculator.mealOptions.three') || '3 måltider' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setState(prev => ({ ...prev, mealsPerDay: option.value as 1 | 2 | 3 }))}
                      className={cardBtn(state.mealsPerDay === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prep time */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.4.prepTime') || 'Hvor meget tid har du til tilberedning?'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'quick', label: t('calculator.prepOptions.quick') || 'Hurtig (< 20 min)' },
                    { value: 'medium', label: t('calculator.prepOptions.medium') || 'Moderat (20-45 min)' },
                    { value: 'long', label: t('calculator.prepOptions.long') || 'Klassisk (> 45 min)' },
                    { value: 'mix', label: t('calculator.prepOptions.mix') || 'Blandet' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setState(prev => ({ ...prev, prepTime: option.value as any }))}
                      className={cardBtn(state.prepTime === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.4.budget') || 'Hvad er dit budget?'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'cheap', label: t('calculator.budgetOptions.cheap') || 'Budget-venlig' },
                    { value: 'medium', label: t('calculator.budgetOptions.medium') || 'Moderat' },
                    { value: 'expensive', label: t('calculator.budgetOptions.expensive') || 'Premium' },
                    { value: 'mixed', label: t('calculator.budgetOptions.mixed') || 'Blandet' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setState(prev => ({ ...prev, budget: option.value as any }))}
                      className={cardBtn(state.budget === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Ingredients & Health Preferences */}
          {currentStep === 1 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal mb-6">
                {t('calculator.steps.5.title') || 'Ingredienser og sundhedspræferencer'}
              </h2>

              <p className="text-charcoal/70 mb-4">
                {t('calculator.steps.5.instruction') || 'Vælg de ingredienser du gerne vil have med. Alle ingredienser er valgt som standard.'}
              </p>

              {/* Health Preferences */}
              <div className="mb-8 pb-8 border-b border-gray-200">
                <h3 className="text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.5.healthPreferences') || 'Sundhedspræferencer'}
                </h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.healthPreferences.antiInflammatory}
                      onChange={() => setState(prev => ({
                        ...prev,
                        healthPreferences: { ...prev.healthPreferences, antiInflammatory: !prev.healthPreferences.antiInflammatory }
                      }))}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-charcoal">
                      {t('calculator.steps.5.antiInflammatory') || 'Fokus på anti-inflammatoriske ingredienser'}
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={state.healthPreferences.avoidProcessed}
                      onChange={() => setState(prev => ({
                        ...prev,
                        healthPreferences: { ...prev.healthPreferences, avoidProcessed: !prev.healthPreferences.avoidProcessed }
                      }))}
                      className="w-5 h-5 rounded"
                    />
                    <span className="text-sm text-charcoal">
                      {t('calculator.steps.5.avoidProcessed') || 'Undgå bearbejdede ingredienser'}
                    </span>
                  </label>
                </div>
              </div>

              {/* Ingredient Categories */}
              <h3 className="text-sm font-bold text-charcoal mb-4">
                {t('calculator.steps.5.ingredients') || 'Ingredienser'}
              </h3>
              <div className="space-y-4">
                {getCategories().map(category => {
                  const isExpanded = expandedCategories.includes(category)
                  const ingredients = getIngredients(category)
                  const categoryCount = getCategoryCount(category)

                  return (
                    <div key={category} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 text-left">
                          <span className="font-bold text-charcoal">
                            {t(getCategoryTranslationKey(category))}
                          </span>
                          <span className="text-xs bg-gray-200 text-charcoal px-2 py-1 rounded">
                            {categoryCount}/{ingredients.length}
                          </span>
                        </div>
                        <ChevronRight
                          size={20}
                          className={`text-charcoal transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50 border-t border-gray-200 p-4">
                          <div className="flex gap-2 mb-3">
                            <button
                              onClick={() => selectAllInCategory(category)}
                              className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-charcoal font-bold"
                            >
                              {t('calculator.selectAll') || 'Vælg alle'}
                            </button>
                            <button
                              onClick={() => deselectAllInCategory(category)}
                              className="text-xs px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-100 text-charcoal font-bold"
                            >
                              {t('calculator.deselectAll') || 'Fravælg alle'}
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {ingredients.map(ingredient => (
                              <label key={ingredient.id} className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={state.selectedIngredients.includes(ingredient.id)}
                                  onChange={() => toggleIngredient(ingredient.id)}
                                  className="w-4 h-4 rounded"
                                />
                                <span className="text-sm text-charcoal">
                                  {t(ingredient.translationKey)}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Number of Days & Leftovers Strategy */}
          {currentStep === 2 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal mb-6">
                {t('calculator.steps.6.title') || 'Varighed og rester'}
              </h2>

              {/* Number of days */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.6.daysPerWeek') || 'Hvor mange dage skal kostplanen dække?'}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <button
                      key={day}
                      onClick={() => setState(prev => ({ ...prev, daysPerWeek: day as any }))}
                      className={cardBtn(state.daysPerWeek === day)}
                    >
                      {day} {day === 1 ? 'dag' : 'dage'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leftovers strategy */}
              <div className="mb-6">
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.6.leftoversStrategy') || 'Hvordan vil du håndtere rester?'}
                </label>
                <div className="grid grid-cols-1 gap-3">
                  {[
                    { value: 'daily', label: t('calculator.leftoversOptions.daily') || 'Hver dag (ny tilberedning)' },
                    { value: 'batch', label: t('calculator.leftoversOptions.batch') || 'Batch-tilberedning (lagring)' },
                    { value: 'mixed', label: t('calculator.leftoversOptions.mixed') || 'Blandet' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setState(prev => ({ ...prev, leftoversStrategy: option.value as any }))}
                      className={cardBtn(state.leftoversStrategy === option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Summary & Email */}
          {currentStep === 3 && (
            <div>
              <h2 className="text-2xl font-serif font-bold text-charcoal mb-6">
                {t('calculator.steps.7.title') || 'Bekræftelse'}
              </h2>

              {/* Calorie Info */}
              {!user && !profile?.daily_calories && (
                <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-sm text-charcoal mb-3 font-bold">
                    {t('calculator.mealPlan.calorieInfo') || 'Daglige kalorier (valgfrit)'}
                  </p>
                  <p className="text-xs text-charcoal/70 mb-3">
                    {t('calculator.mealPlan.calorieNote') || 'Hvis du ikke er logget ind med en kalorie-beregning, skal du indtaste daglige kalorier her. Vi bruger standard 1800 kcal hvis tomt.'}
                  </p>
                  <input
                    type="number"
                    value={manualCalories}
                    onChange={(e) => setManualCalories(e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="f.eks. 1800"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg text-charcoal"
                  />
                </div>
              )}

              {/* Name */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-charcoal mb-2">
                  {t('calculator.steps.7.name') || 'Navn'}
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={(e) => setState(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={t('calculator.steps.7.namePlaceholder') || 'Dit navn'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-charcoal"
                />
              </div>

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-bold text-charcoal mb-2">
                  {t('calculator.steps.7.email') || 'Email'}
                </label>
                <input
                  type="email"
                  value={state.email}
                  onChange={(e) => setState(prev => ({ ...prev, email: e.target.value }))}
                  placeholder={t('calculator.steps.7.emailPlaceholder') || 'din@email.com'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-charcoal"
                />
              </div>

              {/* GDPR Consent */}
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={state.gdprConsent}
                    onChange={() => setState(prev => ({ ...prev, gdprConsent: !prev.gdprConsent }))}
                    className="w-5 h-5 rounded mt-1"
                  />
                  <span className="text-sm text-charcoal">
                    {t('calculator.steps.7.gdprConsent') || 'Jeg accepterer at modtage min personaliserede kostplan via email. Jeg forstår, at mine data behandles i henhold til vores privatlivspolitik.'}
                  </span>
                </label>
              </div>

              {/* Error message */}
              {mealPlanError && (
                <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">
                    {t('calculator.errors.generationFailed') || 'Fejl ved generering'}
                  </p>
                  <p className="text-xs text-red-700 mt-2">{mealPlanError}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              currentStep === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-white border-2 border-gray-300 text-charcoal hover:border-primary'
            }`}
          >
            <ChevronLeft size={20} />
            {t('calculator.back') || 'Tilbage'}
          </button>

          <button
            onClick={handleNext}
            disabled={submitting || !validateMealPlanStep(state, currentStep)}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all ${
              submitting || !validateMealPlanStep(state, currentStep)
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {submitting ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                {t('calculator.generating') || 'Genererer...'}
              </>
            ) : currentStep === TOTAL_STEPS - 1 ? (
              <>
                <Check size={20} />
                {t('calculator.generate') || 'Generér kostplan'}
              </>
            ) : (
              <>
                {t('calculator.next') || 'Næste'}
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
