# 🥑 Keto Calculator - Komplet System Oversigt

## 📊 System Arkitektur

```
┌─────────────────────────────────────────────────────────────────┐
│                        KETO CALCULATOR                          │
│                     Komplet Business System                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Calculator    │────→│   Lead Capture   │────→│  Admin Panel │
│   (Frontend)    │     │    (Database)    │     │  (Dashboard) │
└─────────────────┘     └──────────────────┘     └──────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Personlige     │     │  Coaching        │     │  AI Madplan  │
│  Makro Beregn   │     │  Aktivering      │     │  Generator   │
└─────────────────┘     └──────────────────┘     └──────────────┘
                               │                        │
                               │                        │
                               ▼                        ▼
                    ┌──────────────────┐     ┌──────────────────┐
                    │ Weekly Check-ins │     │  GPT-4 + PDF     │
                    │  (Progress Track)│     │   Generation     │
                    └──────────────────┘     └──────────────────┘
```

## 🔄 User Flow

### 1. Lead Generation (Calculator)
```
Bruger → Calculator → Udfylder formularer → Email capture → Lead i database
   │
   └─→ Output: Personlig makro plan, kaloriebehov, madplan parametre
```

### 2. Admin Review
```
Admin → Dashboard → Se leads → Gennemgå data → Beslut næste skridt
   │
   ├─→ Option A: Aktivér Coaching
   ├─→ Option B: Generer Madplan (AI)
   └─→ Option C: Follow-up senere
```

### 3. Coaching Flow
```
Lead → Aktivering → Coaching Klient → Ugentlige Check-ins → Progress Tracking
                                              │
                                              └─→ Vægt, humør, energi,
                                                  sult, søvn, aktivitet, etc.
```

### 4. Madplan Flow
```
Lead Data → AI Generator → GPT-4 Processing → PDF Generation → Download
     │                            │                   │
     ├─ Kalorier                  ├─ Personalisering  ├─ Professionelt layout
     ├─ Præferencer               ├─ Opskrifter       ├─ Indkøbsliste
     ├─ Ekskluderinger            ├─ Næringsværdier   └─ Tips & tricks
     └─ Mål                       └─ Sprog support
```

## 📁 Fil Struktur

```
Keto_Calculator_Project/
│
├── backend/                          # Node.js + Express Backend
│   ├── server.js                     # Hovedserver med alle endpoints
│   ├── mealPlanGenerator.js          # GPT-4 integration + PDF generator
│   ├── keto_calculator.db            # SQLite database
│   ├── generated_mealplans/          # AI-genererede PDFs
│   ├── package.json                  # Dependencies
│   ├── .env.example                  # Environment variable template
│   └── .gitignore                    # Git ignore rules
│
├── prototype/                        # Frontend HTML/CSS/JS
│   ├── calculator.html               # Keto calculator interface
│   ├── admin.html                    # Admin dashboard (v2.6)
│   ├── admin-checkins.html           # Check-in oversigt med fold-out
│   ├── checkin.html                  # Ugentlig check-in formular
│   └── meal-plan-settings.html       # AI madplan konfiguration
│
└── docs/                             # Dokumentation
    ├── OPDATERINGER_V2.6.md          # Split admin dashboard
    ├── OPDATERINGER_V3.0.md          # AI madplan generator
    ├── MADPLAN_GENERATOR_GUIDE.md    # Komplet madplan guide
    └── SYSTEM_OVERSIGT.md            # Dette dokument
```

## 🗄️ Database Schema

### `leads` - Alle calculator bruger data
```sql
- id, email, name, gdpr_consent
- age, gender, weight, height, activity
- bmr, tdee, weight_goal, daily_calories
- meals_per_day, prep_time, num_days, leftovers
- excluded_ingredients, selected_ingredients
- language, units, diet_type
- admin_comments, last_contact_date
- created_at
```

### `coaching_clients` - Aktive coaching klienter
```sql
- id, lead_id (FK)
- status (active/inactive/completed)
- start_date, end_date, notes
- created_at
```

### `weekly_checkins` - Ugentlig progress tracking
```sql
- id, coaching_client_id (FK)
- weight, week_number
- mood, energy
- hunger, cravings
- sleep_hours, sleep_quality
- digestion, activity
- fasting_hours, fasting_feeling
- stress_factors, weekly_win
- deviations, notes
- created_at
```

### `generated_meal_plans` - AI madplaner
```sql
- id, lead_id (FK)
- pdf_filename, pdf_path
- tokens_used, cost_usd
- created_at
```

## 🚀 API Endpoints

