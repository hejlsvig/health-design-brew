# Strategisk Projektplan: Keto & Fasting Lifestyle Platform

**Projektleder & Fullstack Developer:** Claude (AI)
**Product Owner:** Anders Hejlsvig
**Dato:** 24. februar 2026
**Version:** 1.0

---

## 1. Nuværende Tilstand

### Hvad vi har i dag

**CRM/Backend (fungerer):**
- Node.js + Express backend med SQLite database
- Keto Calculator med 10-trins brugerflow (3 sprog: DA/SE/EN)
- Lead management med coaching-aktivering
- Ugentlige check-ins med 17 datapunkter (vægt, humør, energi, søvn osv.)
- AI-madplangenerering via GPT-4 med PDF-output + email
- Email-automation (check-in reminders)
- Brugerroller (admin/coach) med session-baseret auth
- GDPR consent tracking

**Website (kun calculator):**
- `index.html` — Standalone keto calculator med multi-sprog
- Ingen egentlig hjemmeside, blog, opskrifter eller brugerprofiler

**Lovable Design Repo (blueprint):**
- Komplet designsystem (farver, typografi, spacing, overlays)
- Homepage layout (hero, featured grid, about, footer)
- React/Tailwind/shadcn-ui komponenter
- Sider skitseret: Home, Recipes, Blog, Calculator, Login

---

## 2. Arkitektur-beslutning

### Anbefalet Stack: React Frontend + Supabase Backend

```
┌─────────────────────────────────────────────────────────┐
│                    BRUGERE (DK/SE/EN)                    │
│              Auto-detect sprog via browser                │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              FRONTEND (React + Vite)                      │
│  • Deployet som statiske filer på one.com                 │
│  • Lovable design-system (Tailwind + shadcn/ui)           │
│  • i18n med react-i18next (DA/SE/EN)                      │
│  • Keto Calculator (migreret fra index.html)              │
│  • Opskriftsdatabase med søgning                          │
│  • Blog/Studies med kategorier                            │
│  • Brugerprofiler (Light/Full)                            │
│  • WYSIWYG editor (TipTap) for admin                      │
└──────────────────────┬──────────────────────────────────┘
                       │ API calls
                       ▼
┌─────────────────────────────────────────────────────────┐
│              SUPABASE (Backend-as-a-Service)               │
│                                                           │
│  PostgreSQL Database                                       │
│  ├── profiles (brugerprofiler, TDEE, præferencer)          │
│  ├── leads (fra calculator)                                │
│  ├── coaching_clients (aktive klienter)                    │
│  ├── weekly_checkins (ugentlig tracking)                   │
│  ├── recipes (opskriftsdatabase)                           │
│  ├── recipe_ratings (1-5 stjerner)                         │
│  ├── user_saved_recipes (downloadede opskrifter)           │
│  ├── articles (blog/studies)                               │
│  ├── article_categories (Fasting, Keto, etc.)             │
│  ├── social_media_posts (genereret indhold)                │
│  ├── meal_plans (genererede madplaner)                     │
│  ├── email_history (alle sendte emails)                    │
│  └── crm_users (admin/coach roller)                        │
│                                                           │
│  Auth (Passwordless OTP via email)                         │
│  Storage (billeder, PDFs, opskrift-filer)                  │
│  Edge Functions (API logik, AI-kald, email)                │
│  Row Level Security (GDPR + adgangskontrol)                │
│  Realtime (live dashboard updates)                         │
└──────────────────────┬──────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  OpenAI  │ │  kie.ai  │ │ElevenLabs│
    │(madplan) │ │(video/   │ │  (TTS)   │
    │          │ │ billeder)│ │          │
    └──────────┘ └──────────┘ └──────────┘
```

### Hvorfor Supabase?

1. **Du har allerede en konto** — ingen ny opsætning nødvendig
2. **PostgreSQL** — skalerbar og robust (vs. SQLite der er single-file)
3. **Indbygget Auth** — passwordless OTP login klar ud af boksen
4. **Storage** — til billeder, PDFs, komprimerede uploads
5. **Row Level Security** — GDPR compliance på databaseniveau
6. **Edge Functions** — serverless API endpoints (ingen Node.js server nødvendig)
7. **Gratis tier** — 50.000 monthly active users, 500MB database, 1GB storage
8. **Realtime** — live updates i CRM dashboard

