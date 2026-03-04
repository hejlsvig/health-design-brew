# 📧 Email Integration Guide - Keto Calculator

## Oversigt

Keto Calculator kan nu automatisk sende AI-genererede madplaner via email til dine klienter! Dette giver dig to workflows:

1. **Offentlig Calculator** → Auto-generering + email til bruger
2. **Admin Dashboard** → Manuel generering med valgfri email sending

## 🚀 Hurtig Opsætning

### Step 1: Gmail App Password (Anbefalet)

For at bruge Gmail til at sende emails, skal du bruge en **App Password** (ikke din normale password):

1. **Aktivér 2-faktor autentificering** på din Google konto:
   - Gå til https://myaccount.google.com/security
   - Find "2-Step Verification" og aktiver det

2. **Generer App Password**:
   - Gå til https://myaccount.google.com/apppasswords
   - Vælg "Mail" og "Mac" (eller andet device)
   - Klik "Generate"
   - Google viser en 16-tegns password (f.eks. `abcd efgh ijkl mnop`)
   - **Gem denne password!** Du kan ikke se den igen

### Step 2: Konfigurer via Admin Interface

1. Åbn Admin Dashboard: `http://localhost:3000/admin.html`
2. Klik **"⚙️ Madplan Indstillinger"**
3. Scroll ned til "📧 Email Konfiguration"
4. Udfyld:
   - **Email Service**: `Gmail` (standard)
   - **Email Adresse**: Din Gmail adresse (f.eks. `din-email@gmail.com`)
   - **Email Password**: Den 16-tegns App Password fra Step 1
   - **Afsender Navn**: `Keto Calculator` (eller dit brand navn)
5. Klik **"💾 Gem Email Konfiguration"**
6. Verify status viser: ✅ Konfigureret

### Alternative: Environment Variables

For produktion kan du sætte email credentials via environment variables:

```bash
# .env file
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password-here
EMAIL_FROM_NAME=Keto Calculator
```

Derefter restart serveren:
```bash
cd backend
node server.js
```

## 📤 Sådan Sender Du Madplaner

### Fra Admin Dashboard

1. Åbn en lead i Admin Dashboard
2. Check boksen **"📧 Send madplan via email til [email]"**
3. Klik **"🤖 Generer Madplan"**
4. Vent mens madplanen genereres (10-30 sekunder)
5. Madplanen sendes automatisk + downloades til dig

### Manuel Download (Uden Email)

1. Lad checkboxen være unchecked
2. Klik **"🤖 Generer Madplan"**
3. PDF downloades kun til dig (ingen email sendes)

## 📧 Email Templates

### Dansk Email (Standard)
```
Emne: 🥑 Din Personlige Keto Madplan er Klar!

Hej [Navn],

Tak fordi du brugte vores Keto Calculator!
Vi har lavet en personlig 7-dages keto madplan specielt til dig.

📎 Din madplan er vedhæftet som PDF

Madplanen indeholder:
✅ 7 dages komplet meal plan
✅ Ugentlig indkøbsliste
✅ Detaljerede opskrifter
✅ Næringsværdier
✅ Keto makro-fordeling
✅ Tips & tricks

Held og lykke med din keto rejse!

Venlig hilsen,
Keto Calculator Team
```

### Engelsk & Svensk
Automatisk valgt baseret på brugerens sprog valg i calculatoren.

## 🎨 Email Features

- ✅ **Responsive HTML design** - Ser godt ud på mobil og desktop
- ✅ **PDF attachment** - Madplan vedhæftet direkte
- ✅ **Multi-sprog support** - DA/EN/SE automatisk
- ✅ **Professional branding** - Pæn header med gradient
- ✅ **Plain text fallback** - Virker selv uden HTML support

## 🔒 Sikkerhed & Privacy

### Gmail App Password Fordele:
- ✅ Ikke din rigtige password
- ✅ Kan tilbagekaldes uden at ændre hovedpassword
- ✅ Begrænset scope (kun email sending)
- ✅ Ingen adgang til andre Google services

### Best Practices:
1. **Aldrig gem password i kode** - Brug environment variables
2. **Brug dedikeret email** - Opret en separat Gmail til business
3. **Monitor forbrug** - Gmail har 500 emails/dag gratis limit
4. **Test før produktion** - Send test email til dig selv først

## 🛠️ Email Service Providers

### Gmail (Anbefalet for Start)
- ✅ **Gratis**: 500 emails/dag
- ✅ **Pålidelig**: Google infrastructure
- ✅ **Let opsætning**: Bare App Password
- ❌ **Begrænsning**: 500/dag limit

**Konfiguration:**
```javascript
service: 'gmail'
user: 'your-email@gmail.com'
pass: 'app-password-here'
```

### Outlook/Hotmail
- ✅ **Gratis**: 300 emails/dag
- ✅ **Alternativ til Gmail**

