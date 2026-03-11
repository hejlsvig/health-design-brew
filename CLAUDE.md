# Shifting Source — Projektinstruktioner

## Ejerskab & Vision
Ejer: Anders Hejlsvig (hejlsvig@gmail.com)
Platform: Shifting Source — Keto & Fasting Lifestyle Platform
Domæne: shiftingsource.com
Mål: Bygge en skalerbar, modulær platform der kan kopieres, tilpasses og sælges til andre.

---

## Arkitektur-principper

### 1. Tænk altid skalerbart og modulært
Alt vi bygger skal kunne løsnes fra Shifting Source og genbruges i andre projekter.
Vi bygger ikke bare en hjemmeside — vi bygger en platform med kopierbare moduler.
Spørg dig selv ved hver feature: "Kan dette bruges af en anden platform uden ændringer?"

### 2. Modul-arkitektur
Hvert feature-område skal struktureres som et selvstændigt modul:

```
modules/[modul-navn]/
  ├── migrations/          # SQL migrations for modulets tabeller
  ├── components/          # React-komponenter
  ├── lib/                 # Utility-funktioner, hooks, helpers
  ├── edge-functions/      # Supabase Edge Functions (hvis relevant)
  ├── config.ts            # Modulets konfigurations-interface
  ├── README.md            # Dokumentation: hvad det gør, hvordan det installeres
  └── index.ts             # Eksport af modulets public API
```

Eksempler på moduler:
- **social-publisher** — OAuth, post-oprettelse, scheduling, analytics
- **crm** — Kontakter, pipeline, tags, aktivitetslog
- **health-check** — Automatisk sundhedstjek med email-notifikation
- **newsletter** — Signup, rate limiting, email-integration
- **ai-content** — Artikelgenerering, billedgenerering, chat-assistent
- **seo-toolkit** — Meta-tags, sitemap, robots.txt, JSON-LD, GA4
- **calculator** — TDEE/BMR-beregner, makro-fordeling, kostplanlægger

### 3. Ingen hardcoding — alt er konfigurerbart
- Alle indstillinger i `admin_settings`-tabellen (key-value store)
- Farver, fonte, logo → Tailwind CSS-variabler + admin UI
- API-nøgler, domæner, feature-flags → database-drevet
- Tekster → i18n (da/en/se) med fallback
- Sundhedstjek verificerer at config er korrekt
- Sikkerhedsindstillinger (rate limit, CSP, headers) → database + AdminSettings UI

### 4. Database-konventioner
- Alle tabeller: RLS aktiveret med `is_admin()` policies
- Alle moduler: egne migrations med `ON CONFLICT DO NOTHING` for idempotens
- Settings: brug `admin_settings` med prefix per modul (f.eks. `social_publisher_`, `crm_`)
- Audit/log: brug `consent_log` til GDPR-relevant aktivitet
- Timestamps: `created_at` + `updated_at` med auto-trigger
- UUID primary keys via `gen_random_uuid()`

### 5. White-label-parathed
Når en kunde vil have en kopi af platformen:
1. Fork repo → nyt Supabase-projekt
2. Kør alle migrations i rækkefølge (001-010, automatisk opsætning)
3. Tilpas tema (6-8 CSS-variabler i tailwind.config + logo)
4. Konfigurer admin_settings (domæne, API-nøgler, tekster)
5. Opdater .env med nyt Supabase-projekt
6. Deploy via CI/CD → færdig

Intet i koden skal referere specifikt til "Shifting Source", "keto" eller domænet
undtagen i admin_settings-værdier og i18n-tekstfiler.

### 6. Modul-integration
Når et modul integreres i en ny platform:
- Modulet skal have et klart `config`-interface (domæne, API-nøgler, tema)
- Modulet importerer IKKE direkte fra platform-specifikke filer
- I stedet bruger modulet dependency injection eller config-objekter
- Modulets components accepterer tema/styling via props eller CSS-variabler
- Modulet medbringer sine egne i18n-nøgler

---

## Projektstruktur

