/**
 * Article category definitions for Shifting Source.
 * Central source of truth for all category slugs, labels, and helpers.
 */

export const ARTICLE_CATEGORIES = [
  'keto',
  'fasting',
  'metabolic_health',
  'gut_biome',
  'sleep_recovery',
  'hormones',
  'mental_health',
  'inflammation',
  'exercise_movement',
  'longevity',
] as const

export type ArticleCategory = (typeof ARTICLE_CATEGORIES)[number]

/** Localized labels for each category */
const CATEGORY_LABELS: Record<ArticleCategory, Record<string, string>> = {
  keto:              { da: 'Keto',                  en: 'Keto',                 se: 'Keto' },
  fasting:           { da: 'Faste',                 en: 'Fasting',              se: 'Fasta' },
  metabolic_health:  { da: 'Metabolisk Sundhed',    en: 'Metabolic Health',     se: 'Metabolisk Hälsa' },
  gut_biome:         { da: 'Gut Biome',             en: 'Gut Biome',            se: 'Tarmflora' },
  sleep_recovery:    { da: 'Søvn & Restitution',    en: 'Sleep & Recovery',     se: 'Sömn & Återhämtning' },
  hormones:          { da: 'Hormoner',              en: 'Hormones',             se: 'Hormoner' },
  mental_health:     { da: 'Mental Sundhed',        en: 'Mental Health',        se: 'Mental Hälsa' },
  inflammation:      { da: 'Inflammation',          en: 'Inflammation',         se: 'Inflammation' },
  exercise_movement: { da: 'Træning & Bevægelse',   en: 'Exercise & Movement',  se: 'Träning & Rörelse' },
  longevity:         { da: 'Longevity',             en: 'Longevity',            se: 'Livslängd' },
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
