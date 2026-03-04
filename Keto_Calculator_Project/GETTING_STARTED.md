# 🚀 Getting Started with Keto Calculator Development

**Welcome!** This guide will help you start building the Keto Calculator & Meal Planner.

---

## 📋 PRE-DEVELOPMENT CHECKLIST

Before writing any code, make sure you have:

### ✅ Read the Documentation
- [ ] Read README.md (project overview)
- [ ] Read TECHNICAL_SPECIFICATION.md (system architecture)
- [ ] Read USER_FLOW.md (wireframes & UX)
- [ ] Read N8N_WORKFLOW_DETAILED.md (AI workflow)
- [ ] Review TRANSLATIONS_COMPLETE.json (language structure)

**Estimated Reading Time:** 3-4 hours

### ✅ Set Up Your Environment
- [ ] WordPress installation (local or One.com)
- [ ] Code editor (VS Code recommended)
- [ ] Git installed
- [ ] Node.js & npm installed
- [ ] Browser dev tools ready

### ✅ Get API Access
- [ ] OpenAI API key (for ChatGPT)
- [ ] N8N instance (cloud account or self-hosted)
- [ ] Email service credentials (SMTP or SendGrid)

### ✅ Understand Core Concepts
- [ ] Keto diet basics (70/25/5 macros)
- [ ] Intermittent fasting protocols
- [ ] BMR vs TDEE calculations
- [ ] WordPress plugin development
- [ ] REST API design

---

## 🛠 DEVELOPMENT ENVIRONMENT SETUP

### Option 1: Local WordPress (Recommended for Development)

**Using Local by Flywheel (Easiest):**
```bash
# 1. Download Local from localwp.com
# 2. Create new site: "keto-calculator-dev"
# 3. Set PHP version: 8.0+
# 4. Set WordPress version: Latest
```

**Using MAMP/XAMPP:**
```bash
# 1. Install MAMP or XAMPP
# 2. Download WordPress
# 3. Create database "keto_calculator"
# 4. Install WordPress at http://localhost:8888/keto-calculator
```

### Option 2: One.com Test Site

```bash
# 1. Create subdomain: dev.yourdomain.com
# 2. Install WordPress via One.com panel
# 3. Set up FTP access
# 4. Clone this project to wp-content/plugins/
```

---

## 📂 PROJECT STRUCTURE (To Create)

Create this folder structure in your WordPress installation:

```
wp-content/plugins/keto-calculator/
├── keto-calculator.php           # Main plugin file
├── README.md                      # Plugin readme
├── includes/
│   ├── class-calculator.php      # BMR/TDEE calculations
│   ├── class-database.php        # Database operations
│   ├── class-api.php             # REST API endpoints
│   └── class-n8n-integration.php # N8N webhook integration
├── admin/
│   ├── class-admin.php           # Admin dashboard
│   └── views/                    # Admin templates
├── public/
│   ├── class-public.php          # Frontend display
│   ├── js/
│   │   ├── calculator.js         # Main calculator logic
│   │   ├── validator.js          # Form validation
│   │   └── translations.js       # Language handling
│   ├── css/
│   │   ├── main.css              # Main styles
│   │   └── responsive.css        # Mobile styles
│   └── views/
│       ├── calculator-steps.php  # Step templates
│       └── result-display.php    # Results page
├── languages/
│   ├── da_DK.json                # Danish translations
│   ├── en_US.json                # English translations
│   └── sv_SE.json                # Swedish translations
├── assets/
│   ├── images/                   # Icons, logos
│   └── fonts/                    # Custom fonts
└── tests/
    ├── test-calculator.php       # Unit tests
    └── test-api.php              # API tests
```

---

## 🎯 PHASE 1: FOUNDATION (Week 1-2)

### Day 1-2: Set Up Plugin Structure

**Create main plugin file:**

```php
<?php
/**
 * Plugin Name: Keto Calculator & Meal Planner
 * Plugin URI: https://your-domain.com
 * Description: Personalized keto meal plans with AI-powered recipe generation
 * Version: 1.0.0
 * Author: Anders Hejlsvig
 * Author URI: https://your-domain.com
 * License: GPL2
 * Text Domain: keto-calculator
 * Domain Path: /languages
 */

// Prevent direct access
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('KETO_CALC_VERSION', '1.0.0');
define('KETO_CALC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('KETO_CALC_PLUGIN_URL', plugin_dir_url(__FILE__));

// Include core classes
require_once KETO_CALC_PLUGIN_DIR . 'includes/class-calculator.php';
require_once KETO_CALC_PLUGIN_DIR . 'includes/class-database.php';
require_once KETO_CALC_PLUGIN_DIR . 'includes/class-api.php';

// Initialize plugin
function keto_calc_init() {
    // Register activation hook
    register_activation_hook(__FILE__, 'keto_calc_activate');

    // Load translations
    load_plugin_textdomain('keto-calculator', false, dirname(plugin_basename(__FILE__)) . '/languages');

    // Initialize classes
    $calculator = new Keto_Calculator();
    $database = new Keto_Database();
    $api = new Keto_API();
}
add_action('plugins_loaded', 'keto_calc_init');

// Activation function
function keto_calc_activate() {
    $database = new Keto_Database();
    $database->create_tables();

    // Set default options
    add_option('keto_calc_version', KETO_CALC_VERSION);
    add_option('keto_calc_settings', array(
        'default_language' => 'en',
        'default_units' => 'metric'
    ));
}
```

