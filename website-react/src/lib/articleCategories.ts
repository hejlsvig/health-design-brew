/**
 * Article category definitions for Shifting Source.
 * Central source of truth for all category slugs, labels, and helpers.
 */

export const ARTICLE_CATEGORIES = [
  // ── Core lifestyle ──
  'keto',
  'fasting',
  'weight_loss',
  'nutrition_science',

  // ── Metabolic & cellular ──
  'metabolic_health',
  'insulin_resistance',
  'autophagy',
  'mitochondria',
  'ampk',
  'mtor',
  'sirt1',
  'ketones',

  // ── Body systems ──
  'cardiovascular',
  'blood_pressure',
  'cholesterol',
  'thyroid',
  'gut_biome',
  'liver_health',
  'hormones',

  // ── Health conditions ──
  'chronic_disease',
  'cancer',
  'diabetes',
  'inflammation',

  // ── Performance & body ──
  'muscle',
  'exercise_movement',
  'sleep_recovery',
  'circadian_rhythms',

  // ── Supplements & nutrients ──
  'supplement',
  'protein',
  'creatine',
  'bcaa',
  'electrolytes',
  'sugar',

  // ── Mind & wellbeing ──
  'mental_health',
  'longevity',

  // ── Demographics ──
  'womens_health',
  'mens_health',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

/** Localized labels for each category */
const CATEGORY_LABELS: Record<ArticleCategory, Record<string, string>> = {
  // Core lifestyle
  keto:               { da: 'Keto',                    en: 'Keto',                   se: 'Keto' },
  fasting:            { da: 'Faste',                   en: 'Fasting',                se: 'Fasta' },
  weight_loss:        { da: 'Vægttab',                 en: 'Weight Loss',            se: 'Viktnedgång' },
  nutrition_science:  { da: 'Ernæringsvidenskab',      en: 'Nutrition Science',      se: 'Näringsvetenskap' },

  // Metabolic & cellular
  metabolic_health:   { da: 'Metabolisk Sundhed',      en: 'Metabolic Health',       se: 'Metabolisk Hälsa' },
  insulin_resistance: { da: 'Insulinresistens',        en: 'Insulin Resistance',     se: 'Insulinresistens' },
  autophagy:          { da: 'Autofagi',                en: 'Autophagy',              se: 'Autofagi' },
  mitochondria:       { da: 'Mitokondrier',            en: 'Mitochondria',           se: 'Mitokondrier' },
  ampk:               { da: 'AMPK',                    en: 'AMPK',                   se: 'AMPK' },
  mtor:               { da: 'mTOR',                    en: 'mTOR',                   se: 'mTOR' },
  sirt1:              { da: 'SIRT1',                   en: 'SIRT1',                  se: 'SIRT1' },
  ketones:            { da: 'Ketonstoffer',             en: 'Ketones',                se: 'Ketoner' },

  // Body systems
  cardiovascular:     { da: 'Hjerte-kar',              en: 'Cardiovascular',         se: 'Hjärta & Kärl' },
  blood_pressure:     { da: 'Blodtryk',                en: 'Blood Pressure',         se: 'Blodtryck' },
  cholesterol:        { da: 'Kolesterol',              en: 'Cholesterol',            se: 'Kolesterol' },
  thyroid:            { da: 'Skjoldbruskkirtel',       en: 'Thyroid',                se: 'Sköldkörtel' },
  gut_biome:          { da: 'Tarmflora',               en: 'Gut Health',             se: 'Tarmflora' },
  liver_health:       { da: 'Lever-sundhed',           en: 'Liver Health',           se: 'Leverhälsa' },
  hormones:           { da: 'Hormoner',                en: 'Hormones',               se: 'Hormoner' },

  // Health conditions
  chronic_disease:    { da: 'Kronisk Sygdom',          en: 'Chronic Disease',        se: 'Kronisk Sjukdom' },
  cancer:             { da: 'Kræft',                   en: 'Cancer',                 se: 'Cancer' },
  diabetes:           { da: 'Diabetes',                en: 'Diabetes',               se: 'Diabetes' },
  inflammation:       { da: 'Inflammation',            en: 'Inflammation',           se: 'Inflammation' },

  // Performance & body
  muscle:             { da: 'Muskler',                 en: 'Muscle',                 se: 'Muskler' },
  exercise_movement:  { da: 'Træning & Bevægelse',     en: 'Exercise & Movement',    se: 'Träning & Rörelse' },
  sleep_recovery:     { da: 'Søvn & Restitution',      en: 'Sleep & Recovery',       se: 'Sömn & Återhämtning' },
  circadian_rhythms:  { da: 'Døgnrytme',               en: 'Circadian Rhythms',      se: 'Dygnsrytm' },

  // Supplements & nutrients
  supplement:         { da: 'Kosttilskud',             en: 'Supplements',            se: 'Kosttillskott' },
  protein:            { da: 'Protein',                 en: 'Protein',                se: 'Protein' },
  creatine:           { da: 'Kreatin',                 en: 'Creatine',               se: 'Kreatin' },
  bcaa:               { da: 'BCAA',                    en: 'BCAA',                   se: 'BCAA' },
  electrolytes:       { da: 'Elektrolytter',           en: 'Electrolytes',           se: 'Elektrolyter' },
  sugar:              { da: 'Sukker',                  en: 'Sugar',                  se: 'Socker' },

  // Mind & wellbeing
  mental_health:      { da: 'Mental Sundhed',          en: 'Mental Health',          se: 'Mental Hälsa' },
  longevity:          { da: 'Livslængde',              en: 'Longevity',              se: 'Livslängd' },

  // Demographics
  womens_health:      { da: 'Kvinders Sundhed',        en: "Women's Health",         se: 'Kvinnors Hälsa' },
  mens_health:        { da: 'Mænds Sundhed',           en: "Men's Health",           se: 'Mäns Hälsa' },
}

/** Get the localized label for a category slug */
export function getCategoryLabel(slug: string, lang: string): string {
  const labels = CATEGORY_LABELS[slug as ArticleCategory]
  if (!labels) return slug
  return labels[lang] || labels['da'] || labels['en'] || slug
}

/** Get all categories with their labels for a given language */
export function getCategoryOptions(lang: string): { value: ArticleCategory; label: string }[] {
  return ARTICLE_CATEGORIES.map(cat => ({
    value: cat,
    label: getCategoryLabel(cat, lang),
  }))
}
