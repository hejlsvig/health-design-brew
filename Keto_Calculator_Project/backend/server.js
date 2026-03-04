const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const MealPlanGenerator = require('./mealPlanGenerator');
const EmailService = require('./emailService');
const AuthService = require('./auth');

const app = express();
const PORT = 3000;

// Initialize meal plan generator (will be set up with API key from env or config)
let mealPlanGenerator = null;
let emailService = null;

// Try to load OpenAI API key from environment, config file, or database
let OPENAI_API_KEY = process.env.OPENAI_API_KEY || null;

// Try to load from config file if not in environment
if (!OPENAI_API_KEY) {
    try {
        const configPath = path.join(__dirname, 'openai-key.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            OPENAI_API_KEY = config.apiKey;
            console.log('✓ OpenAI API key loaded from config file');
        }
    } catch (error) {
        console.warn('⚠️  Could not load OpenAI key from config file:', error.message);
    }
}

if (OPENAI_API_KEY) {
    try {
        // Read config for model settings
        const configPath = path.join(__dirname, 'openai-key.json');
        let modelConfig = {};
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            modelConfig = {
                model: config.model || 'gpt-4o',
                maxCompletionTokens: config.maxCompletionTokens || config.maxTokens || 16000,
                temperature: config.temperature || 0.7
            };
        }
        mealPlanGenerator = new MealPlanGenerator(OPENAI_API_KEY, modelConfig);
        console.log('✓ Meal Plan Generator initialized with OpenAI API key');
    } catch (error) {
        console.warn('⚠️  Could not initialize Meal Plan Generator:', error.message);
    }
} else {
    console.warn('⚠️  No OPENAI_API_KEY found. Meal plan generation will not be available.');
    console.warn('   Set OPENAI_API_KEY environment variable or configure via admin panel.');
}

// Initialize email service from environment or config file
let EMAIL_USER = process.env.EMAIL_USER || null;
let EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || null;
let EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'gmail';
let EMAIL_FROM_NAME = process.env.EMAIL_FROM_NAME || 'Keto Calculator';

// Try to load from config file if not in environment
if (!EMAIL_USER || !EMAIL_PASSWORD) {
    try {
        const configPath = path.join(__dirname, 'email-config.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            EMAIL_USER = config.emailUser;
            EMAIL_PASSWORD = config.emailPassword;
            EMAIL_SERVICE = config.service || 'gmail';
            EMAIL_FROM_NAME = config.fromName || 'Keto Calculator';
            console.log('✓ Email configuration loaded from config file');
        }
    } catch (error) {
        console.warn('⚠️  Could not load email config from file:', error.message);
    }
}

try {
    emailService = new EmailService({
        service: EMAIL_SERVICE,
        user: EMAIL_USER,
        pass: EMAIL_PASSWORD,
        fromName: EMAIL_FROM_NAME,
        fromEmail: EMAIL_USER
    });
    if (emailService.isConfigured()) {
        console.log('✓ Email Service initialized');
    } else {
        console.warn('⚠️  Email service not configured. Configure via admin panel.');
    }
} catch (error) {
    console.warn('⚠️  Could not initialize Email Service:', error.message);
}

// Middleware
const isProduction = process.env.NODE_ENV === 'production';

// CORS — domæner fra env-variabel eller fallback
const CORS_ORIGINS_ENV = process.env.CORS_ALLOWED_ORIGINS || '';
const ALLOWED_ORIGINS = [
    ...CORS_ORIGINS_ENV.split(',').map(o => o.trim()).filter(Boolean),
    ...(CORS_ORIGINS_ENV ? [] : ['https://shiftingsource.com', 'https://www.shiftingsource.com']),
    ...(isProduction ? [] : ['http://localhost:5173', 'http://localhost:3000']),
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Ikke tilladt af CORS'));
        }
    },
    credentials: true
}));
app.use(bodyParser.json());
if (!process.env.SESSION_SECRET) {
    console.warn('⚠️  SESSION_SECRET er ikke sat! Brug en stærk, unik nøgle i production.');
}
app.use(session({
    secret: process.env.SESSION_SECRET || 'keto-calculator-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: isProduction,        // HTTPS-only i production
        httpOnly: true,              // Forhindrer JavaScript-adgang
        sameSite: 'lax',             // CSRF-beskyttelse
        maxAge: 24 * 60 * 60 * 1000 // 24 timer
    }
}));

// Initialize auth service
const authService = new AuthService();

// Auth middleware to check if user is logged in
const requireAuth = (req, res, next) => {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized - Please log in' });
    }
};

// Admin-only middleware
const requireAdmin = (req, res, next) => {
    if (req.session && req.session.userId && req.session.userRole === 'admin') {
        next();
    } else {
        res.status(403).json({ error: 'Forbidden - Admin access required' });
    }
};
// Website (public calculator) served at root
app.use(express.static(path.join(__dirname, '../website')));
// CRM (admin dashboard) served under /crm/
app.use('/crm', express.static(path.join(__dirname, '../crm')));
// Translation files for CRM i18n
app.use('/translations', express.static(path.join(__dirname, '../translations')));

// Backward-compatibility redirects: old prototype URLs → /crm/
['admin.html','login.html','lead-profil.html','coaching-profil.html',
 'checkin.html','users.html','noter.html','email-automation.html',
 'emails-oversigt.html','layout.html','meal-plan-settings.html',
 'admin-checkins.html'].forEach(page => {
    app.get(`/${page}`, (req, res) => {
        const qs = req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '';
        res.redirect(301, `/crm/${page}${qs}`);
    });
});