### Hosting på one.com

React-appen bygges til statiske filer (`npm run build` → `/dist/`) som uploades til one.com via FTP. Al backend-logik kører i Supabase. One.com serverer kun HTML/CSS/JS.

---

## 3. Domæne & SEO Anbefaling

### Anbefaling: Ét domæne med sprogstier

```
ketofasting.com/da/       → Dansk (default for DK IP)
ketofasting.com/se/       → Svensk (default for SE IP)
ketofasting.com/en/       → Engelsk (default for alle andre)
```

**Fordele:**
- Ét domæne opbygger stærkere domain authority
- Nemmere at vedligeholde (én codebase, én deployment)
- `hreflang` tags fortæller Google hvilken version der passer til hvilket land
- Geo-redirect via browser `navigator.language` eller IP-lookup

**Social media:** Start med ét sæt konti (fx @ketofastinglife) og post indhold på alle 3 sprog med sprog-flag i caption. Når der er volumen nok (fase 3+), kan I splitte til landeopdelte konti.

---

## 4. Faseplan (MVP-først tilgang)

### FASE 1: Fundament (Uge 1-4)

**Mål:** Hjemmeside live med calculator, opskrifter, blog-struktur og brugerlogin.

#### 1.1 Supabase Setup
- [ ] Opret Supabase-projekt
- [ ] Design og opret database-skema (se afsnit 5)
- [ ] Migrér eksisterende SQLite-data til PostgreSQL
- [ ] Konfigurer Row Level Security policies
- [ ] Sæt Passwordless Auth op (magic link via email)

#### 1.2 React Frontend (baseret på Lovable-design)
- [ ] Initialisér nyt React + Vite + TypeScript projekt
- [ ] Implementér designsystemet fra DesignSpec.tsx (farver, fonts, spacing)
- [ ] Byg Layout-komponent (Navbar med sprogvælger + Footer)
- [ ] Implementér i18n (react-i18next) med DA/SE/EN
- [ ] Geo-detect sprog via `navigator.language`
- [ ] Responsive design (mobile-first)

#### 1.3 Keto Calculator (migrering)
- [ ] Port `calculator.js` + `index.html` til React-komponenter
- [ ] Forbind til Supabase (gem lead-data)
- [ ] Behold GPT-4 madplan-generering (via Supabase Edge Function)
- [ ] Email-afsendelse via Edge Function

#### 1.4 Brugerprofiler
- [ ] Passwordless login (email OTP — gyldigt i 10 min)
- [ ] Profiltyper:
  - **Website-profil (Light):** Oprettes manuelt — kun TDEE-beregning, gemte opskrifter, ratings
  - **Calculator-profil:** Oprettes automatisk ved brug af madplans-calculatoren
  - **Coaching-klient (Full):** Aktiveres fra CRM
- [ ] Lead-source tracking: `source = 'calculator' | 'website_signup' | 'manual'`
- [ ] Profilside med brugerens info, TDEE, gemte opskrifter (rangeret efter rating)

#### 1.5 Basale Sider
- [ ] Homepage (Hero, Featured, About, Footer — fra Lovable design)
- [ ] Login-side
- [ ] Profil-side

**Leverance:** Live hjemmeside med calculator + login + profiler.

---

### FASE 2: Indhold & Opskrifter (Uge 5-8)

**Mål:** Opskriftsdatabase og blog/studies sektion live.

#### 2.1 Opskriftsdatabase
- [ ] Database: `recipes` tabel med felter for titel, beskrivelse, ingredienser, instruktioner, næringsværdier (kalorier, protein, fedt, kulhydrater), billede, kategori-tags, sprog, tilberedningstid, sværhedsgrad
- [ ] Opskrift-listeside med søgning, filtrering (kategori, tid, kalorier)
- [ ] Opskrift-detaljeside med fuld opskrift
- [ ] **TDEE-personalisering:** Hvis bruger er logget ind, vis portionsstørrelse tilpasset deres TDEE
- [ ] Download opskrift som PDF
- [ ] Send opskrift på email
- [ ] Gem opskrift til profil
- [ ] Rating-system (1-5 stjerner) — data tilbage til database
- [ ] Profilside: Gemte opskrifter rangeret efter brugerens egne ratings

