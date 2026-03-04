# Keto Calculator - Detailed User Flow & Wireframes

## Complete User Journey

---

## STEP 1: Landing Page / Language Selection

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║         🥑 PERSONALIZED KETO MEAL PLANNER 🥑              ║
║                                                            ║
║    Calculate Your Daily Needs & Get Custom Meal Plans     ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  Select Your Language / Vælg dit sprog              │  ║
║  │                                                      │  ║
║  │    ┌──────────┐  ┌──────────┐  ┌──────────┐       │  ║
║  │    │ 🇩🇰       │  │ 🇬🇧       │  │ 🇸🇪       │       │  ║
║  │    │ Dansk    │  │ English  │  │ Svenska  │       │  ║
║  │    └──────────┘  └──────────┘  └──────────┘       │  ║
║  │                                                      │  ║
║  │  Select Units / Vælg enheder                        │  ║
║  │                                                      │  ║
║  │    ○ Metric (kg, cm)    ○ Imperial (lb, inches)    │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║                    [ START / START ]                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Language selection persists throughout session
- Unit selection affects all input fields
- "START" button proceeds to Step 2

---

## STEP 2: Personal Stats Input

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 1 of 6: Personal Information                        ║
║  ▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  17%         ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  👤 PERSONAL STATS                                   │  ║
║  │                                                      │  ║
║  │  Køn / Gender                                        │  ║
║  │    ⦿ Mand / Male        ○ Kvinde / Female          │  ║
║  │                                                      │  ║
║  │  ┌───────────────────┐  ┌───────────────────┐      │  ║
║  │  │ Alder / Age       │  │ Højde / Height    │      │  ║
║  │  │ [  35  ] år/years │  │ [ 180 ] cm/inches │      │  ║
║  │  └───────────────────┘  └───────────────────┘      │  ║
║  │                                                      │  ║
║  │  ┌───────────────────┐                              │  ║
║  │  │ Vægt / Weight     │                              │  ║
║  │  │ [ 85.5 ] kg/lb    │                              │  ║
║  │  └───────────────────┘                              │  ║
║  │                                                      │  ║
║  │  Aktivitetsniveau / Activity Level                  │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  Stillesiddende (ingen motion)           ▼ │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  Dropdown options:                                  │  ║
║  │  • Stillesiddende (1.2)                             │  ║
║  │  • Let aktiv (1-3 dage/uge) (1.375)                │  ║
║  │  • Moderat aktiv (3-5 dage/uge) (1.55)             │  ║
║  │  • Meget aktiv (6-7 dage/uge) (1.725)              │  ║
║  │  • Ekstra aktiv (fysisk job) (1.9)                 │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Validation Rules
- Age: 18-100 years
- Weight: 30-300 kg (or 66-661 lb)
- Height: 100-250 cm (or 39-98 inches)
- All fields required
- Real-time validation with error messages

### Error Display Example
```
┌───────────────────┐
│ Alder / Age       │
│ [  15  ] år       │  ⚠️ Alder skal være mellem 18-100 år
└───────────────────┘
```

---

## STEP 3: BMR & TDEE Results Display

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 2 of 6: Your Metabolic Profile                      ║
║  ▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  33%         ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📊 DINE RESULTATER / YOUR RESULTS                   │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │                                              │   │  ║
║  │  │           BMR (Basal Metabolic Rate)         │   │  ║
║  │  │                 1,820 kcal/dag               │   │  ║
║  │  │                                              │   │  ║
║  │  │  Dette er dit grundforbrug i hvile          │   │  ║
║  │  │  (This is your resting metabolic rate)      │   │  ║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │                                              │   │  ║
║  │  │      TDEE (Total Daily Energy Expenditure)  │   │  ║
║  │  │                 2,821 kcal/dag               │   │  ║
║  │  │                                              │   │  ║
║  │  │  Dette er dit daglige forbrug inkl. aktivitet │  ║
║  │  │  (This is your daily expenditure with activity)│║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  │  ℹ️  Beregnet baseret på Mifflin-St Jeor formula   │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Calculation Display
- Show both BMR and TDEE clearly
- Brief explanation of each metric
- Visual hierarchy (larger numbers)

