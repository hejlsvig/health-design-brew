# 🤖 Madplan Generator Guide - Version 3.0

## Oversigt

Madplangeneratoren bruger OpenAI GPT-4 til at lave personlige, AI-drevne keto madplaner baseret på lead data fra calculatoren. Hver madplan er skræddersyet til personens specifikke behov, præferencer og mål.

## 🚀 Nye Features i Version 3.0

### ✅ AI-Drevet Madplan Generering
- **OpenAI GPT-4 Integration**: Bruger state-of-the-art AI til at generere madplaner
- **Personalisering**: Hver madplan er unik baseret på:
  - Kaloribehov (TDEE minus deficit)
  - Aktivitetsniveau
  - Antal måltider per dag
  - Tilberedningstid præference
  - Ekskluderede ingredienser
  - Leftovers præference
  - Sprog (Dansk, Engelsk, Svensk)

### 📄 PDF Output
- **Professionelt Layout**: Genererer pæne PDF dokumenter med:
  - Personlig header med navn
  - Komplet ugentlig indkøbsliste
  - Dag-for-dag madplan med opskrifter
  - Detaljerede ingredienslister
  - Step-by-step tilberedning
  - Nøjagtige næringsværdier
  - Keto makro-fordeling (~70% fedt, ~25% protein, ~5% kulhydrat)
  - Tips & tricks til at følge planen

### 💰 Kostnadsstyring
- **Transparent Prissætning**: Se nøjagtig kostpris for hver madplan
- **Statistik**: Track total forbrug, gennemsnitspris, antal genererede planer
- **Estimeret pris**: Ca. $0.01-0.03 USD per madplan (~0.10-0.30 DKK)

## 📋 Opsætning

### 1. Få en OpenAI API Nøgle

