// Keto Calculator - JavaScript Logic

// Global state
let currentStep = 0;
let userData = {
    language: 'da',
    units: 'metric',
    gender: 'male',
    age: null,
    weight: null,
    height: null,
    activity: 'moderately_active',
    bmr: 0,
    tdee: 0,
    weightGoal: 2,
    dailyCalories: 0,
    mealsPerDay: 3,
    prepTime: 'medium',
    budget: 'medium',
    antiInflammatory: true,
    avoidProcessed: true,
    numDays: 4,
    leftovers: true,
    diet: 'standard',
    excludedIngredients: []
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Keto Calculator loaded!');
    loadFromLocalStorage();

    // Always start at step 0
    currentStep = 0;
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-0').classList.add('active');

    // Sync units with checked radio button on load
    const checkedUnitRadio = document.querySelector('input[name="units"]:checked');
    if (checkedUnitRadio) {
        userData.units = checkedUnitRadio.value;
        console.log('Initial units set to:', userData.units);
    }

    updateTranslations();
    setupEventListeners();
});

// Setup event listeners
function setupEventListeners() {
    // Unit system change
    const unitRadios = document.querySelectorAll('input[name="units"]');
    unitRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            userData.units = this.value;
            updateUnitLabels();
            document.querySelectorAll('.radio-card').forEach(card => card.classList.remove('active'));
            this.closest('.radio-card').classList.add('active');
        });
    });

    // Meals per day change
    const mealsRadios = document.querySelectorAll('input[name="meals"]');
    mealsRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            userData.mealsPerDay = parseInt(this.value);
            document.querySelectorAll('input[name="meals"]').forEach(r => {
                r.closest('.fasting-card').classList.remove('active');
            });
            this.closest('.fasting-card').classList.add('active');
        });
    });

    // Prep time change
    const prepTimeRadios = document.querySelectorAll('input[name="prep_time"]');
    prepTimeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            userData.prepTime = this.value;
            document.querySelectorAll('input[name="prep_time"]').forEach(r => {
                r.closest('.fasting-card').classList.remove('active');
            });
            this.closest('.fasting-card').classList.add('active');
        });
    });

    // Budget change
    const budgetRadios = document.querySelectorAll('input[name="budget"]');
    budgetRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            userData.budget = this.value;
            document.querySelectorAll('input[name="budget"]').forEach(r => {
                r.closest('.fasting-card').classList.remove('active');
            });
            this.closest('.fasting-card').classList.add('active');
        });
    });

    // Weight goal slider
    const slider = document.getElementById('weight-goal-slider');
    if (slider) {
        slider.addEventListener('input', function() {
            updateWeightGoalDisplay(this.value);
        });
    }

    // Ingredient checkboxes counter
    const ingredientCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
    ingredientCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateIngredientCount);
    });
}

// Language management
function setLanguage(lang, event) {
    userData.language = lang;
    saveToLocalStorage();
    updateTranslations();

    // Update active language button
    if (event) {
        document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.lang-btn').classList.add('active');
    }
}

// Update unit labels based on selected system
function updateUnitLabels() {
    const heightUnit = document.getElementById('height-unit');
    const weightUnit = document.getElementById('weight-unit');

    if (userData.units === 'metric') {
        if (heightUnit) heightUnit.textContent = 'cm';
        if (weightUnit) weightUnit.textContent = 'kg';
    } else {
        if (heightUnit) heightUnit.textContent = 'inches';
        if (weightUnit) weightUnit.textContent = 'lb';
    }
}

// Navigation
function nextStep() {
    const steps = document.querySelectorAll('.step');
    if (currentStep < steps.length - 1) {
        steps[currentStep].classList.remove('active');
        currentStep++;
        steps[currentStep].classList.add('active');
        window.scrollTo(0, 0);

        // Initialize step 3 (weight goal) with default value
        if (currentStep === 3) {
            // Set default weight goal if not already set
            if (!userData.weightGoal || userData.weightGoal === 0) {
                userData.weightGoal = 2; // Default to 2 kg
            }
            // Make sure the expected-loss display is updated
            const expectedLossElement = document.getElementById('expected-loss');
            if (expectedLossElement) {
                expectedLossElement.textContent = parseFloat(userData.weightGoal).toFixed(1);
            }
        }

        saveToLocalStorage();
    }
}

