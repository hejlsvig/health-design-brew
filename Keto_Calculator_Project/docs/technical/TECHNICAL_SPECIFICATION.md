# Keto Calculator & Meal Planner - Technical Specification
**Version:** 1.0
**Date:** 2026-01-23
**Project:** Personalized Keto Nutrition Calculator with AI Meal Planning

---

## 1. PROJECT OVERVIEW

### 1.1 Purpose
A multilingual web application that calculates personalized daily caloric needs, generates customized keto meal plans, and provides shopping lists based on user preferences and fasting protocols.

### 1.2 Key Features
- BMR/TDEE calculation with activity level
- Weight loss goal setting (0-3 kg/month)
- Intermittent fasting protocol selection
- Ingredient preference matrix
- AI-generated keto meal plans (ChatGPT)
- PDF generation with meal plan and shopping list
- Email delivery
- Multi-language support (Danish, English, Swedish)
- User authentication and data persistence

### 1.3 Technology Stack

**Frontend:**
- HTML5, CSS3, JavaScript (ES6+)
- React.js or Vue.js (for component-based architecture)
- Responsive design (mobile-first)

**Backend:**
- WordPress REST API
- Custom WordPress plugin for calculator logic
- PHP 8.0+

**Database:**
- MySQL (WordPress database)
- Custom tables for user data and meal plans

**External Services:**
- N8N (workflow automation)
- OpenAI ChatGPT API (meal plan generation)
- PDF generation service (Puppeteer or similar)
- Email service (SMTP or SendGrid)

**Hosting:**
- One.com shared hosting
- WordPress installation

---

## 2. SYSTEM ARCHITECTURE

### 2.1 High-Level Architecture

```
┌─────────────┐
│   User      │
│  Browser    │
└──────┬──────┘
       │
       ├──► WordPress Frontend (Calculator UI)
       │
       ↓
┌──────────────────────────────────┐
│   WordPress Backend              │
│   - Custom Plugin                │
│   - REST API Endpoints           │
│   - User Authentication          │
│   - Data Validation              │
└──────┬───────────────────────────┘
       │
       ├──► MySQL Database
       │    (User data, preferences, meal plans)
       │
       └──► N8N Webhook
            │
            ├──► ChatGPT API (Meal plan generation)
            │
            ├──► PDF Generator (Puppeteer/external service)
            │
            └──► Email Service (PDF delivery)
```

### 2.2 Component Breakdown

#### 2.2.1 Frontend Components
1. **Calculator Module**
   - Personal Stats Input
   - BMR/TDEE Display
   - Goal Setting

2. **Fasting Protocol Selector**
   - Visual selection of fasting windows
   - Meal count display

3. **Ingredient Preference Matrix**
   - Grid layout with checkboxes
   - Categories: Meat, Fish, Dairy, Vegetables, Nuts, Fats

4. **Meal Plan Configuration**
   - Days selection (1-7)
   - Leftovers toggle
   - Diet variant selector

5. **Results Display**
   - Loading state
   - Success message
   - PDF preview/download

#### 2.2.2 Backend Components
1. **Calculator Engine**
   - BMR calculation (Mifflin-St Jeor)
   - TDEE calculation
   - Calorie deficit calculation

2. **Data Validator**
   - Input sanitization
   - Range validation
   - Type checking

3. **User Manager**
   - Registration/login
   - Profile management
   - Session handling

4. **API Gateway**
   - REST endpoints
   - Authentication middleware
   - Rate limiting

5. **N8N Integration**
   - Webhook sender
   - Response handler
   - Error handling

---

## 3. DATABASE SCHEMA

### 3.1 Custom Tables

#### Table: `wp_keto_user_profiles`
```sql
CREATE TABLE wp_keto_user_profiles (
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
    FOREIGN KEY (user_id) REFERENCES wp_users(ID) ON DELETE CASCADE,
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `wp_keto_ingredients`
```sql
CREATE TABLE wp_keto_ingredients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name_en VARCHAR(100) NOT NULL,
    name_da VARCHAR(100) NOT NULL,
    name_se VARCHAR(100) NOT NULL,
    category ENUM('meat', 'fish', 'dairy', 'eggs', 'vegetables', 'nuts', 'fats') NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `wp_keto_user_preferences`
