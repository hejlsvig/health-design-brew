# Changelog

## Version 2.0 - Professionel Update (28. Januar 2026)

### 🎨 UI/UX Forbedringer
- ✅ **Fjernet alle emojis** - Mere professionelt og seriøst look
- ✅ **Fjernet flag emojis** fra sprog-vælger
- ✅ **Fjernet avocado logo** fra landing page

### 🍽️ Funktionelle Ændringer

#### Erstattet Fasting Protokol med Måltider
**Før:**
- Faste-protokoller: 16:8, 18:6, 20:4, OMAD, No fasting
- Kompliceret for brugere at forstå

**Efter:**
- Simpel vælger: **1, 2 eller 3 måltider om dagen**
- Klart og nemt at forstå
- Direkte relateret til madplanen

#### Ny Feature: Tilberedningstid
**Nye muligheder:**
1. **Hurtige retter** - Max 15-20 minutter
2. **Medium** (anbefalet) - 20-40 minutter
3. **Ingen tidsbegrænsning** - 40+ minutter tilladt
4. **Blandet** - Mix af hurtige og langsomme retter

**Fordele:**
- Brugeren får madplaner der passer til deres hverdag
- Travle mennesker kan vælge hurtige retter
- Personer med tid kan få mere avancerede opskrifter

### 🤖 ChatGPT Prompt Forbedringer

**Opdateringer:**
- Fjernet faste-protokol references
- Tilføjet klar angivelse af antal måltider pr. dag
- Tilføjet **streng** tilberedningstid constraint
- Bedre struktur i JSON output format
- Tilføjet `total_time` felt til hver opskrift
- Mere præcise instruktioner til ChatGPT

**Eksempel på ny prompt:**
```
MEAL STRUCTURE:
- Meals per day: 2 meals (lunch and dinner)
- Cooking time preference: Quick meals only (max 15-20 minutes total time)
- Meal prep strategy: Cook once, eat twice (allow leftovers)

COOKING TIME CONSTRAINT:
All recipes MUST be quick: max 15-20 minutes total preparation and cooking time.
```

### 💾 Database Opdateringer

**Nye felter i `leads` tabel:**
- `meals_per_day` (INTEGER) - Antal måltider om dagen (1, 2, eller 3)
- `prep_time` (TEXT) - Tilberedningstid preference (fast, medium, long, mix)

**Fjernet felter:**
- `fasting` - Erstattet med meals_per_day

### 📊 Admin Dashboard

**Opdateringer:**
- Viser nu "Måltider pr. dag" i stedet for "Faste Protokol"
- Viser "Tilberedningstid" med pæne labels
- Formaterer tilberedningstid på dansk

### 🔧 Tekniske Detaljer

**Frontend (calculator.js):**
- Opdateret `userData` objekt med nye felter
- Ny event listeners for måltider og tilberedningstid
- Opdateret `generatePromptPreview()` funktion
- Opdateret `showSummary()` til at vise nye felter
- Opdateret `sendMealPlan()` til at sende nye felter

**Backend (server.js):**
- Database migration (nye kolonner)
- Opdateret INSERT/UPDATE queries
- Håndterer nye felter i API endpoints

---

## Version 1.0 - Initial Release

### Features
- Keto calculator med 6 steps
- BMR/TDEE beregning
- Ingrediens vælger
- ChatGPT prompt generator
- Email collection
- Backend med SQLite database
- Admin dashboard
- Lead management

---

## Upgrade Guide

### Fra v1.0 til v2.0

**Database:**
1. Backend vil automatisk tilføje nye kolonner
2. Eksisterende data beholdes
3. Nye felter får default værdier

**Frontend:**
- Ingen breaking changes
- Gamle faste-protokol værdier erstattes automatisk

**Testing:**
1. Stop backend server
2. Slet `backend/keto_calculator.db` (valgfrit - for clean start)
3. Start backend igen: `npm start`
4. Test calculator flow
5. Tjek admin dashboard
