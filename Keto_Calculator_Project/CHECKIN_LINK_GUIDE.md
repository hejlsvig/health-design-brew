# 📊 Check-in Link Sharing Guide - Keto Calculator

## Oversigt

Keto Calculator kan nu generere og dele links til ugentlige check-ins med dine coaching klienter! Dette giver dig to måder at dele check-in links på:

1. **Manuel deling** → Kopier link og send via SMS/WhatsApp/etc.
2. **Email reminder** → Automatisk email med check-in link

## 🚀 Sådan Bruger Du Det

### Fra Lead/Klient Profil Side

1. **Åbn en coaching klient profil**:
   - Gå til Admin Dashboard → `admin.html`
   - Klik på "Se Profil" for en klient med COACHING AKTIV badge

2. **Naviger til Check-ins tab**:
   - Klik på "Check-ins" fanen i profilen
   - Du vil se check-in link sharing sektionen

### Metode 1: Manuel Link Deling

**Trin:**
1. Se det genererede check-in link i tekstfeltet
2. Klik **"📋 Kopier Link"** knappen
3. Linket kopieres til clipboard
4. Send linket til klienten via din foretrukne kanal:
   - SMS
   - WhatsApp
   - Messenger
   - Email (manuelt)

**Link format:**
```
http://localhost:3000/checkin.html?id={coachingClientId}
```

### Metode 2: Automatisk Email Reminder

**Trin:**
1. Klik **"📧 Send Check-in Reminder Email"** knappen
2. Bekræft at du vil sende email til klientens email adresse
3. Email sendes automatisk med:
   - Pæn HTML formatering
   - Direkte link til check-in formular
   - Forklaring af hvad check-in indeholder
   - Multi-sprog support (DA/EN/SE)

**Status:**
- ✅ Success: Grøn besked vises i 5 sekunder
- ❌ Error: Rød fejlbesked med troubleshooting info

## 📧 Email Template (Dansk)

**Emne:** 📊 Tid til Ugentlig Check-in - Keto Coaching

**Indhold:**
```
Hej [Navn],

Det er tid til at udfylde dit ugentlige check-in! Dette hjælper os med at følge din fremgang og justere din coaching efter behov.

Check-in'en indeholder:
✅ Vægt og kroppsmål
✅ Energiniveau og søvnkvalitet
✅ Humør og trivsel
✅ Madplans opfølgning
✅ Udfordringer og succeser

[Udfyld Check-in knap]

💡 Det tager kun 2-3 minutter og giver værdifuld indsigt i din keto rejse.

Venlig hilsen,
Keto Calculator Team
```

## 🎨 Email Features

- ✅ **Responsive HTML design** - Ser godt ud på mobil og desktop
- ✅ **Call-to-action knap** - Stort link button til check-in
- ✅ **Multi-sprog support** - DA/EN/SE automatisk baseret på klientens sprog
- ✅ **Professional branding** - Pæn header med gradient
- ✅ **Plain text fallback** - Virker selv uden HTML support

## 🔧 Teknisk Implementation

### Frontend (lead-profil.html)

**Check-in Link Section:**
```javascript
// Generate shareable link
function updateCheckinLink() {
    if (coachingClientId) {
        const link = `${window.location.origin}/checkin.html?id=${coachingClientId}`;
        document.getElementById('checkin-link-input').value = link;
        document.getElementById('checkin-link-section').style.display = 'block';
    }
}

// Copy to clipboard
function copyCheckinLink() {
    const input = document.getElementById('checkin-link-input');
    input.select();
    document.execCommand('copy');
    alert('✅ Check-in link kopieret til clipboard!');
}

// Send email reminder
async function sendCheckinReminderEmail() {
    const response = await fetch(
        `http://localhost:3000/api/send-checkin-reminder/${coachingClientId}`,
        { method: 'POST' }
    );
    // Handle response...
}
```

### Backend (server.js)

**API Endpoint:**
```javascript
POST /api/send-checkin-reminder/:coachingClientId

// Henter coaching client + lead data
// Genererer check-in link
// Sender email via emailService
// Returnerer success/failure
```

### Email Service (emailService.js)

**Ny metode:**
```javascript
async sendCheckinReminder(leadData, checkinLink, language = 'da')