```sql
CREATE TABLE wp_keto_user_preferences (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    ingredient_id INT NOT NULL,
    is_excluded BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES wp_users(ID) ON DELETE CASCADE,
    FOREIGN KEY (ingredient_id) REFERENCES wp_keto_ingredients(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_ingredient (user_id, ingredient_id),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Table: `wp_keto_meal_plans`
```sql
CREATE TABLE wp_keto_meal_plans (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    num_days TINYINT NOT NULL,
    allow_leftovers BOOLEAN DEFAULT FALSE,
    diet_variant ENUM('standard', 'vegetarian', 'pescatarian') NOT NULL DEFAULT 'standard',
    fasting_protocol ENUM('no_fast', '16_8', '18_6', '20_4', 'omad') NOT NULL,
    daily_calories INT NOT NULL,
    max_carbs INT DEFAULT 50,
    meal_plan_json TEXT NOT NULL,
    shopping_list_json TEXT NOT NULL,
    pdf_url VARCHAR(255),
    chatgpt_prompt TEXT,
    chatgpt_response TEXT,
    status ENUM('pending', 'generated', 'sent', 'failed') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sent_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES wp_users(ID) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at),
    INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3.2 Seed Data - Ingredients

```sql
-- Meat
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Beef', 'Oksekød', 'Nötkött', 'meat'),
('Chicken', 'Kylling', 'Kyckling', 'meat'),
('Pork', 'Svinekød', 'Fläsk', 'meat'),
('Lamb', 'Lam', 'Lamm', 'meat'),
('Duck', 'And', 'Anka', 'meat'),
('Turkey', 'Kalkun', 'Kalkon', 'meat'),
('Bacon', 'Bacon', 'Bacon', 'meat');

-- Fish & Seafood
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Salmon', 'Laks', 'Lax', 'fish'),
('Cod', 'Torsk', 'Torsk', 'fish'),
('Tuna', 'Tun', 'Tonfisk', 'fish'),
('Shrimp', 'Rejer', 'Räkor', 'fish'),
('Mussels', 'Muslinger', 'Musslor', 'fish'),
('Mackerel', 'Makrel', 'Makrill', 'fish');

-- Dairy
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Butter', 'Smør', 'Smör', 'dairy'),
('Cream', 'Fløde', 'Grädde', 'dairy'),
('Cheese (Cheddar)', 'Ost (Cheddar)', 'Ost (Cheddar)', 'dairy'),
('Cream Cheese', 'Flødeost', 'Philadelphiaost', 'dairy'),
('Greek Yogurt', 'Græsk Yoghurt', 'Grekisk Yoghurt', 'dairy'),
('Mozzarella', 'Mozzarella', 'Mozzarella', 'dairy'),
('Parmesan', 'Parmesan', 'Parmesan', 'dairy');

-- Eggs
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Eggs', 'Æg', 'Ägg', 'eggs');

-- Vegetables (Low-carb)
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Broccoli', 'Broccoli', 'Broccoli', 'vegetables'),
('Cauliflower', 'Blomkål', 'Blomkål', 'vegetables'),
('Spinach', 'Spinat', 'Spenat', 'vegetables'),
('Lettuce', 'Salat', 'Sallad', 'vegetables'),
('Cucumber', 'Agurk', 'Gurka', 'vegetables'),
('Zucchini', 'Squash', 'Zucchini', 'vegetables'),
('Bell Peppers', 'Peberfrugt', 'Paprika', 'vegetables'),
('Onion', 'Løg', 'Lök', 'vegetables'),
('Garlic', 'Hvidløg', 'Vitlök', 'vegetables'),
('Tomatoes', 'Tomater', 'Tomater', 'vegetables'),
('Avocado', 'Avocado', 'Avokado', 'vegetables'),
('Mushrooms', 'Svampe', 'Svamp', 'vegetables'),
('Asparagus', 'Asparges', 'Sparris', 'vegetables'),
('Kale', 'Grønkål', 'Grönkål', 'vegetables');

-- Nuts & Seeds
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Almonds', 'Mandler', 'Mandlar', 'nuts'),
('Walnuts', 'Valnødder', 'Valnötter', 'nuts'),
('Pecans', 'Pekannødder', 'Pekannötter', 'nuts'),
('Chia Seeds', 'Chiafrø', 'Chiafrön', 'nuts'),
('Flaxseeds', 'Hørfrø', 'Linfrön', 'nuts'),
('Pumpkin Seeds', 'Græskarkerner', 'Pumpafrön', 'nuts'),
('Sunflower Seeds', 'Solsikkekerner', 'Solrosfrön', 'nuts');

-- Fats & Oils
INSERT INTO wp_keto_ingredients (name_en, name_da, name_se, category) VALUES
('Olive Oil', 'Olivenolie', 'Olivolja', 'fats'),
('Coconut Oil', 'Kokosolie', 'Kokosolja', 'fats'),
('Avocado Oil', 'Avocadoolie', 'Avokadoolja', 'fats'),
('MCT Oil', 'MCT Olie', 'MCT Olja', 'fats');
```