```
CRM_Web/
├── CLAUDE.md                          # <-- Denne fil (projektinstruktioner)
├── .github/
│   ├── workflows/deploy-website.yml   # CI/CD: build + FTP deploy til one.com
│   └── dependabot.yml                 # Automatisk dependency scanning
│
├── website-react/                     # ═══ HOVEDAPP (React 19 + TypeScript) ═══
│   ├── src/
│   │   ├── App.tsx                    # Router + lazy-loaded pages
│   │   ├── main.tsx                   # Entry point
│   │   ├── index.css                  # Tailwind + brand-variabler
│   │   ├── pages/                     # 25 sider (public + admin)
│   │   ├── components/                # 12+ genbrugbare komponenter
│   │   ├── components/ui/             # Shadcn UI base-komponenter
│   │   ├── contexts/                  # AuthContext, CookieConsentContext
│   │   ├── hooks/                     # Custom React hooks
│   │   ├── lib/                       # 15 utility-moduler
│   │   └── i18n/                      # Oversættelser (da/en/se)
│   │       └── locales/               # da.json, en.json, se.json (~29KB hver)
│   ├── public/
│   │   ├── .htaccess                  # Security headers, CSP, caching, SPA fallback
│   │   ├── robots.txt                 # Søgemaskine-regler
│   │   └── images/                    # Statiske billeder
│   ├── supabase/migrations/           # 10 SQL-migreringer (001-010)
│   ├── vite.config.ts                 # Build: chunk splitting, proxy
│   ├── tailwind.config.ts             # Tema: farver, fonte, animationer
│   ├── tsconfig.json                  # TypeScript config
│   └── package.json                   # React 19, Vite 6, Supabase, i18next, Tiptap
│
├── Keto_Calculator_Project/
│   ├── supabase/functions/            # ═══ EDGE FUNCTIONS (Deno) ═══
│   │   ├── _shared/cors.ts            # Delte CORS headers
│   │   ├── generate-mealplan/         # OpenAI proxy for kostplaner
│   │   ├── health-check/              # Dagligt sundhedstjek (11 checks)
│   │   ├── social-publisher/          # OAuth flows (Meta, Google, TikTok)
│   │   └── run-checkin-flow/          # Coach check-in reminders
│   ├── backend/                       # Express.js server (email, legacy API)
│   │   ├── server.js                  # Hoved-server (CORS, sessions, routes)
│   │   ├── emailService.js            # Nodemailer integration
│   │   ├── mealPlanGenerator.js       # Kostplan-generator (OpenAI)
│   │   └── .env.example               # Backend environment template
│   ├── crm/                           # ⚠️ LEGACY: Statisk HTML CRM
│   │   ├── admin.html, login.html...  # Gammelt CRM (erstattes gradvist)
│   │   ├── supabase-api.js            # Supabase-integration (35KB)
│   │   └── crm-theme.css              # CRM styling
│   └── translations/                  # Backend-oversættelser
│
└── Sikkerhedsaudit_Shifting_Source.docx  # Seneste sikkerhedsaudit
```

---

## Database-schema (Supabase PostgreSQL)

### Kernetabeller
| Tabel | Formål | Migration |
|-------|--------|-----------|
| `profiles` | Alle brugere (light, calculator, coaching) med TDEE/BMR, kost-præferencer, GDPR | 001 |
| `recipes` | Opskrifter med multi-sprog JSONB (da/en/se), nutrition, kategorier | 001 |
| `articles` | Blog-artikler og guides med multi-kategori | 001, 002, 005 |
| `admin_settings` | Central key-value config store — SEO, API-nøgler, sikkerhed | 003 |
| `page_sections` | CMS-drevet homepage (hero, about, featured, etc.) | 004 |
| `user_favorites` | Bruger-favoritter for opskrifter | 004 |

### CRM & GDPR
| Tabel | Formål | Migration |
|-------|--------|-----------|
| `consent_log` | GDPR audit trail (samtykke, login-fejl, etc.) | 006 |
| `newsletter_subscribers` | Email-signups (ikke-auth brugere) | 006 |
| `lead_status` | CRM pipeline (status, interesseret_i, næste_kontakt) | 006 |

### Sikkerhed & Overvågning
| Tabel | Formål | Migration |
|-------|--------|-----------|
| `health_checks` | Resultater fra dagligt sundhedstjek (11 checks) | 009 |

### Vigtige funktioner
- `is_admin()` — Tjekker om bruger er admin (bruges i RLS policies)
- `check_rls_status()` — Returnerer RLS-status for alle tabeller
- Auto-trigger: `updated_at` opdateres automatisk ved ændringer

