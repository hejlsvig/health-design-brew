# 🚀 Kom i gang med Keto Calculator + Backend

## ✅ Status: Alt er klar!

Backend serveren KØR ALLEREDE på din Mac! 🎉

```
✓ Backend server: http://localhost:3000
✓ Database: SQLite (gemmes lokalt)
✓ Admin Dashboard: http://localhost:3000/admin.html
```

---

## 📋 Sådan bruger du systemet

### 1️⃣ Åbn Calculator (for brugere)

**Metode A - Via Browser:**
1. Åbn denne fil i din browser:
   ```
   /Users/andershejlsvig/Desktop/Bog /Calculator/Keto_Calculator_Project/prototype/index.html
   ```

**Metode B - Via Finder:**
1. Gå til mappen: `Keto_Calculator_Project/prototype/`
2. Dobbeltklik på `index.html`

### 2️⃣ Test Calculator Flow

1. Udfyld formularen (alle 6 steps)
2. På sidste step: Indtast din email + navn
3. Klik "📨 Send Min Gratis Madplan"
4. Data gemmes automatisk i databasen! ✅

### 3️⃣ Åbn Admin Dashboard

Åbn i browser:
```
http://localhost:3000/admin.html
```

Her kan du:
- ✅ Se alle leads (personer der har lavet madplan)
- ✅ Klikke på hver lead for at se alle deres data
- ✅ Aktivere coaching for en klient
- ✅ Se statistikker (i dag, denne uge, total)

---

## 🔧 Backend Kommandoer

Backend serveren kører allerede, men hvis du vil stoppe/starte den:

### Stop backend:
```bash
# Tryk Ctrl+C i terminalen hvor serveren kører
```

### Start backend igen:
```bash
cd backend
npm start
```

---

## 📊 Database Oversigt

Din SQLite database ligger her:
```
backend/keto_calculator.db
```

**Tabeller:**
1. **leads** - Alle der har lavet madplan
2. **coaching_clients** - Aktive coaching klienter
3. **weekly_checkins** - Ugentlige vægt logs

---

## 🔄 Næste Steps: N8N Integration

For at få systemet til at sende madplaner automatisk via email:

### 1. Opret N8N Workflow

Du skal lave et N8N workflow med:
- **Webhook trigger** (modtager data fra calculator)
- **ChatGPT node** (genererer madplan baseret på data)
- **PDF generator node** (laver pæn PDF)
- **Email node** (sender PDF til brugerens email)

### 2. Tilføj Webhook URL

Når du har lavet N8N workflow:

1. Åbn `prototype/calculator.js`
2. Find linje ~75
3. Udskift:
   ```javascript
   const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL';
   ```
   Med din rigtige webhook URL fra N8N

4. Uncomment denne linje (~53):
   ```javascript
   // triggerN8NWebhook(payload);
   ```
   Til:
   ```javascript
   triggerN8NWebhook(payload);
   ```

### 3. Test Full Flow

1. Udfyld calculator → Send
2. Data sendes til backend ✅
3. Backend gemmer i database ✅
4. Backend trigger N8N webhook ✅
5. N8N genererer madplan ✅
6. Email sendes til bruger ✅

---

## 💡 Feature Roadmap

### Fase 1 (DONE ✅)
- ✅ Calculator frontend
- ✅ Backend + database
- ✅ Admin dashboard
- ✅ Lead management

### Fase 2 (Næste)
- [ ] N8N integration
- [ ] Automatisk email med madplan
- [ ] Ugentlig check-in formular (for coaching klienter)

### Fase 3 (Senere)
- [ ] Login system for klienter
- [ ] Vægt grafer og progression tracking
- [ ] Automatiske påmindelser (email/SMS)
- [ ] Betalingssystem (Stripe)

---

## 🐛 Fejlfinding

### "Backend kan ikke nås"
→ Tjek at serveren kører: `http://localhost:3000/api/health`

### "Admin dashboard er tomt"
→ Prøv at udfylde calculatoren først

### "CORS fejl"
→ Åbn calculator via `http://localhost:3000/index.html` i stedet

### "Database fejl"
→ Slet `backend/keto_calculator.db` og genstart serveren

---

## 📞 Support

Hvis noget ikke virker:
1. Åbn browser console (F12 → Console tab)
2. Se efter fejl beskeder
3. Tjek at backend server kører
4. Læs fejl beskederne - de er ret hjælpsomme! 😊

---

## 🎯 TL;DR - Hurtig Start

```bash
# 1. Start backend (hvis ikke allerede startet)
cd backend
npm start

# 2. Åbn calculator
open prototype/index.html

# 3. Åbn admin dashboard
open http://localhost:3000/admin.html

# 4. PROFIT! 🚀
```

---

**Made with ❤️ and 🥑**
