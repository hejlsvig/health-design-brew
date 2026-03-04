# 🧪 Testing Guide - Keto Calculator System

Denne guide beskriver hvordan man tester alle funktioner i Keto Calculator systemet systematisk.

**Sidst opdateret:** 4. Februar 2025

---

## 📋 Test Checklist Oversigt

- [ ] 1. Calculator Frontend (index.html)
- [ ] 2. Madplan Generering & Email
- [ ] 3. Admin Dashboard
- [ ] 4. Lead Profiler
- [ ] 5. Coaching Klient Profiler
- [ ] 6. Check-in System
- [ ] 7. Sikkerhed & Begrænsninger

---

## 1️⃣ Calculator Frontend (index.html)

**URL:** `http://localhost:8080/index.html`

### Test Scenarie 1.1: Grundlæggende Gennemgang
1. [ ] Åbn calculatoren i browseren
2. [ ] Vælg sprog (Dansk/English/Svenska) - verificer at alle tekster skifter
3. [ ] Vælg enheder (Metric/Imperial)
4. [ ] Klik "START"

### Test Scenarie 1.2: Step 1 - Personlig Information
1. [ ] Indtast navn
2. [ ] Vælg køn (Mand/Kvinde)
3. [ ] Indtast alder (test: 25, 45, 65)
4. [ ] Indtast vægt (test: 60kg, 80kg, 100kg)
5. [ ] Indtast højde (test: 160cm, 175cm, 190cm)
6. [ ] Vælg aktivitetsniveau
7. [ ] Verificer at "Næste" knappen virker

### Test Scenarie 1.3: Step 2 - Beregninger
1. [ ] Verificer at BMR vises korrekt
2. [ ] Verificer at TDEE vises korrekt
3. [ ] Check at værdier ændrer sig hvis man går tilbage og ændrer data
4. [ ] Klik "Næste"

### Test Scenarie 1.4: Step 3 - Vægttab Mål
1. [ ] Test slider for vægttab (0.5kg - 2kg per uge)
2. [ ] Verificer at tekst opdateres synkront med slider
3. [ ] Verificer at kalorie-deficit beregnes korrekt (vægttab × 1100 kcal)
4. [ ] Klik "Næste"

### Test Scenarie 1.5: Step 4 - Madplan Præferencer
1. [ ] Vælg antal måltider (2, 3, 4)
2. [ ] Vælg antal dage (3, 5, 7)
3. [ ] Vælg tilberedningstid
4. [ ] Vælg budget niveau
5. [ ] Toggle "Leftovers" switch
6. [ ] Klik "Næste"

### Test Scenarie 1.6: Step 5 - Ingrediens Valg
1. [ ] Test "Vælg Alle" knap
2. [ ] Test "Fravælg Alle" knap
3. [ ] Vælg og fravælg individuelle ingredienser
4. [ ] Verificer at counter opdateres (X/34 valgt)
5. [ ] Klik "Næste"

### Test Scenarie 1.7: Step 6 - Submit
1. [ ] Indtast email (test både valid og invalid format)
2. [ ] Vælg GDPR consent checkbox
3. [ ] Klik "Send Min Gratis Madplan"
4. [ ] Verificer success besked
5. [ ] Check browser console for fejl

**Forventet Resultat:**
- ✅ Success besked vises
- ✅ Email modtages inden for 1-2 minutter med PDF vedhæftet
- ✅ Lead gemmes i database

---

## 2️⃣ Madplan Generering & Email

### Test Scenarie 2.1: Madplan Generering
1. [ ] Submit calculator form (se test 1.7)
2. [ ] Check server logs: `tail -f backend/server.log`
3. [ ] Verificer log output:
   - [ ] "✓ Lead saved/updated: [email] (ID: X, Meal plans: Y/5)"
   - [ ] "🤖 Auto-generating meal plan for [email]..."
   - [ ] "✓ Meal plan generated successfully"
   - [ ] "✓ Meal plan generated: [filename] (XXXX tokens, $X.XX)"
   - [ ] "✓ Meal plan email sent to [email]"

### Test Scenarie 2.2: PDF Kvalitet
1. [ ] Åbn modtaget PDF
2. [ ] Verificer antal dage (skal matche valg: 3, 5, eller 7 dage)
3. [ ] Verificer at INGEN ekskluderede ingredienser er i opskrifterne
4. [ ] Check indkøbsliste:
   - [ ] Titel er "Indkøbsliste" (IKKE "Indkøbsliste (Hele Ugen)")
   - [ ] Ingredienser er organiseret i kategorier
