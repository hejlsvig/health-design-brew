const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

class EmailService {
    constructor(config) {
        // Email configuration from environment or passed config
        this.config = {
            service: config.service || process.env.EMAIL_SERVICE || 'gmail',
            user: config.user || process.env.EMAIL_USER,
            pass: config.pass || process.env.EMAIL_PASSWORD,
            fromName: config.fromName || 'Keto Calculator',
            fromEmail: config.fromEmail || process.env.EMAIL_USER
        };

        // Database connection for email logging
        this.db = new sqlite3.Database('./keto_calculator.db', (err) => {
            if (err) {
                console.error('Error connecting to database for email logging:', err);
            }
        });

        // Create transporter if credentials are available
        if (this.config.user && this.config.pass) {
            // Handle One.com with custom SMTP settings
            if (this.config.service === 'one') {
                this.transporter = nodemailer.createTransport({
                    host: 'send.one.com',
                    port: 465,
                    secure: true, // SSL
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass
                    }
                });
                console.log('✓ Email service initialized (One.com SMTP)');
            } else {
                // Use built-in service configurations (gmail, outlook, etc.)
                this.transporter = nodemailer.createTransport({
                    service: this.config.service,
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass
                    }
                });
                console.log('✓ Email service initialized');
            }
        } else {
            this.transporter = null;
            console.warn('⚠️  Email service not configured. Set EMAIL_USER and EMAIL_PASSWORD.');
        }
    }

    /**
     * Log email to database
     */
    async logEmail(leadId, emailType, recipientEmail, subject, status = 'sent', errorMessage = null) {
        return new Promise((resolve, reject) => {
            const query = `
                INSERT INTO email_history (lead_id, email_type, recipient_email, subject, status, error_message)
                VALUES (?, ?, ?, ?, ?, ?)
            `;

            this.db.run(query, [leadId, emailType, recipientEmail, subject, status, errorMessage], function(err) {
                if (err) {
                    console.error('Error logging email to database:', err);
                    reject(err);
                } else {
                    resolve(this.lastID);
                }
            });
        });
    }

    /**
     * Check if email service is configured
     */
    isConfigured() {
        return this.transporter !== null;
    }

    /**
     * Send meal plan PDF via email
     */
    async sendMealPlan(leadData, pdfPath, mealPlanData = null, language = 'da') {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const { email, name, id: leadId } = leadData;
        const lang = language.toLowerCase();

        // Default meal plan data if not provided
        const planData = mealPlanData || { days: 7, mealsPerDay: 3 };

        // Email templates by language
        const templates = {
            da: {
                subject: 'Din Personlige Keto Madplan er Klar!',
                html: this.getDanishEmailTemplate(name, planData),
                text: this.getDanishEmailText(name, planData)
            },
            en: {
                subject: 'Your Personal Keto Meal Plan is Ready!',
                html: this.getEnglishEmailTemplate(name, planData),
                text: this.getEnglishEmailText(name, planData)
            },
            se: {
                subject: 'Din Personliga Keto Måltidsplan är Klar!',
                html: this.getSwedishEmailTemplate(name, planData),
                text: this.getSwedishEmailText(name, planData)
            }
        };

        const template = templates[lang] || templates['da'];

        // Email options
        const mailOptions = {
            from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
            to: email,
            subject: template.subject,
            text: template.text,
            html: template.html,
            attachments: [
                {
                    filename: 'Keto-Madplan.pdf',
                    path: pdfPath,
                    contentType: 'application/pdf'
                }
            ]
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✓ Email sent to:', email);
            console.log('  Message ID:', info.messageId);

            // Log successful email send
            if (leadId) {
                await this.logEmail(leadId, 'meal_plan', email, template.subject, 'sent', null);
            }

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Error sending email:', error);

            // Log failed email attempt
            if (leadId) {
                await this.logEmail(leadId, 'meal_plan', email, template.subject, 'failed', error.message);
            }

            throw error;
        }
    }

    /**
     * Send welcome email when lead signs up
     */
    async sendWelcomeEmail(leadData, language = 'da') {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const { email, name, id: leadId } = leadData;
        const lang = language.toLowerCase();

        const templates = {
            da: {
                subject: 'Velkommen til Keto Calculator!',
                html: this.getWelcomeEmailTemplate(name, 'da'),
                text: `Hej ${name || 'der'},\n\nTak fordi du brugte vores Keto Calculator!\n\nDin personlige madplan er på vej.\n\nVenlig hilsen,\nKeto Calculator Team`
            }
        };

        const template = templates[lang] || templates['da'];

        const mailOptions = {
            from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
            to: email,
            subject: template.subject,
            text: template.text,
            html: template.html
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✓ Welcome email sent to:', email);

            // Log successful email send
            if (leadId) {
                await this.logEmail(leadId, 'welcome', email, template.subject, 'sent', null);
            }

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Error sending welcome email:', error);

            // Log failed email attempt
            if (leadId) {
                await this.logEmail(leadId, 'welcome', email, template.subject, 'failed', error.message);
            }

            throw error;
        }
    }

    /**
     * Send weekly check-in reminder with link
     */
    async sendCheckinReminder(leadData, checkinLink, language = 'da') {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        const { email, name, id: leadId } = leadData;
        const lang = language.toLowerCase();

        const templates = {
            da: {
                subject: 'Tid til Ugentlig Check-in - Keto Coaching',
                html: this.getCheckinReminderTemplate(name, checkinLink, 'da'),
                text: this.getCheckinReminderText(name, checkinLink)
            },
            en: {
                subject: 'Weekly Check-in Time - Keto Coaching',
                html: this.getCheckinReminderTemplate(name, checkinLink, 'en'),
                text: `Hi ${name || 'there'},\n\nTime for your weekly check-in!\n\nClick here to complete your check-in: ${checkinLink}\n\nBest regards,\nKeto Calculator Team`
            },
            se: {
                subject: 'Dags för Veckovis Incheckning - Keto Coaching',
                html: this.getCheckinReminderTemplate(name, checkinLink, 'se'),
                text: `Hej ${name || 'där'},\n\nDags för din veckovisa incheckning!\n\nKlicka här för att slutföra din incheckning: ${checkinLink}\n\nVänliga hälsningar,\nKeto Calculator Team`
            }
        };

        const template = templates[lang] || templates['da'];

        const mailOptions = {
            from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
            to: email,
            subject: template.subject,
            text: template.text,
            html: template.html
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✓ Check-in reminder sent to:', email);

            // Log successful email send
            if (leadId) {
                await this.logEmail(leadId, 'checkin_reminder', email, template.subject, 'sent', null);
            }

            return {
                success: true,
                messageId: info.messageId
            };
        } catch (error) {
            console.error('Error sending check-in reminder:', error);

            // Log failed email attempt
            if (leadId) {
                await this.logEmail(leadId, 'checkin_reminder', email, template.subject, 'failed', error.message);
            }

            throw error;
        }
    }

    // ==========================================
    // EMAIL TEMPLATES - DANISH
    // ==========================================

    getDanishEmailTemplate(name, planData) {
        const { days, mealsPerDay } = planData;
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
        .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Din Keto Madplan er Klar!</h1>
        </div>
        <div class="content">
            <p>Hej ${name || 'der'},</p>

            <p>Tak fordi du brugte vores Keto Calculator! Vi har lavet en <strong>personlig ${days}-dages keto madplan</strong> specielt til dig.</p>

            <div class="highlight">
                <strong>Din madplan er vedhæftet som PDF</strong><br>
                Du finder din komplette madplan inklusiv indkøbsliste i den vedhæftede PDF fil.
            </div>

            <h3>Hvad indeholder madplanen?</h3>
            <ul>
                <li>${days} dages komplet meal plan med ${mealsPerDay} måltider per dag</li>
                <li>Indkøbsliste (organiseret efter kategorier)</li>
                <li>Detaljerede opskrifter med ingrediensmængder</li>
                <li>Næringsværdier for hver ret (kalorier, protein, fedt, net kulhydrat)</li>
                <li>Keto makro-fordeling (~70% fedt, ~25% protein, ~5% kulhydrat)</li>
                <li>Praktiske tips & tricks</li>
            </ul>

            <h3>Næste Skridt:</h3>
            <ol>
                <li>Åbn den vedhæftede PDF</li>
                <li>Gennemgå indkøbslisten</li>
                <li>Køb ind til dine måltider</li>
                <li>Følg madplanen dag for dag</li>
                <li>Nyd vejen til dine vægttabs mål!</li>
            </ol>

            <p style="margin-top: 30px;">Held og lykke med din keto rejse!</p>

            <p>Venlig hilsen,<br>
            <strong>Keto Calculator Team</strong></p>
        </div>
        <div class="footer">
            <p>Dette er en automatisk email. Svar ikke på denne besked.</p>
            <p style="font-size: 12px; margin-top: 10px;">
                Genereret med Keto Calculator • ${new Date().getFullYear()}
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getDanishEmailText(name, planData) {
        const { days, mealsPerDay } = planData;
        return `
Hej ${name || 'der'},

Tak fordi du brugte vores Keto Calculator!

Din personlige ${days}-dages keto madplan er vedhæftet som PDF.

Madplanen indeholder:
- ${days} dages komplet meal plan med ${mealsPerDay} måltider per dag
- Indkøbsliste
- Detaljerede opskrifter
- Næringsværdier for hver ret
- Keto makro-fordeling
- Tips & tricks

Næste skridt:
1. Åbn den vedhæftede PDF
2. Gennemgå indkøbslisten
3. Køb ind til dine måltider
4. Følg madplanen dag for dag

Held og lykke med din keto rejse!

Venlig hilsen,
Keto Calculator Team
        `;
    }

    // ==========================================
    // EMAIL TEMPLATES - ENGLISH
    // ==========================================

    getEnglishEmailTemplate(name, planData) {
        const { days, mealsPerDay } = planData;
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
        .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Your Keto Meal Plan is Ready!</h1>
        </div>
        <div class="content">
            <p>Hi ${name || 'there'},</p>

            <p>Thank you for using our Keto Calculator! We've created a <strong>personalized ${days}-day keto meal plan</strong> just for you.</p>

            <div class="highlight">
                <strong>Your meal plan is attached as PDF</strong><br>
                You'll find your complete meal plan including shopping list in the attached PDF file.
            </div>

            <h3>What's included?</h3>
            <ul>
                <li>${days}-day complete meal plan with ${mealsPerDay} meals per day</li>
                <li>Shopping list (organized by categories)</li>
                <li>Detailed recipes with ingredient amounts</li>
                <li>Nutritional values for each meal (calories, protein, fat, net carbs)</li>
                <li>Keto macro distribution (~70% fat, ~25% protein, ~5% carbs)</li>
                <li>Practical tips & tricks</li>
            </ul>

            <p style="margin-top: 30px;">Good luck on your keto journey!</p>

            <p>Best regards,<br>
            <strong>Keto Calculator Team</strong></p>
        </div>
        <div class="footer">
            <p>This is an automated email. Please do not reply.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getEnglishEmailText(name, planData) {
        const { days, mealsPerDay } = planData;
        return `Hi ${name || 'there'},\n\nYour personalized ${days}-day keto meal plan with ${mealsPerDay} meals per day is attached as PDF.\n\nGood luck on your keto journey!\n\nBest regards,\nKeto Calculator Team`;
    }

    // ==========================================
    // EMAIL TEMPLATES - SWEDISH
    // ==========================================

    getSwedishEmailTemplate(name, planData) {
        const { days, mealsPerDay } = planData;
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
        .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Din Keto Måltidsplan är Klar!</h1>
        </div>
        <div class="content">
            <p>Hej ${name || 'där'},</p>

            <p>Tack för att du använde vår Keto Calculator! Vi har skapat en <strong>personlig ${days}-dagars keto måltidsplan</strong> speciellt för dig.</p>

            <div class="highlight">
                <strong>Din måltidsplan är bifogad som PDF</strong><br>
                Du hittar din kompletta måltidsplan inklusive inköpslista i den bifogade PDF-filen.
            </div>

            <h3>Vad ingår?</h3>
            <ul>
                <li>${days}-dagars komplett måltidsplan med ${mealsPerDay} måltider per dag</li>
                <li>Inköpslista (organiserad efter kategorier)</li>
                <li>Detaljerade recept med ingrediensmängder</li>
                <li>Näringsvärden för varje måltid (kalorier, protein, fett, netto kolhydrater)</li>
                <li>Keto makrofördelning (~70% fett, ~25% protein, ~5% kolhydrater)</li>
                <li>Praktiska tips & tricks</li>
            </ul>

            <p style="margin-top: 30px;">Lycka till på din keto resa!</p>

            <p>Vänliga hälsningar,<br>
            <strong>Keto Calculator Team</strong></p>
        </div>
        <div class="footer">
            <p>Detta är ett automatiskt e-postmeddelande. Svara inte på detta meddelande.</p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getSwedishEmailText(name, planData) {
        const { days, mealsPerDay } = planData;
        return `Hej ${name || 'där'},\n\nDin personliga ${days}-dagars keto måltidsplan med ${mealsPerDay} måltider per dag är bifogad som PDF.\n\nLycka till på din keto resa!\n\nVänliga hälsningar,\nKeto Calculator Team`;
    }

    getWelcomeEmailTemplate(name, language) {
        // Simple welcome template
        return this.getDanishEmailTemplate(name);
    }

    // ==========================================
    // CHECK-IN REMINDER TEMPLATES
    // ==========================================

    getCheckinReminderTemplate(name, checkinLink, language = 'da') {
        const translations = {
            da: {
                title: 'Tid til Ugentlig Check-in',
                greeting: 'Hej',
                intro: 'Det er tid til at udfylde dit ugentlige check-in! Dette hjælper os med at følge din fremgang og justere din coaching efter behov.',
                whatIncluded: 'Check-in\'en indeholder:',
                items: [
                    'Vægt og kroppsmål',
                    'Energiniveau og søvnkvalitet',
                    'Humør og trivsel',
                    'Madplans opfølgning',
                    'Udfordringer og succeser'
                ],
                cta: 'Klik på knappen nedenfor for at udfylde din check-in:',
                buttonText: 'Udfyld Check-in',
                note: 'Det tager kun 2-3 minutter og giver værdifuld indsigt i din keto rejse.',
                closing: 'Venlig hilsen',
                team: 'Keto Calculator Team'
            },
            en: {
                title: 'Weekly Check-in Time',
                greeting: 'Hi',
                intro: 'It\'s time to complete your weekly check-in! This helps us track your progress and adjust your coaching as needed.',
                whatIncluded: 'The check-in includes:',
                items: [
                    'Weight and body measurements',
                    'Energy level and sleep quality',
                    'Mood and wellbeing',
                    'Meal plan follow-up',
                    'Challenges and successes'
                ],
                cta: 'Click the button below to complete your check-in:',
                buttonText: 'Complete Check-in',
                note: 'It only takes 2-3 minutes and provides valuable insight into your keto journey.',
                closing: 'Best regards',
                team: 'Keto Calculator Team'
            },
            se: {
                title: 'Dags för Veckovis Incheckning',
                greeting: 'Hej',
                intro: 'Det är dags att fylla i din veckovisa incheckning! Detta hjälper oss att följa dina framsteg och justera din coaching efter behov.',
                whatIncluded: 'Incheckningen innehåller:',
                items: [
                    'Vikt och kroppsmått',
                    'Energinivå och sömnkvalitet',
                    'Humör och välbefinnande',
                    'Måltidsplan uppföljning',
                    'Utmaningar och framgångar'
                ],
                cta: 'Klicka på knappen nedan för att fylla i din incheckning:',
                buttonText: 'Fyll i Incheckning',
                note: 'Det tar bara 2-3 minuter och ger värdefull insikt i din keto resa.',
                closing: 'Vänliga hälsningar',
                team: 'Keto Calculator Team'
            }
        };

        const t = translations[language] || translations['da'];

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0; }
        .header h1 { margin: 0; font-size: 28px; }
        .content { background: #ffffff; padding: 30px; border: 1px solid #e0e0e0; }
        .footer { background: #f8f9fa; padding: 20px; text-align: center; border-radius: 0 0 12px 12px; font-size: 14px; color: #666; }
        .btn { display: inline-block; background: #667eea; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: 600; font-size: 16px; }
        .btn:hover { background: #5568d3; }
        .highlight { background: #e7f3ff; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
        ul { padding-left: 20px; }
        li { margin: 8px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${t.title}</h1>
        </div>
        <div class="content">
            <p>${t.greeting} ${name || 'der'},</p>

            <p>${t.intro}</p>

            <div class="highlight">
                <strong>${t.whatIncluded}</strong>
                <ul>
                    ${t.items.map(item => `<li>${item}</li>`).join('\n                    ')}
                </ul>
            </div>

            <p>${t.cta}</p>

            <div style="text-align: center;">
                <a href="${checkinLink}" class="btn">${t.buttonText}</a>
            </div>

            <p style="color: #666; font-size: 14px; margin-top: 20px;">
                ${t.note}
            </p>

            <p style="margin-top: 30px;">${t.closing},<br>
            <strong>${t.team}</strong></p>
        </div>
        <div class="footer">
            <p>Dette er en automatisk email. Svar ikke på denne besked.</p>
            <p style="font-size: 12px; margin-top: 10px;">
                Genereret med Keto Calculator • ${new Date().getFullYear()}
            </p>
        </div>
    </div>
</body>
</html>
        `;
    }

    getCheckinReminderText(name, checkinLink) {
        return `
Hej ${name || 'der'},

Det er tid til at udfylde dit ugentlige check-in!

Check-in'en indeholder:
- Vægt og kroppsmål
- Energiniveau og søvnkvalitet
- Humør og trivsel
- Madplans opfølgning
- Udfordringer og succeser

Udfyld din check-in her: ${checkinLink}

Det tager kun 2-3 minutter og giver værdifuld indsigt i din keto rejse.

Venlig hilsen,
Keto Calculator Team
        `;
    }

    /**
     * Update email configuration at runtime
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };

        if (this.config.user && this.config.pass) {
            // Handle One.com with custom SMTP settings
            if (this.config.service === 'one') {
                this.transporter = nodemailer.createTransport({
                    host: 'send.one.com',
                    port: 465,
                    secure: true, // SSL
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass
                    }
                });
                console.log('✓ Email service re-initialized with new config (One.com SMTP)');
            } else {
                // Use built-in service configurations (gmail, outlook, etc.)
                this.transporter = nodemailer.createTransport({
                    service: this.config.service,
                    auth: {
                        user: this.config.user,
                        pass: this.config.pass
                    }
                });
                console.log('✓ Email service re-initialized with new config');
            }
        }
    }

    /**
     * Send a custom email message
     */
    async sendCustomEmail(toEmail, subject, message, leadId = null, userId = null, customFooter = null, customLogo = null) {
        if (!this.isConfigured()) {
            throw new Error('Email service not configured');
        }

        // Use custom footer if provided, otherwise use default
        const footerContent = customFooter
            ? customFooter.replace(/\n/g, '<br>')
            : `Med venlig hilsen,<br>${this.config.fromName}`;

        // Add logo to footer if provided
        const logoHtml = customLogo
            ? `<div style="margin-bottom: 15px;"><img src="${customLogo}" alt="Logo" style="max-width: 150px; height: auto;"></div>`
            : '';

        const mailOptions = {
            from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
            to: toEmail,
            subject: subject,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .message { white-space: pre-wrap; }
                        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="message">${message.replace(/\n/g, '<br>')}</div>
                        <div class="footer">
                            ${logoHtml}
                            <p>${footerContent}</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            await this.transporter.sendMail(mailOptions);

            // Log email to database
            if (leadId) {
                await this.logEmail(leadId, 'custom', toEmail, subject, 'sent');
            }

            return { success: true };
        } catch (error) {
            console.error('Error sending custom email:', error);

            // Log failed email
            if (leadId) {
                await this.logEmail(leadId, 'custom', toEmail, subject, 'failed', error.message);
            }

            throw error;
        }
    }
}

module.exports = EmailService;
