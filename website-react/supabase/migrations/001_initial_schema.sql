-- ═══════════════════════════════════════════════════════════════
-- SHIFTING SHOURCE — Initial Database Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. PROFILES (all user types) ──────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT,

    -- Source & type
    source TEXT NOT NULL DEFAULT 'website_signup'
        CHECK (source IN ('calculator', 'website_signup', 'manual')),
    profile_type TEXT NOT NULL DEFAULT 'light'
        CHECK (profile_type IN ('light', 'calculator', 'coaching')),
    language TEXT NOT NULL DEFAULT 'da'
        CHECK (language IN ('da', 'se', 'en')),

    -- Personal data
    gender TEXT CHECK (gender IN ('male', 'female')),
    age INTEGER CHECK (age >= 10 AND age <= 120),
    weight REAL CHECK (weight > 0),
    height REAL CHECK (height > 0),
    activity_level TEXT CHECK (activity_level IN (
        'sedentary', 'light', 'moderate', 'active', 'very_active'
    )),
    units TEXT DEFAULT 'metric' CHECK (units IN ('metric', 'imperial')),

    -- Calculated values
    bmr INTEGER,
    tdee INTEGER,
    daily_calories INTEGER,
    weight_goal REAL,

    -- Diet preferences
    diet_type TEXT DEFAULT 'Custom Keto',
    fasting_protocol TEXT DEFAULT 'none'
        CHECK (fasting_protocol IN ('none', '16:8', '18:6', '20:4', 'omad')),
    meals_per_day INTEGER DEFAULT 3 CHECK (meals_per_day >= 1 AND meals_per_day <= 6),
    prep_time TEXT DEFAULT 'medium' CHECK (prep_time IN ('quick', 'medium', 'elaborate')),
    excluded_ingredients JSONB DEFAULT '[]'::jsonb,
    selected_ingredients JSONB DEFAULT '[]'::jsonb,

    -- GDPR
    gdpr_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,

    -- Metadata
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 2. RECIPES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,

    -- Multi-language content (JSONB: {"da": "...", "se": "...", "en": "..."})
    title JSONB NOT NULL,
    description JSONB NOT NULL,
    ingredients JSONB NOT NULL,
    instructions JSONB NOT NULL,

    -- Nutrition per serving
    calories INTEGER,
    protein REAL,
    fat REAL,
    carbs REAL,
    fiber REAL,
    net_carbs REAL GENERATED ALWAYS AS (GREATEST(carbs - COALESCE(fiber, 0), 0)) STORED,

    -- Metadata
    prep_time INTEGER,        -- minutes
    cook_time INTEGER,        -- minutes
    total_time INTEGER GENERATED ALWAYS AS (COALESCE(prep_time, 0) + COALESCE(cook_time, 0)) STORED,
    servings INTEGER DEFAULT 1,
    difficulty TEXT DEFAULT 'easy'
        CHECK (difficulty IN ('easy', 'medium', 'hard')),
    image_url TEXT,

    -- Categorization
    categories TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Publishing
    published_countries TEXT[] DEFAULT '{da,se,en}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,

    -- SEO (multi-language)
    seo_title JSONB,
    seo_description JSONB,

    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER recipes_updated_at
    BEFORE UPDATE ON recipes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Indexes for recipe search
CREATE INDEX idx_recipes_status ON recipes(status);
CREATE INDEX idx_recipes_categories ON recipes USING GIN(categories);
CREATE INDEX idx_recipes_tags ON recipes USING GIN(tags);
CREATE INDEX idx_recipes_published_countries ON recipes USING GIN(published_countries);

-- ─── 3. RECIPE RATINGS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recipe_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, recipe_id)
);

-- ─── 4. SAVED RECIPES ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_saved_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ,
    emailed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, recipe_id)
);

-- ─── 5. ARTICLES / STUDIES ────────────────────────────────────
CREATE TABLE IF NOT EXISTS articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,

    -- Multi-language content
    title JSONB NOT NULL,
    content JSONB NOT NULL,         -- Rich text HTML
    summary JSONB,                   -- Short explanation

    -- Source
    source_url TEXT,
    source_title TEXT,

    -- Categorization
    category TEXT NOT NULL CHECK (category IN ('fasting', 'keto')),
    tags TEXT[] DEFAULT '{}',

    -- Publishing
    published_countries TEXT[] DEFAULT '{da,se,en}',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    published_at TIMESTAMPTZ,

    -- SEO
    seo_title JSONB,
    seo_description JSONB,
    featured_image TEXT,

    -- Audit
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER articles_updated_at
    BEFORE UPDATE ON articles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_articles_status ON articles(status);