5. [ ] Verificer at hver dag har:
   - [ ] Morgenmad med ingredienser, tilberedning, næringsværdi
   - [ ] Frokost med ingredienser, tilberedning, næringsværdi
   - [ ] Aftensmad med ingredienser, tilberedning, næringsværdi
   - [ ] Daglig total kalorier matcher cirka målet (±50 kcal)
6. [ ] Check at sprog matcher valgt sprog i calculatoren

### Test Scenarie 2.3: Email Delivery
1. [ ] Verificer at email ankommer
2. [ ] Check afsender: din@one.com email
3. [ ] Check emne linje (baseret på sprog)
4. [ ] Verificer at PDF er vedhæftet
5. [ ] Check at brødtekst er formateret korrekt med klientens navn

---

## 3️⃣ Admin Dashboard

**URL:** `http://localhost:3000/admin.html`

### Test Scenarie 3.1: Statistik Cards
1. [ ] Åbn admin dashboard
2. [ ] Verificer "Total Leads" card:
   - [ ] Viser korrekt antal
   - [ ] Klik på card → skifter til "Alle Leads" tab
3. [ ] Verificer "Aktive Klienter" card:
   - [ ] Viser korrekt antal
   - [ ] Klik på card → skifter til "Aktive Klienter" tab
4. [ ] Verificer "Nye Leads" card:
   - [ ] Viser korrekt antal (sidste 7 dage)
   - [ ] Klik på card → viser dropdown overlay med liste
5. [ ] Verificer "Leads denne uge" card:
   - [ ] Viser korrekt antal
   - [ ] Klik på card → viser dropdown overlay med liste

### Test Scenarie 3.2: Leads Tab
1. [ ] Klik på "📋 Leads" tab button
2. [ ] Verificer at tab button skifter farve (active state)
3. [ ] Verificer leads tabel:
   - [ ] Kolonner: Navn, Email, Alder, Vægt, Oprettet, GDPR, Handlinger
   - [ ] GDPR kolonne viser ✓ for consented leads (IKKE ✗)
   - [ ] Sortering virker (klik på kolonne headers)
4. [ ] Test søgefunktion:
   - [ ] Søg efter navn
   - [ ] Søg efter email
5. [ ] Test "Se Profil" knap → åbner lead-profil.html

### Test Scenarie 3.3: Aktive Klienter Tab
1. [ ] Klik på "👥 Aktive Klienter" tab
2. [ ] Verificer klient tabel med kolonner
3. [ ] Test "Se Profil" knap → åbner coaching-profil.html

---

## 4️⃣ Lead Profiler

**URL:** `http://localhost:3000/lead-profil.html?id=X`

### Test Scenarie 4.1: Lead Uden Coaching
1. [ ] Åbn lead profil for et lead UDEN aktiv coaching
2. [ ] Verificer tabs:
   - [ ] Oversigt ✓
   - [ ] Madplaner ✓
   - [ ] Email ✓
   - [ ] Noter ✓
   - [ ] Check-ins ✗ (SKAL IKKE vises)
3. [ ] Verificer action button:
   - [ ] "✓ Aktivér Coaching" knap vises

### Test Scenarie 4.2: Oversigt Tab
1. [ ] Verificer personlig info vises korrekt:
   - [ ] Navn, Email, Alder, Køn
   - [ ] Vægt, Højde, Aktivitet
   - [ ] BMR, TDEE, Daily Calories
2. [ ] Verificer madplan præferencer:
   - [ ] Måltider per dag, Antal dage
   - [ ] Prep time, Budget, Leftovers

### Test Scenarie 4.3: Madplaner Tab
1. [ ] Klik på "Madplaner" tab
2. [ ] Verificer liste over genererede madplaner:
   - [ ] Dato genereret
   - [ ] Filnavn
   - [ ] Tokens brugt
   - [ ] Cost i USD
3. [ ] Test "📄 Se PDF" knap → åbner PDF
4. [ ] Test "🔄 Regenerér Madplan" knap:
   - [ ] Verificer bekræftelses dialog
   - [ ] Verificer at ny madplan genereres
   - [ ] Check at email sendes