---

## STEP 4: Weight Goal Setting

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 3 of 6: Your Weight Goal                            ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░  50%          ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🎯 VÆGTMÅL / WEIGHT GOAL                            │  ║
║  │                                                      │  ║
║  │  Hvor meget vil du gå ned i vægt per måned?         │  ║
║  │  (How much weight do you want to lose per month?)   │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │                                            │     │  ║
║  │  │     ◄─────────⬤─────────────────►        │     │  ║
║  │  │     0 kg           1.5 kg          3 kg    │     │  ║
║  │  │                                            │     │  ║
║  │  │          💪  2.0 kg per måned              │     │  ║
║  │  │                                            │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  Quick Select:                                       │  ║
║  │  [ 0 kg ]  [ 0.5 kg ]  [ 1 kg ]  [ 2 kg ]  [ 3 kg ] │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │  📉 DINE DAGLIGE KALORIER                     │   │  ║
║  │  │                                              │   │  ║
║  │  │  TDEE:              2,821 kcal/dag          │   │  ║
║  │  │  Kalorieunderskud:  -  513 kcal/dag         │   │  ║
║  │  │  ───────────────────────────────────         │   │  ║
║  │  │  Dit daglige mål:   2,308 kcal/dag          │   │  ║
║  │  │                                              │   │  ║
║  │  │  ⚖️  Forventet vægttab: 2 kg/måned          │   │  ║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  │  ℹ️  Anbefalet: 0.5-2 kg/måned for sundt vægttab   │  ║
║  │     (Recommended: 0.5-2 kg/month for healthy loss)  │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Interactive slider (0-3 kg)
- Real-time calorie calculation updates
- Quick select buttons for common goals
- Visual feedback on deficit amount
- Option to maintain weight (0 kg)

---

## STEP 5: Fasting Protocol Selection

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 4 of 6: Fasting Protocol                            ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░  67%            ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  ⏰ VÆLG FASTENPROTOKOL / FASTING PROTOCOL           │  ║
║  │                                                      │  ║
║  │  Intermitterende faste kan hjælpe med vægttab       │  ║
║  │  (Intermittent fasting can help with weight loss)   │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  ○ Ingen faste / No Fast                   │     │  ║
║  │  │     3 måltider + snacks                    │     │  ║
║  │  │     └─ 🍽️  🍽️  🍽️                          │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  ⦿ 16:8 (Anbefalet for begyndere)          │     │  ║
║  │  │     3 måltider inden for 8 timer           │     │  ║
║  │  │     └─ 16t faste ▓▓▓▓▓▓▓▓ 8t spise         │     │  ║
║  │  │        Eksempel: Spis 12:00 - 20:00        │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  ○ 18:6                                     │     │  ║
║  │  │     3 måltider inden for 6 timer           │     │  ║
║  │  │     └─ 18t faste ▓▓▓▓▓▓▓▓▓ 6t spise        │     │  ║
║  │  │        Eksempel: Spis 14:00 - 20:00        │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  ○ 20:4 (Avanceret)                        │     │  ║
║  │  │     2 måltider inden for 4 timer           │     │  ║
║  │  │     └─ 20t faste ▓▓▓▓▓▓▓▓▓▓ 4t spise       │     │  ║
║  │  │        Eksempel: Spis 16:00 - 20:00        │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  ○ OMAD - One Meal A Day (Meget avanceret) │     │  ║
║  │  │     1 stort måltid                         │     │  ║
║  │  │     └─ 23t faste ▓▓▓▓▓▓▓▓▓▓▓ 1t spise      │     │  ║
║  │  │        Eksempel: Spis 18:00 - 19:00        │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ℹ️  Du kan altid ændre dette senere                │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Radio button selection
- Visual timeline for each protocol
- Example eating windows
- Difficulty indicators
- Meal count automatically set based on protocol:
  - No Fast: 3 meals + snacks
  - 16:8: 3 meals
  - 18:6: 3 meals
  - 20:4: 2 meals
  - OMAD: 1 meal