1. Gå til [platform.openai.com](https://platform.openai.com/signup)
2. Opret en konto eller log ind
3. Naviger til "API keys" under din profil
4. Klik "Create new secret key"
5. Kopier nøglen (den starter med `sk-...`)

### 2. Konfigurer API Nøglen

**Metode 1: Via Admin Interface (Anbefalet)**
1. Åbn Admin Dashboard: `http://localhost:3000/admin.html`
2. Klik på "⚙️ Madplan Indstillinger" knappen
3. Indsæt din OpenAI API nøgle
4. Klik "💾 Gem API Nøgle"

**Metode 2: Via Environment Variable**
```bash
export OPENAI_API_KEY="sk-..."
cd backend
node server.js
```

### 3. Verificer Installation

Serveren vil vise status når den starter:
```
║  Meal Plan Generator: ✓ ENABLED       ║  # API nøgle konfigureret
# eller
║  Meal Plan Generator: ✗ DISABLED (No API key)       ║  # Ingen API nøgle
```

## 🎯 Sådan Bruger Du Det

### Fra Admin Dashboard

1. **Åbn Lead Detaljer**:
   - Klik på en lead i tabellen
   - Modal vindue åbnes med lead information

2. **Generer Madplan**:
   - Klik på "🤖 Generer Madplan" knappen
   - Bekræft action (du vil se estimeret pris)
   - Vent mens AI genererer madplanen (10-30 sekunder)

3. **Download PDF**:
   - Når generering er færdig, får du besked med:
     - Antal tokens brugt
     - Nøjagtig kostpris
     - PDF filnavn
   - PDF downloades automatisk
   - Du kan også downloade senere fra "Madplan Indstillinger"

### Madplan Indhold

Hver genereret madplan indeholder:

#### 📋 Indkøbsliste
- Komplet liste for hele ugen
- Organiseret efter kategorier:
  - Kød & Fisk
  - Grøntsager
  - Mejeriprodukter
  - Krydderier & Andet

#### 📅 Dag-for-dag Plan
For hver dag (standard 7 dage):
- **Morgenmad, Frokost, Aftensmad** (eller antal måltider som valgt)
- Ingrediensliste per portion
- Step-by-step tilberedningsvejledning
- Tilberedningstid
- Næringsværdier per portion og daglig total

#### 💡 Tips & Tricks
- Praktiske råd til at følge madplanen
- Keto-specifikke tips
- Meal prep forslag

## 📊 Database Schema

### `generated_meal_plans` tabel

```sql
CREATE TABLE generated_meal_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    lead_id INTEGER NOT NULL,
    pdf_filename TEXT NOT NULL,
    pdf_path TEXT NOT NULL,
    tokens_used INTEGER,
    cost_usd REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id)
);
```

## 🔌 API Endpoints

### POST `/api/generate-meal-plan/:leadId`
Generer madplan for en lead

**Response:**
```json
{
  "success": true,
  "message": "Meal plan generated successfully",
  "pdfFileName": "madplan_test_example_com_1738185123456.pdf",
  "tokens": 3847,
  "cost": {
    "input": "0.0123",
    "output": "0.0456",
    "total": "0.0579",
    "currency": "USD"
  }
}
```

### GET `/api/download-meal-plan/:filename`
Download genereret PDF

### GET `/api/meal-plans/:leadId`
Hent alle madplaner for en lead

### GET `/api/admin/all-meal-plans`
Hent alle genererede madplaner (admin)

**Response:**
```json
{
  "mealPlans": [
    {
      "id": 1,
      "lead_id": 5,
      "pdf_filename": "madplan_...",
      "tokens_used": 3847,
      "cost_usd": 0.0579,
      "created_at": "2026-01-29 23:15:23",
      "email": "test@example.com",
      "name": "Test Person"
    }
  ],
  "totalCost": "0.1234"
}
```

### POST `/api/admin/set-openai-key`
Sæt/opdater OpenAI API nøgle

**Request:**
```json
{
  "apiKey": "sk-..."
}
```

## 📁 Filstruktur

```
backend/
├── server.js                    # Hovedserver med API endpoints
├── mealPlanGenerator.js        # GPT-4 integration og PDF generering
├── keto_calculator.db          # SQLite database
└── generated_mealplans/        # PDF filer gemmes her
    └── madplan_*.pdf

prototype/
├── admin.html                  # Admin dashboard med "Generer Madplan" knap
└── meal-plan-settings.html     # API nøgle konfiguration og statistik
```

## 🎨 Prompt Engineering

Madplangeneratoren bruger et specialdesignet prompt der sikrer:

1. **Korrekte Makroer**: 70% fedt, 25% protein, 5% kulhydrat
2. **Præcis Kaloriefordeling**: Matcher brugerens daglige kaloribehov
3. **Næringsværdi Beregninger**: Nøjagtige tal for hver opskrift
4. **Sprog Support**: Komplet output på dansk, engelsk eller svensk
5. **Præference Respekt**: Ekskluderer specificerede ingredienser
6. **Tids-optimering**: Matcher prep_time præference
7. **Leftovers Logic**: Designer aftenmad med ekstra portioner hvis ønsket

## 💡 Best Practices

### For Bedste Resultater:
1. **Komplet Lead Data**: Sørg for leads har udfyldt alle felter i calculatoren
2. **GDPR Consent**: Verificer at lead har givet samtykke
3. **Realistiske Mål**: Tjek at vægtmål er sunde (ikke mere end 1 kg/uge)
4. **Ingrediens Ekskluderinger**: Små lister giver mere variation

### Kostoptimering:
1. **Batch Generering**: Generer flere madplaner på samme tid
2. **Genbrug**: Hvis en lead beder om samme plan igen, brug eksisterende PDF
3. **Monitor Forbrug**: Tjek statistik regelmæssigt i "Madplan Indstillinger"

## 🔒 Sikkerhed

### API Nøgle Beskyttelse:
- API nøglen gemmes kun i serverens hukommelse (ikke i database)
- Skal genindtastes hver gang serveren genstarter
- Brug environment variable i produktion
- Begræns adgang til admin interface

### PDF Sikkerhed:
- Filnavne valideres for path traversal
- PDFs gemmes i dedikeret mappe
- Kun tilgængelig via API endpoint
- Sikkerhedscheck på download endpoint

## 📈 Monitoring

### Se Statistik:
1. Åbn "⚙️ Madplan Indstillinger"
2. Se:
   - Total antal genererede madplaner
   - Total kostpris i USD
   - Gennemsnitspris per madplan
   - Liste over seneste 5 madplaner

### Log Output:
Serveren logger:
```
📝 Generating meal plan for test@example.com...
🤖 Generating meal plan with GPT-4...
✓ Meal plan generated successfully
✓ PDF generated successfully: /path/to/pdf
✓ Meal plan saved to database (ID: 5)
```

## 🐛 Troubleshooting

### "Meal plan generation is not available"
- **Løsning**: Konfigurer OpenAI API nøgle via "Madplan Indstillinger"

### "Unauthorized" eller "Invalid API key"
- **Løsning**: Verificer API nøgle er korrekt og har kreditter på OpenAI kontoen

### PDF generering fejler
- **Løsning**:
  - Tjek at `generated_mealplans/` mappe eksisterer
  - Verificer write permissions
  - Se server logs for specifikke fejl

### Madplan har forkerte makroer
- **Løsning**:
  - GPT-4 er probabilistisk, prøv at generere igen
  - Tjek at lead data er korrekt (særligt daily_calories)
  - Rapporter persistente problemer

### Høje omkostninger
- **Løsning**:
  - Verificer at du bruger GPT-4-turbo (billigere end standard GPT-4)
  - Reducer num_days hvis muligt
  - Monitor forbrug via statistik siden

## 🚀 Fremtidige Forbedringer

Mulige udvidelser:
- [ ] Email integration - Send madplan direkte til lead
- [ ] Meal plan templates - Gem populære madplaner til genbrug
- [ ] Variationer - Generer flere versioner af samme plan
- [ ] Shopping list export - CSV/printbar indkøbsliste
- [ ] Multi-language PDFs - Automatisk oversættelse
- [ ] Billeder - Tilføj stock photos af retter
- [ ] Progress tracking - Sammenlign madplan med check-in data
- [ ] Cost calculator - Beregn indkøbspris for madplanen

## 📞 Support

Hvis du oplever problemer:
1. Tjek server logs: `tail -f backend/server.log`
2. Verificer API nøgle status
3. Se browser console for frontend fejl
4. Kontroller database schema er opdateret

---

**Version**: 3.0
**Dato**: 30. Januar 2026
**AI Model**: OpenAI GPT-4-turbo
**PDF Library**: PDFKit