---

## 4. API ENDPOINTS

### 4.1 WordPress REST API Endpoints

#### Base URL: `/wp-json/keto-calculator/v1/`

#### 4.1.1 User Profile

**POST** `/profile/create`
- **Description:** Create or update user profile
- **Authentication:** Required (WordPress user)
- **Request Body:**
```json
{
  "age": 35,
  "gender": "male",
  "weight": 85.5,
  "height": 180,
  "activity_level": "moderately_active",
  "weight_goal_monthly": 2,
  "fasting_protocol": "16_8",
  "preferred_language": "da",
  "unit_system": "metric"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "bmr": 1820,
    "tdee": 2821,
    "daily_calories": 2308
  }
}
```

**GET** `/profile/get`
- **Description:** Get current user profile
- **Authentication:** Required
- **Response:** User profile object

#### 4.1.2 Ingredients

**GET** `/ingredients/list`
- **Description:** Get all ingredients with translations
- **Query Parameters:**
  - `language` (optional): da/en/se
- **Response:**
```json
{
  "success": true,
  "data": {
    "meat": [
      {"id": 1, "name": "Oksekød", "is_excluded": false},
      {"id": 2, "name": "Kylling", "is_excluded": false}
    ],
    "vegetables": [...]
  }
}
```

**POST** `/preferences/update`
- **Description:** Update user ingredient preferences
- **Authentication:** Required
- **Request Body:**
```json
{
  "excluded_ingredients": [8, 15, 22]
}
```

#### 4.1.3 Meal Plan

**POST** `/meal-plan/generate`
- **Description:** Trigger meal plan generation
- **Authentication:** Required
- **Request Body:**
```json
{
  "num_days": 7,
  "allow_leftovers": true,
  "diet_variant": "standard"
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "plan_id": 123,
    "status": "pending",
    "message": "Meal plan is being generated. You will receive an email shortly."
  }
}
```

**GET** `/meal-plan/status/{plan_id}`
- **Description:** Check meal plan generation status
- **Authentication:** Required
- **Response:**
```json
{
  "success": true,
  "data": {
    "status": "generated",
    "pdf_url": "https://example.com/path/to/pdf",
    "created_at": "2026-01-23 10:30:00"
  }
}
```

**GET** `/meal-plan/history`
- **Description:** Get user's meal plan history
- **Authentication:** Required
- **Response:** Array of meal plans

---

## 5. N8N WORKFLOW SPECIFICATION

### 5.1 Workflow: Meal Plan Generation

#### Trigger Node
- **Type:** Webhook
- **Method:** POST
- **URL:** `https://n8n.yourdomain.com/webhook/keto-meal-plan`