### admin_settings nøgler (aktuelt ~30+)
SEO: `site_url`, `site_name`, `seo_default_description`, `seo_google_verification`, `ga_measurement_id`, `seo_robots_disallow`
Sikkerhed: `security_frame_options`, `security_referrer_policy`, `rate_limit_max_requests`, `rate_limit_window_seconds`, `csp_extra_domains`
Health: `health_check_enabled`, `admin_notification_email`
AI: `openai_api_key`, `ai_model`, `kieai_api_key`
Prompts: `chat_system_prompt_da/en/se`, `article_system_prompt`, `image_generation_prompt`
Video: `video_prompt_article`, `video_prompt_recipe`
Social: `social_instagram`, `social_youtube`, `social_tiktok`, `social_facebook`
Hosting: `ftp_host`, `ftp_username`, `ftp_password`
Mealplan: `mealplan_openai_api_key`, `mealplan_ai_model`, `mealplan_smtp_host/port/user/password`, `mealplan_smtp_from_email/from_name`, `mealplan_system_prompt`

---

## Routes (React Router)

### Offentlige sider
| Route | Komponent | Formål |
|-------|-----------|--------|
| `/` | Home | Forside (CMS-drevet via page_sections) |
| `/calculator` | Calculator | Keto-beregner med TDEE/BMR/makroer |
| `/recipes` | Recipes | Opskriftsliste med filtre |
| `/blog` | Blog | Blog-oversigt |
| `/blog/:slug` | BlogPost | Enkelt blogindlæg |
| `/guides` | Guides | Guides og forskningsartikler |
| `/guides/:slug` | GuidePost | Enkelt guide |
| `/about` | About | Om-side (CMS-redigerbar) |
| `/privacy` | Privacy | Privatlivspolitik (CMS-redigerbar) |
| `/terms` | Terms | Servicevilkår (CMS-redigerbar) |
| `/login` | Login | Dual auth: Magic Link + password login |
| `/profile` | Profile | Brugerprofil |
| `*` | NotFound | 404-side |

### Admin-sider (lazy-loaded, kræver isAdmin)
| Route | Komponent | Formål |
|-------|-----------|--------|
| `/admin` | AdminDashboard | Overblik |
| `/admin/blog` | AdminBlog | Blog CRUD med Tiptap editor |
| `/admin/recipes` | AdminRecipes | Opskrift CRUD |
| `/admin/guides` | AdminGuides | Guide CRUD |
| `/admin/about` | AdminAbout | Om-side editor |
| `/admin/privacy` | AdminPrivacy | Privatlivspolitik editor |
| `/admin/terms` | AdminTerms | Servicevilkår editor |
| `/admin/homepage` | AdminHomepage | Homepage sections editor |
| `/admin/users` | AdminUsers | Brugeradministration |
| `/admin/settings` | AdminSettings | Alle indstillinger (4 tabs) |
| `/admin/social-publisher` | AdminSocialPublisher | Social media OAuth + posting |
| `/admin/crm` | AdminCRM | CRM lead-liste |
| `/admin/crm/:userId` | AdminCRMDetail | CRM lead-detaljevisning |

---

## Edge Functions (Supabase/Deno)

### I `website-react/supabase/functions/` (nyere)
| Funktion | Formål | Secrets |
|----------|--------|---------|
| `proxy-kieai` | Proxyer Kie.ai Nanobanana Pro API (billedgenerering) | Via `admin_settings` |
| `proxy-image` | Downloader AI-billeder server-side (CORS workaround) | — |
| `upload-image-ftp` | Uploader billeder til one.com via FTP | Via `admin_settings` (ftp_*) |