**Konfiguration:**
```javascript
service: 'outlook'
user: 'your-email@outlook.com'
pass: 'your-password'
```

### SendGrid (For Skalering)
- ✅ **100 emails/dag gratis**
- ✅ **Pro features**: Analytics, templates, scheduling
- ✅ **Scalable**: 40,000+ emails/dag med betalt plan

**Konfiguration:**
```javascript
service: 'SendGrid'
auth: {
    user: 'apikey',
    pass: 'SG.your-api-key-here'
}
```

### Mailgun (For Udvikling)
- ✅ **5,000 emails gratis første 3 måneder**
- ✅ **Developer friendly**: REST API

## 📊 Email Tracking (Fremtidig Feature)

Kommende features:
- [ ] Email open tracking
- [ ] Link click tracking
- [ ] Delivery confirmation
- [ ] Bounce handling
- [ ] Unsubscribe management

## 🐛 Troubleshooting

### "Email service not configured"
**Problem**: Email credentials ikke sat
**Løsning**: Gå til "Madplan Indstillinger" og konfigurer email

### "Invalid login"
**Problem**: Forkert password eller ikke App Password
**Løsning**:
1. Tjek at du bruger App Password (ikke normal password)
2. Verificer at 2FA er aktiveret på Google konto
3. Generer ny App Password

### "535-5.7.8 Username and Password not accepted"
**Problem**: Gmail App Password fejl
**Løsning**:
1. Gå til https://myaccount.google.com/apppasswords
2. Slet gammel App Password
3. Generer ny App Password
4. Opdater konfiguration

### Email sendes ikke (ingen fejl)
**Problem**: Email blokkeret af Gmail sikkerhed
**Løsning**:
1. Tjek https://myaccount.google.com/notifications
2. Godkend "less secure app" hvis nødvendigt
3. Tjek "Sent" folder i Gmail

### "Daily sending quota exceeded"
**Problem**: Over 500 emails/dag på Gmail
**Løsning**:
1. Vent 24 timer
2. Overvej SendGrid eller Mailgun
3. Brug flere Gmail konti med load balancing

## 🔧 Advanced Configuration

### Custom SMTP Server

```javascript
// I emailService.js kan du bruge custom SMTP:
const transporter = nodemailer.createTransport({
    host: 'smtp.your-domain.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: 'your-username',
        pass: 'your-password'
    }
});
```

### Email Templates Customization

Email templates findes i `/backend/emailService.js`:

- `getDanishEmailTemplate()` - Dansk HTML email
- `getEnglishEmailTemplate()` - Engelsk HTML email
- `getSwedishEmailTemplate()` - Svensk HTML email

Du kan redigere disse for at tilpasse:
- Farver & styling
- Logo & branding
- Indhold & budskaber

## 📈 Production Checklist

Før du går live:

- [ ] Sæt email credentials via environment variables
- [ ] Test email sending til dig selv
- [ ] Verificer PDF vedhæftet korrekt
- [ ] Tjek spam score (mail-tester.com)
- [ ] Monitor daily sending limits
- [ ] Setup fallback email service
- [ ] Add unsubscribe link (GDPR)
- [ ] Log email sending (success/failure)

## 💰 Cost Estimering

### Gmail Gratis Tier
- **Pris**: $0/måned
- **Limit**: 500 emails/dag
- **Perfekt til**: Opstart, testing, <15,000 emails/måned

### SendGrid Essentials
- **Pris**: $19.95/måned
- **Inkluderet**: 50,000 emails/måned
- **Perfekt til**: Vækst fase, 50-100 madplaner/dag

### Mailgun Flex
- **Pris**: Pay as you go
- **Cost**: $0.80 per 1,000 emails
- **Perfekt til**: Variable volumen

## 🎯 Use Cases

### Use Case 1: Lead Magnet
1. Bruger udfylder calculator
2. Madplan genereres automatisk
3. Email sendes med PDF vedhæftet
4. → Lead bliver warm til coaching

### Use Case 2: Onboarding Email
1. Ny coaching klient
2. Generer velkomst madplan manuelt
3. Send via email
4. → Klienten starter med klar plan

### Use Case 3: Monthly Updates
1. Hver måned genereres ny madplan variation
2. Batch send til alle aktive klienter
3. → Holder klienter engaged

## 📞 Support

### Email Issues
1. Tjek server logs: `tail -f backend/server.log`
2. Test med curl:
```bash
curl -X POST http://localhost:3000/api/admin/set-email-config \
  -H "Content-Type: application/json" \
  -d '{"emailUser":"test@gmail.com","emailPassword":"app-password","emailService":"gmail"}'
```

### Gmail Specific
- Gmail Help: https://support.google.com/mail
- App Passwords: https://support.google.com/accounts/answer/185833
- SMTP Settings: https://support.google.com/mail/answer/7126229

---

**Version**: 3.1 (Email Integration)
**Last Updated**: 30. Januar 2026
**Dependencies**: Nodemailer ^6.x