#### Input Data Structure:
```json
{
  "user_id": 123,
  "email": "user@example.com",
  "plan_id": 456,
  "language": "da",
  "user_profile": {
    "age": 35,
    "gender": "male",
    "weight": 85.5,
    "height": 180,
    "daily_calories": 2308,
    "fasting_protocol": "16_8",
    "diet_variant": "standard"
  },
  "meal_config": {
    "num_days": 7,
    "allow_leftovers": true,
    "meals_per_day": 3
  },
  "excluded_ingredients": ["Onion", "Garlic"],
  "included_ingredients": ["Beef", "Chicken", "Salmon", "Broccoli", "..."]
}
```

#### Workflow Steps:

1. **Webhook Receive**
   - Validate incoming data
   - Extract all parameters

2. **Build ChatGPT Prompt** (Function Node)
   - Format user data into structured prompt
   - Include dietary restrictions
   - Specify output format requirements

3. **ChatGPT API Call** (HTTP Request Node)
   - **Endpoint:** `https://api.openai.com/v1/chat/completions`
   - **Model:** `gpt-4` or `gpt-4-turbo`
   - **Max Tokens:** 4000-8000 (depending on days)
   - **Temperature:** 0.7

4. **Parse Response** (Function Node)
   - Extract meal plan JSON
   - Validate structure
   - Calculate nutritional totals

5. **Generate PDF** (HTTP Request to PDF Service)
   - Send formatted data to Puppeteer service
   - Receive PDF URL

6. **Send Email** (Send Email Node)
   - Attach PDF
   - Personalized message in user's language
   - Include summary of meal plan

7. **Update WordPress** (HTTP Request Node)
   - POST to `/wp-json/keto-calculator/v1/meal-plan/update-status`
   - Update plan status to "sent"
   - Store PDF URL

8. **Error Handling** (IF Node + Email)
   - If any step fails, send error notification
   - Log error to WordPress
   - Update status to "failed"

---

## 6. CHATGPT PROMPT TEMPLATE

### 6.1 System Prompt
```
You are a professional keto nutrition expert and meal planner. Your task is to create personalized ketogenic meal plans that are:
- Nutritionally balanced and under 50g net carbs per day
- Delicious and varied
- Practical to prepare
- Based on available ingredients
- Culturally appropriate for the user's language/region

Always provide exact measurements, cooking times, and detailed nutritional information.
```

### 6.2 User Prompt Template (Danish Example)
```
Opret en personaliseret keto-madplan med følgende specifikationer:

**Brugerprofil:**
- Køn: Mand
- Alder: 35 år
- Vægt: 85.5 kg
- Højde: 180 cm
- Daglige kalorier: 2308 kcal
- Fastenprotokol: 16:8 (3 måltider inden for 8 timer)
- Vægtmål: Tab 2 kg/måned

**Madplan konfiguration:**
- Antal dage: 7
- Rester tilladt: Ja
- Diætvariant: Standard keto
- Måltider per dag: 3 (morgenmad, frokost, aftensmad)

**Ingredienser at INKLUDERE:**
Oksekød, Kylling, Laks, Bacon, Æg, Smør, Fløde, Ost, Broccoli, Blomkål, Spinat, Avocado, Olivenolie

**Ingredienser at UNDGÅ:**
Løg, Hvidløg

**Makrofordeling:**
- Fedt: 70%
- Protein: 25%
- Kulhydrater: 5% (max 50g netto/dag)

**Output format (VIGTIG - følg denne struktur nøjagtigt):**

Returner UDELUKKENDE en JSON struktur i følgende format:

{
  "meal_plan": {
    "day_1": {
      "date": "Mandag",
      "meals": [
        {
          "meal_type": "breakfast",
          "name": "Navn på ret",
          "ingredients": [
            {"name": "Ingrediens", "amount": "100 g"}
          ],
          "instructions": ["Trin 1", "Trin 2"],
          "prep_time": "10 min",
          "cook_time": "15 min",
          "servings": 1,
          "nutrition": {
            "calories": 650,
            "protein": 35,
            "fat": 52,
            "carbs": 8,
            "fiber": 3,
            "net_carbs": 5
          }
        }
      ],
      "daily_totals": {
        "calories": 2300,
        "protein": 140,
        "fat": 175,
        "carbs": 45,
        "net_carbs": 28
      }
    }
  },
  "shopping_list": {
    "meat": [{"item": "Oksekød", "amount": "500 g"}],
    "vegetables": [{"item": "Broccoli", "amount": "2 hoveder"}],
    "dairy": [{"item": "Fløde", "amount": "500 ml"}]
  },
  "weekly_summary": {
    "total_calories_avg": 2308,
    "total_protein_avg": 145,
    "total_fat_avg": 178,
    "total_carbs_avg": 42,
    "total_net_carbs_avg": 27
  }
}

**Vigtige retningslinjer:**
1. Alle opskrifter skal være nemme at lave og tage max 45 minutter
2. Hvis "Rester tilladt", lav større portioner og genbruger næste dag
3. Sørg for variation i proteinkilder gennem ugen
4. Hold dig STRENGT til de tilladte ingredienser
5. Hold kulhydrater under 50g netto per dag
6. Alle målinger i metriske enheder (gram, ml, liter)
7. Alle instruktioner på dansk
```