### Day 3-4: Create Database Tables

**File: `includes/class-database.php`**

```php
<?php
class Keto_Database {

    public function create_tables() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // Create user profiles table
        $sql_profiles = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}keto_user_profiles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT NOT NULL,
            age INT NOT NULL,
            gender ENUM('male', 'female') NOT NULL,
            weight DECIMAL(5,2) NOT NULL,
            height DECIMAL(5,2) NOT NULL,
            activity_level ENUM('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active') NOT NULL,
            weight_goal_monthly DECIMAL(4,2) NOT NULL DEFAULT 0,
            bmr INT NOT NULL,
            tdee INT NOT NULL,
            daily_calories INT NOT NULL,
            fasting_protocol ENUM('no_fast', '16_8', '18_6', '20_4', 'omad') NOT NULL DEFAULT 'no_fast',
            preferred_language ENUM('da', 'en', 'se') NOT NULL DEFAULT 'en',
            unit_system ENUM('metric', 'imperial') NOT NULL DEFAULT 'metric',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES {$wpdb->prefix}users(ID) ON DELETE CASCADE,
            INDEX idx_user_id (user_id)
        ) $charset_collate;";

        // Create ingredients table
        $sql_ingredients = "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}keto_ingredients (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name_en VARCHAR(100) NOT NULL,
            name_da VARCHAR(100) NOT NULL,
            name_se VARCHAR(100) NOT NULL,
            category ENUM('meat', 'fish', 'dairy', 'eggs', 'vegetables', 'nuts', 'fats') NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_category (category)
        ) $charset_collate;";

        // Execute SQL
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql_profiles);
        dbDelta($sql_ingredients);

        // Seed ingredients data
        $this->seed_ingredients();
    }

    private function seed_ingredients() {
        // See TECHNICAL_SPECIFICATION.md for complete ingredient list
        // Insert all 47 ingredients here
    }
}
```

### Day 5-7: Build Calculator Logic

**File: `includes/class-calculator.php`**

```php
<?php
class Keto_Calculator {

    /**
     * Calculate BMR using Mifflin-St Jeor equation
     */
    public function calculate_bmr($weight_kg, $height_cm, $age, $gender) {
        if ($gender === 'male') {
            $bmr = (10 * $weight_kg) + (6.25 * $height_cm) - (5 * $age) + 5;
        } else {
            $bmr = (10 * $weight_kg) + (6.25 * $height_cm) - (5 * $age) - 161;
        }

        return round($bmr);
    }

    /**
     * Calculate TDEE (Total Daily Energy Expenditure)
     */
    public function calculate_tdee($bmr, $activity_level) {
        $multipliers = array(
            'sedentary' => 1.2,
            'lightly_active' => 1.375,
            'moderately_active' => 1.55,
            'very_active' => 1.725,
            'extra_active' => 1.9
        );

        $multiplier = $multipliers[$activity_level] ?? 1.2;
        return round($bmr * $multiplier);
    }

    /**
     * Calculate daily calorie target with deficit
     */
    public function calculate_daily_calories($tdee, $weight_goal_monthly_kg) {
        // 1 kg fat = 7700 kcal
        // Deficit per day = (goal_kg * 7700) / 30 days
        $daily_deficit = ($weight_goal_monthly_kg * 7700) / 30;

        $daily_calories = $tdee - $daily_deficit;

        // Safety limits
        $daily_calories = max($daily_calories, 1200); // Minimum 1200 kcal
        $daily_calories = min($daily_calories, 4000); // Maximum 4000 kcal

        return round($daily_calories);
    }

    /**
     * Calculate macros (keto standard: 70/25/5)
     */
    public function calculate_macros($daily_calories) {
        return array(
            'fat_grams' => round(($daily_calories * 0.70) / 9),
            'protein_grams' => round(($daily_calories * 0.25) / 4),
            'carbs_grams' => round(($daily_calories * 0.05) / 4),
            'max_net_carbs' => 50
        );
    }

    /**
     * Convert units
     */
    public function convert_weight_to_kg($weight, $unit_system) {
        if ($unit_system === 'imperial') {
            return $weight * 0.453592; // pounds to kg
        }
        return $weight;
    }

    public function convert_height_to_cm($height, $unit_system) {
        if ($unit_system === 'imperial') {
            return $height * 2.54; // inches to cm
        }
        return $height;
    }
}
```