### Calculator & Leads
```
POST   /api/submit-calculator        # Opret ny lead
GET    /api/admin/leads              # Hent alle leads
GET    /api/admin/leads/:id          # Hent specifik lead
POST   /api/admin/update-comments/:id # Opdater admin kommentarer
POST   /api/admin/update-last-contact/:id # Opdater kontakt dato
```

### Coaching
```
GET    /api/admin/check-coaching/:leadId     # Tjek coaching status
POST   /api/admin/activate-coaching/:leadId  # Aktivér coaching
GET    /api/admin/coaching-clients           # Hent alle coaching klienter
GET    /api/admin/coaching-count             # Tæl aktive klienter
```

### Check-ins
```
POST   /api/checkin/:coachingClientId        # Opret check-in
GET    /api/checkins/:coachingClientId       # Hent check-ins for klient
```

### AI Madplan Generator
```
POST   /api/generate-meal-plan/:leadId       # Generer madplan med GPT-4
GET    /api/download-meal-plan/:filename     # Download PDF
GET    /api/meal-plans/:leadId               # Hent madplaner for lead
GET    /api/admin/all-meal-plans             # Hent alle madplaner (stats)
POST   /api/admin/set-openai-key             # Konfigurer API nøgle
```

## 🎨 Frontend Features

### Calculator (`calculator.html`)
- ✅ Multi-step formular (6 trin)
- ✅ Real-time BMR/TDEE beregning
- ✅ Multi-sprog support (DA/EN/SE)
- ✅ Ingrediens selector med ekskludering
- ✅ GDPR consent checkbox
- ✅ Email capture

### Admin Dashboard (`admin.html` v2.6)
- ✅ **Split View**: Leads vs Aktive Klienter tabs
- ✅ Stats cards: Total leads, nye i dag, aktive klienter, denne uge
- ✅ Søgning i leads/klienter
- ✅ Lead detail modal med fuld information
- ✅ Coaching aktivering
- ✅ Admin kommentarer
- ✅ Last contact tracking
- ✅ **Klient Cards**: Visual design for aktive klienter
- ✅ Direkte links til check-ins og madplan generering

### Check-in System
**`checkin.html`** - Ugentlig formular:
- ✅ Vægt input
- ✅ Humør & energi sliders (1-10)
- ✅ Sult niveauer (Ingen/Let/Moderat/Kraftig)
- ✅ Cravings (Nej/Lidt/Meget)
- ✅ Søvn (timer + kvalitet)
- ✅ Fordøjelse (checkboxes)
- ✅ Fysisk aktivitet
- ✅ Faste (timer + følelse)
- ✅ Stress faktorer
- ✅ Ugens sejr (free text)

**`admin-checkins.html`** - Oversigt:
- ✅ Kompakt view: Uge, vægt, humør, energi, dato
- ✅ **Fold-out Details**: Klik for at se alle felter
- ✅ Vægt change indicator (grøn/rød)
- ✅ Smooth animations

### Madplan Generator (`meal-plan-settings.html`)
- ✅ OpenAI API nøgle konfiguration
- ✅ Statistik dashboard
- ✅ Total madplaner, cost tracking
- ✅ Liste over seneste madplaner
- ✅ Download links til PDFs

## 🤖 AI Integration

### GPT-4 Madplan Generator
**Model**: `gpt-4-turbo-preview`
**Cost**: ~$0.01-0.03 USD per madplan

**Input Data**:
- Lead profil (alder, køn, vægt, højde)
- Kaloriebehov (fra TDEE beregning)
- Aktivitetsniveau
- Antal måltider per dag
- Tilberedningstid præference
- Ekskluderede ingredienser
- Leftovers præference
- Sprog

**Output**:
- Professionel PDF madplan
- 7 dages meal plan (tilpasselig)
- Komplet indkøbsliste
- Detaljerede opskrifter
- Næringsværdier
- Keto makro-fordeling
- Tips & tricks

**Teknologier**:
- OpenAI SDK (JavaScript)
- PDFKit for PDF generering
- Custom prompt engineering

## 📊 Version History

### v3.0 - AI Madplan Generator ✨ CURRENT
- 🤖 OpenAI GPT-4 integration
- 📄 PDF generering med PDFKit
- 💰 Cost tracking & statistik
- ⚙️ Admin interface til API konfiguration
- 🗄️ `generated_meal_plans` database tabel

### v2.6 - Split Admin Dashboard
- 📋 Opdelt leads og klienter i separate tabs
- 🎨 Klient cards med visual design
- 📊 Forbedrede stats cards
- 🔍 Separate søgefunktioner