### 6.3 Response Validation
- Verify JSON structure is valid
- Check that all days are present
- Verify net carbs are under 50g per day
- Ensure only allowed ingredients are used
- Validate nutritional calculations

---

## 7. PDF TEMPLATE SPECIFICATION

### 7.1 Layout Structure

**Page 1: Cover & Summary**
- Logo/branding
- User name
- Date generated
- Language selection
- Personal stats summary (age, weight, height)
- Calorie goals
- Fasting protocol
- Macro breakdown (pie chart)

**Pages 2-N: Daily Meal Plans**
For each day:
- Day header (Day 1 - Monday)
- Meal cards (Breakfast, Lunch, Dinner)
  - Meal photo placeholder
  - Recipe name
  - Ingredients list with amounts
  - Step-by-step instructions
  - Nutrition facts table
- Daily totals summary

**Last Page: Shopping List**
- Categorized by food group
  - Meat & Poultry
  - Fish & Seafood
  - Dairy & Eggs
  - Vegetables
  - Nuts & Seeds
  - Fats & Oils
  - Pantry items
- Quantities aggregated for full week

### 7.2 Design Specifications
- **Color Scheme:**
  - Primary: #4A7C59 (green)
  - Secondary: #F5F5DC (beige)
  - Accent: #FF6B6B (coral)
- **Fonts:**
  - Headers: Montserrat Bold
  - Body: Open Sans Regular
- **Page Size:** A4 (210mm × 297mm)
- **Margins:** 20mm all sides
- **File Format:** PDF/A (archival)

---

## 8. TRANSLATION STRUCTURE

### 8.1 Translation Keys JSON

```json
{
  "da": {
    "calculator": {
      "title": "Personlig Keto Kalkulator",
      "subtitle": "Beregn dine daglige kaloriebehov",
      "age": "Alder",
      "gender": "Køn",
      "male": "Mand",
      "female": "Kvinde",
      "weight": "Vægt",
      "height": "Højde",
      "activity_level": "Aktivitetsniveau",
      "sedentary": "Stillesiddende",
      "lightly_active": "Let aktiv",
      "moderately_active": "Moderat aktiv",
      "very_active": "Meget aktiv",
      "extra_active": "Ekstra aktiv"
    },
    "fasting": {
      "title": "Vælg fastenprotokol",
      "no_fast": "Ingen faste",
      "16_8": "16:8 (3 måltider på 8 timer)",
      "18_6": "18:6 (3 måltider på 6 timer)",
      "20_4": "20:4 (2 måltider på 4 timer)",
      "omad": "OMAD (1 måltid per dag)"
    },
    "ingredients": {
      "title": "Vælg dine ingredienser",
      "select_all": "Vælg alle",
      "deselect_all": "Fravælg alle"
    }
  },
  "en": {
    "calculator": {
      "title": "Personal Keto Calculator",
      "subtitle": "Calculate your daily caloric needs",
      ...
    }
  },
  "se": {
    "calculator": {
      "title": "Personlig Keto Kalkylator",
      "subtitle": "Beräkna ditt dagliga kaloriebehov",
      ...
    }
  }
}
```

