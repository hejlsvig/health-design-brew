/**
 * Pure calculation functions for the Keto Calculator
 * Using Mifflin-St Jeor equation for BMR calculation
 */

export interface CalculatorState {
  language: 'da' | 'se' | 'en' | ''
  units: 'metric' | 'imperial' | ''
  gender: 'male' | 'female' | ''
  age: number | ''
  height: number | ''
  weight: number | ''
  activityLevel: 1.2 | 1.375 | 1.55 | 1.725 | 1.9 | ''
  weightGoal: number
  mealsPerDay: 1 | 2 | 3 | ''
  prepTime: 'quick' | 'medium' | 'long' | 'mix' | ''
  budget: 'cheap' | 'medium' | 'expensive' | 'mixed' | ''
  selectedIngredients: string[]
  healthPreferences: {
    antiInflammatory: boolean
    avoidProcessed: boolean
  }
  daysPerWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7 | ''
  leftoversStrategy: 'daily' | 'batch' | 'mixed' | ''
  email: string
  name: string
  gdprConsent: boolean
  newsletterConsent: boolean
  contactConsent: boolean
}

export const INITIAL_STATE: CalculatorState = {
  language: '',
  units: '',
  gender: '',
  age: '',
  height: '',
  weight: '',
  activityLevel: '',
  weightGoal: -0.5,
  mealsPerDay: '',
  prepTime: '',
  budget: '',
  selectedIngredients: [],
  healthPreferences: {
    antiInflammatory: true,
    avoidProcessed: true,
  },
  daysPerWeek: '',
  leftoversStrategy: '',
  email: '',
  name: '',
  gdprConsent: false,
  newsletterConsent: false,
  contactConsent: false,
}

/**
 * Get all ingredient IDs (for default "all selected" state)
 */
export function getAllIngredientIds(): string[] {
  // Imported dynamically to avoid circular dependency
  return []
}

/**
 * Convert pounds to kilograms
 */
export function poundsToKg(lbs: number): number {
  return lbs / 2.20462
}

/**
 * Convert kilograms to pounds
 */
export function kgToPounds(kg: number): number {
  return kg * 2.20462
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54
}

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm / 2.54
}

/**
 * Convert height to centimeters (handles both metric and imperial)
 */
export function convertHeightToCm(value: number, units: 'metric' | 'imperial' | ''): number {
  if (units === 'metric' || units === '') {
    return value
  }
  // For imperial, assume value is in inches
  return inchesToCm(value)
}

/**
 * Convert weight to kilograms (handles both metric and imperial)
 */
export function convertWeightToKg(value: number, units: 'metric' | 'imperial' | ''): number {
  if (units === 'metric' || units === '') {
    return value
  }
  return poundsToKg(value)
}

/**
 * Calculate Basal Metabolic Rate using Mifflin-St Jeor equation
 * @param weight in kilograms
 * @param height in centimeters
 * @param age in years
 * @param gender 'male' or 'female'
 */
export function calculateBMR(
  weight: number,
  height: number,
  age: number,
  gender: 'male' | 'female'
): number {
  if (gender === 'male') {
    return 10 * weight + 6.25 * height - 5 * age + 5
  } else {
    return 10 * weight + 6.25 * height - 5 * age - 161
  }
}

/**
 * Calculate Total Daily Energy Expenditure
 * @param bmr Basal Metabolic Rate
 * @param activityLevel Activity multiplier (1.2 to 1.9)
 */
export function calculateTDEE(bmr: number, activityLevel: number): number {
  return bmr * activityLevel
}

/**
 * Calculate daily calories needed based on weight goal
 * @param tdee Total Daily Energy Expenditure
 * @param weightGoalKg Target monthly weight change in kg (negative = loss, positive = gain)
 */
export function calculateDailyCalories(tdee: number, weightGoalKg: number): number {
  // Each kg of body weight = ~7700 calories
  // Monthly goal to daily adjustment: (kg * 7700) / 30
  // weightGoalKg is negative for loss → dailyCalorieAdjustment is negative → fewer calories
  const dailyCalorieAdjustment = (weightGoalKg * 7700) / 30

  // Add adjustment: negative goal = eat less, positive goal = eat more
  let dailyCalories = tdee + dailyCalorieAdjustment

  // Clamp between 1200 and 4000 kcal for safety
  dailyCalories = Math.max(1200, Math.min(4000, dailyCalories))

  return Math.round(dailyCalories)
}

/**
 * Calculate macronutrient breakdown for keto diet
 * Keto standard: 70% fat, 25% protein, 5% carbs
 */
export function calculateMacros(dailyCalories: number): {
  fat: number
  protein: number
  carbs: number
  fatGrams: number
  proteinGrams: number
  carbsGrams: number
} {
  const fat = Math.round(dailyCalories * 0.7)
  const protein = Math.round(dailyCalories * 0.25)
  const carbs = Math.round(dailyCalories * 0.05)

  return {
    fat,
    protein,
    carbs,
    fatGrams: Math.round(fat / 9),
    proteinGrams: Math.round(protein / 4),
    carbsGrams: Math.round(carbs / 4),
  }
}

/**
 * Get activity level label from numeric value
 */
export function getActivityLevelLabel(level: number): string {
  switch (level) {
    case 1.2:
      return 'Sedentary'
    case 1.375:
      return 'Lightly Active'
    case 1.55:
      return 'Moderately Active'
    case 1.725:
      return 'Very Active'
    case 1.9:
      return 'Extremely Active'
    default:
      return 'Unknown'
  }
}

/**
 * Validate all required fields for a given step
 */
export function validateStep(state: CalculatorState, step: number): boolean {
  switch (step) {
    case 0: // Language + Units
      return state.language !== '' && state.units !== ''

    case 1: // Personal stats
      return (
        state.gender !== '' &&
        state.age !== '' &&
        typeof state.age === 'number' &&
        state.height !== '' &&
        typeof state.height === 'number' &&
        state.weight !== '' &&
        typeof state.weight === 'number' &&
        state.activityLevel !== ''
      )

    case 2: // Results display
      return true // Always valid, just displaying

    case 3: // Weight goal
      return state.weightGoal !== null && state.weightGoal !== undefined

    case 4: // Meals, prep time, budget
      return state.mealsPerDay !== '' && state.prepTime !== '' && state.budget !== ''

    case 5: // Ingredients & health preferences
      return state.selectedIngredients.length > 0

    case 6: // Days & leftovers strategy
      return state.daysPerWeek !== '' && state.leftoversStrategy !== ''

    case 7: // Summary & email
      return state.email !== '' && state.gdprConsent === true

    default:
      return false
  }
}

/**
 * Sanitize email address
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}