#### 2.2 Blog/Studies Sektion
- [ ] Database: `articles` tabel med titel, indhold, kategori, sprog, SEO-metadata, publiceringsdato, status (draft/published)
- [ ] Kategorier: "Fasting" og "Keto" (med tags)
- [ ] Artikellisteside med kategorifilter
- [ ] Artikeldetaljeside med læsevenligt layout
- [ ] Link til original kilde-artikel
- [ ] Multi-sprog support (vælg publiceringsland per artikel)

#### 2.3 WYSIWYG Editor (Admin)
- [ ] TipTap editor integreret i admin-panel
- [ ] 2 skabeloner: Blog/Studies og Madopskrifter
- [ ] Billedhåndtering med automatisk komprimering (Sharp.js: WebP, max 1200px bred, ~80% kvalitet)
- [ ] Vælg publiceringsland (DK/SE/EN — multi-select)
- [ ] Auto-generér SEO (meta title, description, Open Graph)
- [ ] Kategori-tildeling
- [ ] Draft/Published workflow

**Leverance:** Komplet indholdsplatform med opskrifter + blog.

---

### FASE 3: CRM Upgrade (Uge 9-12)

**Mål:** CRM migreret til Supabase med rollebaseret adgang og analytics.

#### 3.1 CRM Brugerroller
- [ ] **Light:** Kan se egne leads, basale handlinger
- [ ] **Medium:** Kan se alle leads, redigere, sende emails, generere madplaner
- [ ] **Admin:** Fuld adgang + brugeradministration + indstillinger
- [ ] Rollebaseret UI (skjul/vis elementer baseret på rolle)

#### 3.2 Data & Analytics Dashboard
- [ ] Ugentlig/månedlig analyse per klient:
  - Vægttab fra start (kg + %)
  - Humør-trend (graf over tid)
  - Energi-trend
  - Søvnkvalitet-trend
  - Compliance rate (check-in completion)
- [ ] Aggregerede KPIs:
  - Gns. vægttab per klient
  - Mest populære opskrifter
  - Lead conversion rate
  - Check-in completion rate

#### 3.3 Forbedret Check-in
- [ ] Tilføj nye datapunkter: mave-omfang, body fat %, billede-upload (progress fotos)
- [ ] Automatiske grafer: vægt over tid, humør over tid
- [ ] Email-påmindelser (allerede bygget — migreres)

#### 3.4 GDPR Compliance
- [ ] Cookie consent banner på hjemmesiden
- [ ] Privacy policy + Terms of Service sider (DA/SE/EN)
- [ ] "Slet min data" funktion i brugerprofil
- [ ] Data export (download alle mine data som JSON/CSV)
- [ ] Opt-in for marketing emails
- [ ] Data retention policy (automatisk sletning efter X måneder uden aktivitet)
- [ ] Supabase RLS sikrer at brugere kun ser egne data

**Leverance:** Professionelt CRM med analytics og fuld GDPR compliance.

---

### FASE 4: AI Content Pipeline (Uge 13-18)

**Mål:** Automatiseret indholdsproduktion fra videnskabelige artikler til social media.

#### 4.1 Artikel-til-Hjemmeside Pipeline
Flow:
```
1. Indsæt link til videnskabelig artikel
2. AI analyserer artiklen (Claude API)
3. Genererer ny side:
   - Forenklet forklaring på "normalt dansk/svensk/engelsk"
   - SEO-optimeret titel + meta tags
   - Nøglepunkter/takeaways
   - Link til original artikel
4. Review + publicér
```

#### 4.2 Social Media Content Generator
Flow (efter artikel er publiceret):
```
1. "Vil du lave opslag til sociale medier?" → Ja
2. AI genererer forslag til:
   - Instagram: Billede-prompt (Nano Banana Pro) + caption + hashtags
   - TikTok/YouTube Shorts: Video-prompt (Kling 3.0/VEO 3.1) + script
   - Facebook: Post-tekst + billede
3. Foruddefinerede profiler:
   - Font/stil til tekst-overlays
   - ElevenLabs stemme-ID
   - Nano Banana Pro standard-prompt (stil, farver, stemning)
   - Brand-guidelines (logo placering, farver)
4. Generér assets via kie.ai API
5. Review + planlæg publicering
```