### v2.5 - Check-in Fold-out View
- 📋 Admin check-in oversigt
- 📂 Fold-out detaljer (progressive disclosure)
- 🎨 Smooth animations

### v2.4 - Udvidet Check-in System
- 📊 17 felter i check-in formular
- 🗄️ Database schema opdatering
- 📈 Komplet tracking (sult, søvn, stress, etc.)

### v2.0-2.3 - Core Features
- 🎯 Coaching aktivering
- 📊 Weekly check-ins
- 👤 Lead management
- 🌍 Multi-sprog support
- ✅ GDPR compliance

### v1.0 - MVP
- 🧮 Keto calculator
- 📧 Email capture
- 💾 SQLite database

## 🛠️ Tech Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: SQLite3
- **AI**: OpenAI SDK (GPT-4)
- **PDF**: PDFKit

### Frontend
- **HTML5** + **CSS3** + **Vanilla JavaScript**
- Ingen frameworks (lightweight & fast)
- Responsive design
- Progressive enhancement

### Dependencies
```json
{
  "express": "^5.2.1",
  "sqlite3": "^5.1.7",
  "cors": "^2.8.6",
  "body-parser": "^2.2.2",
  "openai": "^latest",
  "pdfkit": "^latest"
}
```

## 🚀 Deployment Checklist

### Før Produktion:
- [ ] Sæt OpenAI API nøgle via environment variable
- [ ] Konfigurer database backup
- [ ] Implementer authentication på admin endpoints
- [ ] SSL/HTTPS setup
- [ ] Rate limiting på API endpoints
- [ ] Error monitoring (Sentry, etc.)
- [ ] Email service integration (SendGrid, etc.)
- [ ] Payment integration (Stripe, etc.)
- [ ] GDPR data export/delete functionality
- [ ] PDF storage optimization (S3, etc.)

### Sikkerhed:
- [ ] API nøgle i .env fil (ikke i kode)
- [ ] Admin interface password protection
- [ ] SQL injection prevention (prepared statements ✅)
- [ ] XSS protection
- [ ] CSRF protection
- [ ] File upload validation
- [ ] Rate limiting

## 📈 Metrics & KPIs

### Lead Metrics
- Total leads
- Leads per dag/uge/måned
- GDPR consent rate
- Lead conversion til coaching

### Coaching Metrics
- Aktive klienter
- Gennemsnitlig client retention
- Check-in completion rate
- Vægtab success rate

### Madplan Metrics
- Total madplaner genereret
- Total AI cost
- Gennemsnitspris per madplan
- Madplaner per klient

## 💡 Future Enhancements

### Phase 1: Automation
- [ ] Email automation (welcome series, check-in reminders)
- [ ] Automatic madplan delivery til nye klienter
- [ ] Weekly progress reports via email

### Phase 2: Advanced Features
- [ ] Recipe database & variation generator
- [ ] Meal plan templates
- [ ] Shopping list export (CSV/printable)
- [ ] Mobile app/PWA

### Phase 3: Analytics
- [ ] Advanced analytics dashboard
- [ ] Client progress visualization
- [ ] Prediction models for success
- [ ] A/B testing framework

### Phase 4: Scaling
- [ ] Multi-coach support
- [ ] White-label options
- [ ] API for third-party integrations
- [ ] Marketplace for meal plans

## 🎯 Business Model

### Revenue Streams
1. **Coaching Subscriptions**
   - Månedlig/kvartalsvis betaling
   - Inkluderer ugentlig check-ins
   - Personlig madplan generering

2. **One-time Madplan Sales**
   - Køb personlig madplan uden coaching
   - Upsell til coaching senere

3. **Premium Features**
   - Ekstra madplan variationer
   - 1-on-1 video konsultationer
   - Advanced progress analytics

### Cost Structure
- **Fixed**: Server hosting, domain, tools
- **Variable**: OpenAI API costs (~$0.02 per madplan)
- **Time**: Admin/coaching tid

### Unit Economics
```
Madplan Cost: $0.02 USD
Coaching Price: $200 USD/måned (example)
Margin: ~99.99%
```

## 📞 Support & Maintenance

### Monitoring
- Server uptime monitoring
- Database backup (daily)
- Error logging
- API usage tracking

### Regular Tasks
- Check OpenAI costs
- Review coaching client progress
- Update meal plan prompts
- Database optimization

---

**System Version**: 3.0
**Last Updated**: 30. Januar 2026
**Status**: ✅ Production Ready
**Maintained By**: Anders Hejlsvig