CREATE INDEX idx_articles_category ON articles(category);

-- ─── 6. COACHING CLIENTS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS coaching_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active'
        CHECK (status IN ('active', 'inactive', 'completed')),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    access_token UUID DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. WEEKLY CHECK-INS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS weekly_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    coaching_client_id UUID NOT NULL REFERENCES coaching_clients(id) ON DELETE CASCADE,
    week_number INTEGER,
    weight REAL,

    -- Wellness metrics
    mood INTEGER CHECK (mood >= 1 AND mood <= 10),
    energy INTEGER CHECK (energy >= 1 AND energy <= 10),
    hunger TEXT,
    cravings TEXT,
    sleep_hours REAL,
    sleep_quality INTEGER CHECK (sleep_quality >= 1 AND sleep_quality <= 10),
    digestion TEXT,
    activity TEXT,

    -- Fasting metrics
    fasting_hours INTEGER,
    fasting_feeling TEXT,

    -- Notes
    stress_factors TEXT,
    weekly_win TEXT,
    deviations TEXT,
    notes TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. GENERATED MEAL PLANS ─────────────────────────────────
CREATE TABLE IF NOT EXISTS generated_meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    pdf_filename TEXT NOT NULL,
    pdf_storage_path TEXT,       -- Supabase Storage path
    tokens_used INTEGER,
    cost_usd REAL,
    model TEXT DEFAULT 'gpt-4o',
    num_days INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. CRM USERS (admin panel) ──────────────────────────────
CREATE TABLE IF NOT EXISTS crm_users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'light'
        CHECK (role IN ('light', 'medium', 'admin')),
    language TEXT DEFAULT 'da',
    active BOOLEAN DEFAULT true,
    email_footer TEXT,
    email_logo TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER crm_users_updated_at
    BEFORE UPDATE ON crm_users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 10. EMAIL HISTORY ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS email_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    email_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    subject TEXT,
    status TEXT DEFAULT 'sent',
    error_message TEXT,
    sent_by UUID REFERENCES crm_users(id),
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY (RLS)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE coaching_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_meal_plans ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Recipes: everyone can read published recipes
CREATE POLICY "Anyone can view published recipes"
    ON recipes FOR SELECT
    USING (status = 'published');

-- Articles: everyone can read published articles
CREATE POLICY "Anyone can view published articles"
    ON articles FOR SELECT
    USING (status = 'published');

-- Recipe ratings: users manage own ratings
CREATE POLICY "Users can manage own ratings"
    ON recipe_ratings FOR ALL
    USING (auth.uid() = profile_id);

-- Saved recipes: users manage own saves
CREATE POLICY "Users can manage own saved recipes"
    ON user_saved_recipes FOR ALL
    USING (auth.uid() = profile_id);

-- Coaching clients: users can view own coaching
CREATE POLICY "Users can view own coaching"
    ON coaching_clients FOR SELECT
    USING (auth.uid() = profile_id);

-- Check-ins: users can manage own check-ins
CREATE POLICY "Users can view own checkins"
    ON weekly_checkins FOR SELECT
    USING (
        coaching_client_id IN (
            SELECT id FROM coaching_clients WHERE profile_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own checkins"
    ON weekly_checkins FOR INSERT
    WITH CHECK (
        coaching_client_id IN (
            SELECT id FROM coaching_clients WHERE profile_id = auth.uid()
        )
    );

-- Meal plans: users can view own plans
CREATE POLICY "Users can view own meal plans"
    ON generated_meal_plans FOR SELECT
    USING (auth.uid() = profile_id);

-- ═══════════════════════════════════════════════════════════════
-- HELPER FUNCTION: Auto-create profile on signup
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, name, language)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'language', 'da')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: create profile when user signs up via Auth
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ═══════════════════════════════════════════════════════════════
-- VIEWS (convenience)
-- ═══════════════════════════════════════════════════════════════

-- Recipe with average rating
CREATE OR REPLACE VIEW recipes_with_ratings AS
SELECT
    r.*,
    COALESCE(AVG(rr.rating), 0) AS avg_rating,
    COUNT(rr.id) AS rating_count
FROM recipes r
LEFT JOIN recipe_ratings rr ON r.id = rr.recipe_id
GROUP BY r.id;