#### 4.3 Planlægning & Publicering
- [ ] Content calendar (planlæg opslag på dato/tid)
- [ ] Multi-platform publicering
- [ ] Google UTM tags på alle links
- [ ] Statistik feedback til CRM (engagement, clicks, reach)

**Leverance:** AI-drevet content pipeline fra forskning til social media.

---

### FASE 5: App-forberedelse & Skalering (Uge 19+)

**Mål:** Forbered data og API til fremtidig app.

#### 5.1 API-standardisering
- [ ] RESTful API dokumentation (OpenAPI/Swagger)
- [ ] Alle endpoints versioneret (`/api/v1/...`)
- [ ] JWT tokens til app-autentificering
- [ ] Rate limiting

#### 5.2 App-datamodel
- [ ] Profildata klar til sync med app
- [ ] Push notifications setup (for check-in reminders)
- [ ] Offline-support overvejelser

#### 5.3 Avancerede Features
- [ ] Opskrift-variationer baseret på AI
- [ ] Shopping list export
- [ ] Meal prep planlægger
- [ ] Community features (kommentarer på opskrifter)

---

## 5. Database-skema (Supabase/PostgreSQL)

### Kernetabeller

```sql
-- Brugerprofiler (alle typer)
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    source TEXT NOT NULL DEFAULT 'website_signup',
        -- 'calculator', 'website_signup', 'manual', 'coaching'
    profile_type TEXT NOT NULL DEFAULT 'light',
        -- 'light', 'calculator', 'coaching'
    language TEXT DEFAULT 'da',

    -- Personlige data
    gender TEXT,
    age INTEGER,
    weight REAL,
    height REAL,
    activity_level TEXT,

    -- Beregnede værdier
    bmr INTEGER,
    tdee INTEGER,
    daily_calories INTEGER,
    weight_goal REAL,

    -- Præferencer
    diet_type TEXT,
    fasting_protocol TEXT,
    excluded_ingredients JSONB DEFAULT '[]',
    selected_ingredients JSONB DEFAULT '[]',

    -- GDPR
    gdpr_consent BOOLEAN DEFAULT false,
    marketing_consent BOOLEAN DEFAULT false,

    -- Metadata
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opskrifter
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title JSONB NOT NULL,          -- {"da": "...", "se": "...", "en": "..."}
    description JSONB NOT NULL,
    ingredients JSONB NOT NULL,     -- Array med ingredienser + mængder
    instructions JSONB NOT NULL,    -- Step-by-step

    -- Næringsværdier (per portion)
    calories INTEGER,
    protein REAL,
    fat REAL,
    carbs REAL,
    fiber REAL,

    -- Metadata
    prep_time INTEGER,              -- minutter
    cook_time INTEGER,
    servings INTEGER DEFAULT 1,
    difficulty TEXT,                 -- 'easy', 'medium', 'hard'
    image_url TEXT,

    -- Kategorisering
    categories TEXT[] DEFAULT '{}', -- {'keto', 'fasting', 'breakfast'}
    tags TEXT[] DEFAULT '{}',

    -- Publicering
    published_countries TEXT[] DEFAULT '{da,se,en}',
    status TEXT DEFAULT 'draft',

    -- SEO
    seo_title JSONB,
    seo_description JSONB,

    created_by UUID REFERENCES crm_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Opskrift-ratings
CREATE TABLE recipe_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, recipe_id)
);

-- Gemte opskrifter
CREATE TABLE user_saved_recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    downloaded_at TIMESTAMPTZ,
    emailed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(profile_id, recipe_id)
);

-- Artikler/Studies
CREATE TABLE articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE NOT NULL,
    title JSONB NOT NULL,
    content JSONB NOT NULL,           -- Rich text (HTML)
    summary JSONB,                     -- Kort forklaring

    -- Kilde
    source_url TEXT,                   -- Link til original artikel
    source_title TEXT,

    -- Kategorisering
    category TEXT NOT NULL,            -- 'fasting', 'keto'
    tags TEXT[] DEFAULT '{}',

    -- Publicering
    published_countries TEXT[] DEFAULT '{da,se,en}',
    status TEXT DEFAULT 'draft',
    published_at TIMESTAMPTZ,

    -- SEO
    seo_title JSONB,
    seo_description JSONB,
    featured_image TEXT,

    created_by UUID REFERENCES crm_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Social media posts
CREATE TABLE social_media_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES articles(id),
    recipe_id UUID REFERENCES recipes(id),

    platform TEXT NOT NULL,            -- 'instagram', 'tiktok', 'facebook', 'youtube'
    language TEXT NOT NULL,

    caption TEXT,
    image_url TEXT,
    video_url TEXT,
    audio_url TEXT,

    -- Prompts brugt til generering
    image_prompt TEXT,
    video_prompt TEXT,

    -- Planlægning
    scheduled_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    status TEXT DEFAULT 'draft',

    -- Analytics
    utm_url TEXT,
    engagement_data JSONB,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CRM Brugere (admin/coach roller)
CREATE TABLE crm_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'light',  -- 'light', 'medium', 'admin'
    language TEXT DEFAULT 'da',
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- (Eksisterende tabeller migreres: coaching_clients, weekly_checkins,
--  generated_meal_plans, email_history, lead_notes, notes)
```

