const AuthService = require('./auth');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function createAdmin() {
    console.log('\n🔐 Opret Admin Bruger\n');
    console.log('Dette script opretter en ny administrator til Keto Calculator systemet.\n');

    try {
        const name = await question('Fulde navn: ');
        const email = await question('Email: ');
        const password = await question('Adgangskode (min. 8 tegn): ');
        const personalEmail = await question('Personlig email (til klient kommunikation, kan være samme): ');
        const language = await question('Sprog (da/en/se) [da]: ') || 'da';

        if (!name || !email || !password) {
            console.error('❌ Navn, email og adgangskode er påkrævet!');
            process.exit(1);
        }

        if (password.length < 8) {
            console.error('❌ Adgangskode skal være mindst 8 tegn!');
            process.exit(1);
        }

        const authService = new AuthService();

        console.log('\n⏳ Opretter admin bruger...\n');

        const user = await authService.createUser(
            email,
            password,
            name,
            'admin',
            personalEmail || email,
            language
        );

        console.log('✅ Admin bruger oprettet succesfuldt!\n');
        console.log('📋 Bruger detaljer:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Navn: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Rolle: ${user.role}`);
        console.log(`   Sprog: ${language}`);
        console.log('\n🔓 Du kan nu logge ind på login.html med denne email og adgangskode.\n');

        authService.close();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Fejl ved oprettelse af bruger:', error.message);
        process.exit(1);
    }
}

createAdmin();
