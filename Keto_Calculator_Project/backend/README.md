# Keto Calculator Backend

Backend server til Keto Calculator med database og admin dashboard.

## 🚀 Kom i gang

### 1. Start Backend Serveren

```bash
cd backend
npm start
```

Serveren kører nu på: `http://localhost:3000`

### 2. Åbn Calculator

Åbn `prototype/index.html` i din browser (kan være direkte via Finder → Dobbeltklik)

### 3. Åbn Admin Dashboard

Åbn `http://localhost:3000/admin.html` i din browser

## 📁 Hvad er hvad?

```
backend/
├── server.js              → Backend server (Express + SQLite)
├── keto_calculator.db     → Database (oprettes automatisk)
└── package.json           → Dependencies

prototype/
├── index.html             → Calculator formularen
├── calculator.js          → Frontend logik + API kald
├── admin.html             → Admin dashboard
└── styles.css             → Styling
```

## 🗄️ Database Struktur

### Tabeller

1. **leads** - Alle der har lavet en madplan
   - Email, navn, alder, vægt, højde
   - BMR, TDEE, kalorie mål
   - Ingredienser, diet type
   - Timestamps

2. **coaching_clients** - Aktive coaching klienter
   - Link til lead
   - Start/slut dato
   - Status, noter

3. **weekly_checkins** - Ugentlige vægt logs
   - Vægt, uge nummer
   - Stemning, energi
   - Noter, afvigelser

## 🔌 API Endpoints

### Public Endpoints

```
POST /api/submit-calculator
→ Gem calculator data (opretter lead)
```

### Admin Endpoints

```
GET  /api/admin/leads
→ Få alle leads

GET  /api/admin/leads/:id
→ Få enkelt lead med alle detaljer

POST /api/admin/activate-coaching/:leadId
→ Aktivér coaching for en lead

GET  /api/admin/coaching-clients
→ Få alle aktive coaching klienter

POST /api/checkin/:coachingClientId
→ Gem ugentlig check-in

GET  /api/checkins/:coachingClientId
→ Få alle check-ins for en klient
```

## 📊 User Flow

```
1. Bruger udfylder calculator
2. Indtaster email og navn
3. Klikker "Send min madplan"
4. Data sendes til backend → gemmes i database
5. (Fremtid) Backend trigger N8N webhook
6. (Fremtid) N8N genererer PDF og sender email

Admin side:
1. Åbn admin dashboard
2. Se alle leads
3. Klik på lead → se detaljer
4. Aktivér coaching hvis klient vil have det
5. Se vægtprogression over tid
```

## 🔄 N8N Integration (Næste Step)

For at integrere med N8N:

1. Opret webhook i N8N
2. Tilføj webhook URL i `calculator.js` linje ~75:
   ```javascript
   const N8N_WEBHOOK_URL = 'https://din-n8n-url.com/webhook/...';
   ```
3. Uncomment `triggerN8NWebhook(payload);` i `calculator.js`

N8N workflow skal:
- Modtage data fra webhook
- Sende til ChatGPT for at generere madplan
- Oprette PDF
- Sende email til klienten

## 💡 Næste Features

- [ ] Ugentlig check-in formular (for coaching klienter)
- [ ] Vægt graf over tid
- [ ] Email notifikationer (påmindelser)
- [ ] Automatisk N8N integration
- [ ] Login system for klienter
- [ ] Betalingssystem (Stripe)

## 🐛 Troubleshooting

**Backend starter ikke:**
- Tjek at du er i `backend/` mappen
- Kør `npm install` igen

**Calculator kan ikke sende data:**
- Tjek at backend server kører på port 3000
- Åbn browser console (F12) for fejl beskeder
- Tjek CORS hvis problemer

**Admin dashboard er tomt:**
- Prøv at udfylde calculatoren først
- Tjek at backend serveren kører
- Åbn browser console for fejl

## 📝 Notes

- Database filen (`keto_calculator.db`) gemmes lokalt
- Ingen passwords endnu - det er bare til dig
- Auto-refresh i admin dashboard hver 30 sek
- LocalStorage gemmer calculator progress
