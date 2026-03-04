const EmailService = require('./emailService');

// Test email sending
async function testEmail() {
    const emailService = new EmailService({
        service: 'gmail',
        user: 'hejlsvig@gmail.com',
        pass: process.argv[2], // Pass app password as argument
        fromName: 'Keto Calculator Test'
    });

    if (!emailService.isConfigured()) {
        console.error('❌ Email service not configured');
        process.exit(1);
    }

    console.log('✓ Email service configured');
    console.log('Testing email send to: odense26@hotmail.com');

    try {
        const result = await emailService.transporter.sendMail({
            from: '"Keto Calculator Test" <hejlsvig@gmail.com>',
            to: 'odense26@hotmail.com',
            subject: 'Test Email fra Keto Calculator',
            text: 'Dette er en test email. Hvis du modtager denne, virker email systemet!',
            html: '<h1>Test Email</h1><p>Hvis du modtager denne, virker email systemet!</p>'
        });

        console.log('✅ Email sent successfully!');
        console.log('Message ID:', result.messageId);
        console.log('Response:', result.response);
    } catch (error) {
        console.error('❌ Error sending email:', error);
        console.error('Error details:', error.message);
        if (error.code) console.error('Error code:', error.code);
    }
}

testEmail();