---

## 🎨 PHASE 2: FRONTEND UI (Week 3-4)

### Build Calculator Interface

**File: `public/js/calculator.js`**

```javascript
// Keto Calculator - Main JavaScript
(function($) {
    'use strict';

    const KetoCalculator = {

        currentStep: 1,
        totalSteps: 6,
        userData: {},

        init: function() {
            this.bindEvents();
            this.loadTranslations();
            this.restoreSession();
        },

        bindEvents: function() {
            // Navigation
            $('.keto-calc-next').on('click', this.nextStep.bind(this));
            $('.keto-calc-back').on('click', this.prevStep.bind(this));

            // Form validation
            $('input, select').on('blur', this.validateField.bind(this));

            // Real-time calculations
            $('#age, #weight, #height, #activity_level').on('change', this.calculateBMR.bind(this));

            // Weight goal slider
            $('#weight_goal').on('input', this.updateWeightGoal.bind(this));
        },

        nextStep: function(e) {
            e.preventDefault();

            if (this.validateStep(this.currentStep)) {
                this.saveStepData();
                this.currentStep++;
                this.showStep(this.currentStep);
                this.updateProgressBar();
            }
        },

        validateStep: function(step) {
            // Validation logic for each step
            // See USER_FLOW.md for validation rules
            return true;
        },

        calculateBMR: function() {
            const age = parseInt($('#age').val());
            const weight = parseFloat($('#weight').val());
            const height = parseFloat($('#height').val());
            const gender = $('input[name="gender"]:checked').val();
            const activity = $('#activity_level').val();

            if (age && weight && height && gender && activity) {
                // Call WordPress AJAX to calculate BMR/TDEE
                $.ajax({
                    url: ketoCalcData.ajaxUrl,
                    type: 'POST',
                    data: {
                        action: 'keto_calc_calculate',
                        age: age,
                        weight: weight,
                        height: height,
                        gender: gender,
                        activity: activity
                    },
                    success: function(response) {
                        if (response.success) {
                            $('#bmr_result').text(response.data.bmr);
                            $('#tdee_result').text(response.data.tdee);
                        }
                    }
                });
            }
        }

        // More methods...
    };

    // Initialize on document ready
    $(document).ready(function() {
        KetoCalculator.init();
    });

})(jQuery);
```

---

## 🔌 PHASE 3: REST API (Week 5-6)

### Create API Endpoints

**File: `includes/class-api.php`**

```php
<?php
class Keto_API {

    public function __construct() {
        add_action('rest_api_init', array($this, 'register_routes'));
    }

    public function register_routes() {
        $namespace = 'keto-calculator/v1';

        // Profile endpoints
        register_rest_route($namespace, '/profile/create', array(
            'methods' => 'POST',
            'callback' => array($this, 'create_profile'),
            'permission_callback' => array($this, 'check_user_permission')
        ));

        // Meal plan endpoint
        register_rest_route($namespace, '/meal-plan/generate', array(
            'methods' => 'POST',
            'callback' => array($this, 'generate_meal_plan'),
            'permission_callback' => array($this, 'check_user_permission')
        ));
    }

    public function generate_meal_plan($request) {
        $params = $request->get_params();

        // Validate input
        // Build N8N webhook payload
        // Send to N8N
        // Return response

        return new WP_REST_Response(array(
            'success' => true,
            'plan_id' => $plan_id,
            'message' => 'Meal plan is being generated'
        ), 200);
    }

    public function check_user_permission() {
        return is_user_logged_in();
    }
}
```

---

## 🤖 PHASE 4: N8N INTEGRATION (Week 5-6)

### Set Up N8N Workflow

1. **Create N8N Account** (if cloud) or install N8N locally:
```bash
npm install n8n -g
n8n start
```

2. **Import Workflow:**
   - Copy workflow from `N8N_WORKFLOW_DETAILED.md`
   - Create each node as specified
   - Add your API keys as environment variables

3. **Test Webhook:**
```bash
curl -X POST https://your-n8n-url.com/webhook/keto-meal-plan \
  -H "Content-Type: application/json" \
  -H "X-N8N-Auth-Token: your-token" \
  -d @test-payload.json
```

---

## 📄 PHASE 5: PDF GENERATION (Week 7)

### Set Up Puppeteer Service

**Option 1: Separate PDF Service (Recommended)**

```javascript
// pdf-service.js
const express = require('express');
const puppeteer = require('puppeteer');
const app = express();

app.post('/generate-pdf', async (req, res) => {
    const { html, filename } = req.body;

    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);

    const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });

    await browser.close();

    res.contentType('application/pdf');
    res.send(pdf);
});

app.listen(3000);
```