### Test Scenarie 4.4: Email Tab
1. [ ] Klik på "Email" tab
2. [ ] Verificer email historie tabel:
   - [ ] Dato sendt
   - [ ] Type (meal_plan)
   - [ ] Status (sent)
3. [ ] Test "📧 Send Madplan Email" knap:
   - [ ] Verificer at email sendes
   - [ ] Check at ny entry dukker op i historik

### Test Scenarie 4.5: Noter Tab
1. [ ] Klik på "Noter" tab
2. [ ] Skriv en note i textarea
3. [ ] Klik "💾 Gem Noter"
4. [ ] Reload siden → verificer at note er gemt

### Test Scenarie 4.6: Aktivér Coaching
1. [ ] Klik "✓ Aktivér Coaching" knap
2. [ ] Indtast start notes (valgfrit)
3. [ ] Klik "Bekræft"
4. [ ] Verificer success besked
5. [ ] Reload siden → verificer at du bliver sendt til coaching-profil.html

---

## 5️⃣ Coaching Klient Profiler

**URL:** `http://localhost:3000/coaching-profil.html?id=X`

### Test Scenarie 5.1: Coaching Klient
1. [ ] Åbn coaching profil for en aktiv klient
2. [ ] Verificer tabs:
   - [ ] Oversigt ✓
   - [ ] Madplaner ✓
   - [ ] Email ✓
   - [ ] Noter ✓
   - [ ] Check-ins ✓ (SKAL vises)
3. [ ] Verificer action buttons:
   - [ ] "📊 Ny Check-in" knap
   - [ ] "⏸️ Pause Coaching" knap
   - [ ] "⛔ Afslut Coaching" knap

### Test Scenarie 5.2: Check-ins Integration
1. [ ] Scroll ned til "Check-ins" sektion på Oversigt tab
2. [ ] Verificer at seneste check-ins vises inline
3. [ ] Test "📊 Vis Alle Check-ins" link
4. [ ] Klik på en check-in → verificer at detaljer udvides

### Test Scenarie 5.3: Check-in Link
1. [ ] Scroll til "Check-in Link" sektion
2. [ ] Verificer at link indeholder UUID token (IKKE ID nummer)
3. [ ] Format: `http://localhost:8080/checkin.html?token=UUID`
4. [ ] Test "📋 Kopier Link" knap
5. [ ] Test "📧 Send Link via Email" knap

### Test Scenarie 5.4: Ny Check-in Knap
1. [ ] Klik "📊 Ny Check-in" knap
2. [ ] Verificer at ny tab åbnes med checkin.html
3. [ ] Verificer at URL indeholder token (ikke ID)

### Test Scenarie 5.5: Pause/Afslut Coaching
1. [ ] Test "⏸️ Pause Coaching":
   - [ ] Bekræft dialog
   - [ ] Verificer status ændres til "paused"
2. [ ] Test "⛔ Afslut Coaching":
   - [ ] Bekræft dialog
   - [ ] Verificer status ændres til "completed"

---

## 6️⃣ Check-in System

**URL:** `http://localhost:8080/checkin.html?token=UUID`

### Test Scenarie 6.1: Åbn Check-in med Token
1. [ ] Kopier check-in link fra coaching profil
2. [ ] Åbn link i ny tab/browser
3. [ ] Verificer at klient navn vises øverst
4. [ ] Verificer at URL bruger token (IKKE ID)

### Test Scenarie 6.2: Udfyld Check-in Form
1. [ ] Indtast nuværende vægt
2. [ ] Vælg energiniveau (1-5 stjerner)
3. [ ] Vælg søvnkvalitet (1-5 stjerner)
4. [ ] Vælg humør (1-5 stjerner)
5. [ ] Vælg compliance (1-5 stjerner)
6. [ ] Toggle "Trænet denne uge" checkbox
7. [ ] Indtast antal træningssessioner (hvis toggled)
8. [ ] Skriv note om ugen
9. [ ] Skriv mål for næste uge
10. [ ] Klik "📊 Submit Check-in"

### Test Scenarie 6.3: Check-in Historik
1. [ ] Efter submit, scroll ned
2. [ ] Verificer at ny check-in vises øverst i liste
3. [ ] Test "Vis Detaljer" på en check-in
4. [ ] Verificer at alle data vises korrekt

### Test Scenarie 6.4: Sikkerhed - Invalid Token
1. [ ] Prøv at åbne checkin.html med ugyldig token
2. [ ] Forventet: Fejlbesked "Invalid or expired access token"