---

## STEP 6: Ingredient Preferences Matrix

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 5 of 6: Food Preferences                            ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░  83%                 ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🥩 VÆLG DINE INGREDIENSER / SELECT INGREDIENTS      │  ║
║  │                                                      │  ║
║  │  Fravælg hvad du ikke kan lide eller er allergisk   │  ║
║  │  (Deselect what you don't like or are allergic to)  │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  🥩 KØD / MEAT                             │     │  ║
║  │  │  [Fravælg alle]                            │     │  ║
║  │  │                                            │     │  ║
║  │  │  ☑ Oksekød/Beef    ☑ Kylling/Chicken      │     │  ║
║  │  │  ☑ Svinekød/Pork   ☑ Lam/Lamb             │     │  ║
║  │  │  ☑ And/Duck        ☑ Kalkun/Turkey        │     │  ║
║  │  │  ☑ Bacon/Bacon                            │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  🐟 FISK & SKALDYR / FISH & SEAFOOD        │     │  ║
║  │  │  [Fravælg alle]                            │     │  ║
║  │  │                                            │     │  ║
║  │  │  ☑ Laks/Salmon     ☑ Torsk/Cod            │     │  ║
║  │  │  ☑ Tun/Tuna        ☑ Rejer/Shrimp         │     │  ║
║  │  │  ☑ Muslinger/Mussels ☑ Makrel/Mackerel    │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  🧀 MEJERIPRODUKTER / DAIRY                │     │  ║
║  │  │  [Fravælg alle]                            │     │  ║
║  │  │                                            │     │  ║
║  │  │  ☑ Smør/Butter     ☑ Fløde/Cream          │     │  ║
║  │  │  ☑ Ost/Cheese      ☑ Flødeost/Cream Cheese│     │  ║
║  │  │  ☑ Gr. Yoghurt     ☑ Mozzarella           │     │  ║
║  │  │  ☑ Parmesan                               │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  🥚 ÆG / EGGS                              │     │  ║
║  │  │                                            │     │  ║
║  │  │  ☑ Æg/Eggs                                 │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │                      [Scroll for more ↓]            │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝

[SCROLLED DOWN:]

╔════════════════════════════════════════════════════════════╗
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🥬 GRØNTSAGER / VEGETABLES                          │  ║
║  │  [Fravælg alle]                                     │  ║
║  │                                                      │  ║
║  │  ☑ Broccoli        ☑ Blomkål/Cauliflower           │  ║
║  │  ☑ Spinat/Spinach  ☑ Salat/Lettuce                 │  ║
║  │  ☑ Agurk/Cucumber  ☑ Squash/Zucchini               │  ║
║  │  ☑ Peberfrugt/Peppers  ☐ Løg/Onion                 │  ║
║  │  ☐ Hvidløg/Garlic  ☑ Tomater/Tomatoes              │  ║
║  │  ☑ Avocado         ☑ Svampe/Mushrooms              │  ║
║  │  ☑ Asparges/Asparagus  ☑ Grønkål/Kale             │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🌰 NØDDER & FRØ / NUTS & SEEDS                      │  ║
║  │  [Fravælg alle]                                     │  ║
║  │                                                      │  ║
║  │  ☑ Mandler/Almonds     ☑ Valnødder/Walnuts         │  ║
║  │  ☑ Pekannødder/Pecans  ☑ Chiafrø/Chia Seeds        │  ║
║  │  ☑ Hørfrø/Flaxseeds    ☑ Græskarkerner/Pumpkin     │  ║
║  │  ☑ Solsikkekerner/Sunflower Seeds                  │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  🫒 FEDTSTOFFER & OLIER / FATS & OILS                │  ║
║  │  [Fravælg alle]                                     │  ║
║  │                                                      │  ║
║  │  ☑ Olivenolie/Olive Oil                            │  ║
║  │  ☑ Kokosolie/Coconut Oil                           │  ║
║  │  ☑ Avocadoolie/Avocado Oil                         │  ║
║  │  ☑ MCT Olie/MCT Oil                                │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  📊  Valgte ingredienser: 42 ud af 47                     ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Checkboxes for each ingredient
- "Deselect all" per category
- Counter showing selected items
- Scrollable interface
- Pre-checked by default (user unchecks dislikes)
- Categories clearly separated
- Visual feedback on hover/selection

---

## STEP 7: Meal Plan Configuration

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  Step 6 of 6: Meal Plan Settings                          ║
║  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  100%                    ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📅 MADPLAN KONFIGURATION / MEAL PLAN SETUP          │  ║
║  │                                                      │  ║
║  │  Hvor mange dage vil du have madplan for?           │  ║
║  │  (How many days do you want a meal plan for?)       │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │  Antal dage / Number of days:                │   │  ║
║  │  │                                              │   │  ║
║  │  │  [ 1 ] [ 2 ] [ 3 ] [●4●] [ 5 ] [ 6 ] [ 7 ]  │   │  ║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │  🍱 Rester / Leftovers:                      │   │  ║
║  │  │                                              │   │  ║
║  │  │  ⦿ Ja - Lav samme ret 2 dage i træk         │   │  ║
║  │  │     (Yes - Make the same dish 2 days in row)│   │  ║
║  │  │                                              │   │  ║
║  │  │  ○ Nej - Nye retter hver dag                │   │  ║
║  │  │     (No - New dishes every day)             │   │  ║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  │  ┌──────────────────────────────────────────────┐   │  ║
║  │  │  🥗 Diætvariant / Diet Variant:              │   │  ║
║  │  │                                              │   │  ║
║  │  │  ⦿ Standard Keto (alle ingredienser)         │   │  ║
║  │  │     (Standard Keto - all ingredients)       │   │  ║
║  │  │                                              │   │  ║
║  │  │  ○ Vegetarisk Keto (ingen kød/fisk)         │   │  ║
║  │  │     (Vegetarian Keto - no meat/fish)        │   │  ║
║  │  │                                              │   │  ║
║  │  │  ○ Pescetarisk Keto (kun fisk, ingen kød)   │   │  ║
║  │  │     (Pescatarian Keto - fish only, no meat) │   │  ║
║  │  │                                              │   │  ║
║  │  └──────────────────────────────────────────────┘   │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ ← Tilbage ]      [ Næste → ]               ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Day selector buttons (1-7)
- Radio buttons for leftovers
- Radio buttons for diet variant
- All options clearly explained
- Visual feedback on selection