**Option 2: Use PDF API Service**
- PDFShift
- DocRaptor
- Gotenberg (self-hosted)

---

## ✅ TESTING CHECKLIST

### Unit Tests
- [ ] BMR calculation (multiple test cases)
- [ ] TDEE calculation (all activity levels)
- [ ] Calorie deficit calculation
- [ ] Macro calculations
- [ ] Unit conversions (metric/imperial)

### Integration Tests
- [ ] User registration flow
- [ ] API endpoint responses
- [ ] Database queries
- [ ] N8N webhook
- [ ] ChatGPT API
- [ ] PDF generation
- [ ] Email delivery

### User Acceptance Tests
- [ ] Complete flow in Danish
- [ ] Complete flow in English
- [ ] Complete flow in Swedish
- [ ] Mobile responsive (iPhone, Android)
- [ ] Tablet responsive (iPad)
- [ ] Desktop (Chrome, Safari, Firefox)
- [ ] Form validation (all fields)
- [ ] Error handling

---

## 🐛 DEBUGGING TIPS

### WordPress Debug Mode

```php
// wp-config.php
define('WP_DEBUG', true);
define('WP_DEBUG_LOG', true);
define('WP_DEBUG_DISPLAY', false);
```

Check logs at: `wp-content/debug.log`

### JavaScript Console

```javascript
// Add to calculator.js for debugging
console.log('Current step:', this.currentStep);
console.log('User data:', this.userData);
```

### API Testing with Postman

1. Create collection: "Keto Calculator API"
2. Add requests for each endpoint
3. Set authorization header
4. Save example requests/responses

---

## 🚀 DEPLOYMENT CHECKLIST

### Before Going Live

- [ ] All tests passing
- [ ] Database optimized (indexes added)
- [ ] Security review complete
- [ ] HTTPS/SSL configured
- [ ] API keys in environment variables
- [ ] Error logging configured
- [ ] Backup system in place
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] GDPR compliance checked
- [ ] Performance tested (> 20 concurrent users)
- [ ] Cross-browser tested
- [ ] Mobile tested on real devices
- [ ] N8N workflow tested end-to-end
- [ ] ChatGPT prompts producing quality results
- [ ] PDF template looking professional
- [ ] Email delivery working (check spam folders)

---

## 📚 HELPFUL RESOURCES

### WordPress Development
- [WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [WordPress Database Class Reference](https://developer.wordpress.org/reference/classes/wpdb/)

### N8N
- [N8N Documentation](https://docs.n8n.io/)
- [N8N Community](https://community.n8n.io/)

### OpenAI
- [ChatGPT API Docs](https://platform.openai.com/docs/)
- [Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)

### Keto Diet
- [Keto Macro Calculator Formulas](https://www.ruled.me/keto-calculator/)
- [Net Carbs Explanation](https://www.ruled.me/what-are-net-carbs/)

---

## 💬 NEED HELP?

### Common Issues

**Issue:** Database tables not creating
**Solution:** Check user permissions, try running SQL manually in phpMyAdmin

**Issue:** JavaScript not loading
**Solution:** Check `wp_enqueue_script()` in plugin file, verify file paths

**Issue:** API returns 401 Unauthorized
**Solution:** Check nonce verification, ensure user is logged in

**Issue:** N8N webhook timeout
**Solution:** Increase timeout in N8N settings, check ChatGPT API response time

**Issue:** PDF not generating
**Solution:** Check Puppeteer installation, verify HTML template is valid

**Issue:** Email not received
**Solution:** Check spam folder, verify SMTP credentials, test with mail-tester.com

---

## 🎉 YOU'RE READY TO START!

### Recommended First Steps:

1. **Today:** Read all documentation (3-4 hours)
2. **Day 2:** Set up development environment
3. **Day 3-4:** Create plugin structure and database
4. **Day 5-7:** Build calculator logic and test
5. **Week 2:** Start frontend UI
6. **Week 3-4:** Complete all UI steps
7. **Week 5-6:** Backend API and N8N
8. **Week 7:** PDF and email
9. **Week 8:** Testing
10. **Week 9:** Deploy!

### Questions to Ask Yourself Before Starting:

- [ ] Do I understand the keto diet basics?
- [ ] Do I know how BMR/TDEE is calculated?
- [ ] Am I comfortable with WordPress plugin development?
- [ ] Do I understand REST API design?
- [ ] Have I used N8N before (or willing to learn)?
- [ ] Do I have all necessary API keys?
- [ ] Is my development environment ready?

**If you answered "no" to any question, spend time learning that topic first.**

---

**Good luck! You have everything you need to build an amazing product. 🚀**

**Refer back to the documentation whenever you need clarification.**

**Take it step-by-step, and you'll have a working MVP in 9 weeks!**
