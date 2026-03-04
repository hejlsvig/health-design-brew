const AuthService = require('./auth');

async function createCoach() {
    const authService = new AuthService();

    try {
        const user = await authService.createUser(
            'coach@test.dk',
            'coach123',
            'Test Coach',
            'coach',
            'coach@test.dk',
            'da'
        );

        console.log('✅ Coach bruger oprettet!');
        console.log('Email:', user.email);
        console.log('Navn:', user.name);
        console.log('Rolle:', user.role);
        console.log('\n🔓 Login på login.html med:');
        console.log('Email: coach@test.dk');
        console.log('Password: coach123');

        authService.close();
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Coach bruger eksisterer allerede!');
            console.log('\n🔓 Login med:');
            console.log('Email: coach@test.dk');
            console.log('Password: coach123');
        } else {
            console.error('❌ Fejl:', error.message);
        }
        authService.close();
        process.exit(error.message.includes('already exists') ? 0 : 1);
    }
}

createCoach();