---

## 6. Sikkerhed & GDPR

### Sikkerhed
- **Supabase Auth** med passwordless OTP (magic links)
- **Row Level Security (RLS):** Brugere kan KUN se egne data
- **CRM-adgang:** Separate roller med policy-baseret adgang
- **HTTPS** overalt (one.com + Supabase)
- **API-nøgler** i Supabase secrets (aldrig i frontend-kode)
- **Billedkomprimering** server-side for at undgå malicious uploads
- **Content Security Policy** headers

### GDPR
- Cookie consent (kun nødvendige cookies som default)
- Privacy Policy på alle 3 sprog
- "Ret til at blive glemt" — slet alle data med ét klik
- Data export — download alt som JSON
- Opt-in for marketing (aldrig pre-checked)
- Data Processing Agreement via Supabase
- Log over alle data-behandlinger

---

## 7. Tidsestimat & Prioritering

| Fase | Varighed | Beskrivelse |
|------|----------|-------------|
| **Fase 1** | 4 uger | Fundament: Supabase + React + Calculator + Profiler |
| **Fase 2** | 4 uger | Indhold: Opskrifter + Blog + WYSIWYG Editor |
| **Fase 3** | 4 uger | CRM: Roller + Analytics + GDPR |
| **Fase 4** | 6 uger | AI Pipeline: Artikel → Social Media |
| **Fase 5** | Løbende | App-forberedelse & skalering |

**Total til MVP (Fase 1-2): ~8 uger**
**Total til fuld platform (Fase 1-4): ~18 uger**

---

## 8. Løbende Omkostninger (estimat)

| Service | Pris/måned | Noter |
|---------|-----------|-------|
| one.com | ~50 kr | Eksisterende hosting |
| Supabase Free | 0 kr | Op til 50.000 MAU |
| OpenAI API | ~20-200 kr | Afhængig af forbrug |
| kie.ai | Variabel | Video/billede generering |
| ElevenLabs | ~80 kr+ | TTS til videoer |
| Domæne | ~10 kr | Årlig omkostning |
| **Total** | **~160-340 kr/md** | Skalerer med forbrug |

---

## 9. Næste Skridt

### Start i dag:
1. **Godkend denne plan** — giv feedback, stil spørgsmål
2. **Vælg domænenavn** — skal registreres
3. **Del Supabase projektinfo** — så vi kan begynde setup

### Første arbejdsuge:
1. Opret Supabase database-skema
2. Sæt React-projekt op med Lovable-designet
3. Implementér Navbar + Footer + sprogvælger
4. Port Keto Calculator til React
5. Forbind til Supabase Auth + Database

---

*Denne plan er et levende dokument og vil blive opdateret løbende.*