---

## 9. USER FLOW DIAGRAM

```
START
  │
  ├─► [1] Language & Unit Selection
  │     ↓
  ├─► [2] Personal Stats Input
  │     ↓
  ├─► [3] BMR/TDEE Calculation & Display
  │     ↓
  ├─► [4] Weight Goal Setting
  │     ↓
  ├─► [5] Fasting Protocol Selection
  │     ↓
  ├─► [6] Ingredient Preferences
  │     ↓
  ├─► [7] Meal Plan Configuration
  │     ↓
  ├─► [8] Review & Confirm
  │     ↓
  ├─► [9] Login/Register (if not logged in)
  │     ↓
  ├─► [10] Submit to N8N
  │     ↓
  ├─► [11] Loading State (Progress indicator)
  │     ↓
  ├─► [12] Success Message
  │     ↓
  └─► [13] Email Sent (with PDF link)
```

---

## 10. CALCULATION FORMULAS

### 10.1 BMR (Basal Metabolic Rate) - Mifflin-St Jeor

**Men:**
```
BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age_years) + 5
```

**Women:**
```
BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age_years) - 161
```

### 10.2 TDEE (Total Daily Energy Expenditure)

```
TDEE = BMR × Activity_Multiplier
```

**Activity Multipliers:**
- Sedentary (little/no exercise): 1.2
- Lightly Active (1-3 days/week): 1.375
- Moderately Active (3-5 days/week): 1.55
- Very Active (6-7 days/week): 1.725
- Extra Active (physical job + exercise): 1.9

### 10.3 Calorie Deficit for Weight Loss

```
Daily_Calories = TDEE - ((Weight_Goal_Monthly_kg × 7700) / 30)
```

**Example:**
- TDEE: 2821 kcal
- Goal: Lose 2 kg/month
- Deficit: (2 × 7700) / 30 = 513 kcal/day
- Daily Calories: 2821 - 513 = 2308 kcal

### 10.4 Macro Calculations (Keto Standard)

**Fat (70%):**
```
Fat_grams = (Daily_Calories × 0.70) / 9
```

**Protein (25%):**
```
Protein_grams = (Daily_Calories × 0.25) / 4
```

**Carbs (5%):**
```
Carbs_grams = (Daily_Calories × 0.05) / 4
```
**Maximum:** 50g net carbs/day

---

## 11. SECURITY CONSIDERATIONS

### 11.1 Data Protection
- All passwords hashed with WordPress standards (bcrypt)
- HTTPS only (SSL certificate required)
- CSRF tokens on all forms
- Input sanitization and validation
- SQL injection prevention (prepared statements)
- XSS prevention (output escaping)

### 11.2 Privacy
- GDPR compliance
- Cookie consent banner
- Privacy policy
- Terms of service
- Data deletion on request
- No third-party analytics without consent

### 11.3 API Security
- Rate limiting on API endpoints
- WordPress nonce verification
- User authentication required for sensitive endpoints
- N8N webhook authentication token
- ChatGPT API key stored securely (environment variables)

### 11.4 PDF Security
- Unique, non-guessable filenames
- Time-limited access URLs
- No sensitive data in filenames
- Automatic cleanup of old PDFs (30 days)

---

## 12. ERROR HANDLING

### 12.1 Frontend Validation
- Real-time input validation
- Clear error messages in user's language
- Field highlighting on error
- Prevent submission until valid

### 12.2 Backend Validation
- Server-side validation of all inputs
- Range checks (age: 18-100, weight: 30-300kg, etc.)
- Type validation
- Required field checks

### 12.3 API Error Responses

