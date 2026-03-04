-- Migration 005: Convert articles from single category to multi-category array
-- Categories: keto, fasting, metabolic_health, gut_biome, sleep_recovery,
--             hormones, mental_health, inflammation, exercise_movement, longevity

-- 1. Add new categories column (TEXT array)
ALTER TABLE articles ADD COLUMN IF NOT EXISTS categories TEXT[] DEFAULT '{}';

-- 2. Migrate existing data: copy single category into array
UPDATE articles SET categories = ARRAY[category] WHERE category IS NOT NULL AND (categories IS NULL OR categories = '{}');

-- 3. Drop old category column and its constraints
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_check;
ALTER TABLE articles DROP COLUMN IF EXISTS category;

-- 4. Make categories NOT NULL with minimum 1 element
ALTER TABLE articles ALTER COLUMN categories SET NOT NULL;
ALTER TABLE articles ALTER COLUMN categories SET DEFAULT '{}';
ALTER TABLE articles ADD CONSTRAINT check_categories_not_empty CHECK (array_length(categories, 1) >= 1);

-- 5. Drop old index, create new GIN index for array queries
DROP INDEX IF EXISTS idx_articles_category;
CREATE INDEX IF NOT EXISTS idx_articles_categories ON articles USING GIN(categories);