---

## STEP 8: Review & Confirm (Login/Register)

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║  ✅ Review Your Information                                ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📋 OPSUMMERING / SUMMARY                            │  ║
║  │                                                      │  ║
║  │  Personlige data:                                    │  ║
║  │  • Mand, 35 år, 180 cm, 85.5 kg                     │  ║
║  │  • Moderat aktiv                                     │  ║
║  │                                                      │  ║
║  │  Mål:                                                │  ║
║  │  • Tab 2 kg/måned                                    │  ║
║  │  • Daglige kalorier: 2,308 kcal                     │  ║
║  │  • Makroer: 70% fedt, 25% protein, 5% kulhydrat     │  ║
║  │  • Max 50g kulhydrater/dag                          │  ║
║  │                                                      │  ║
║  │  Faste: 16:8 (3 måltider)                           │  ║
║  │                                                      │  ║
║  │  Madplan: 4 dage, Standard Keto, med rester         │  ║
║  │                                                      │  ║
║  │  Fravælgte ingredienser: Løg, Hvidløg (2 stk)      │  ║
║  │                                                      │  ║
║  │                                        [Rediger]     │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📧 LOG IND ELLER OPRET KONTO                        │  ║
║  │     (LOGIN OR CREATE ACCOUNT)                        │  ║
║  │                                                      │  ║
║  │  For at modtage din madplan skal du oprette en konto│  ║
║  │  (To receive your meal plan, you need an account)   │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  Email:                                    │     │  ║
║  │  │  [____________________________]            │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ⦿ Opret ny konto / Create new account              │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  Adgangskode / Password:                   │     │  ║
║  │  │  [____________________________]            │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ┌────────────────────────────────────────────┐     │  ║
║  │  │  Gentag adgangskode / Repeat password:    │     │  ║
║  │  │  [____________________________]            │     │  ║
║  │  └────────────────────────────────────────────┘     │  ║
║  │                                                      │  ║
║  │  ○ Log ind med eksisterende konto                   │  ║
║  │     (Login with existing account)                   │  ║
║  │                                                      │  ║
║  │  ☑ Jeg accepterer vilkår & betingelser              │  ║
║  │     (I accept terms & conditions)                   │  ║
║  │                                                      │  ║
║  │  ☑ Jeg vil gerne modtage nyheder om keto            │  ║
║  │     (I'd like to receive keto news) [valgfrit]      │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║     [ ← Tilbage ]      [ GENERER MADPLAN → ]              ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Complete summary of all choices
- Edit button to go back
- Login/register toggle
- Email validation
- Password strength indicator
- Terms acceptance checkbox
- Optional newsletter checkbox

---

## STEP 9: Loading / Processing State

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                                                            ║
║         🤖 DIN MADPLAN BLIVER GENERERET 🤖                 ║
║            (YOUR MEAL PLAN IS BEING GENERATED)             ║
║                                                            ║
║                                                            ║
║                    ⏳ Vent venligst...                     ║
║                      (Please wait...)                      ║
║                                                            ║
║                                                            ║
║              ╔════════════════════════════╗                ║
║              ║  ▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░  ║                ║
║              ╚════════════════════════════╝                ║
║                        60%                                 ║
║                                                            ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │                                                      │  ║
║  │  ✓ Analyserer dine præferencer...                   │  ║
║  │  ✓ Beregner daglige makroer...                      │  ║
║  │  ⏳ Genererer personlige opskrifter... (30-60 sek)  │  ║
║  │  ⏱️  Laver indkøbsliste...                           │  ║
║  │  ⏱️  Opretter PDF dokument...                        │  ║
║  │  ⏱️  Sender til din email...                         │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║     💡 Vidste du? Keto kan hjælpe med at forbedre         ║
║        mental klarhed og energiniveau!                     ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Animated progress bar
- Step-by-step progress indicators
- Estimated time display
- Educational tips during wait
- No user interaction needed
- Auto-advance to success screen

---

## STEP 10: Success & Confirmation

### Layout
```
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║                  🎉 SUCCES! / SUCCESS! 🎉                  ║
║                                                            ║
║          Din madplan er klar! / Your meal plan is ready!   ║
║                                                            ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │                                                      │  ║
║  │                      ✅                              │  ║
║  │                                                      │  ║
║  │     Din personlige keto-madplan er blevet           │  ║
║  │     sendt til: anders@example.com                   │  ║
║  │                                                      │  ║
║  │     (Your personalized keto meal plan has been      │  ║
║  │      sent to: anders@example.com)                   │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📄 HVAD FÅR DU? / WHAT YOU GET:                     │  ║
║  │                                                      │  ║
║  │  ✓ 4 dages komplet madplan                          │  ║
║  │  ✓ 12 lækre keto-opskrifter                         │  ║
║  │  ✓ Detaljeret indkøbsliste                          │  ║
║  │  ✓ Næringsinfo for hver ret                         │  ║
║  │  ✓ Trin-for-trin instruktioner                      │  ║
║  │                                                      │  ║
║  │  Alt optimeret til dit mål om at tabe 2 kg/måned!   │  ║
║  │                                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║  ┌─────────────────────────────────────────────────────┐  ║
║  │  📧 Tjek din email (inkl. spam-mappe)               │  ║
║  │  📱 Har du ikke modtaget den inden for 5 minutter?  │  ║
║  │     [Send igen]                                      │  ║
║  └─────────────────────────────────────────────────────┘  ║
║                                                            ║
║              [ Download PDF nu ]                           ║
║              [ Min Dashboard → ]                           ║
║              [ Lav ny madplan ]                            ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

### Functionality
- Success confirmation
- Email address shown
- List of deliverables
- Resend email option
- Direct PDF download link
- Link to user dashboard
- Option to create new plan

---

## MOBILE RESPONSIVENESS

### Mobile Layout Considerations (< 768px)

```
┌──────────────────────┐
│  🥑 KETO PLANNER     │
│  ═══════════════════ │
│                      │
│  Step 1 of 6         │
│  ▓▓▓░░░░░░░░  17%   │
│                      │
│  ┌─────────────────┐ │
│  │ 👤 PERSONAL INFO │ │
│  │                 │ │
│  │ Køn / Gender:   │ │
│  │ ⦿ Mand ○ Kvinde │ │
│  │                 │ │
│  │ Alder / Age:    │ │
│  │ [    35     ]   │ │
│  │                 │ │
│  │ Højde / Height: │ │
│  │ [   180 cm  ]   │ │
│  │                 │ │
│  │ Vægt / Weight:  │ │
│  │ [  85.5 kg  ]   │ │
│  │                 │ │
│  │ Aktivitet:      │ │
│  │ [Select...   ▼] │ │
│  │                 │ │
│  └─────────────────┘ │
│                      │
│  [ ← ]      [ → ]    │
│                      │
└──────────────────────┘
```

### Mobile-Specific Features:
- Hamburger menu
- Vertical stacking
- Larger touch targets (44px minimum)
- Simplified ingredient grid (1 column)
- Sticky navigation buttons
- Collapsible sections
- Swipe gestures for navigation

---

## RESPONSIVE BREAKPOINTS

- **Mobile:** < 768px (single column)
- **Tablet:** 768px - 1024px (adjusted columns)
- **Desktop:** > 1024px (full layout)

---

## ACCESSIBILITY FEATURES

### Screen Reader Support
- ARIA labels on all interactive elements
- Semantic HTML (h1, h2, section, nav)
- Alt text for images/icons
- Focus indicators

### Keyboard Navigation
- Tab order follows visual flow
- Enter/Space to select
- Arrow keys for radio/checkbox groups
- Escape to close modals

### Visual Accessibility
- High contrast text (WCAG AA minimum)
- Large, readable fonts (minimum 16px body)
- Color not sole indicator (icons + text)
- Focus visible on all interactive elements

---

## STATE MANAGEMENT

### LocalStorage Keys
```javascript
{
  "keto_calculator_language": "da",
  "keto_calculator_units": "metric",
  "keto_calculator_step": 3,
  "keto_calculator_data": {
    "age": 35,
    "gender": "male",
    "weight": 85.5,
    "height": 180,
    "activity_level": "moderately_active",
    "weight_goal": 2,
    "bmr": 1820,
    "tdee": 2821,
    "daily_calories": 2308,
    "fasting_protocol": "16_8",
    "excluded_ingredients": [8, 15],
    "num_days": 4,
    "allow_leftovers": true,
    "diet_variant": "standard"
  }
}
```

### Session Management
- Auto-save on field blur
- Resume functionality
- Clear on logout
- Expire after 24 hours

---

## NEXT STEPS

This user flow document will be used to:
1. Create HTML/CSS/JS prototype
2. Design visual mockups
3. Implement frontend components
4. Connect to backend API
5. Test with real users

**Ready for implementation!**