### Test Scenarie 6.5: Sikkerhed - Sequential ID
1. [ ] Prøv at åbne checkin.html?id=1 (old format)
2. [ ] Verificer at det stadig virker (backward compatibility)
3. [ ] Men nyt check-in links skal ALTID bruge token

---

## 7️⃣ Sikkerhed & Begrænsninger

### Test Scenarie 7.1: Aktiv Klient Beskyttelse
1. [ ] Aktivér coaching for et lead (så det bliver aktiv klient)
2. [ ] Prøv at submitte calculator fra index.html med SAMME email
3. [ ] Forventet resultat:
   - [ ] ❌ Fejl besked: "Du er allerede en aktiv coaching klient..."
   - [ ] ✅ Data overskrives IKKE i databasen
   - [ ] ✅ Ingen ny madplan genereres

### Test Scenarie 7.2: Maksimum 5 Madplaner Per Email
1. [ ] Find en email der har genereret 4 madplaner
2. [ ] Generér den 5. madplan → ✅ Skal virke
3. [ ] Prøv at generere den 6. madplan → ❌ Skal fejle
4. [ ] Forventet fejl: "Du har nået maksimum antal gratis madplaner (5 stk)..."

### Test Scenarie 7.3: UUID Token Sikkerhed
1. [ ] Verificer at check-in links bruger UUID (ikke sequential ID)
2. [ ] Format: `token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
3. [ ] Test at gamle ID-baserede links stadig virker (backward compatibility)
4. [ ] Test at ugyldig token giver fejl

---

## 🔍 Database Verificering

### Verificer Database Integritet
```bash
# Tilslut til database
cd backend
sqlite3 keto_calculator.db

# Check leads count
SELECT COUNT(*) FROM leads;

# Check coaching clients med tokens
SELECT id, lead_id, status, access_token FROM coaching_clients;

# Check meal plans count per email
SELECT
    l.email,
    COUNT(gm.id) as meal_plan_count
FROM leads l
LEFT JOIN generated_meal_plans gm ON l.id = gm.lead_id
GROUP BY l.email
ORDER BY meal_plan_count DESC;

# Check check-ins
SELECT COUNT(*) FROM weekly_checkins;

# Exit
.exit
```

---

## 📊 Performance Test

### Test Scenarie P.1: Responstider
1. [ ] Calculator submit: < 2 sekunder (uden madplan generation)
2. [ ] Madplan generation: 10-30 sekunder (afhængig af GPT-4)
3. [ ] Email delivery: 30-60 sekunder
4. [ ] Admin dashboard load: < 1 sekund
5. [ ] Lead profil load: < 1 sekund

### Test Scenarie P.2: Concurrent Users
1. [ ] Åbn 3 browser tabs
2. [ ] Submit calculator samtidig fra alle tabs
3. [ ] Verificer at alle får success og modtager emails

---

## 🐛 Bug Reporting Template

Når du finder en fejl, dokumentér den således:

```markdown
### Bug: [Kort beskrivelse]

**Dato:** YYYY-MM-DD
**Severity:** Critical / High / Medium / Low
**Status:** Open / In Progress / Fixed

**Steps to Reproduce:**
1.
2.
3.

**Expected Result:**
-

**Actual Result:**
-

**Screenshots/Logs:**
[Indsæt her]

**Browser/Environment:**
- Browser:
- OS:
- Server version:
```

---

## ✅ Test Sign-Off

Efter hver test session:

**Tester:** _________________
**Dato:** _________________
**Områder Testet:** _________________
**Bugs Fundet:** _________________
**Status:** Pass / Fail / Partial

**Notes:**
_________________
_________________
_________________

---

## 📚 Relaterede Dokumenter

- [GETTING_STARTED.md](GETTING_STARTED.md) - Sådan kommer du i gang
- [SYSTEM_OVERSIGT.md](SYSTEM_OVERSIGT.md) - System arkitektur
- [EMAIL_SETUP_GUIDE.md](EMAIL_SETUP_GUIDE.md) - Email konfiguration
- [MADPLAN_GENERATOR_GUIDE.md](MADPLAN_GENERATOR_GUIDE.md) - Madplan generator detaljer
- [CHECKIN_LINK_GUIDE.md](CHECKIN_LINK_GUIDE.md) - Check-in system guide