// Templates:
// - getCheckinReminderTemplate(name, link, lang)
// - getCheckinReminderText(name, link)
```

## ✅ Hvad er Implementeret

- [x] Check-in link generation i lead profil
- [x] Copy-to-clipboard funktionalitet
- [x] "Åbn i Ny Fane" knap
- [x] Send check-in reminder email knap
- [x] Email templates (DA/EN/SE)
- [x] API endpoint til email sending
- [x] Error handling og status beskeder
- [x] Integration med eksisterende email service

## 📋 Use Cases

### Use Case 1: Ugentlig Reminder til Alle Klienter

**Manual proces:**
1. Hver mandag morgen åbn admin dashboard
2. Gå igennem alle coaching klienter
3. Klik "Send Check-in Reminder" for hver klient
4. → Alle klienter får email reminder

**Fremtidig automation:**
- Implementer scheduled job der sender automatisk hver mandag
- Batch send til alle aktive klienter

### Use Case 2: On-Demand Check-in Request

**Scenario:** Du har en coaching session og vil have opdateret data
1. Åbn klientens profil
2. Send check-in reminder email
3. Klient udfylder med det samme
4. Du kan se data i real-time i admin-checkins.html

### Use Case 3: SMS Reminder via Manuel Deling

**Scenario:** Klient foretrækker SMS
1. Kopier check-in link
2. Send via SMS:
   ```
   Hej [Navn]! Tid til ugentlig check-in 📊
   Udfyld her: [link]
   Det tager kun 2 min! 💪
   ```

## 🔒 Sikkerhed

### Link Validation
- Check-in links indeholder coaching client ID (ikke lead ID)
- Kun klienter med aktiv coaching kan modtage links
- Links er permanente (ikke time-limited) - overvej at tilføje expiry

### Privacy
- Links kan ikke bruges til at se andres data
- Kun klientens egne check-ins er tilgængelige via linket
- Ingen følsom data i URL (kun ID)

## 🐛 Troubleshooting

### "Email service not configured"
**Problem**: Email credentials ikke sat
**Løsning**:
1. Gå til Admin → "⚙️ Madplan Indstillinger"
2. Scroll ned til "📧 Email Konfiguration"
3. Udfyld Gmail credentials
4. Gem konfiguration

### Email sendes ikke
**Problem**: Ingen fejl men email modtages ikke
**Løsning**:
1. Tjek at klientens email adresse er korrekt
2. Tjek spam folder
3. Test med din egen email først
4. Verificer email service status i settings

### Link virker ikke
**Problem**: Klient klikker på link men får fejl
**Løsning**:
1. Verificer at coaching client ID er korrekt
2. Tjek at check-in formular findes på `/checkin.html`
3. Test linket selv i incognito mode

### Kopier knap virker ikke
**Problem**: "Kopier Link" knap gør ingenting
**Løsning**:
- Moderne browsere: Fungerer normalt
- Ældre browsere: Kopier manuelt fra tekstfeltet
- HTTPS required: Nogle browsere kræver HTTPS for clipboard access

## 📈 Fremtidige Forbedringer

Potentielle features:
- [ ] Automatisk ugentlig reminder (scheduled job)
- [ ] Batch send til alle klienter med én knap
- [ ] Link expiry (links udløber efter X dage)
- [ ] Tracking: Se hvem der har klikket på link
- [ ] SMS integration (Twilio)
- [ ] Push notifications (web push API)
- [ ] Påmindelse hvis check-in ikke udfyldt efter 3 dage

## 💡 Best Practices

### Timing
- **Bedste tid at sende**: Mandag morgen (ny uge, høj motivation)
- **Undgå**: Fredag aften, weekend (lav response rate)

### Besked Stil
- **Kort og præcis**: "Tid til ugentlig check-in 📊"
- **Friendly tone**: Brug emoji, vær positiv
- **Call-to-action**: "Udfyld nu" ikke "Husk at udfylde"

### Opfølgning
- Hvis ikke udfyldt efter 48 timer: Send reminder igen
- Hvis konsekvent ikke udfyldt: Ring til klienten personligt
- Celebrer konsistens: "5. uge i træk! 🎉"

---

**Version**: 3.2 (Check-in Link Sharing)
**Last Updated**: 30. Januar 2026
**Dependencies**: Nodemailer ^6.x, EmailService class