**Structure:**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Age must be between 18 and 100",
    "field": "age"
  }
}
```

**Error Codes:**
- `INVALID_INPUT` - Input validation failed
- `UNAUTHORIZED` - Not logged in
- `NOT_FOUND` - Resource not found
- `RATE_LIMIT` - Too many requests
- `SERVER_ERROR` - Internal server error
- `N8N_ERROR` - Workflow execution failed
- `CHATGPT_ERROR` - AI generation failed
- `PDF_ERROR` - PDF generation failed
- `EMAIL_ERROR` - Email sending failed

### 12.4 N8N Error Handling
- Retry mechanism (3 attempts with exponential backoff)
- Error notifications to admin
- Fallback to queue system if immediate processing fails
- User notification if process takes too long

---

## 13. PERFORMANCE OPTIMIZATION

### 13.1 Frontend
- Minified CSS/JS
- Image optimization
- Lazy loading
- Browser caching
- CDN for static assets

### 13.2 Backend
- Database query optimization
- Object caching (WordPress transients)
- API response caching where appropriate
- Database indexes on frequently queried fields

### 13.3 N8N
- Async processing (don't block user)
- Queue management for high load
- Webhook timeout handling

---

## 14. TESTING REQUIREMENTS

### 14.1 Unit Tests
- Calculator functions (BMR, TDEE, calorie deficit)
- Input validation functions
- Data transformation functions

### 14.2 Integration Tests
- API endpoints
- Database operations
- N8N webhook integration
- Email delivery

### 14.3 User Acceptance Testing
- Complete user flow (all steps)
- Multiple languages
- Different device sizes
- Different browsers

### 14.4 Load Testing
- Concurrent user simulation
- API rate limiting verification
- Database performance under load

---

## 15. DEPLOYMENT PLAN

### Phase 1: Development Environment
1. Set up local WordPress installation
2. Create standalone prototype
3. Develop and test all components
4. Test N8N workflow locally

### Phase 2: Staging Environment
1. Deploy to One.com test subdomain
2. Configure production-like environment
3. Full integration testing
4. User acceptance testing

### Phase 3: Production Deployment
1. Backup existing site
2. Deploy WordPress plugin
3. Run database migrations
4. Configure N8N webhooks
5. SSL certificate verification
6. Final smoke tests
7. Go live

### Phase 4: Post-Launch
1. Monitor error logs
2. Track user feedback
3. Performance monitoring
4. Iterative improvements

---

## 16. MAINTENANCE & SUPPORT

### 16.1 Regular Maintenance
- Daily backups
- Weekly security updates
- Monthly performance review
- Quarterly feature updates

### 16.2 Monitoring
- Error logging (WordPress debug.log)
- N8N workflow success rate
- Email delivery rate
- User registration/completion rate
- API response times

### 16.3 Support
- User documentation (FAQ)
- Admin documentation
- Troubleshooting guides
- Contact form for issues

---

## 17. FUTURE ENHANCEMENTS (Post-MVP)

### 17.1 Phase 2 Features
- Progress tracking dashboard
- Weight logging over time
- Favorite recipes
- Meal swapping functionality
- Recipe rating system
- Social sharing

### 17.2 Phase 3 Features
- Mobile app (React Native)
- Integration with fitness trackers
- Grocery delivery API integration
- Community features
- Nutrition coach chat
- Subscription model

---

## APPENDIX

### A. Glossary
- **BMR:** Basal Metabolic Rate
- **TDEE:** Total Daily Energy Expenditure
- **Keto:** Ketogenic diet
- **OMAD:** One Meal A Day
- **MCT:** Medium-Chain Triglycerides
- **Net Carbs:** Total carbs minus fiber

### B. References
- Mifflin-St Jeor Equation
- Ketogenic Diet Guidelines
- GDPR Compliance
- WordPress Coding Standards

### C. Version History
- v1.0 (2026-01-23): Initial specification

---

**Document Owner:** Anders Hejlsvig
**Last Updated:** 2026-01-23
**Status:** Draft for Review