### I `Keto_Calculator_Project/supabase/functions/` (ældre)
| Funktion | Formål | Secrets |
|----------|--------|---------|
| `generate-mealplan` | Proxyer OpenAI kald server-side (API key aldrig i browser) | `OPENAI_API_KEY` |
| `health-check` | 11 automatiske sikkerhedstjek + email-notifikation | `RESEND_API_KEY`, `FROM_EMAIL` |
| `social-publisher` | OAuth2 flows for Meta, Google, TikTok | `META_APP_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `TIKTOK_CLIENT_KEY/SECRET` |
| `run-checkin-flow` | Coach check-in reminder workflow | — |

---

## Environment Variables

### Frontend (.env)
```
VITE_SUPABASE_URL=https://hllprmlkuchhfmexzpad.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbG...
VITE_SITE_URL=http://localhost:5173    # (optional, til dev)
```

### Backend (.env)
```
OPENAI_API_KEY=sk-...
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_PASSWORD=...
NODE_ENV=production
SESSION_SECRET=...                      # VIGTIGT: Skift i produktion!
CORS_ALLOWED_ORIGINS=https://shiftingsource.com,https://www.shiftingsource.com
```

### Supabase Edge Function Secrets
```
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  # Auto-injected af Supabase
OPENAI_API_KEY, RESEND_API_KEY, FROM_EMAIL
META_APP_ID, META_APP_SECRET
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET
```

### CI/CD Secrets (GitHub Actions)
```
FTP_HOST, FTP_USERNAME, FTP_PASSWORD     # one.com FTP
VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

---

## Deployment

### Nuværende strategi
Vi arbejder direkte i GitHub og deployer til produktion via CI/CD.
Når sitet er live på one.com med rigtige brugere, opretter vi et staging-miljø
(`staging.shiftingsource.com` + separat Supabase-projekt) til test af ændringer.

### Frontend (website-react)
1. Push til `main` branch (ændringer i `website-react/**`)
2. GitHub Actions: `npm audit` → `tsc` type-check → `npm run build`
3. FTP deploy til one.com `/www/` via `FTP-Deploy-Action@v4.3.5`
4. `.htaccess` håndterer: HTTPS redirect, security headers, caching, SPA fallback

### Edge Functions
Deployes via Supabase MCP-connector (foretrukket) eller manuelt via CLI:
```bash
supabase functions deploy health-check
supabase functions deploy generate-mealplan
supabase functions deploy social-publisher
supabase functions deploy upload-image-ftp
```

