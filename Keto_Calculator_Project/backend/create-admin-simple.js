const AuthService = require('./auth');

async function createAdmin() {
    const authService = new AuthService();

    try {
        const user = await authService.createUser(
            'hejlsvig@gmail.com',
            'admin123',
            'Anders Hejlsvig',
            'admin',
            'hejlsvig@gmail.com',
            'da'
        );

        console.log('✅ Admin bruger oprettet!');
        console.log('Email:', user.email);
        console.log('Navn:', user.name);
        console.log('Rolle:', user.role);
        console.log('\n🔓 Login på login.html med:');
        console.log('Email: hejlsvig@gmail.com');
        console.log('Password: admin123');

        authService.close();
    } catch (error) {
        if (error.message.includes('already exists')) {
            console.log('✅ Admin bruger eksisterer allerede!');
            console.log('\n🔓 Login med:');
            console.log('Email: hejlsvig@gmail.com');
            console.log('Password: admin123');
        } else {
            console.error('❌ Fejl:', error.message);
        }
        authService.close();
        process.exit(error.message.includes('already exists') ? 0 : 1);
    }
}

createAdmin();