function prevStep() {
    const steps = document.querySelectorAll('.step');
    if (currentStep > 0) {
        steps[currentStep].classList.remove('active');
        currentStep--;
        steps[currentStep].classList.add('active');
        window.scrollTo(0, 0);
    }
}

// Calculator Functions (Mifflin-St Jeor)
function calculateBMR(weight_kg, height_cm, age, gender) {
    let bmr;
    if (gender === 'male') {
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
    } else {
        bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
    }
    return Math.round(bmr);
}

function calculateTDEE(bmr, activityLevel) {
    const multipliers = {
        'sedentary': 1.2,
        'lightly_active': 1.375,
        'moderately_active': 1.55,
        'very_active': 1.725,
        'extra_active': 1.9
    };
    const multiplier = multipliers[activityLevel];
    const tdee = Math.round(bmr * multiplier);
    console.log(`TDEE Calculation: BMR=${bmr}, Activity=${activityLevel}, Multiplier=${multiplier}, TDEE=${tdee}`);
    return tdee;
}

function calculateDailyCalories(tdee, weightGoalKg) {
    // 1 kg fat = 7700 kcal
    // Monthly goal to daily deficit: (kg * 7700) / 30
    const dailyDeficit = (weightGoalKg * 7700) / 30;
    let dailyCalories = tdee - dailyDeficit;

    // Safety limits
    dailyCalories = Math.max(dailyCalories, 1200);
    dailyCalories = Math.min(dailyCalories, 4000);

    return Math.round(dailyCalories);
}

function convertToKg(weight, units) {
    if (units === 'imperial') {
        return weight * 0.453592; // pounds to kg
    }
    return weight;
}

function convertToCm(height, units) {
    if (units === 'imperial') {
        return height * 2.54; // inches to cm
    }
    return height;
}

