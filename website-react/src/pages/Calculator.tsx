import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronRight, ChevronLeft, Check, UtensilsCrossed, Calculator as CalcIcon, Save } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import {
  CalculatorState,
  INITIAL_STATE,
  convertHeightToCm,
  convertWeightToKg,
  calculateBMR,
  calculateTDEE,
  calculateDailyCalories,
  calculateMacros,
  validateStep,
} from '@/lib/calculator'
import { getIngredients, getCategories, getCategoryTranslationKey } from '@/lib/ingredients'


// Phase 1: Calorie Calculator (steps 0-3) — UI shows "Trin 1-4"
// Phase 2: Meal Planner (steps 4-7) — UI shows "Trin 5-8"
const CALORIE_LAST_STEP = 3
const MEAL_PLAN_FIRST_STEP = 4
const TOTAL_STEPS = 8

export default function Calculator() {
  const { t, i18n } = useTranslation()
  const { user, profile, refreshProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(0)
  const [phase, setPhase] = useState<'calorie' | 'mealplan'>('calorie')
  const [showResults, setShowResults] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
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
  const [expandedCategories, setExpandedCategories] = useState<string[]>([
    'meat', 'fish', 'dairy', 'vegetables', 'nuts', 'fats', 'herbs',
  ])

  // Load user data if logged in
  useEffect(() => {
    if (user && profile) {
      setState(prev => ({
        ...prev,
        email: profile.email || '',
        name: profile.name || '',
        language: (profile.language as 'da' | 'se' | 'en') || prev.language,
      }))
    }
  }, [user, profile])

  // Calculate BMR and TDEE
  const calculateResults = () => {
    if (
      state.gender === '' ||
      state.age === '' ||
      state.height === '' ||
      state.weight === '' ||
      state.activityLevel === ''
    ) {
      return null
    }

    const heightCm = convertHeightToCm(state.height as number, state.units)
    const weightKg = convertWeightToKg(state.weight as number, state.units)
    const age = state.age as number
    const gender = state.gender as 'male' | 'female'
    const activityLevel = state.activityLevel as number

    const bmr = calculateBMR(weightKg, heightCm, age, gender)
    const tdee = calculateTDEE(bmr, activityLevel)
    const dailyCalories = calculateDailyCalories(tdee, state.weightGoal)
    const macros = calculateMacros(dailyCalories)

    return { bmr, tdee, dailyCalories, macros, weightKg }
  }

  const results = calculateResults()

  const handleNext = () => {
    if (validateStep(state, currentStep)) {
      // After step 3 (last calorie step), show results screen
      if (currentStep === CALORIE_LAST_STEP && phase === 'calorie') {
        setShowResults(true)
        return
      }
      // In meal plan phase, step 7 = submit
      if (currentStep === 7) {
        handleSubmit()
        return
      }
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep === MEAL_PLAN_FIRST_STEP && phase === 'mealplan') {
      // Going back from meal plan to results screen
      setShowResults(true)
      setPhase('calorie')
      setCurrentStep(CALORIE_LAST_STEP)
      return
    }
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleContinueToMealPlan = () => {
    setPhase('mealplan')
    setShowResults(false)
    setCurrentStep(MEAL_PLAN_FIRST_STEP)
  }

  // Save calorie results to profile (no meal plan data)
  const handleSaveToProfile = async () => {
    if (!user || !results) return

    setSaving(true)
    try {
      const heightCm = state.height ? convertHeightToCm(state.height as number, state.units) : null
      const weightKg = state.weight ? convertWeightToKg(state.weight as number, state.units) : null

      const profileData: Record<string, unknown> = {
        gender: state.gender || null,
        age: state.age || null,
        weight: weightKg,
        height: heightCm,
        units: state.units || 'metric',
        language: state.language,
        activity_level: state.activityLevel
          ? { 1.2: 'sedentary', 1.375: 'light', 1.55: 'moderate', 1.725: 'active', 1.9: 'very_active' }[state.activityLevel]
          : null,
        weight_goal: state.weightGoal,
        bmr: Math.round(results.bmr),
        tdee: Math.round(results.tdee),
        daily_calories: Math.round(results.dailyCalories),
        source: 'calculator',
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileData)
        .eq('id', user.id)

      if (error) {
        console.error('Error saving profile:', error)
        alert(t('calculator.errors.saveFailed') || 'Failed to save data')
        return
      }

      // Refresh profile in AuthContext so Profile page shows updated data
      await refreshProfile()

      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (error) {
      console.error('Error saving profile:', error)
      alert(t('calculator.errors.saveFailed') || 'Failed to save data')
    } finally {
      setSaving(false)
    }
  }

  // Full submit with meal plan data + email
  const handleSubmit = async () => {
    if (!validateStep(state, 7)) {
      alert(t('calculator.errors.completionRequired') || 'Please complete all required fields')
      return
    }

    setSubmitting(true)
    try {
      const heightCm = state.height ? convertHeightToCm(state.height as number, state.units) : null
      const weightKg = state.weight ? convertWeightToKg(state.weight as number, state.units) : null

      const profileData: Record<string, unknown> = {
        email: state.email,
        name: state.name,
        gender: state.gender || null,
        age: state.age || null,
        weight: weightKg,
        height: heightCm,
        units: state.units || 'metric',
        language: state.language,
        activity_level: state.activityLevel
          ? { 1.2: 'sedentary', 1.375: 'light', 1.55: 'moderate', 1.725: 'active', 1.9: 'very_active' }[state.activityLevel]
          : null,
        weight_goal: state.weightGoal,
        meals_per_day: state.mealsPerDay || null,
        prep_time: state.prepTime || null,
        selected_ingredients: state.selectedIngredients,
        gdpr_consent: state.gdprConsent,
        marketing_consent: state.gdprConsent,
        source: 'calculator',
        profile_type: 'calculator',
      }

      if (results) {
        profileData.bmr = Math.round(results.bmr)
        profileData.tdee = Math.round(results.tdee)
        profileData.daily_calories = results.dailyCalories
      }

      if (user) {
        const { error } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', user.id)

        if (error) {
          console.error('Error saving profile:', error)
          alert(t('calculator.errors.saveFailed') || 'Failed to save data')
          return
        }

        // Log lead activity for CRM pipeline
        await supabase.from('lead_activity').insert({
          user_id: user.id,
          activity_type: 'calculator_completed',
          activity_details: {
            daily_calories: results?.dailyCalories,
            tdee: results ? Math.round(results.tdee) : null,
            bmr: results ? Math.round(results.bmr) : null,
          },
        }).then(() => {}, () => {}) // Ignore if table not ready yet
      }

      alert(t('calculator.success.submitted') || 'Your calculation has been saved!')

      const allIds = getCategories().flatMap(cat => getIngredients(cat).map(ing => ing.id))
      setState({ ...INITIAL_STATE, selectedIngredients: allIds })
      setCurrentStep(0)
      setPhase('calorie')
      setShowResults(false)
    } catch (error) {
      console.error('Error submitting calculator:', error)
      alert(t('calculator.errors.submitFailed') || 'Failed to submit calculator')
    } finally {
      setSubmitting(false)
    }
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

  // Progress calculation based on phase
  const getStepProgress = () => {
    if (phase === 'calorie') {
      return ((currentStep + 1) / (CALORIE_LAST_STEP + 1)) * 100
    }
    const mealPlanStep = currentStep - MEAL_PLAN_FIRST_STEP
    return ((mealPlanStep + 1) / (TOTAL_STEPS - MEAL_PLAN_FIRST_STEP)) * 100
  }

  const getStepDisplay = () => {
    if (phase === 'calorie') {
      return { current: currentStep + 1, total: CALORIE_LAST_STEP + 1 }
    }
    return { current: currentStep - MEAL_PLAN_FIRST_STEP + 1, total: TOTAL_STEPS - MEAL_PLAN_FIRST_STEP }
  }

  // Shared button style helper
  const cardBtn = (isActive: boolean) =>
    `py-4 px-3 rounded-lg border-2 font-sans font-bold text-sm transition-all text-center ${
      isActive
        ? 'border-primary bg-primary text-white'
        : 'border-gray-300 bg-white text-charcoal hover:border-primary'
    }`

  // ═══════════════════════════════════════════
  // RESULTS SCREEN (shown after step 3 / UI trin 4)
  // ═══════════════════════════════════════════
  if (showResults && results) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-bold mb-4">
              <Check size={16} />
              {t('calculator.resultsReady')}
            </div>
            <h1 className="font-serif text-4xl font-bold text-primary mb-3">
              {t('calculator.title')}
            </h1>
            <p className="text-muted-foreground">{t('calculator.resultsDescription')}</p>
          </div>

          {/* Results Cards */}
          <div className="bg-white rounded-xl shadow-lg p-8 mb-6">
            {/* Main Numbers */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-lg p-6">
                <p className="text-sm font-sans opacity-90 mb-2">{t('calculator.steps.2.bmr')}</p>
                <p className="font-serif text-3xl font-bold">{Math.round(results.bmr)}</p>
                <p className="text-xs font-sans opacity-75 mt-2">kcal/{t('calculator.perDay')}</p>
              </div>

              <div className="bg-gradient-to-br from-accent to-accent/80 text-white rounded-lg p-6">
                <p className="text-sm font-sans opacity-90 mb-2">{t('calculator.steps.2.tdee')}</p>
                <p className="font-serif text-3xl font-bold">{Math.round(results.tdee)}</p>
                <p className="text-xs font-sans opacity-75 mt-2">kcal/{t('calculator.perDay')}</p>
              </div>
            </div>

            {/* Daily Calories — Big Feature */}
            <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6 border-2 border-primary/10 mb-8">
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground font-sans mb-1">
                  {t('calculator.steps.3.dailyCalories')}
                </p>
                <p className="font-serif text-5xl font-bold text-primary">{results.dailyCalories}</p>
                <p className="text-sm text-muted-foreground font-sans mt-1">kcal/{t('calculator.perDay')}</p>
                {state.weightGoal !== 0 && (
                  <p className="text-sm font-sans font-bold text-accent mt-2">
                    {state.weightGoal < 0 ? t('calculator.steps.3.deficit') : t('calculator.steps.3.surplus')}:{' '}
                    {state.weightGoal < 0 ? '' : '+'}{Math.round(results.dailyCalories - results.tdee)} kcal
                  </p>
                )}
              </div>

              {/* Macros */}
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.macros.fat')}: {results.macros.fatGrams}g (70%)
                  </p>
                  <div className="w-full h-2 bg-primary/20 rounded-full">
                    <div className="h-full bg-primary rounded-full" style={{ width: '70%' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.macros.protein')}: {results.macros.proteinGrams}g (25%)
                  </p>
                  <div className="w-full h-2 bg-accent/20 rounded-full">
                    <div className="h-full bg-accent rounded-full" style={{ width: '25%' }} />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.macros.carbs')}: {results.macros.carbsGrams}g (5%)
                  </p>
                  <div className="w-full h-2 bg-sage/40 rounded-full">
                    <div className="h-full bg-sage rounded-full" style={{ width: '5%' }} />
                  </div>
                </div>
              </div>
            </div>

            {/* Summary Details */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h3 className="font-bold text-charcoal mb-4">{t('calculator.steps.2.details')}</h3>
              <div className="grid grid-cols-2 gap-4 text-sm font-sans">
                <div>
                  <p className="text-muted-foreground">{t('calculator.steps.1.gender')}</p>
                  <p className="font-bold text-charcoal">{t(`calculator.gender.${state.gender}`)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('calculator.steps.1.age')}</p>
                  <p className="font-bold text-charcoal">{state.age}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('calculator.steps.1.weight')}</p>
                  <p className="font-bold text-charcoal">
                    {state.weight} {state.units === 'metric' ? 'kg' : 'lbs'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('calculator.steps.1.height')}</p>
                  <p className="font-bold text-charcoal">
                    {state.height} {state.units === 'metric' ? 'cm' : 'inches'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">{t('calculator.steps.3.goalLabel')}</p>
                  <p className="font-bold text-charcoal">
                    {state.weightGoal === 0
                      ? t('calculator.steps.3.maintain')
                      : `${state.weightGoal > 0 ? '+' : ''}${state.weightGoal} kg/${t('calculator.perMonth')}`}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 mb-6">
            <button
              onClick={() => {
                setShowResults(false)
                setCurrentStep(CALORIE_LAST_STEP)
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-lg border-2 border-charcoal text-charcoal hover:bg-charcoal hover:text-white font-sans font-bold transition-all"
            >
              <ChevronLeft size={20} />
              {t('calculator.back')}
            </button>

            {/* Save to profile button — only shown if logged in */}
            {user ? (
              <button
                onClick={handleSaveToProfile}
                disabled={saving || saved}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 font-sans font-bold transition-all ${
                  saved
                    ? 'border-green-500 bg-green-500 text-white'
                    : saving
                      ? 'border-gray-300 text-gray-400 cursor-not-allowed'
                      : 'border-primary bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {saved ? (
                  <>
                    <Check size={20} />
                    {t('admin.saved') || 'Gemt!'}
                  </>
                ) : saving ? (
                  <>
                    <Save size={20} className="animate-pulse" />
                    {t('admin.saving') || 'Gemmer...'}
                  </>
                ) : (
                  <>
                    <Save size={20} />
                    {t('calculator.saveToProfile') || 'Gem på profil'}
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowResults(false)
                  setCurrentStep(0)
                  setPhase('calorie')
                }}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg border-2 border-primary bg-primary text-white hover:bg-primary/90 font-sans font-bold transition-all"
              >
                <CalcIcon size={20} />
                {t('calculator.done')}
              </button>
            )}
          </div>

          {/* Meal Plan CTA */}
          <div className="bg-gradient-to-br from-accent/10 to-primary/10 rounded-xl border-2 border-accent/20 p-8 text-center">
            <UtensilsCrossed size={40} className="mx-auto text-accent mb-4" />
            <h3 className="font-serif text-2xl font-bold text-primary mb-2">
              {t('calculator.continueMealPlan')}
            </h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              {t('calculator.continueMealPlanDesc')}
            </p>
            <button
              onClick={handleContinueToMealPlan}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-accent text-white hover:bg-accent/90 font-sans font-bold transition-all text-lg"
            >
              {t('calculator.mealPlanner')}
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ═══════════════════════════════════════════
  // STEP-BY-STEP FLOW
  // ═══════════════════════════════════════════
  const stepDisplay = getStepDisplay()

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs font-sans font-bold uppercase tracking-widest text-accent mb-2">
            {phase === 'calorie' ? t('calculator.calorieCalculator') : t('calculator.mealPlanner')}
          </p>
          <h1 className="font-serif text-4xl font-bold text-primary mb-3">
            {phase === 'calorie' ? t('calculator.title') : t('calculator.mealPlanTitle')}
          </h1>
          <p className="text-muted-foreground">
            {phase === 'calorie' ? t('calculator.subtitle') : t('calculator.mealPlanSubtitle')}
          </p>
        </div>

        {/* Phase Indicator */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            phase === 'calorie' ? 'bg-primary text-white' : 'bg-gray-200 text-muted-foreground'
          }`}>
            <CalcIcon size={16} />
            {t('calculator.phase')} 1: {t('calculator.calorieCalculator')}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            phase === 'mealplan' ? 'bg-accent text-white' : 'bg-gray-200 text-muted-foreground'
          }`}>
            <UtensilsCrossed size={16} />
            {t('calculator.phase')} 2: {t('calculator.mealPlanner')}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-sans text-muted-foreground">
              {t('calculator.step')} {stepDisplay.current} {t('calculator.of')} {stepDisplay.total}
            </span>
            <span className="text-sm font-sans font-bold text-primary">{Math.round(getStepProgress())}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ease-out ${phase === 'mealplan' ? 'bg-accent' : 'bg-primary'}`}
              style={{ width: `${getStepProgress()}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          {/* ═══ Step 0: Language & Units ═══ */}
          {currentStep === 0 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                  {t('calculator.steps.0.title')}
                </h2>
                <p className="text-muted-foreground mb-6">{t('calculator.steps.0.subtitle')}</p>

                <div>
                  <label className="block text-sm font-bold text-charcoal mb-4">
                    {t('calculator.steps.0.selectLanguage')}
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    {(['da', 'se', 'en'] as const).map(lang => (
                      <button
                        key={lang}
                        onClick={() => {
                          const newUnits = lang === 'en' ? 'imperial' as const : 'metric' as const
                          setState(prev => ({ ...prev, language: lang, units: newUnits }))
                          i18n.changeLanguage(lang)
                        }}
                        className={cardBtn(state.language === lang)}
                      >
                        {lang === 'da' ? 'Dansk' : lang === 'se' ? 'Svenska' : 'English'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t pt-8">
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.0.selectUnits')}
                </label>
                <div className="flex gap-4">
                  {(['metric', 'imperial'] as const).map(unit => (
                    <button
                      key={unit}
                      onClick={() => setState(prev => ({ ...prev, units: unit }))}
                      className={`flex-1 ${cardBtn(state.units === unit)}`}
                    >
                      {unit === 'metric' ? 'kg / cm' : 'lbs / inches'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 1: Personal Stats ═══ */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                  {t('calculator.steps.1.title')}
                </h2>
                <p className="text-muted-foreground mb-6">{t('calculator.steps.1.subtitle')}</p>
              </div>

              {/* Gender */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.1.gender')}
                </label>
                <div className="flex gap-4">
                  {(['male', 'female'] as const).map(gender => (
                    <button
                      key={gender}
                      onClick={() => setState(prev => ({ ...prev, gender }))}
                      className={`flex-1 ${cardBtn(state.gender === gender)}`}
                    >
                      {t(`calculator.gender.${gender}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age, Height, Weight */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    {t('calculator.steps.1.age')}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={state.age === '' ? '' : state.age}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9]/g, '')
                      setState(prev => ({ ...prev, age: v === '' ? '' : parseInt(v) }))
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-primary"
                    placeholder={t('calculator.steps.1.agePlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    {t('calculator.steps.1.height')} ({state.units === 'metric' ? 'cm' : 'inches'})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={state.height === '' ? '' : state.height}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.]/g, '')
                      setState(prev => ({ ...prev, height: v === '' ? '' : parseFloat(v) || '' }))
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-primary"
                    placeholder={t('calculator.steps.1.heightPlaceholder')}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-charcoal mb-2">
                    {t('calculator.steps.1.weight')} ({state.units === 'metric' ? 'kg' : 'lbs'})
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={state.weight === '' ? '' : state.weight}
                    onChange={e => {
                      const v = e.target.value.replace(/[^0-9.]/g, '')
                      setState(prev => ({ ...prev, weight: v === '' ? '' : parseFloat(v) || '' }))
                    }}
                    className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-primary"
                    placeholder={t('calculator.steps.1.weightPlaceholder')}
                  />
                </div>
              </div>

              {/* Activity Level */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-3">
                  {t('calculator.steps.1.activityLevel')}
                </label>
                <div className="space-y-2">
                  {([
                    { value: 1.2, label: 'calculator.activityLevel.sedentary' },
                    { value: 1.375, label: 'calculator.activityLevel.lightly' },
                    { value: 1.55, label: 'calculator.activityLevel.moderately' },
                    { value: 1.725, label: 'calculator.activityLevel.very' },
                    { value: 1.9, label: 'calculator.activityLevel.extremely' },
                  ] as const).map(({ value, label }) => (
                    <button
                      key={value}
                      onClick={() => setState(prev => ({ ...prev, activityLevel: value }))}
                      className={`w-full text-left p-3 rounded-lg border-2 font-sans transition-all ${
                        state.activityLevel === value
                          ? 'border-primary bg-primary/10 text-primary font-bold'
                          : 'border-gray-300 text-charcoal hover:border-primary'
                      }`}
                    >
                      {t(label)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 2: BMR & TDEE Results ═══ */}
          {currentStep === 2 && results && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                  {t('calculator.steps.2.title')}
                </h2>
                <p className="text-muted-foreground mb-6">{t('calculator.steps.2.subtitle')}</p>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-gradient-to-br from-primary to-primary/80 text-white rounded-lg p-6">
                  <p className="text-sm font-sans opacity-90 mb-2">{t('calculator.steps.2.bmr')}</p>
                  <p className="font-serif text-3xl font-bold">{Math.round(results.bmr)}</p>
                  <p className="text-xs font-sans opacity-75 mt-2">kcal/{t('calculator.perDay')}</p>
                </div>

                <div className="bg-gradient-to-br from-accent to-accent/80 text-white rounded-lg p-6">
                  <p className="text-sm font-sans opacity-90 mb-2">{t('calculator.steps.2.tdee')}</p>
                  <p className="font-serif text-3xl font-bold">{Math.round(results.tdee)}</p>
                  <p className="text-xs font-sans opacity-75 mt-2">kcal/{t('calculator.perDay')}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="font-bold text-charcoal mb-4">{t('calculator.steps.2.details')}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-sans">
                  <div>
                    <p className="text-muted-foreground">{t('calculator.steps.1.age')}</p>
                    <p className="font-bold text-charcoal">{state.age}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('calculator.steps.1.weight')}</p>
                    <p className="font-bold text-charcoal">
                      {state.weight} {state.units === 'metric' ? 'kg' : 'lbs'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('calculator.steps.1.height')}</p>
                    <p className="font-bold text-charcoal">
                      {state.height} {state.units === 'metric' ? 'cm' : 'inches'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">{t('calculator.steps.1.gender')}</p>
                    <p className="font-bold text-charcoal">{t(`calculator.gender.${state.gender}`)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 3: Weight Goal & Calorie Calculation ═══ */}
          {currentStep === 3 && results && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-primary mb-4">
                  {t('calculator.steps.3.title')}
                </h2>
                <p className="text-muted-foreground mb-6">{t('calculator.steps.3.subtitle')}</p>
              </div>

              {/* Weight Goal Slider */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.3.goalLabel')}: {' '}
                  <span className="text-primary text-lg">
                    {state.weightGoal === 0
                      ? t('calculator.steps.3.maintain')
                      : `${state.weightGoal > 0 ? '+' : ''}${state.weightGoal} kg/${t('calculator.perMonth')}`}
                  </span>
                </label>
                <input
                  type="range"
                  min="-1"
                  max="0.5"
                  step="0.25"
                  value={state.weightGoal}
                  onChange={e => setState(prev => ({ ...prev, weightGoal: parseFloat(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-2 font-sans">
                  <span>-1 kg</span>
                  <span>{t('calculator.steps.3.maintain')}</span>
                  <span>+0.5 kg</span>
                </div>
              </div>

              {/* Quick Select */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: -1, label: '-1 kg' },
                  { value: -0.5, label: '-0.5 kg' },
                  { value: 0, label: t('calculator.steps.3.maintain') },
                  { value: 0.5, label: '+0.5 kg' },
                ].map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setState(prev => ({ ...prev, weightGoal: value }))}
                    className={cardBtn(state.weightGoal === value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Calorie Breakdown */}
              <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-lg p-6 border-2 border-primary/10">
                <h3 className="font-bold text-charcoal mb-6">{t('calculator.steps.3.breakdown')}</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-muted-foreground font-sans mb-1">TDEE</p>
                    <p className="font-serif text-xl text-charcoal">{Math.round(results.tdee)} kcal</p>

                    {state.weightGoal !== 0 && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground font-sans mb-1">
                          {state.weightGoal < 0 ? t('calculator.steps.3.deficit') : t('calculator.steps.3.surplus')}
                        </p>
                        <p className="font-sans text-sm text-accent font-bold">
                          {state.weightGoal < 0 ? '' : '+'}{Math.round(results.dailyCalories - results.tdee)} kcal
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t">
                      <p className="text-sm text-muted-foreground font-sans mb-1">
                        {t('calculator.steps.3.dailyCalories')}
                      </p>
                      <p className="font-serif text-3xl font-bold text-primary">{results.dailyCalories}</p>
                      <p className="text-xs text-muted-foreground font-sans mt-1">kcal/{t('calculator.perDay')}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-sans text-muted-foreground mb-1">
                        {t('calculator.macros.fat')}: {results.macros.fatGrams}g (70%)
                      </p>
                      <div className="w-full h-2 bg-primary/20 rounded-full">
                        <div className="h-full bg-primary rounded-full" style={{ width: '70%' }} />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-sans text-muted-foreground mb-1">
                        {t('calculator.macros.protein')}: {results.macros.proteinGrams}g (25%)
                      </p>
                      <div className="w-full h-2 bg-accent/20 rounded-full">
                        <div className="h-full bg-accent rounded-full" style={{ width: '25%' }} />
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-sans text-muted-foreground mb-1">
                        {t('calculator.macros.carbs')}: {results.macros.carbsGrams}g (5%)
                      </p>
                      <div className="w-full h-2 bg-sage/40 rounded-full">
                        <div className="h-full bg-sage rounded-full" style={{ width: '5%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 4: Meals, Prep Time, Budget (MEAL PLAN PHASE) ═══ */}
          {currentStep === 4 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-accent mb-4">
                  {t('calculator.steps.4.title')}
                </h2>
              </div>

              {/* Meals Per Day */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.4.mealsPerDay')}
                </label>
                <div className="grid grid-cols-3 gap-4">
                  {[1, 2, 3].map(meals => (
                    <button
                      key={meals}
                      onClick={() => setState(prev => ({ ...prev, mealsPerDay: meals as 1 | 2 | 3 }))}
                      className={`py-6 px-4 rounded-lg border-2 font-sans font-bold transition-all ${
                        state.mealsPerDay === meals
                          ? 'border-accent bg-accent text-white'
                          : 'border-gray-300 bg-white text-charcoal hover:border-accent'
                      }`}
                    >
                      <p className="text-2xl font-serif mb-1">{meals}</p>
                      <p className="text-sm">{t(`calculator.steps.4.meal${meals}`)}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Prep Time */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.4.prepTime')}
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {(['quick', 'medium', 'long', 'mix'] as const).map(time => (
                    <button
                      key={time}
                      onClick={() => setState(prev => ({ ...prev, prepTime: time }))}
                      className={`py-4 px-3 rounded-lg border-2 font-sans font-bold text-sm transition-all text-center ${
                        state.prepTime === time
                          ? 'border-accent bg-accent text-white'
                          : 'border-gray-300 bg-white text-charcoal hover:border-accent'
                      }`}
                    >
                      {t(`calculator.steps.4.prep${time.charAt(0).toUpperCase() + time.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.4.budget')}
                </label>
                <div className="grid grid-cols-4 gap-4">
                  {(['cheap', 'medium', 'expensive', 'mixed'] as const).map(budget => (
                    <button
                      key={budget}
                      onClick={() => setState(prev => ({ ...prev, budget }))}
                      className={`py-4 px-3 rounded-lg border-2 font-sans font-bold text-sm transition-all text-center ${
                        state.budget === budget
                          ? 'border-accent bg-accent text-white'
                          : 'border-gray-300 bg-white text-charcoal hover:border-accent'
                      }`}
                    >
                      {t(`calculator.steps.4.budget${budget.charAt(0).toUpperCase() + budget.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 5: Ingredient Preferences ═══ */}
          {currentStep === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-accent mb-4">
                  {t('calculator.steps.5.title')}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {t('calculator.steps.5.subtitle')} ({state.selectedIngredients.length}/122)
                </p>
              </div>

              <div className="space-y-3">
                {getCategories().map(category => {
                  const categoryIngredients = getIngredients(category)
                  const selectedCount = getCategoryCount(category)
                  const isExpanded = expandedCategories.includes(category)

                  return (
                    <div key={category} className="border-2 border-gray-300 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleCategory(category)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-charcoal capitalize">
                            {t(getCategoryTranslationKey(category))}
                          </span>
                          <span className="text-xs font-sans text-muted-foreground">
                            {selectedCount}/{categoryIngredients.length}
                          </span>
                        </div>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            if (selectedCount === categoryIngredients.length) {
                              deselectAllInCategory(category)
                            } else {
                              selectAllInCategory(category)
                            }
                          }}
                          className="text-sm font-sans font-bold text-accent hover:text-accent/80 transition-all"
                        >
                          {selectedCount === categoryIngredients.length
                            ? t('calculator.deselectAll')
                            : t('calculator.selectAll')}
                        </button>
                      </button>

                      {isExpanded && (
                        <div className="border-t-2 border-gray-300 bg-gray-50 p-4 grid grid-cols-2 gap-3">
                          {categoryIngredients.map(ingredient => (
                            <label
                              key={ingredient.id}
                              className="flex items-center gap-3 cursor-pointer hover:bg-white p-2 rounded transition-all"
                            >
                              <input
                                type="checkbox"
                                checked={state.selectedIngredients.includes(ingredient.id)}
                                onChange={() => toggleIngredient(ingredient.id)}
                                className="w-4 h-4 rounded accent-accent"
                              />
                              <span className="text-sm font-sans text-charcoal">
                                {t(ingredient.translationKey)}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              {/* Health Preferences */}
              <div className="border-t-2 pt-6">
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.5.healthPreferences')}
                </label>
                <div className="space-y-3">
                  {[
                    { key: 'antiInflammatory', label: 'calculator.steps.5.antiInflammatory' },
                    { key: 'avoidProcessed', label: 'calculator.steps.5.avoidProcessed' },
                  ].map(({ key, label }) => (
                    <label
                      key={key}
                      className="flex items-center gap-3 p-3 border-2 border-gray-300 rounded-lg cursor-pointer hover:border-accent transition-all"
                    >
                      <input
                        type="checkbox"
                        checked={state.healthPreferences[key as keyof typeof state.healthPreferences]}
                        onChange={e =>
                          setState(prev => ({
                            ...prev,
                            healthPreferences: {
                              ...prev.healthPreferences,
                              [key]: e.target.checked,
                            },
                          }))
                        }
                        className="w-4 h-4 accent-accent"
                      />
                      <span className="font-sans text-charcoal">{t(label)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 6: Days & Leftovers Strategy ═══ */}
          {currentStep === 6 && (
            <div className="space-y-8">
              <div>
                <h2 className="font-serif text-2xl font-bold text-accent mb-4">
                  {t('calculator.steps.6.title')}
                </h2>
              </div>

              {/* Days Per Week */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.6.daysPerWeek')}
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(day => (
                    <button
                      key={day}
                      onClick={() => setState(prev => ({ ...prev, daysPerWeek: day as 1 | 2 | 3 | 4 | 5 | 6 | 7 }))}
                      className={`py-4 px-3 rounded-lg border-2 font-sans font-bold text-sm transition-all text-center ${
                        state.daysPerWeek === day
                          ? 'border-accent bg-accent text-white'
                          : 'border-gray-300 bg-white text-charcoal hover:border-accent'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>

              {/* Leftovers Strategy */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-4">
                  {t('calculator.steps.6.leftoversStrategy')}
                </label>
                <div className="space-y-3">
                  {(['daily', 'batch', 'mixed'] as const).map(strategy => (
                    <button
                      key={strategy}
                      onClick={() => setState(prev => ({ ...prev, leftoversStrategy: strategy }))}
                      className={`w-full text-left p-4 rounded-lg border-2 font-sans transition-all ${
                        state.leftoversStrategy === strategy
                          ? 'border-accent bg-accent/10'
                          : 'border-gray-300 hover:border-accent'
                      }`}
                    >
                      <p className={`font-bold ${state.leftoversStrategy === strategy ? 'text-accent' : 'text-charcoal'}`}>
                        {t(`calculator.steps.6.${strategy}.title`)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {t(`calculator.steps.6.${strategy}.desc`)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ═══ Step 7: Summary & Email ═══ */}
          {currentStep === 7 && results && (
            <div className="space-y-6">
              <div>
                <h2 className="font-serif text-2xl font-bold text-accent mb-4">
                  {t('calculator.steps.7.title')}
                </h2>
                <p className="text-muted-foreground mb-6">{t('calculator.steps.7.subtitle')}</p>
              </div>

              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-primary/10 rounded-lg p-4 border-l-4 border-primary">
                  <p className="text-xs font-sans text-muted-foreground mb-1">TDEE</p>
                  <p className="font-serif text-2xl font-bold text-primary">{Math.round(results.tdee)} kcal</p>
                </div>

                <div className="bg-accent/10 rounded-lg p-4 border-l-4 border-accent">
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.steps.3.dailyCalories')}
                  </p>
                  <p className="font-serif text-2xl font-bold text-accent">{results.dailyCalories} kcal</p>
                </div>

                <div className="bg-primary/10 rounded-lg p-4 border-l-4 border-primary">
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.steps.4.mealsPerDay')}
                  </p>
                  <p className="font-serif text-2xl font-bold text-primary">{state.mealsPerDay}</p>
                </div>

                <div className="bg-accent/10 rounded-lg p-4 border-l-4 border-accent">
                  <p className="text-xs font-sans text-muted-foreground mb-1">
                    {t('calculator.steps.6.daysPerWeek')}
                  </p>
                  <p className="font-serif text-2xl font-bold text-accent">{state.daysPerWeek}</p>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  {t('calculator.steps.7.email')}
                </label>
                <input
                  type="email"
                  value={state.email}
                  onChange={e => setState(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-accent"
                  placeholder="your@email.com"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-bold text-charcoal mb-2">
                  {t('calculator.steps.7.name')}
                </label>
                <input
                  type="text"
                  value={state.name}
                  onChange={e => setState(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg font-sans focus:outline-none focus:border-accent"
                  placeholder={t('calculator.steps.7.namePlaceholder')}
                />
              </div>

              {/* GDPR Consent */}
              <button
                onClick={() => setState(prev => ({ ...prev, gdprConsent: !prev.gdprConsent }))}
                className={`w-full flex items-start gap-3 p-4 rounded-lg border-2 text-left transition-all ${
                  state.gdprConsent
                    ? 'border-accent bg-accent/10'
                    : 'border-gray-300 hover:border-accent'
                }`}
              >
                <div className={`w-5 h-5 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                  state.gdprConsent
                    ? 'border-accent bg-accent'
                    : 'border-gray-400'
                }`}>
                  {state.gdprConsent && <Check size={14} className="text-white" />}
                </div>
                <p className="text-sm font-sans text-charcoal">
                  {t('calculator.steps.7.gdprConsent')}{' '}
                  <span className="text-accent font-bold">*</span>
                </p>
              </button>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-sans font-bold transition-all ${
              currentStep === 0
                ? 'border-gray-300 text-gray-300 cursor-not-allowed'
                : 'border-charcoal text-charcoal hover:bg-charcoal hover:text-white'
            }`}
          >
            <ChevronLeft size={20} />
            {t('calculator.back')}
          </button>

          <button
            onClick={handleNext}
            disabled={!validateStep(state, currentStep) || submitting}
            className={`flex items-center gap-2 px-6 py-3 rounded-lg border-2 font-sans font-bold transition-all ${
              !validateStep(state, currentStep) || submitting
                ? 'border-gray-300 text-gray-300 cursor-not-allowed'
                : phase === 'mealplan'
                  ? 'border-accent bg-accent text-white hover:bg-accent/90'
                  : 'border-primary bg-primary text-white hover:bg-primary/90'
            }`}
          >
            {currentStep === 7 ? (
              <>
                {submitting ? t('calculator.submitting') : t('calculator.submit')}
                {!submitting && <Check size={20} />}
              </>
            ) : (
              <>
                {t('calculator.next')}
                <ChevronRight size={20} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