// Database setup
const db = new sqlite3.Database(path.join(__dirname, 'keto_calculator.db'), (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('✓ Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Leads table - alle der har lavet en madplan
    db.run(`
        CREATE TABLE IF NOT EXISTS leads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            name TEXT,
            gdpr_consent BOOLEAN DEFAULT 0,
            language TEXT,
            units TEXT,
            gender TEXT,
            age INTEGER,
            weight REAL,
            height REAL,
            activity TEXT,
            bmr INTEGER,
            tdee INTEGER,
            weight_goal REAL,
            daily_calories INTEGER,
            meals_per_day INTEGER,
            prep_time TEXT,
            num_days INTEGER,
            leftovers BOOLEAN,
            excluded_ingredients TEXT,
            selected_ingredients TEXT,
            diet_type TEXT,
            admin_comments TEXT,
            first_contact_date DATETIME,
            last_contact_date DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Error creating leads table:', err);
        } else {
            console.log('✓ Leads table ready');
        }
    });

    // Coaching clients table - aktive coaching klienter
    db.run(`
        CREATE TABLE IF NOT EXISTS coaching_clients (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER,
            status TEXT DEFAULT 'active',
            start_date DATE,
            end_date DATE,
            notes TEXT,
            access_token TEXT,
            FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating coaching_clients table:', err);
        } else {
            console.log('✓ Coaching clients table ready');

            // Add access_token column if it doesn't exist (for existing databases)
            db.run(`
                ALTER TABLE coaching_clients ADD COLUMN access_token TEXT
            `, (err) => {
                if (err && !err.message.includes('duplicate column')) {
                    console.error('Error adding access_token column:', err);
                }

                // Generate tokens for existing clients without one
                db.all(`SELECT id FROM coaching_clients WHERE access_token IS NULL`, [], (err, rows) => {
                    if (err) {
                        console.error('Error fetching clients without tokens:', err);
                        return;
                    }

                    if (rows && rows.length > 0) {
                        console.log(`✓ Generating tokens for ${rows.length} existing coaching clients...`);
                        rows.forEach(row => {
                            const token = crypto.randomUUID();
                            db.run(`UPDATE coaching_clients SET access_token = ? WHERE id = ?`, [token, row.id], (err) => {
                                if (err) {
                                    console.error(`Error updating token for client ${row.id}:`, err);
                                }
                            });
                        });
                    }
                });
            });
        }
    });

    // Weekly check-ins table - vægt tracking
    db.run(`
        CREATE TABLE IF NOT EXISTS weekly_checkins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            coaching_client_id INTEGER,
            weight REAL,
            week_number INTEGER,
            mood INTEGER,
            energy INTEGER,
            hunger TEXT,
            cravings TEXT,
            sleep_hours REAL,
            sleep_quality INTEGER,
            digestion TEXT,
            activity TEXT,
            fasting_hours INTEGER,
            fasting_feeling TEXT,
            stress_factors TEXT,
            weekly_win TEXT,
            deviations TEXT,
            notes TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (coaching_client_id) REFERENCES coaching_clients(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating weekly_checkins table:', err);
        } else {
            console.log('✓ Weekly check-ins table ready');
        }
    });

    // Generated meal plans table
    db.run(`
        CREATE TABLE IF NOT EXISTS generated_meal_plans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lead_id INTEGER NOT NULL,
            pdf_filename TEXT NOT NULL,
            pdf_path TEXT NOT NULL,
            tokens_used INTEGER,
            cost_usd REAL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lead_id) REFERENCES leads(id)
        )
    `, (err) => {
        if (err) {
            console.error('Error creating generated_meal_plans table:', err);
        } else {
            console.log('✓ Generated meal plans table ready');
        }
    });
}

// ========================================
// API ENDPOINTS
// ========================================

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Keto Calculator Backend Running' });
});

// Translations endpoint
app.get('/api/translations', (req, res) => {
    try {
        const translationsPath = path.join(__dirname, 'translations.json');
        if (fs.existsSync(translationsPath)) {
            const translations = JSON.parse(fs.readFileSync(translationsPath, 'utf8'));
            res.json(translations);
        } else {
            res.status(404).json({ error: 'Translations file not found' });
        }
    } catch (error) {
        console.error('Error loading translations:', error);
        res.status(500).json({ error: 'Failed to load translations' });
    }
});

// Debug endpoint - check service status
app.get('/api/admin/service-status', requireAdmin, (req, res) => {
    res.json({
        mealPlanGenerator: {
            configured: mealPlanGenerator !== null,
            ready: mealPlanGenerator ? true : false
        },
        emailService: {
            configured: emailService ? emailService.isConfigured() : false,
            fromEmail: emailService && emailService.isConfigured() ? emailService.config.fromEmail : null,
            service: emailService ? emailService.config.service : null
        }
    });
});

// ==================== AUTHENTICATION ENDPOINTS ====================

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const user = await authService.login(email, password);

        // Store user info in session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        req.session.userRole = user.role;
        req.session.userLanguage = user.language;

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                language: user.language
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({ error: error.message });
    }
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Could not log out' });
        }
        res.json({ success: true });
    });
});

// Get current user
app.get('/api/auth/me', requireAuth, async (req, res) => {
    try {
        const user = await authService.getUserById(req.session.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get current user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== USER MANAGEMENT ENDPOINTS (ADMIN ONLY) ====================

// Create new user (admin only)
app.post('/api/users', requireAdmin, async (req, res) => {
    try {
        const { email, password, name, role, workEmail, language } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, password, and name are required' });
        }

        const user = await authService.createUser(email, password, name, role || 'coach', workEmail, language || 'da');
        res.json({ success: true, user });
    } catch (error) {
        console.error('Create user error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Get all users (admin only)
app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const users = await authService.getAllUsers();
        res.json({ users });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get single user (admin only)
app.get('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        const user = await authService.getUserById(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user (admin only)
app.put('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        const updates = req.body;
        await authService.updateUser(req.params.id, updates);
        const user = await authService.getUserById(req.params.id);
        res.json({ success: true, user });
    } catch (error) {
        console.error('Update user error:', error);
        res.status(400).json({ error: error.message });
    }
});

// Delete user (soft delete - admin only)
app.delete('/api/users/:id', requireAdmin, async (req, res) => {
    try {
        await authService.deleteUser(req.params.id);
        res.json({ success: true });
    } catch (error) {
        console.error('Delete user error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEAD ASSIGNMENT ENDPOINTS ====================

// Assign lead to user
app.post('/api/leads/:leadId/assign', requireAuth, async (req, res) => {
    try {
        const { userId } = req.body;
        const leadId = req.params.leadId;

        // Only admins can assign to other users, coaches can only assign to themselves
        if (req.session.userRole !== 'admin' && userId != req.session.userId) {
            return res.status(403).json({ error: 'You can only assign leads to yourself' });
        }

        await authService.assignLead(leadId, userId, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Assign lead error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get assigned leads for current user
app.get('/api/my-leads', requireAuth, async (req, res) => {
    try {
        const leads = await authService.getAssignedLeads(req.session.userId);
        res.json({ leads });
    } catch (error) {
        console.error('Get assigned leads error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get unassigned leads (all users can see this)
app.get('/api/leads/unassigned', requireAuth, async (req, res) => {
    try {
        const leads = await authService.getUnassignedLeads();
        res.json({ leads });
    } catch (error) {
        console.error('Get unassigned leads error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get lead assignment info
app.get('/api/leads/:leadId/assignment', requireAuth, async (req, res) => {
    try {
        const assignment = await authService.getLeadAssignment(req.params.leadId);
        res.json({ assignment });
    } catch (error) {
        console.error('Get lead assignment error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit calculator data (create lead)
app.post('/api/submit-calculator', (req, res) => {
    const data = req.body;

    // SECURITY CHECK 1: Check if email belongs to active coaching client
    const checkActiveClientSql = `
        SELECT l.id, l.email, cc.id as coaching_client_id
        FROM leads l
        JOIN coaching_clients cc ON l.id = cc.lead_id
        WHERE l.email = ? AND cc.status = 'active'
        LIMIT 1
    `;

    db.get(checkActiveClientSql, [data.email], (err, activeClient) => {
        if (err) {
            console.error('Error checking active client:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (activeClient) {
            console.log(`⚠️ Blocked calculator submission for active client: ${data.email}`);
            return res.status(403).json({
                error: 'active_client',
                message: 'Du er allerede en aktiv coaching klient. Kontakt din coach for at opdatere dine indstillinger.'
            });
        }

        // SECURITY CHECK 2: Check meal plan count limit (max 5 per email)
        const checkMealPlanCountSql = `
            SELECT COUNT(*) as count
            FROM generated_meal_plans gmp
            JOIN leads l ON gmp.lead_id = l.id
            WHERE l.email = ?
        `;

        db.get(checkMealPlanCountSql, [data.email], (err, result) => {
            if (err) {
                console.error('Error checking meal plan count:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            if (result && result.count >= 5) {
                console.log(`⚠️ Meal plan limit reached for email: ${data.email} (${result.count} plans)`);
                return res.status(429).json({
                    error: 'meal_plan_limit',
                    message: 'Du har nået maksimum antal gratis madplaner (5 stk). Kontakt os for at få adgang til flere.',
                    count: result.count
                });
            }

            // All checks passed - proceed with insert/update
            const mealPlanCount = result ? result.count : 0;

            const sql = `
                INSERT INTO leads (
                    email, name, gdpr_consent, language, units, gender, age, weight, height,
                    activity, bmr, tdee, weight_goal, daily_calories, meals_per_day, prep_time,
                    num_days, leftovers, excluded_ingredients, selected_ingredients, diet_type,
                    first_contact_date
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(email) DO UPDATE SET
                    name = excluded.name,
                    gdpr_consent = excluded.gdpr_consent,
                    language = excluded.language,
                    units = excluded.units,
                    gender = excluded.gender,
                    age = excluded.age,
                    weight = excluded.weight,
                    height = excluded.height,
                    activity = excluded.activity,
                    bmr = excluded.bmr,
                    tdee = excluded.tdee,
                    weight_goal = excluded.weight_goal,
                    daily_calories = excluded.daily_calories,
                    meals_per_day = excluded.meals_per_day,
                    prep_time = excluded.prep_time,
                    num_days = excluded.num_days,
                    leftovers = excluded.leftovers,
                    excluded_ingredients = excluded.excluded_ingredients,
                    selected_ingredients = excluded.selected_ingredients,
                    diet_type = excluded.diet_type,
                    last_contact_date = CURRENT_TIMESTAMP,
                    updated_at = CURRENT_TIMESTAMP
            `;

            const params = [
                data.email,
                data.name || null,
                data.gdprConsent ? 1 : 0,
                data.language,
                data.units,
                data.gender,
                data.age,
                data.weight,
                data.height,
                data.activity,
                data.bmr,
                data.tdee,
                data.weightGoal,
                data.dailyCalories,
                data.mealsPerDay || 3,
                data.prepTime || 'medium',
                data.numDays,
                data.leftovers ? 1 : 0,
                JSON.stringify(data.excludedIngredients || []),
                JSON.stringify(data.selectedIngredients || []),
                data.dietType || 'Custom Keto'
            ];

            db.run(sql, params, async function(err) {
                if (err) {
                    console.error('Error inserting lead:', err);
                    return res.status(500).json({ error: 'Database error', details: err.message });
                }

                // Get the lead ID (works for both INSERT and UPDATE)
                db.get('SELECT id FROM leads WHERE email = ?', [data.email], (err, row) => {
                    if (err || !row) {
                        console.error('Error fetching lead ID:', err);
                        return res.status(500).json({ error: 'Database error' });
                    }

                    const leadId = row.id;
                    console.log(`✓ Lead saved/updated: ${data.email} (ID: ${leadId}, Meal plans: ${mealPlanCount}/5)`);

                    // AUTO-GENERATE MEAL PLAN if OpenAI is configured
                    if (mealPlanGenerator) {
                        console.log(`🤖 Auto-generating meal plan for ${data.email}...`);

                        // Trigger meal plan generation in background (don't wait for response)
                        generateMealPlanForLead(leadId, data.email, true).catch(err => {
                            console.error('Error auto-generating meal plan:', err);
                        });

                        res.json({
                            success: true,
                            message: 'Data saved successfully. Your meal plan is being generated and will be emailed to you shortly!',
                            leadId: leadId,
                            mealPlanCount: mealPlanCount,
                            mealPlanLimit: 5,
                            generatingMealPlan: true
                        });
                    } else {
                        res.json({
                            success: true,
                            message: 'Data saved successfully',
                            leadId: leadId,
                            mealPlanCount: mealPlanCount,
                            mealPlanLimit: 5,
                            generatingMealPlan: false
                        });
                    }
                });
            });
        });
    });
});

// Get all leads (admin)
app.get('/api/admin/leads', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            id, email, name, age, weight, height, weight_goal,
            daily_calories, language, gdpr_consent, created_at, updated_at
        FROM leads
        ORDER BY created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching leads:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ leads: rows });
    });
});

// Get single lead detail (admin)
app.get('/api/admin/leads/:id', requireAdmin, (req, res) => {
    const sql = `SELECT * FROM leads WHERE id = ?`;

    db.get(sql, [req.params.id], (err, row) => {
        if (err) {
            console.error('Error fetching lead:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        if (!row) {
            return res.status(404).json({ error: 'Lead not found' });
        }

        // Parse JSON fields
        row.excludedIngredients = JSON.parse(row.excluded_ingredients || '[]');
        row.selectedIngredients = JSON.parse(row.selected_ingredients || '[]');

        res.json(row);
    });
});

// Check if lead has active coaching
app.get('/api/admin/check-coaching/:leadId', requireAdmin, (req, res) => {
    const { leadId } = req.params;

    const sql = `
        SELECT id, lead_id, status, access_token
        FROM coaching_clients
        WHERE lead_id = ? AND status = 'active'
        LIMIT 1
    `;

    db.get(sql, [leadId], (err, row) => {
        if (err) {
            console.error('Error checking coaching:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            hasActiveCoaching: !!row,
            coachingClientId: row ? row.id : null,
            accessToken: row ? row.access_token : null
        });
    });
});

// Activate coaching for a lead
app.post('/api/admin/activate-coaching/:leadId', requireAdmin, (req, res) => {
    const { leadId } = req.params;
    const { notes } = req.body;

    // First check if already has active coaching
    const checkSql = `
        SELECT COUNT(*) as count
        FROM coaching_clients
        WHERE lead_id = ? AND status = 'active'
    `;

    db.get(checkSql, [leadId], (err, row) => {
        if (err) {
            console.error('Error checking coaching:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (row.count > 0) {
            return res.status(400).json({ error: 'Lead already has active coaching' });
        }

        // Generate secure access token (UUID)
        const accessToken = crypto.randomUUID();

        // Insert new coaching client
        const insertSql = `
            INSERT INTO coaching_clients (lead_id, start_date, notes, status, access_token)
            VALUES (?, DATE('now'), ?, 'active', ?)
        `;

        db.run(insertSql, [leadId, notes || '', accessToken], function(err) {
            if (err) {
                console.error('Error activating coaching:', err);
                return res.status(500).json({ error: 'Database error' });
            }

            console.log(`✓ Coaching activated for lead ID: ${leadId}`);
            res.json({
                success: true,
                message: 'Coaching activated',
                coachingClientId: this.lastID
            });
        });
    });
});

// Update admin comments for a lead
app.post('/api/admin/update-comments/:leadId', requireAdmin, (req, res) => {
    const { leadId } = req.params;
    const { comments } = req.body;

    const sql = `
        UPDATE leads
        SET admin_comments = ?,
            last_contact_date = CURRENT_TIMESTAMP,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [comments, leadId], function(err) {
        if (err) {
            console.error('Error updating comments:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log(`✓ Comments updated for lead ID: ${leadId}`);
        res.json({
            success: true,
            message: 'Comments updated successfully'
        });
    });
});

// Update last contact date for a lead
app.post('/api/admin/update-last-contact/:leadId', requireAdmin, (req, res) => {
    const { leadId } = req.params;
    const { lastContactDate } = req.body;

    const sql = `
        UPDATE leads
        SET last_contact_date = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;

    db.run(sql, [lastContactDate, leadId], function(err) {
        if (err) {
            console.error('Error updating last contact date:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        console.log(`✓ Last contact date updated for lead ID: ${leadId}`);
        res.json({
            success: true,
            message: 'Last contact date updated successfully'
        });
    });
});

// Get all coaching clients
app.get('/api/admin/coaching-clients', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            cc.id, cc.lead_id, cc.status, cc.start_date, cc.notes, cc.access_token,
            l.email, l.name, l.age, l.weight, l.weight_goal
        FROM coaching_clients cc
        JOIN leads l ON cc.lead_id = l.id
        WHERE cc.status = 'active'
        ORDER BY cc.start_date DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            console.error('Error fetching coaching clients:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ clients: rows });
    });
});

// Get coaching clients count
app.get('/api/admin/coaching-count', requireAdmin, (req, res) => {
    const sql = `
        SELECT COUNT(*) as count
        FROM coaching_clients
        WHERE status = 'active'
    `;

    db.get(sql, [], (err, row) => {
        if (err) {
            console.error('Error fetching coaching count:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ count: row.count });
    });
});

// Submit weekly check-in
// Save check-in (by ID or access token)
app.post('/api/checkin/:idOrToken', (req, res) => {
    const { idOrToken } = req.params;
    const {
        weight, weekNumber, mood, energy,
        hunger, cravings, sleepHours, sleepQuality,
        digestion, activity, fastingHours, fastingFeeling,
        stressFactors, weeklyWin, deviations, notes
    } = req.body;

    // Check if it's a UUID token or numeric ID
    const isToken = idOrToken.includes('-');

    const resolveCoachingClientId = (callback) => {
        if (isToken) {
            // Token-based: Lookup coaching_client_id from token
            db.get(`SELECT id FROM coaching_clients WHERE access_token = ?`, [idOrToken], (err, row) => {
                if (err || !row) {
                    return res.status(404).json({ error: 'Invalid access token' });
                }
                callback(row.id);
            });
        } else {
            // ID-based: Use directly
            callback(parseInt(idOrToken));
        }
    };

    resolveCoachingClientId((coachingClientId) => {
        const sql = `
            INSERT INTO weekly_checkins
            (coaching_client_id, weight, week_number, mood, energy,
             hunger, cravings, sleep_hours, sleep_quality,
             digestion, activity, fasting_hours, fasting_feeling,
             stress_factors, weekly_win, deviations, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.run(sql, [
            coachingClientId, weight, weekNumber, mood, energy,
            hunger, cravings, sleepHours, sleepQuality,
            digestion, activity, fastingHours, fastingFeeling,
            stressFactors, weeklyWin, deviations, notes
        ], function(err) {
        if (err) {
            console.error('Error saving check-in:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        const checkinId = this.lastID;
        console.log(`✓ Check-in saved for client ${coachingClientId}`);

        // Update lead profile with new weight and recalculate calories
        const getLeadSql = `
            SELECT l.* FROM leads l
            JOIN coaching_clients cc ON l.id = cc.lead_id
            WHERE cc.id = ?
        `;

        db.get(getLeadSql, [coachingClientId], (err, lead) => {
            if (err || !lead) {
                console.error('Error fetching lead for update:', err);
                // Still return success for check-in save
                return res.json({
                    success: true,
                    message: 'Check-in saved',
                    checkinId: checkinId
                });
            }

            // Calculate new BMR with updated weight
            const weightKg = lead.units === 'imperial' ? weight * 0.453592 : weight;
            const heightCm = lead.units === 'imperial' ? lead.height * 2.54 : lead.height;

            let bmr;
            if (lead.gender === 'male') {
                bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * lead.age) + 5;
            } else {
                bmr = (10 * weightKg) + (6.25 * heightCm) - (5 * lead.age) - 161;
            }
            bmr = Math.round(bmr);

            // Calculate TDEE
            const activityMultipliers = {
                'sedentary': 1.2,
                'light': 1.375,
                'moderate': 1.55,
                'active': 1.725,
                'very_active': 1.9
            };
            const tdee = Math.round(bmr * (activityMultipliers[lead.activity] || 1.2));

            // Calculate daily calories based on weight goal
            const weightGoalKg = lead.weight_goal || 0;
            const deficit = weightGoalKg * 1100; // ~1100 kcal deficit per kg per month
            const dailyCalories = Math.max(1200, Math.round(tdee - deficit));

            // Update lead with new data
            const updateLeadSql = `
                UPDATE leads
                SET weight = ?, bmr = ?, tdee = ?, daily_calories = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            `;

            db.run(updateLeadSql, [weight, bmr, tdee, dailyCalories, lead.id], (updateErr) => {
                if (updateErr) {
                    console.error('Error updating lead profile:', updateErr);
                } else {
                    console.log(`✓ Lead profile updated: weight=${weight}kg, BMR=${bmr}, TDEE=${tdee}, calories=${dailyCalories}`);
                }

                res.json({
                    success: true,
                    message: 'Check-in saved and profile updated',
                    checkinId: checkinId,
                    profileUpdated: !updateErr,
                    newWeight: weight,
                    newBMR: bmr,
                    newTDEE: tdee,
                    newCalories: dailyCalories
                });
            });
        });
        });
    });
});

// Get coaching client info by token (for secure client access)
app.get('/api/coaching-client/by-token/:token', (req, res) => {
    const { token } = req.params;

    const sql = `
        SELECT cc.id, cc.lead_id, cc.start_date, l.name, l.email, l.weight as start_weight,
               l.weight_goal, l.language
        FROM coaching_clients cc
        JOIN leads l ON cc.lead_id = l.id
        WHERE cc.access_token = ? AND cc.status = 'active'
    `;

    db.get(sql, [token], (err, row) => {
        if (err) {
            console.error('Error fetching coaching client by token:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        if (!row) {
            return res.status(404).json({ error: 'Invalid or expired access token' });
        }

        res.json({
            success: true,
            coachingClientId: row.id,
            leadId: row.lead_id,
            name: row.name,
            email: row.email,
            startWeight: row.start_weight,
            goalWeight: row.weight_goal,
            language: row.language,
            startDate: row.start_date
        });
    });
});

// Get check-ins for a coaching client (by ID or access token)
app.get('/api/checkins/:idOrToken', (req, res) => {
    const { idOrToken } = req.params;

    // Check if it's a UUID token (contains dashes) or numeric ID
    const isToken = idOrToken.includes('-');

    let sql, params;

    if (isToken) {
        // Token-based access (secure - for clients)
        sql = `
            SELECT wc.*, cc.id as coaching_client_id FROM weekly_checkins wc
            JOIN coaching_clients cc ON wc.coaching_client_id = cc.id
            WHERE cc.access_token = ?
            ORDER BY wc.created_at DESC
        `;
        params = [idOrToken];
    } else {
        // ID-based access (for admin dashboard)
        sql = `
            SELECT * FROM weekly_checkins
            WHERE coaching_client_id = ?
            ORDER BY created_at DESC
        `;
        params = [idOrToken];
    }

    db.all(sql, params, (err, rows) => {
        if (err) {
            console.error('Error fetching check-ins:', err);
            return res.status(500).json({ error: 'Database error' });
        }
        res.json({ checkins: rows });
    });
});

// ============================================
// MEAL PLAN GENERATION ENDPOINTS
// ============================================

// Helper function to generate meal plan for a lead
async function generateMealPlanForLead(leadId, email, sendEmail = true) {
    return new Promise(async (resolve, reject) => {
        try {
            // Get lead data
            const sql = `SELECT * FROM leads WHERE id = ?`;

            db.get(sql, [leadId], async (err, lead) => {
                if (err || !lead) {
                    return reject(new Error('Lead not found'));
                }

                // Generate meal plan using OpenAI (with PDF)
                const result = await mealPlanGenerator.generateComplete({
                    email: email,
                    name: lead.name || 'Kære',
                    gender: lead.gender,
                    age: lead.age,
                    weight: lead.weight,
                    height: lead.height,
                    activity: lead.activity,
                    daily_calories: lead.daily_calories,
                    meals_per_day: lead.meals_per_day || 3,
                    num_days: lead.num_days || 7,
                    leftovers: lead.leftovers === 1 || lead.leftovers === true,
                    prep_time: lead.prep_time || 'medium',
                    excluded_ingredients: lead.excluded_ingredients || '',
                    selected_ingredients: lead.selected_ingredients || '',
                    diet_type: lead.diet_type || 'Custom Keto',
                    language: lead.language || 'da'
                });

                if (!result.success) {
                    return reject(new Error(result.error || 'Meal plan generation failed'));
                }

                // Save to database
                const insertSql = `
                    INSERT INTO generated_meal_plans (lead_id, pdf_filename, pdf_path, tokens_used, cost_usd, model)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                const modelUsed = result.model || mealPlanGenerator?.config?.model || 'gpt-4o';
                db.run(insertSql, [leadId, result.pdfFileName, result.pdfPath, result.tokens, result.cost.total, modelUsed], async function(err) {
                    if (err) {
                        console.error('Error saving meal plan to database:', err);
                    }

                    console.log(`✓ Meal plan generated: ${result.pdfFileName} (${result.tokens} tokens, $${result.cost.total})`);

                    // Send email if configured
                    if (sendEmail && emailService && emailService.isConfigured()) {
                        try {
                            await emailService.sendMealPlan(
                                { email: email, name: lead.name || 'Kære', id: leadId },
                                result.pdfPath,
                                null,
                                lead.language || 'da'
                            );
                            console.log(`✓ Meal plan email sent to ${email}`);
                        } catch (emailErr) {
                            console.error('Error sending meal plan email:', emailErr);
                        }
                    }

                    resolve(result);
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

// Generate meal plan for a lead
app.post('/api/generate-meal-plan/:leadId', async (req, res) => {
    const { leadId } = req.params;
    const {
        sendEmail = false,
        numDays,
        mealsPerDay,
        dailyCalories,
        leftovers
    } = req.body; // Optional parameters from frontend

    if (!mealPlanGenerator) {
        return res.status(503).json({
            error: 'Meal plan generation is not available. OpenAI API key not configured.'
        });
    }

    try {
        // Get lead data
        const sql = `
            SELECT * FROM leads WHERE id = ?
        `;

        db.get(sql, [leadId], async (err, lead) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }

            if (!lead) {
                return res.status(404).json({ error: 'Lead not found' });
            }

            // Parse excluded ingredients
            const excludedIngredients = lead.excluded_ingredients || '';

            // Allow overriding parameters from request body
            const mealPlanData = {
                ...lead,
                excluded_ingredients: excludedIngredients,
                // Override with request params if provided
                num_days: numDays !== undefined ? numDays : lead.num_days,
                meals_per_day: mealsPerDay !== undefined ? mealsPerDay : lead.meals_per_day,
                daily_calories: dailyCalories !== undefined ? dailyCalories : lead.daily_calories,
                leftovers: leftovers !== undefined ? leftovers : lead.leftovers
            };

            // Generate meal plan
            console.log(`📝 Generating meal plan for ${lead.email}...`);
            console.log(`   Settings: ${mealPlanData.num_days} days, ${mealPlanData.meals_per_day} meals/day, ${mealPlanData.daily_calories} kcal`);
            const result = await mealPlanGenerator.generateComplete(mealPlanData);

            if (result.success) {
                // Save meal plan info to database
                const saveSql = `
                    INSERT INTO generated_meal_plans
                    (lead_id, pdf_filename, pdf_path, tokens_used, cost_usd, model, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
                `;

                const modelUsed = result.model || mealPlanGenerator?.config?.model || 'gpt-4o';
                db.run(saveSql, [
                    leadId,
                    result.pdfFileName,
                    result.pdfPath,
                    result.tokens,
                    parseFloat(result.cost.total),
                    modelUsed
                ], function(saveErr) {
                    if (saveErr) {
                        console.error('Error saving meal plan record:', saveErr);
                    } else {
                        console.log(`✓ Meal plan saved to database (ID: ${this.lastID})`);
                    }
                });

                // Send email if requested
                let emailSent = false;
                if (sendEmail && emailService && emailService.isConfigured()) {
                    try {
                        // Ensure lead has id property for email logging
                        const leadWithId = { ...lead, id: parseInt(leadId) };
                        // Prepare meal plan data for email template
                        const emailPlanData = {
                            days: mealPlanData.num_days,
                            mealsPerDay: mealPlanData.meals_per_day
                        };
                        await emailService.sendMealPlan(
                            leadWithId,
                            result.pdfPath,
                            emailPlanData,
                            lead.language || 'da'
                        );
                        emailSent = true;
                        console.log(`✓ Meal plan emailed to ${lead.email}`);
                    } catch (emailError) {
                        console.error('Error sending email:', emailError);
                        // Don't fail the whole request if email fails
                    }
                }

                res.json({
                    success: true,
                    message: 'Meal plan generated successfully',
                    pdfFileName: result.pdfFileName,
                    tokens: result.tokens,
                    cost: result.cost,
                    emailSent: emailSent
                });
            } else {
                res.status(500).json({
                    success: false,
                    error: result.error
                });
            }
        });
    } catch (error) {
        console.error('Error generating meal plan:', error);
        res.status(500).json({ error: error.message });
    }
});

// Download generated meal plan PDF
app.get('/api/download-meal-plan/:filename', (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(__dirname, 'generated_mealplans', filename);

    // Security check: ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
        return res.status(400).json({ error: 'Invalid filename' });
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Meal plan not found' });
    }

    // Send file
    res.download(filePath, filename, (err) => {
        if (err) {
            console.error('Error downloading file:', err);
            res.status(500).json({ error: 'Error downloading file' });
        }
    });
});

// Get meal plans for a lead
app.get('/api/meal-plans/:leadId', (req, res) => {
    const { leadId } = req.params;

    const sql = `
        SELECT id, pdf_filename, tokens_used, cost_usd, created_at
        FROM generated_meal_plans
        WHERE lead_id = ?
        ORDER BY created_at DESC
    `;

    db.all(sql, [leadId], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            mealPlans: rows
        });
    });
});

// Send check-in reminder email
app.post('/api/send-checkin-reminder/:coachingClientId', async (req, res) => {
    const { coachingClientId } = req.params;

    if (!emailService || !emailService.isConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Email service not configured. Please configure email in Madplan Indstillinger.'
        });
    }

    try {
        // Get coaching client and lead data
        const sql = `
            SELECT
                cc.id as coaching_id,
                cc.lead_id,
                l.email,
                l.name,
                l.language
            FROM coaching_clients cc
            JOIN leads l ON cc.lead_id = l.id
            WHERE cc.id = ?
        `;

        db.get(sql, [coachingClientId], async (err, client) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            if (!client) {
                return res.status(404).json({ success: false, error: 'Coaching client not found' });
            }

            // Generate check-in link
            const checkinLink = `${req.protocol}://${req.get('host')}/crm/checkin.html?id=${coachingClientId}`;

            // Send check-in reminder email
            try {
                const result = await emailService.sendCheckinReminder(
                    {
                        email: client.email,
                        name: client.name,
                        id: client.lead_id  // Add lead_id for email logging
                    },
                    checkinLink,
                    client.language || 'da'
                );

                console.log(`✓ Check-in reminder sent to ${client.email}`);
                res.json({
                    success: true,
                    message: 'Check-in reminder email sent successfully',
                    messageId: result.messageId
                });
            } catch (emailError) {
                console.error('Error sending check-in reminder email:', emailError);
                res.status(500).json({
                    success: false,
                    error: 'Failed to send email: ' + emailError.message
                });
            }
        });
    } catch (error) {
        console.error('Error in send-checkin-reminder endpoint:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get all generated meal plans (admin)
app.get('/api/admin/all-meal-plans', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            mp.id,
            mp.lead_id,
            mp.pdf_filename,
            mp.tokens_used,
            mp.cost_usd,
            mp.created_at,
            l.email,
            l.name
        FROM generated_meal_plans mp
        JOIN leads l ON mp.lead_id = l.id
        ORDER BY mp.created_at DESC
    `;

    db.all(sql, [], (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({
            mealPlans: rows,
            totalCost: rows.reduce((sum, mp) => sum + mp.cost_usd, 0).toFixed(4)
        });
    });
});

// Set or update OpenAI API key (admin only - should be protected in production)
app.post('/api/admin/set-openai-key', requireAdmin, (req, res) => {
    const { apiKey } = req.body;

    if (!apiKey) {
        return res.status(400).json({ error: 'API key is required' });
    }

    try {
        // Save API key to disk for persistence
        const configPath = path.join(__dirname, 'openai-key.json');
        fs.writeFileSync(configPath, JSON.stringify({ apiKey }, null, 2));
        console.log('✓ OpenAI API key saved to disk:', configPath);

        // Initialize or update meal plan generator
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const modelConfig = {
            model: config.model || 'gpt-4o',
            maxCompletionTokens: config.maxCompletionTokens || config.maxTokens || 16000,
            temperature: config.temperature || 0.7
        };
        mealPlanGenerator = new MealPlanGenerator(apiKey, modelConfig);

        res.json({
            success: true,
            message: 'OpenAI API key configured successfully and saved'
        });
    } catch (error) {
        console.error('Error saving OpenAI key:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get current model configuration
app.get('/api/admin/model-config', requireAdmin, (req, res) => {
    try {
        const configPath = path.join(__dirname, 'openai-key.json');
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            res.json({
                success: true,
                model: config.model || 'gpt-4o',
                maxTokens: config.maxCompletionTokens || config.maxTokens || 16000
            });
        } else {
            res.json({
                success: true,
                model: 'gpt-4o',
                maxTokens: 16000
            });
        }
    } catch (error) {
        console.error('Error loading model config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Set model configuration
app.post('/api/admin/set-model-config', requireAdmin, (req, res) => {
    const { model, maxTokens, temperature } = req.body;

    if (!model || !maxTokens) {
        return res.status(400).json({ error: 'Model and maxTokens are required' });
    }

    try {
        const configPath = path.join(__dirname, 'openai-key.json');
        let config = {};

        // Read existing config
        if (fs.existsSync(configPath)) {
            config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        // Update model settings
        config.model = model;
        config.maxCompletionTokens = maxTokens;

        // Save temperature only for GPT-5.1
        if (model === 'gpt-5.1' && temperature !== undefined) {
            config.temperature = temperature;
        } else {
            delete config.temperature; // Remove for other models
        }
        // Remove old maxTokens field if it exists
        delete config.maxTokens;

        // Save back to disk
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        console.log(`✓ Model config updated: Model=${model}, MaxCompletionTokens=${maxTokens}`);

        // Reinitialize meal plan generator if API key exists
        if (config.apiKey && mealPlanGenerator) {
            const modelConfig = {
                model: model,
                maxCompletionTokens: maxTokens,
                temperature: config.temperature || 0.7
            };
            mealPlanGenerator = new MealPlanGenerator(config.apiKey, modelConfig);
            console.log('✓ Meal Plan Generator reinitialized with new config');
        }

        res.json({
            success: true,
            message: 'Model configuration saved successfully',
            model: model,
            maxTokens: maxTokens
        });
    } catch (error) {
        console.error('Error saving model config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Set or update Email configuration (admin only)
app.post('/api/admin/set-email-config', requireAdmin, (req, res) => {
    const { emailUser, emailPassword, emailService: service = 'gmail', fromName = 'Keto Calculator' } = req.body;

    if (!emailUser || !emailPassword) {
        return res.status(400).json({ error: 'Email user and password are required' });
    }

    try {
        // Save email config to disk for persistence
        const configPath = path.join(__dirname, 'email-config.json');
        fs.writeFileSync(configPath, JSON.stringify({
            service,
            emailUser,
            emailPassword,
            fromName
        }, null, 2));
        console.log('✓ Email configuration saved to disk:', configPath);

        if (!emailService || !emailService.isConfigured()) {
            // Create new email service
            emailService = new EmailService({
                service: service,
                user: emailUser,
                pass: emailPassword,
                fromName: fromName,
                fromEmail: emailUser
            });
        } else {
            // Update existing configuration
            emailService.updateConfig({
                service: service,
                user: emailUser,
                pass: emailPassword,
                fromName: fromName,
                fromEmail: emailUser
            });
        }

        console.log('✓ Email configuration updated:', emailUser);

        res.json({
            success: true,
            message: 'Email configuration updated successfully and saved'
        });
    } catch (error) {
        console.error('Error updating email config:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get email service status
app.get('/api/admin/email-status', requireAdmin, (req, res) => {
    res.json({
        configured: emailService && emailService.isConfigured(),
        service: emailService ? emailService.config.service : null,
        fromEmail: emailService ? emailService.config.fromEmail : null
    });
});

// ==========================================
// EMAIL AUTOMATION ENDPOINTS
// ==========================================

// Get global automation settings
app.get('/api/admin/email-automation/settings', requireAdmin, (req, res) => {
    const sql = `SELECT * FROM email_automation_settings WHERE automation_type = 'checkin_reminder' LIMIT 1`;

    db.get(sql, [], (err, settings) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (!settings) {
            // Create default settings if none exist
            const insertSql = `INSERT INTO email_automation_settings (automation_type, enabled, frequency_days) VALUES ('checkin_reminder', 1, 7)`;
            db.run(insertSql, function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ error: insertErr.message });
                }

                res.json({
                    settings: {
                        id: this.lastID,
                        automation_type: 'checkin_reminder',
                        enabled: 1,
                        frequency_days: 7,
                        last_run: null
                    }
                });
            });
        } else {
            res.json({ settings });
        }
    });
});

// Update global automation settings
app.post('/api/admin/email-automation/settings', requireAdmin, (req, res) => {
    const { automationType, enabled, frequencyDays } = req.body;

    const sql = `
        INSERT INTO email_automation_settings (automation_type, enabled, frequency_days)
        VALUES (?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            enabled = ?,
            frequency_days = ?
    `;

    db.run(sql, [automationType, enabled ? 1 : 0, frequencyDays, enabled ? 1 : 0, frequencyDays], function(err) {
        if (err) {
            // Try update instead
            const updateSql = `UPDATE email_automation_settings SET enabled = ?, frequency_days = ? WHERE automation_type = ?`;
            db.run(updateSql, [enabled ? 1 : 0, frequencyDays, automationType], function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ success: false, error: updateErr.message });
                }
                res.json({ success: true });
            });
        } else {
            res.json({ success: true });
        }
    });
});

// Get all coaching clients with email preferences
app.get('/api/admin/email-automation/clients', requireAdmin, (req, res) => {
    const sql = `
        SELECT
            cc.id as coaching_client_id,
            cc.lead_id,
            l.email,
            l.name,
            l.language,
            COALESCE(cep.checkin_reminders_enabled, 1) as checkin_reminders_enabled,
            cep.last_checkin_reminder_sent,
            COALESCE(cep.reminder_frequency_days, 7) as reminder_frequency_days
        FROM coaching_clients cc
        JOIN leads l ON cc.lead_id = l.id
        LEFT JOIN client_email_preferences cep ON cep.coaching_client_id = cc.id
        WHERE cc.status = 'active'
        ORDER BY l.name
    `;

    db.all(sql, [], (err, clients) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        res.json({ clients: clients || [] });
    });
});

// Toggle reminders for a specific client
app.post('/api/admin/email-automation/client/:coachingClientId/toggle', requireAdmin, (req, res) => {
    const { coachingClientId } = req.params;
    const { enabled } = req.body;

    // Check if preferences exist
    const checkSql = `SELECT id FROM client_email_preferences WHERE coaching_client_id = ?`;

    db.get(checkSql, [coachingClientId], (err, existing) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        if (existing) {
            // Update existing
            const updateSql = `UPDATE client_email_preferences SET checkin_reminders_enabled = ? WHERE coaching_client_id = ?`;
            db.run(updateSql, [enabled ? 1 : 0, coachingClientId], function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ success: false, error: updateErr.message });
                }
                res.json({ success: true });
            });
        } else {
            // Insert new
            const insertSql = `INSERT INTO client_email_preferences (coaching_client_id, checkin_reminders_enabled) VALUES (?, ?)`;
            db.run(insertSql, [coachingClientId, enabled ? 1 : 0], function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                res.json({ success: true });
            });
        }
    });
});

// Update frequency for a specific client
app.post('/api/admin/email-automation/client/:coachingClientId/frequency', requireAdmin, (req, res) => {
    const { coachingClientId } = req.params;
    const { frequencyDays } = req.body;

    // Check if preferences exist
    const checkSql = `SELECT id FROM client_email_preferences WHERE coaching_client_id = ?`;

    db.get(checkSql, [coachingClientId], (err, existing) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }

        if (existing) {
            // Update existing
            const updateSql = `UPDATE client_email_preferences SET reminder_frequency_days = ? WHERE coaching_client_id = ?`;
            db.run(updateSql, [frequencyDays, coachingClientId], function(updateErr) {
                if (updateErr) {
                    return res.status(500).json({ success: false, error: updateErr.message });
                }
                res.json({ success: true });
            });
        } else {
            // Insert new
            const insertSql = `INSERT INTO client_email_preferences (coaching_client_id, reminder_frequency_days) VALUES (?, ?)`;
            db.run(insertSql, [coachingClientId, frequencyDays], function(insertErr) {
                if (insertErr) {
                    return res.status(500).json({ success: false, error: insertErr.message });
                }
                res.json({ success: true });
            });
        }
    });
});

// Run email automation manually
app.post('/api/admin/email-automation/run', requireAdmin, async (req, res) => {
    if (!emailService || !emailService.isConfigured()) {
        return res.status(503).json({
            success: false,
            error: 'Email service not configured'
        });
    }

    try {
        // Get all clients ready for reminders
        const sql = `
            SELECT
                cc.id as coaching_client_id,
                cc.lead_id,
                l.email,
                l.name,
                l.language,
                COALESCE(cep.reminder_frequency_days, 7) as reminder_frequency_days,
                cep.last_checkin_reminder_sent
            FROM coaching_clients cc
            JOIN leads l ON cc.lead_id = l.id
            LEFT JOIN client_email_preferences cep ON cep.coaching_client_id = cc.id
            WHERE cc.status = 'active'
              AND COALESCE(cep.checkin_reminders_enabled, 1) = 1
        `;

        db.all(sql, [], async (err, clients) => {
            if (err) {
                return res.status(500).json({ success: false, error: err.message });
            }

            let emailsSent = 0;
            const now = new Date();

            for (const client of clients) {
                // Check if client is due for reminder
                if (client.last_checkin_reminder_sent) {
                    const lastSent = new Date(client.last_checkin_reminder_sent);
                    const daysSinceLastReminder = (now - lastSent) / (1000 * 60 * 60 * 24);

                    if (daysSinceLastReminder < client.reminder_frequency_days) {
                        continue; // Skip - not due yet
                    }
                }

                // Send reminder
                try {
                    const checkinLink = `http://localhost:3000/crm/checkin.html?id=${client.coaching_client_id}`;

                    await emailService.sendCheckinReminder(
                        {
                            email: client.email,
                            name: client.name,
                            id: client.lead_id
                        },
                        checkinLink,
                        client.language || 'da'
                    );

                    // Update last sent time
                    const updateSql = `
                        INSERT INTO client_email_preferences (coaching_client_id, last_checkin_reminder_sent)
                        VALUES (?, datetime('now'))
                        ON CONFLICT(coaching_client_id) DO UPDATE SET last_checkin_reminder_sent = datetime('now')
                    `;

                    db.run(updateSql, [client.coaching_client_id], (updateErr) => {
                        if (updateErr) {
                            // Try alternative update
                            db.run(`UPDATE client_email_preferences SET last_checkin_reminder_sent = datetime('now') WHERE coaching_client_id = ?`, [client.coaching_client_id]);
                        }
                    });

                    emailsSent++;
                    console.log(`✓ Check-in reminder sent to ${client.email}`);
                } catch (emailError) {
                    console.error(`Error sending reminder to ${client.email}:`, emailError);
                }
            }

            // Update last run time
            db.run(`UPDATE email_automation_settings SET last_run = datetime('now') WHERE automation_type = 'checkin_reminder'`);

            res.json({
                success: true,
                emailsSent,
                totalClients: clients.length
            });
        });
    } catch (error) {
        console.error('Error running automation:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get email history for a lead
app.get('/api/admin/email-history/:leadId', requireAdmin, (req, res) => {
    const { leadId } = req.params;

    const query = `
        SELECT
            id,
            email_type,
            recipient_email,
            subject,
            status,
            error_message,
            sent_at
        FROM email_history
        WHERE lead_id = ?
        ORDER BY sent_at DESC
    `;

    db.all(query, [leadId], (err, emails) => {
        if (err) {
            console.error('Error fetching email history:', err);
            return res.status(500).json({ error: 'Database error' });
        }

        res.json({
            leadId: parseInt(leadId),
            emails: emails || [],
            totalEmails: emails ? emails.length : 0
        });
    });
});

// ==================== EMAIL ENDPOINTS ====================

// Send custom email to lead/client
app.post('/api/emails/send', requireAuth, async (req, res) => {
    try {
        const { to, subject, message, leadId, clientId } = req.body;

        if (!to || !subject || !message) {
            return res.status(400).json({ error: 'Email address, subject, and message are required' });
        }

        if (!emailService || !emailService.isConfigured()) {
            return res.status(500).json({ error: 'Email service not configured' });
        }

        // Get user's email footer and logo if available
        const user = await authService.getUserById(req.session.userId);
        const emailFooter = user?.email_footer || null;
        const emailLogo = user?.email_logo || null;

        await emailService.sendCustomEmail(to, subject, message, leadId || clientId, req.session.userId, emailFooter, emailLogo);

        res.json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Send email error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== LEAD NOTES ENDPOINTS ====================

// Get all notes for a specific lead
app.get('/api/leads/:leadId/notes', requireAuth, (req, res) => {
    const leadId = req.params.leadId;

    db.all(
        `SELECT ln.*, u.name as user_name
         FROM lead_notes ln
         LEFT JOIN users u ON ln.user_id = u.id
         WHERE ln.lead_id = ?
         ORDER BY ln.created_at DESC`,
        [leadId],
        (err, notes) => {
            if (err) {
                console.error('Get lead notes error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ notes });
        }
    );
});

// Add a note to a lead
app.post('/api/leads/:leadId/notes', requireAuth, (req, res) => {
    const leadId = req.params.leadId;
    const { note } = req.body;
    const userId = req.session.userId;

    if (!note || !note.trim()) {
        return res.status(400).json({ error: 'Note content is required' });
    }

    db.run(
        'INSERT INTO lead_notes (lead_id, user_id, note) VALUES (?, ?, ?)',
        [leadId, userId, note.trim()],
        function(err) {
            if (err) {
                console.error('Create lead note error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Delete a lead note
app.delete('/api/leads/notes/:noteId', requireAuth, (req, res) => {
    const noteId = req.params.noteId;

    db.run(
        'DELETE FROM lead_notes WHERE id = ?',
        [noteId],
        function(err) {
            if (err) {
                console.error('Delete lead note error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Note not found' });
            }
            res.json({ success: true });
        }
    );
});

// ==================== NOTES ENDPOINTS ====================

// Get all notes for current user
app.get('/api/notes', requireAuth, (req, res) => {
    db.all(
        'SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC',
        [req.session.userId],
        (err, notes) => {
            if (err) {
                console.error('Get notes error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ notes });
        }
    );
});

// Get single note
app.get('/api/notes/:id', requireAuth, (req, res) => {
    db.get(
        'SELECT * FROM notes WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.userId],
        (err, note) => {
            if (err) {
                console.error('Get note error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (!note) {
                return res.status(404).json({ error: 'Note not found' });
            }
            res.json({ note });
        }
    );
});

// Create note
app.post('/api/notes', requireAuth, (req, res) => {
    const { title, content, category } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    db.run(
        'INSERT INTO notes (user_id, title, content, category) VALUES (?, ?, ?, ?)',
        [req.session.userId, title, content || '', category || 'general'],
        function(err) {
            if (err) {
                console.error('Create note error:', err);
                return res.status(500).json({ error: err.message });
            }
            res.json({ success: true, id: this.lastID });
        }
    );
});

// Update note
app.put('/api/notes/:id', requireAuth, (req, res) => {
    const { title, content, category } = req.body;

    db.run(
        'UPDATE notes SET title = ?, content = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
        [title, content, category, req.params.id, req.session.userId],
        function(err) {
            if (err) {
                console.error('Update note error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Note not found' });
            }
            res.json({ success: true });
        }
    );
});

// Delete note
app.delete('/api/notes/:id', requireAuth, (req, res) => {
    db.run(
        'DELETE FROM notes WHERE id = ? AND user_id = ?',
        [req.params.id, req.session.userId],
        function(err) {
            if (err) {
                console.error('Delete note error:', err);
                return res.status(500).json({ error: err.message });
            }
            if (this.changes === 0) {
                return res.status(404).json({ error: 'Note not found' });
            }
            res.json({ success: true });
        }
    );
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════╗
║  🥑 Keto Calculator Backend Server               ║
║                                                  ║
║  Server running on: http://localhost:${PORT}     ║
║  API Base URL: http://localhost:${PORT}/api      ║
║                                                  ║
║  Website: http://localhost:${PORT}/                       ║
║  CRM Dashboard: http://localhost:${PORT}/crm/admin.html  ║
║  Meal Plan Generator: ${mealPlanGenerator ? '✓ ENABLED' : '✗ DISABLED (No API key)'}       ║
╚══════════════════════════════════════════════════╝
    `);
});

// Graceful shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('\n✓ Database connection closed');
        }
        process.exit(0);
    });
});