### Database-migrationer
Køres via Supabase MCP-connector (foretrukket) eller manuelt i Supabase SQL Editor.
Rækkefølge: 001 → 027. Alle migrations er idempotente (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`).

---

## Arbejdsfordeling (Claude vs. Anders)

### Claude kører selv (via MCP-connectors og VM):
- **Database-migrationer** — Kør direkte via Supabase MCP (`apply_migration`)
- **Edge Function deploy** — Deploy via Supabase MCP (`deploy_edge_function`)
- **SQL-forespørgsler** — Kør queries og verificer data via Supabase MCP (`execute_sql`)
- **Kode-ændringer** — Skriv, rediger og commit kode i VM'en
- **Build-verifikation** — Kør `tsc` og `npm run build` for at sikre 0 fejl
- **Advisors/sikkerhedstjek** — Kør `get_advisors` efter DDL-ændringer

### Anders kører selv:
- **`git push`** — VM'en har ingen GitHub-autentificering. Anders' repo-sti: `cd /Users/andershejlsvig/Desktop/Bog\ /CRM_Web && git push`
- **Browser-test** — Visuelt tjek af ændringer på shiftingsource.com
- **Supabase CLI secrets** — `supabase secrets set ...` (kræver lokal CLI + auth)
- **Google Search Console / GA verificering** — Log ind og verificer i Googles dashboards

### Princip: Claude gør alt hvad Claude kan — resten instrueres til Anders.

---

## Legacy CRM (planlagt udfasning)

Der eksisterer et ældre statisk HTML/JS-baseret CRM i `Keto_Calculator_Project/crm/`.
Det deler Supabase-database med React-appen og serveres via Vite proxy i dev.

**Status:** Gradvist erstattes af React admin-sider (`/admin/crm`, `/admin/users`).
**Plan:** Flyt al CRM-funktionalitet til React-moduler og fjern legacy HTML-filerne.
**Undgå:** Byg ikke nye features i det gamle CRM — alt nyt bygges i React.

---

## Tech Stack (detaljeret)

### Frontend
- **React 19** + **TypeScript 5.7** + **Vite 6**
- **Tailwind CSS 3.4** med custom tema (charcoal, sage, accent amber)
- **Shadcn UI** (Radix primitives) til base-komponenter
- **React Router 7** (file-based routing-stil)
- **i18next** + browser-detection (da/en/se)
- **Tiptap** rich text editor til blog/article CRUD
- **Supabase JS 2.49** (auth, database, realtime)

### Backend & Database
- **Supabase** PostgreSQL med RLS + Edge Functions (Deno)
- **Express.js 5.2** (legacy backend: email, meal plans)
- **SQLite** (legacy, kun til gamle kostplaner)

### AI & Integrationer
- **OpenAI** GPT-5.2/4.1 (artikler, chat, kostplaner)
- **Kie.ai / Nanobanana Pro** (billedgenerering)
- **Resend API** (email-notifikationer)
- **Nodemailer** (backend email)
- **Meta/Google/TikTok OAuth** (social publisher)

### Design System
- **Baggrund:** Charcoal (#1a1a1a area), sage greens
- **Accent:** Amber (#D97706) — CTA, links, highlights
- **Overskrifter:** DM Serif Display (serif)
- **Brødtekst:** Nunito Sans (sans-serif)
- **Dekorativ:** Dancing Script (håndskrift til taglines)
- **Dark mode:** Understøttet (class-based)

### Hosting & CI/CD
- **one.com** — Apache hosting med FTP deploy
- **GitHub Actions** — Auto-build + deploy ved push til main
- **Dependabot** — Ugentlig vulnerability scanning (npm + github-actions)
- **Supabase Cloud** — Database, auth, edge functions, storage

---

## Kodekvalitet & Regler

### Før vi skriver kode
- Læs relevante filer først — forstå eksisterende mønstre
- Følg eksisterende navngivnings- og strukturkonventioner
- Tjek om en lignende feature allerede er implementeret

### Under udvikling
- TypeScript strict mode — ingen `any` medmindre nødvendigt
- Alle nye settings → `admin_settings` tabel + AdminSettings UI med hjælpetekst
- Alle nye tabeller → RLS aktiveret med `is_admin()` policies
- Alle nye features → tilføj health check verification
- Alle nye tekster → i18n-nøgler i alle 3 sprog (da/en/se)
- Brug `getSettings()` til at læse config — aldrig hardcode værdier

### Før vi er færdige
- Build SKAL være 0 fejl (`npm run build`)
- Test i browser — visuelt + konsol (0 fejl)
- Kør health check for at verificere nye features
- Opdater CLAUDE.md hvis projektstruktur ændres væsentligt

### Git-konventioner
- Commit-beskeder: kort, præcist, på engelsk
- Aldrig push secrets eller .env-filer
- CI/CD kører automatisk ved push til main

---

## Sprog & Kommunikation
- **Kode, comments, git commits:** Engelsk
- **UI og hjælpetekster:** Dansk (primær), Engelsk, Svensk via i18n
- **Admin UI labels:** Dansk (da er primærsprog for admin)
- **Kommunikation med Anders:** Dansk
- **Dokumentation (CLAUDE.md, README):** Dansk

---

## Aktuel modul-status

| Modul | Status | Lokation | Modulær? |
|-------|--------|----------|----------|
| CMS (blog, guides, opskrifter) | ✅ Komplet | `pages/Admin*`, `lib/openai.ts` | ⚠️ Tæt koblet |
| SEO toolkit | ✅ Komplet | `lib/seo.ts`, `lib/analytics.ts` | ⚠️ Tæt koblet |
| Health Check | ✅ Komplet | `functions/health-check/` | ✅ Selvstændigt |
| CRM | ✅ Basis | `pages/AdminCRM*`, `lib/crm.ts` | ⚠️ Tæt koblet |
| Social Publisher | 🔧 Under opbygning | `pages/AdminSocialPublisher`, `lib/socialPublisher.ts` | ⚠️ Tæt koblet |
| Newsletter | ✅ Basis | `NewsletterSignup.tsx`, migration 006 | ⚠️ Tæt koblet |
| AI Content | ✅ Komplet | `lib/chatai.ts`, `lib/kieai.ts`, `lib/openai.ts` | ⚠️ Tæt koblet |
| Calculator | ✅ Komplet | `pages/Calculator.tsx`, `lib/calculator.ts` | ⚠️ Tæt koblet |
| Meal Plan Generator | ✅ Komplet | `pages/MealPlan.tsx`, `functions/generate-mealplan/` | ⚠️ Tæt koblet |
| Auth | ✅ Komplet | `contexts/AuthContext.tsx` | ⚠️ Core platform |
| Image Upload (FTP) | ✅ Komplet | `functions/upload-image-ftp/`, `AiImageGenerator.tsx` | ✅ Selvstændigt |

**Næste skridt:** Når Social Publisher er færdigbygget, refaktorér det som det første ægte modul med sin egen mappestruktur. Brug det som template for at modularisere resten.

### Seneste ændringer (marts 2026)
- **Kostplan-generator (MealPlan)**: Fuldt flow — Calculator → MealPlan → OpenAI generering → PDF → SFTP upload → Email afsendelse. Virker uden login. Logget-ind brugere får profil-data auto-udfyldt og gemt.
- **Separat mealplan SMTP**: Egen SMTP-konto til kostplan-emails (`meal@shiftingsource.com`). Konfigureres i Admin → Settings → AI & Indhold → Kostplan AI → Kostplan Email (SMTP).
- **Separat mealplan AI**: Valgfri separat OpenAI API-nøgle og model til kostplaner. Fallback til generel AI-config.
- **SMTP erstatter Resend**: Al email sendes nu via SMTP (one.com) i stedet for Resend API. Konfigureres i Admin → Settings → Hosting & Email.
- **Kun GPT 5.x modeller**: Fjernet GPT-4.1 og o4-mini. Default fallback er `gpt-5.2-chat-latest`.
- **Edge Function auth valgfrit**: `generate-mealplan` deployes med `--no-verify-jwt`. Auth er valgfrit — logget-ind brugere får profil+CRM gemt.
- **Dual auth**: Login understøtter nu Magic Link + password. Profil-siden har "Opret adgangskode"-sektion.
- **CRM tilgængelig**: AdminDashboard linker korrekt til `/admin/crm`. CRM-ikon i navbar for admins.
- **FTP image upload**: Ny Edge Function `upload-image-ftp` — AI-genererede billeder uploades direkte til one.com via FTP.
- **PubMed-artikler**: 3 forskningsartikler tilføjet (anti-inflammatorisk kost, metabolisk skift, kunstige sødestoffer).

### Kostplan-generator detaljer
- **Frontend**: `pages/MealPlan.tsx` — 4-steps wizard (måltider → ingredienser → dage → opsummering+email)
- **Edge Function**: `functions/generate-mealplan/index.ts` — OpenAI → markdown → HTML → PDF (via html2pdf.app) → SFTP upload → Email (SMTP)
- **Admin settings** (alle i `admin_settings` tabel):
  - `mealplan_openai_api_key`, `mealplan_ai_model` — separat AI config
  - `mealplan_smtp_host/port/user/password` — separat SMTP-konto
  - `mealplan_smtp_from_email/from_name` — afsender-info
  - `mealplan_system_prompt` — tilpasset system prompt
- **Migrationer**: 020 (mealplan fields), 021 (SMTP settings), 022 (mealplan SMTP)
- **Planlagt**: Rate limiting (5 generationer/uge for ikke-klienter), CRM-integration (coach-specifik afsender)

---

## Kendte begrænsninger & teknisk gæld

1. **Legacy CRM** — Statisk HTML i `/crm/` deler database men har ikke React-integration
2. **Modularitet** — De fleste features er funktionelt selvstændige men ikke strukturelt adskilt i mapper endnu
3. **CSP via .htaccess** — Kræver manuelt redeploy ved ændring (kan ikke opdateres dynamisk)
4. **Backend** — Express.js serveren bruges primært til email og legacy API; de fleste nye features bruger Edge Functions
5. **Manglende tests** — Ingen unit tests endnu; health check er eneste automatiserede QA
6. **Staging miljø** — Alt deployes direkte til produktion; ingen staging
7. **GDPR "Slet min konto"** — Implementeret i Profile.tsx (anonymiserer profil + sign out)

---

## Prioriteret roadmap

1. **Færdiggør Social Publisher** — OAuth, posting, scheduling, analytics
2. **Modularisér Social Publisher** — Første ægte modul med isoleret mappestruktur
3. **Brug modulet som template** til at refaktorere andre features
4. **Staging miljø** — Separat deploy-target for test
5. ~~**GDPR selvbetjening**~~ — ✅ Implementeret (Profile.tsx: eksporter data + slet konto)
6. **Unit tests** — Vitest for kritiske lib-funktioner
