# Shifting Shource — Setup Guide

## Trin 1: Installer dependencies

```bash
cd website-react
npm install
```

## Trin 2: Konfigurer Supabase

1. Kopier `.env.example` til `.env`:
   ```bash
   cp .env.example .env
   ```

2. Udfyld dine Supabase credentials i `.env`:
   ```
   VITE_SUPABASE_URL=https://dit-projekt.supabase.co
   VITE_SUPABASE_ANON_KEY=din-anon-key
   ```

3. Kør database-migrationen i Supabase:
   - Gå til **Supabase Dashboard → SQL Editor → New Query**
   - Kopiér indholdet af `supabase/migrations/001_initial_schema.sql`
   - Klik **Run**

4. Aktiver **Email OTP** i Supabase:
   - Gå til **Authentication → Providers → Email**
   - Slå "Enable Email provider" til
   - Slå "Enable Email OTP (Magic Link)" til
   - Sæt "OTP Expiry" til 600 sekunder (10 minutter)

## Trin 3: Start development server

```bash
npm run dev
```

Åbn http://localhost:5173 i din browser.

## Trin 4: Byg til produktion

```bash
npm run build
```

Upload indholdet af `/dist/` mappen til one.com via FTP.

## Projektstruktur

```
website-react/
├── public/                  # Statiske filer
├── src/
│   ├── components/          # React-komponenter
│   │   ├── Layout.tsx       # Wrapper med Navbar + Footer
│   │   ├── Navbar.tsx       # Top navigation med sprogvælger
│   │   └── Footer.tsx       # Bund med nyhedsbrev + links
│   ├── contexts/
│   │   └── AuthContext.tsx   # Supabase Auth state
│   ├── i18n/
│   │   ├── index.ts         # i18n konfiguration
│   │   └── locales/         # DA/SE/EN oversættelser
│   ├── lib/
│   │   ├── supabase.ts      # Supabase klient
│   │   └── utils.ts         # Hjælpefunktioner
│   ├── pages/               # Side-komponenter
│   │   ├── Home.tsx         # Forsiden
│   │   ├── Calculator.tsx   # Keto-kalkulator
│   │   ├── Recipes.tsx      # Opskrifter (Fase 2)
│   │   ├── Blog.tsx         # Studies/Blog (Fase 2)
│   │   ├── Login.tsx        # Passwordless login
│   │   └── Profile.tsx      # Brugerprofil
│   ├── App.tsx              # Routing
│   ├── main.tsx             # Entry point
│   └── index.css            # Design tokens + Tailwind
├── supabase/
│   └── migrations/          # SQL til Supabase
│       └── 001_initial.sql  # Komplet database-skema
├── .env.example             # Environment variables template
└── SETUP.md                 # Denne fil
```