// Calculate and move to next step
function calculateAndNext() {
    // Get values
    const age = parseInt(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseFloat(document.getElementById('height').value);
    const gender = document.querySelector('input[name="gender"]:checked').value;
    const activity = document.getElementById('activity_level').value;

    // Validate
    if (!age || !weight || !height) {
        alert(translations[userData.language].errors.validation);
        return;
    }

    if (age < 18 || age > 100) {
        document.getElementById('age-error').textContent = translations[userData.language].personal_stats.validation.age_range;
        return;
    }

    // Convert to metric for calculations
    const weight_kg = convertToKg(weight, userData.units);
    const height_cm = convertToCm(height, userData.units);

    // Debug logging
    console.log('Calculate and Next Debug:');
    console.log('userData.units:', userData.units);
    console.log('Input values - weight:', weight, 'height:', height, 'age:', age);
    console.log('Activity level selected:', activity);
    console.log('Converted values - weight_kg:', weight_kg, 'height_cm:', height_cm);

    // Calculate
    userData.age = age;
    userData.weight = weight;
    userData.height = height;
    userData.gender = gender;
    userData.activity = activity;
    userData.bmr = calculateBMR(weight_kg, height_cm, age, gender);

    console.log('BMR:', userData.bmr, 'Activity:', activity, 'TDEE:', calculateTDEE(userData.bmr, activity));
    userData.tdee = calculateTDEE(userData.bmr, activity);
    userData.dailyCalories = calculateDailyCalories(userData.tdee, userData.weightGoal);

    // Display results
    document.getElementById('bmr-result').textContent = userData.bmr.toLocaleString();
    document.getElementById('tdee-result').textContent = userData.tdee.toLocaleString();
    document.getElementById('tdee-display').textContent = userData.tdee.toLocaleString();

    // Calculate deficit
    const deficit = userData.tdee - userData.dailyCalories;
    document.getElementById('deficit-display').textContent = Math.round(deficit).toLocaleString();
    document.getElementById('daily-calories-display').textContent = userData.dailyCalories.toLocaleString();
    document.getElementById('expected-loss').textContent = parseFloat(userData.weightGoal).toFixed(1);

    nextStep();
}

// Weight goal management
function setWeightGoal(kg, event) {
    userData.weightGoal = kg;
    const slider = document.getElementById('weight-goal-slider');
    if (slider) slider.value = kg;
    updateWeightGoalDisplay(kg);

    // Update active button
    if (event) {
        document.querySelectorAll('.quick-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }

    // Recalculate calories
    userData.dailyCalories = calculateDailyCalories(userData.tdee, kg);
    const deficit = userData.tdee - userData.dailyCalories;
    document.getElementById('deficit-display').textContent = Math.round(deficit).toLocaleString();
    document.getElementById('daily-calories-display').textContent = userData.dailyCalories.toLocaleString();
    document.getElementById('expected-loss').textContent = parseFloat(kg).toFixed(1);
}

function updateWeightGoalDisplay(value) {
    userData.weightGoal = parseFloat(value);
    document.getElementById('weight-goal-value').textContent = parseFloat(value).toFixed(1);

    // Recalculate calories
    if (userData.tdee > 0) {
        userData.dailyCalories = calculateDailyCalories(userData.tdee, parseFloat(value));
        const deficit = userData.tdee - userData.dailyCalories;
        document.getElementById('deficit-display').textContent = Math.round(deficit).toLocaleString();
        document.getElementById('daily-calories-display').textContent = userData.dailyCalories.toLocaleString();
        document.getElementById('expected-loss').textContent = parseFloat(value).toFixed(1);
    }
}

// Day selection
function setDays(days, event) {
    userData.numDays = days;
    if (event) {
        document.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
        event.target.classList.add('active');
    }
}

// Ingredient counter
function updateIngredientCount() {
    const checked = document.querySelectorAll('.checkbox-item input[type="checkbox"]:checked').length;
    const total = document.querySelectorAll('.checkbox-item input[type="checkbox"]').length;
    const counter = document.getElementById('ingredient-count');
    if (counter) {
        counter.textContent = `${checked} / ${total}`;
    }
}

// Toggle collapse category
function toggleCategoryCollapse(header) {
    const category = header.closest('.ingredient-category');
    category.classList.toggle('collapsed');
}

// Toggle all ingredients in category
function toggleCategory(button, event) {
    event.stopPropagation(); // Prevent collapse toggle
    const category = button.closest('.ingredient-category');
    const checkboxes = category.querySelectorAll('.checkbox-item input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);

    checkboxes.forEach(checkbox => {
        checkbox.checked = !allChecked;
    });

    // Update button text with translation
    const selectAllText = getNestedTranslation(translations[userData.language], 'ingredients.select_all') || 'Select All';
    const deselectAllText = getNestedTranslation(translations[userData.language], 'ingredients.deselect_all') || 'Deselect All';
    button.textContent = allChecked ? selectAllText : deselectAllText;

    // Update counter
    updateIngredientCount();
}

// Show summary
function showSummary() {
    // Collect final data
    const leftovers = document.querySelector('input[name="leftovers"]:checked').value === 'yes';

    userData.leftovers = leftovers;

    // Count selected and excluded ingredients
    const allCheckboxes = document.querySelectorAll('.checkbox-item input[type="checkbox"]');
    const selectedIngredients = [];
    const excludedIngredients = [];

    allCheckboxes.forEach(checkbox => {
        const label = checkbox.nextElementSibling;
        const ingredientName = label ? label.textContent : '';
        if (checkbox.checked) {
            selectedIngredients.push(ingredientName);
        } else {
            excludedIngredients.push(ingredientName);
        }
    });

    userData.selectedIngredients = selectedIngredients;
    userData.excludedIngredients = excludedIngredients;

    // Get health preferences
    userData.antiInflammatory = document.getElementById('anti-inflammatory')?.checked || false;
    userData.avoidProcessed = document.getElementById('avoid-processed')?.checked || false;

    // Determine diet type based on selections
    let dietType = 'Custom Keto';
    const hasMeat = selectedIngredients.some(ing =>
        ['Beef', 'Chicken', 'Pork', 'Lamb', 'Duck', 'Turkey', 'Bacon', 'Oksekød', 'Kylling'].includes(ing)
    );
    const hasFish = selectedIngredients.some(ing =>
        ['Salmon', 'Cod', 'Tuna', 'Shrimp', 'Laks', 'Torsk'].includes(ing)
    );

    if (!hasMeat && !hasFish) {
        dietType = 'Vegetarian Keto';
    } else if (!hasMeat && hasFish) {
        dietType = 'Pescatarian Keto';
    } else if (hasMeat && hasFish) {
        dietType = 'Standard Keto';
    }

    // Build summary
    const summaryList = document.getElementById('summary-list');

    // Get meals per day, prep time and budget from form
    const mealsPerDay = document.querySelector('input[name="meals"]:checked')?.value || '3';
    const prepTime = document.querySelector('input[name="prep_time"]:checked')?.value || 'medium';
    const budget = document.querySelector('input[name="budget"]:checked')?.value || 'medium';

    userData.mealsPerDay = parseInt(mealsPerDay);
    userData.prepTime = prepTime;
    userData.budget = budget;

    const prepTimeLabels = {
        'fast': 'Hurtige retter (15-20 min)',
        'medium': 'Medium (20-40 min)',
        'long': 'Ingen tidsbegrænsning (40+ min)',
        'mix': 'Blandet (varieret)'
    };

    const budgetLabels = {
        'cheap': 'Billigt',
        'medium': 'Middel',
        'expensive': 'Dyrt',
        'mixed': 'Mixet'
    };

    summaryList.innerHTML = `
        <li><strong>Language:</strong> ${userData.language.toUpperCase()}</li>
        <li><strong>Units:</strong> ${userData.units === 'metric' ? 'Metric (kg, cm)' : 'Imperial (lb, inches)'}</li>
        <li><strong>Gender:</strong> ${userData.gender}</li>
        <li><strong>Age:</strong> ${userData.age} years</li>
        <li><strong>Weight:</strong> ${userData.weight} ${userData.units === 'metric' ? 'kg' : 'lb'}</li>
        <li><strong>Height:</strong> ${userData.height} ${userData.units === 'metric' ? 'cm' : 'inches'}</li>
        <li><strong>Activity:</strong> ${userData.activity}</li>
        <li><strong>BMR:</strong> ${userData.bmr.toLocaleString()} kcal/day</li>
        <li><strong>TDEE:</strong> ${userData.tdee.toLocaleString()} kcal/day</li>
        <li><strong>Weight Goal:</strong> ${userData.weightGoal} kg/month ${userData.weightGoal === 0 ? '(maintain)' : '(loss)'}</li>
        <li><strong>Daily Calories:</strong> ${userData.dailyCalories.toLocaleString()} kcal/day</li>
        <li><strong>Meals Per Day:</strong> ${userData.mealsPerDay} måltid${userData.mealsPerDay > 1 ? 'er' : ''}</li>
        <li><strong>Tilberedningstid:</strong> ${prepTimeLabels[userData.prepTime]}</li>
        <li><strong>Budget:</strong> ${budgetLabels[userData.budget]}</li>
        <li><strong>Meal Plan Days:</strong> ${userData.numDays} days</li>
        <li><strong>Leftovers Strategy:</strong> ${leftovers ? 'Cook once, eat twice' : 'Fresh meals every day'}</li>
        <li><strong>Available Ingredients:</strong> ${selectedIngredients.length} items selected</li>
        <li><strong>Excluded Ingredients:</strong> ${excludedIngredients.length > 0 ? excludedIngredients.length + ' items - ' + excludedIngredients.join(', ') : 'None - all keto ingredients allowed'}</li>
        <li><strong>Detected Diet Type:</strong> ${dietType}</li>
    `;

    // Generate ChatGPT prompt preview
    generatePromptPreview(selectedIngredients, excludedIngredients, dietType);

    nextStep();
    saveToLocalStorage();
}

// Generate ChatGPT prompt preview
function generatePromptPreview(selectedIngredients, excludedIngredients, dietType) {
    const lang = userData.language === 'da' ? 'Danish' : (userData.language === 'se' ? 'Swedish' : 'English');

    // Determine meal descriptions
    let mealsDescription = '';
    if (userData.mealsPerDay === 1) {
        mealsDescription = '1 large meal (OMAD - One Meal A Day)';
    } else if (userData.mealsPerDay === 2) {
        mealsDescription = '2 meals (lunch and dinner)';
    } else {
        mealsDescription = '3 meals (breakfast, lunch, and dinner)';
    }

    // Determine prep time description
    let prepTimeDescription = '';
    let prepTimeConstraint = '';
    if (userData.prepTime === 'fast') {
        prepTimeDescription = 'Quick meals only (max 15-20 minutes total time)';
        prepTimeConstraint = 'All recipes MUST be quick: max 15-20 minutes total preparation and cooking time.';
    } else if (userData.prepTime === 'medium') {
        prepTimeDescription = 'Medium cooking time (20-40 minutes)';
        prepTimeConstraint = 'Recipes should take 20-40 minutes total preparation and cooking time.';
    } else if (userData.prepTime === 'long') {
        prepTimeDescription = 'No time restrictions (40+ minutes allowed)';
        prepTimeConstraint = 'Cooking time is flexible - you may include elaborate recipes that take 40+ minutes.';
    } else {
        prepTimeDescription = 'Mixed cooking times (variety of quick and slow recipes)';
        prepTimeConstraint = 'Include a mix of quick recipes (15-20 min) and more elaborate ones (40+ min) throughout the week.';
    }

    // Determine budget description
    let budgetDescription = '';
    let budgetConstraint = '';
    if (userData.budget === 'cheap') {
        budgetDescription = 'Budget-friendly (economical ingredients)';
        budgetConstraint = 'Focus on affordable ingredients like chicken, ground beef, eggs, seasonal vegetables, and budget-friendly cheeses. Avoid expensive items like ribeye, salmon, avocado, and gourmet ingredients.';
    } else if (userData.budget === 'expensive') {
        budgetDescription = 'Premium ingredients (high-end)';
        budgetConstraint = 'Use premium ingredients like salmon, ribeye, lamb, gourmet cheeses, avocado, nuts, and high-quality oils. Quality is more important than cost.';
    } else if (userData.budget === 'mixed') {
        budgetDescription = 'Mixed budget (variety of price levels)';
        budgetConstraint = 'Include a mix of budget-friendly meals and some premium meals throughout the week. Some days cheap (chicken, eggs), other days luxurious (salmon, ribeye).';
    } else {
        budgetDescription = 'Medium budget (balanced)';
        budgetConstraint = 'Balance between affordable and quality ingredients. Mix of chicken, pork, occasional beef or fish, variety of vegetables and standard cheeses.';
    }

    // Calculate macros
    const fatGrams = Math.round((userData.dailyCalories * 0.70) / 9);
    const proteinGrams = Math.round((userData.dailyCalories * 0.25) / 4);
    const carbsGrams = Math.round((userData.dailyCalories * 0.05) / 4);

    const prompt = `You are a professional keto diet chef and nutritionist. Generate a personalized ${userData.numDays}-day ketogenic meal plan in ${lang}.

USER PROFILE:
- Gender: ${userData.gender}
- Age: ${userData.age} years
- Weight Goal: ${userData.weightGoal} kg/month ${userData.weightGoal === 0 ? '(maintain weight)' : '(weight loss)'}

DAILY TARGETS:
- Calories: ${userData.dailyCalories} kcal/day
- Fat: ${fatGrams}g (70%)
- Protein: ${proteinGrams}g (25%)
- Carbs: ${carbsGrams}g (5%, max 50g net carbs)

MEAL STRUCTURE:
- Meals per day: ${mealsDescription}
- Cooking time preference: ${prepTimeDescription}
- Budget preference: ${budgetDescription}
- Meal prep strategy: ${userData.leftovers ? 'Cook once, eat twice (allow leftovers)' : 'Fresh meals every day'}

COOKING TIME CONSTRAINT:
${prepTimeConstraint}

BUDGET CONSTRAINT:
${budgetConstraint}

HEALTH PRIORITIES:
${userData.antiInflammatory ? '✓ ANTI-INFLAMMATORY: Prioritize anti-inflammatory ingredients like fatty fish (salmon, mackerel), leafy greens, olive oil, nuts, berries, turmeric, ginger, and omega-3 rich foods. Avoid inflammatory foods.' : '○ Anti-inflammatory not prioritized'}
${userData.avoidProcessed ? '✓ MINIMIZE ULTRA-PROCESSED FOODS: Focus on whole, natural foods. MINIMIZE processed meats (sausages, bacon, salami, deli meats), packaged foods, and highly processed products. Prefer fresh meats, fish, vegetables, and minimally processed ingredients. You can still use these ingredients occasionally, but keep them to a minimum.' : '○ Processed foods allowed in moderation'}

INGREDIENT RESTRICTIONS:
${excludedIngredients.length > 0 ?
`DO NOT USE these ${excludedIngredients.length} ingredients: ${excludedIngredients.join(', ')}` :
'No restrictions - you may use any keto-friendly ingredients'}

You may use any other keto-friendly ingredients that are not in the excluded list above.

DETECTED DIET TYPE: ${dietType}

INSTRUCTIONS:
1. Create ${userData.numDays} days of keto meals using any keto-friendly ingredients EXCEPT those listed above
2. Each day should include EXACTLY ${userData.mealsPerDay} meal${userData.mealsPerDay > 1 ? 's' : ''}
3. Each day should hit the daily calorie target (${userData.dailyCalories} kcal ±100)
4. STRICTLY follow the cooking time constraint specified above
5. PRIORITIZE the health preferences specified above (anti-inflammatory and/or avoiding processed foods)
6. ${userData.leftovers ? 'Include leftover meals where appropriate (e.g., cook dinner Day 1, reheat Day 2)' : 'Create unique meals for each day'}
7. Provide detailed recipes with:
   - Ingredient quantities (in metric units: grams, ml)
   - Step-by-step instructions
   - Prep time and cook time (MUST match the time constraint)
   - Macros per serving (calories, fat, protein, carbs, net carbs)
8. Include a complete shopping list organized by category
9. All recipes must be keto-friendly (max 50g net carbs/day)
10. Write everything in ${lang}

OUTPUT FORMAT:
Return a JSON object with this structure:
{
  "days": [
    {
      "day": 1,
      "meals": [
        {
          "name": "Meal name",
          "type": "breakfast/lunch/dinner",
          "ingredients": ["ingredient 1 - 200g", "ingredient 2 - 100ml"],
          "instructions": ["step 1", "step 2"],
          "prep_time": "10 min",
          "cook_time": "15 min",
          "total_time": "25 min",
          "servings": 1,
          "macros": {
            "calories": 650,
            "fat": 52,
            "protein": 35,
            "carbs": 8,
            "net_carbs": 5
          }
        }
      ],
      "daily_totals": {
        "calories": ${userData.dailyCalories},
        "fat": ${fatGrams},
        "protein": ${proteinGrams},
        "carbs": ${carbsGrams}
      }
    }
  ],
  "shopping_list": {
    "meat": ["item 1 - 500g", "item 2 - 300g"],
    "vegetables": ["item 1 - 200g", "item 2 - 150g"],
    "dairy": ["item 1 - 250ml", "item 2 - 100g"],
    "pantry": ["item 1", "item 2"],
    "other": ["item 1", "item 2"]
  }
}`;

    // Display in the preview box
    const promptContent = document.getElementById('prompt-content');
    if (promptContent) {
        promptContent.textContent = prompt;
    }
}

// Restart
function restartPrototype() {
    currentStep = 0;
    document.querySelectorAll('.step').forEach(step => step.classList.remove('active'));
    document.getElementById('step-0').classList.add('active');
    window.scrollTo(0, 0);
}

// Local Storage
function saveToLocalStorage() {
    try {
        localStorage.setItem('ketoCalculatorData', JSON.stringify(userData));
        localStorage.setItem('ketoCalculatorStep', currentStep);
    } catch (e) {
        console.log('LocalStorage not available:', e);
    }
}

function loadFromLocalStorage() {
    try {
        const saved = localStorage.getItem('ketoCalculatorData');
        if (saved) {
            userData = JSON.parse(saved);
        }

        const savedStep = localStorage.getItem('ketoCalculatorStep');
        if (savedStep) {
            currentStep = parseInt(savedStep);
        }
    } catch (e) {
        console.log('Error loading from LocalStorage:', e);
    }
}

// Update all translations on the page
function updateTranslations() {
    if (!translations || !translations[userData.language]) {
        console.log('Translations not loaded yet');
        return;
    }

    // Translate text content
    const elements = document.querySelectorAll('[data-translate]');
    elements.forEach(el => {
        const key = el.getAttribute('data-translate');
        const translation = getNestedTranslation(translations[userData.language], key);
        if (translation) {
            if (el.tagName === 'INPUT' && el.placeholder !== undefined) {
                el.placeholder = translation;
            } else {
                el.textContent = translation;
            }
        }
    });

    // Translate placeholders
    const placeholderElements = document.querySelectorAll('[data-translate-placeholder]');
    placeholderElements.forEach(el => {
        const key = el.getAttribute('data-translate-placeholder');
        const translation = getNestedTranslation(translations[userData.language], key);
        if (translation) {
            el.placeholder = translation;
        }
    });
}

// Helper to get nested translation
function getNestedTranslation(obj, path) {
    return path.split('.').reduce((prev, curr) => {
        return prev ? prev[curr] : null;
    }, obj);
}

// Send meal plan to backend and N8N
async function sendMealPlan() {
    const email = document.getElementById('user-email').value;
    const name = document.getElementById('user-name').value;
    const gdprConsent = document.getElementById('gdpr-consent').checked;
    const submitBtn = document.getElementById('send-btn');
    const messageDiv = document.getElementById('submit-message');

    // Validate email
    if (!email || !email.includes('@')) {
        showMessage('error', 'Indtast venligst en gyldig email adresse');
        return;
    }

    // Validate GDPR consent
    if (!gdprConsent) {
        showMessage('error', 'Du skal acceptere vores betingelser for at modtage madplanen');
        return;
    }

    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.innerHTML = '⏳ Sender...';

    // Prepare data
    const payload = {
        email: email,
        name: name || null,
        gdprConsent: gdprConsent,
        language: userData.language,
        units: userData.units,
        gender: userData.gender,
        age: userData.age,
        weight: userData.weight,
        height: userData.height,
        activity: userData.activity,
        bmr: userData.bmr,
        tdee: userData.tdee,
        weightGoal: userData.weightGoal,
        dailyCalories: userData.dailyCalories,
        mealsPerDay: userData.mealsPerDay,
        prepTime: userData.prepTime,
        numDays: userData.numDays,
        leftovers: userData.leftovers,
        excludedIngredients: userData.excludedIngredients,
        selectedIngredients: userData.selectedIngredients,
        dietType: determineDietType()
    };

    try {
        // Send to backend
        const response = await fetch('/api/submit-calculator', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (response.ok) {
            showMessage('success', `✅ Perfekt! Vi har modtaget dine data og sender din madplan til ${email} inden for få minutter!`);
            submitBtn.innerHTML = '✓ Sendt!';

            // Optional: Trigger N8N webhook here
            // triggerN8NWebhook(payload);

        } else {
            throw new Error(result.error || 'Server error');
        }

    } catch (error) {
        console.error('Error sending data:', error);
        showMessage('error', '❌ Ups! Der skete en fejl. Prøv venligst igen eller kontakt support.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '📨 Send Min Gratis Madplan';
    }
}

// Show message helper
function showMessage(type, text) {
    const messageDiv = document.getElementById('submit-message');
    messageDiv.style.display = 'block';
    messageDiv.className = type === 'success' ? 'success-message' : 'error-message';
    messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
    messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
    messageDiv.style.border = type === 'success' ? '1px solid #c3e6cb' : '1px solid #f5c6cb';
    messageDiv.textContent = text;
}

// Determine diet type based on ingredient selection
function determineDietType() {
    const selectedIngredients = userData.selectedIngredients || [];
    const hasMeat = selectedIngredients.some(ing =>
        ['Beef', 'Chicken', 'Pork', 'Lamb', 'Duck', 'Turkey', 'Bacon', 'Oksekød', 'Kylling'].includes(ing)
    );
    const hasFish = selectedIngredients.some(ing =>
        ['Salmon', 'Cod', 'Tuna', 'Shrimp', 'Laks', 'Torsk'].includes(ing)
    );

    if (!hasMeat && !hasFish) {
        return 'Vegetarian Keto';
    } else if (!hasMeat && hasFish) {
        return 'Pescatarian Keto';
    } else if (hasMeat && hasFish) {
        return 'Standard Keto';
    }
    return 'Custom Keto';
}

// Optional: Trigger N8N webhook
async function triggerN8NWebhook(data) {
    // Replace with your actual N8N webhook URL
    const N8N_WEBHOOK_URL = 'YOUR_N8N_WEBHOOK_URL';

    try {
        await fetch(N8N_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        console.log('N8N webhook triggered successfully');
    } catch (error) {
        console.error('Error triggering N8N webhook:', error);
    }
}

// Console welcome message
console.log(`
╔══════════════════════════════════════╗
║  🥑 Keto Calculator Prototype 🥑     ║
║                                      ║
║  Built with:                         ║
║  • Vanilla JavaScript                ║
║  • CSS3 Animations                   ║
║  • Mifflin-St Jeor Formula          ║
║                                      ║
║  This is a working demonstration     ║
║  of the full application design.     ║
╚══════════════════════════════════════╝
`);
