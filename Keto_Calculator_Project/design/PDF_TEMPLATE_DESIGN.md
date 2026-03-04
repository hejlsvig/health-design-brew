# PDF Template Design Specification

## Keto Meal Plan PDF Layout

---

## OVERVIEW

**Document Type:** A4 PDF (210mm × 297mm)
**Orientation:** Portrait
**File Size Target:** < 5MB
**Pages:** Variable (depends on number of days)
**Fonts:**
- Headers: Montserrat Bold
- Body: Open Sans Regular
- Fallback: Arial, sans-serif

**Color Palette:**
- Primary Green: `#4A7C59`
- Light Green: `#7CAE7A`
- Beige Background: `#F5F5DC`
- Coral Accent: `#FF6B6B`
- Dark Text: `#333333`
- Light Text: `#666666`
- Borders: `#DDDDDD`

---

## PAGE 1: COVER PAGE & SUMMARY

### Layout Structure
```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║    [Logo/Branding]                                       ║
║                                                          ║
║              🥑 PERSONALIZED KETO                        ║
║                  MEAL PLAN                               ║
║                                                          ║
║    ────────────────────────────────────────────          ║
║                                                          ║
║            Prepared for: Anders Hejlsvig                 ║
║            Date: January 23, 2026                        ║
║            Language: Dansk / Danish                      ║
║                                                          ║
║    ────────────────────────────────────────────          ║
║                                                          ║
║    📊 YOUR PROFILE SUMMARY                               ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  Personal Stats                             │      ║
║    │  • Gender: Male                             │      ║
║    │  • Age: 35 years                            │      ║
║    │  • Weight: 85.5 kg                          │      ║
║    │  • Height: 180 cm                           │      ║
║    │  • Activity Level: Moderately Active        │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  Metabolic Profile                          │      ║
║    │  • BMR: 1,820 kcal/day                      │      ║
║    │  • TDEE: 2,821 kcal/day                     │      ║
║    │  • Target Calories: 2,308 kcal/day          │      ║
║    │  • Weight Goal: -2 kg/month                 │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  Macro Breakdown                            │      ║
║    │                                             │      ║
║    │      ╭───────╮                              │      ║
║    │     ╱   70%   ╲    FAT                      │      ║
║    │    │    Fat    │   178g per day             │      ║
║    │     ╲         ╱                             │      ║
║    │      ╰───────╯                              │      ║
║    │                                             │      ║
║    │   25% PROTEIN    5% CARBS                   │      ║
║    │   144g/day       29g/day (max 50g net)      │      ║
║    │                                             │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    🕐 Fasting Protocol: 16:8 (3 meals)                   ║
║    📅 Meal Plan Duration: 7 days                         ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Cover Page Elements

**1. Header Section (Top 60mm)**
- Logo/branding centered
- Title "PERSONALIZED KETO MEAL PLAN" (36pt, Montserrat Bold)
- Decorative divider line

**2. User Info (60-90mm)**
- Name (20pt)
- Date generated
- Language selection indicator

**3. Profile Summary Boxes (90-250mm)**

**Box 1: Personal Stats**
```css
background: #F5F5DC;
border: 2px solid #4A7C59;
border-radius: 8px;
padding: 15px;
```
- Bullet list of key stats
- Icons next to each item

**Box 2: Metabolic Profile**
- Similar styling
- Highlighted calorie targets
- Color-coded weight goal (green for loss)

**Box 3: Macro Breakdown**
- Pie chart visualization
- Large numbers with units
- Visual hierarchy (Fat > Protein > Carbs)

**4. Footer Info (250-297mm)**
- Fasting protocol with icon
- Meal plan duration
- Page number (Page 1 of X)

---

## PAGES 2-N: DAILY MEAL PLANS

### Day Header
```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║    DAY 1 - MONDAY                              📅        ║
║    ════════════════════════════════════════             ║
║                                                          ║
║    Daily Totals: 2,308 kcal | 178g Fat | 144g Protein   ║
║                              | 29g Net Carbs             ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Meal Card Layout (Repeats 1-3 times per page)

```
┌────────────────────────────────────────────────────────┐
│  🌅 BREAKFAST                         ⏱️ 25 minutes     │
│                                                        │
│  ┌─────────────────────────────┐                      │
│  │                             │                      │
│  │   [Recipe Image Placeholder] │                      │
│  │         (150x100mm)          │                      │
│  │                             │                      │
│  └─────────────────────────────┘                      │
│                                                        │
│  Keto Avocado & Bacon Eggs                            │
│  ─────────────────────────────────────────            │
│                                                        │
│  A delicious breakfast combining crispy bacon with     │
│  creamy avocado and perfectly cooked eggs.             │
│                                                        │
│  📋 INGREDIENTS (1 serving):                           │
│  ✓ 3 eggs                                             │
│  ✓ 100g bacon, chopped                                │
│  ✓ 1 avocado (150g)                                   │
│  ✓ 20g butter                                         │
│  ✓ Salt and pepper to taste                           │
│                                                        │
│  👨‍🍳 INSTRUCTIONS:                                      │
│  1. Fry bacon in a pan until crispy                    │
│  2. Remove bacon, add butter to pan                    │
│  3. Crack eggs into pan and cook to preference         │
│  4. Slice avocado                                      │
│  5. Serve eggs with bacon and avocado on the side      │
│                                                        │
│  ⏱️ Prep Time: 5 min | Cook Time: 10 min | Servings: 1 │
│                                                        │
│  ┌──────────────────────────────────────────────────┐ │
│  │  NUTRITION FACTS (per serving)                   │ │
│  ├────────────────┬────────────────┬────────────────┤ │
│  │  Calories      │  Protein       │  Fat           │ │
│  │  680 kcal      │  38g           │  56g           │ │
│  ├────────────────┼────────────────┼────────────────┤ │
│  │  Carbs         │  Fiber         │  Net Carbs     │ │
│  │  12g           │  8g            │  4g            │ │
│  └────────────────┴────────────────┴────────────────┘ │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Meal Card Styling

**Card Container:**
```css
border: 1px solid #DDDDDD;
border-radius: 10px;
margin: 15px 0;
padding: 20px;
background: #FFFFFF;
box-shadow: 0 2px 4px rgba(0,0,0,0.1);
```

**Meal Type Header:**
```css
font-size: 18pt;
font-weight: bold;
color: #4A7C59;
margin-bottom: 10px;
```
- Icons: 🌅 Breakfast, 🌞 Lunch, 🌙 Dinner

**Recipe Title:**
```css
font-size: 22pt;
font-weight: bold;
color: #333333;
margin: 10px 0;
```

**Description:**
```css
font-size: 11pt;
color: #666666;
font-style: italic;
margin-bottom: 15px;
line-height: 1.5;
```

**Ingredients Section:**
```css
background: #F5F5DC;
padding: 10px;
border-radius: 5px;
margin: 10px 0;
```
- Checkmark bullets (✓)
- Each ingredient on new line
- Measurements in bold

**Instructions Section:**
```css
margin: 15px 0;
```
- Numbered list
- Clear, concise steps
- Line spacing: 1.4

**Nutrition Table:**
```css
border: 2px solid #4A7C59;
border-radius: 8px;
background: #F5F5DC;
```
- 2 rows × 3 columns
- Bold headers
- Large numbers (16pt)
- Units in smaller text (10pt)

### Daily Summary Footer
```
┌────────────────────────────────────────────────────────┐
│  📊 DAILY TOTALS FOR DAY 1                             │
│                                                        │
│  Calories: 2,308 kcal    ✓ On target                  │
│  Fat: 178g (70%)         ✓ Perfect                    │
│  Protein: 144g (25%)     ✓ Perfect                    │
│  Net Carbs: 29g (5%)     ✓ Under 50g                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## LAST PAGE: SHOPPING LIST

### Shopping List Layout

```
╔══════════════════════════════════════════════════════════╗
║                                                          ║
║    🛒 SHOPPING LIST                                      ║
║    ════════════════════════════════════════             ║
║                                                          ║
║    For your 7-day meal plan                              ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  🥩 MEAT & POULTRY                          │      ║
║    │                                             │      ║
║    │  ☐ Beef (ground) ................. 500g    │      ║
║    │  ☐ Chicken breast ................ 800g    │      ║
║    │  ☐ Bacon ......................... 400g    │      ║
║    │  ☐ Pork chops .................... 600g    │      ║
║    │                                             │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  🐟 FISH & SEAFOOD                          │      ║
║    │                                             │      ║
║    │  ☐ Salmon fillet ................. 600g    │      ║
║    │  ☐ Shrimp ........................ 300g    │      ║
║    │                                             │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    ┌─────────────────────────────────────────────┐      ║
║    │  🧀 DAIRY & EGGS                            │      ║
║    │                                             │      ║
║    │  ☐ Eggs .......................... 24 pcs  │      ║
║    │  ☐ Butter ........................ 250g    │      ║
║    │  ☐ Heavy cream ................... 500ml   │      ║
║    │  ☐ Cheddar cheese ................ 300g    │      ║
║    │  ☐ Cream cheese .................. 200g    │      ║
║    │  ☐ Mozzarella .................... 200g    │      ║
║    │                                             │      ║
║    └─────────────────────────────────────────────┘      ║
║                                                          ║
║    [Continue for all categories...]                     ║
║                                                          ║
╚══════════════════════════════════════════════════════════╝
```

### Shopping List Categories (in order)

1. **🥩 Meat & Poultry**
2. **🐟 Fish & Seafood**
3. **🧀 Dairy & Eggs**
4. **🥬 Vegetables**
5. **🌰 Nuts & Seeds**
6. **🫒 Fats & Oils**
7. **🧂 Pantry & Spices**

### Category Box Styling
```css
border: 2px solid #4A7C59;
border-radius: 8px;
background: #FFFFFF;
padding: 15px;
margin: 15px 0;
```

**Category Header:**
```css
font-size: 16pt;
font-weight: bold;
color: #4A7C59;
margin-bottom: 10px;
```

**Items:**
```css
font-size: 11pt;
line-height: 1.8;
```
- Checkbox (☐) before each item
- Item name with dotted leader
- Quantity right-aligned
- Zebra striping (alternating light background)

### Shopping List Tips Section
```
┌────────────────────────────────────────────────────────┐
│  💡 SHOPPING TIPS                                      │
│                                                        │
│  ✓ Check your pantry before shopping                  │
│  ✓ Buy in bulk to save money (meat, cheese)           │
│  ✓ Fresh vegetables are best within 3-4 days          │
│  ✓ Consider pre-portioning meat and freezing          │
│                                                        │
└────────────────────────────────────────────────────────┘
```

---

## FOOTER (All Pages Except Cover)

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│  Generated by Keto Meal Planner | Page 3 of 10        │
│  www.your-domain.com | support@your-domain.com         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

**Footer Styling:**
```css
position: fixed;
bottom: 15mm;
width: 100%;
text-align: center;
font-size: 9pt;
color: #999999;
border-top: 1px solid #DDDDDD;
padding-top: 5mm;
```

---

## PDF GENERATION TECHNICAL SPECS

### HTML/CSS Structure

**Base HTML Template:**
```html
<!DOCTYPE html>
<html lang="da">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keto Meal Plan - {{user_name}}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@700&family=Open+Sans:wght@400;600&display=swap');

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    @page {
      size: A4;
      margin: 20mm;
    }

    body {
      font-family: 'Open Sans', Arial, sans-serif;
      font-size: 11pt;
      color: #333333;
      line-height: 1.6;
    }

    h1, h2, h3 {
      font-family: 'Montserrat', Arial, sans-serif;
      font-weight: 700;
    }

    .cover-page {
      page-break-after: always;
      text-align: center;
    }

    .day-page {
      page-break-after: always;
    }

    .meal-card {
      border: 1px solid #DDDDDD;
      border-radius: 10px;
      padding: 20px;
      margin: 15px 0;
      background: #FFFFFF;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      page-break-inside: avoid;
    }

    .nutrition-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #4A7C59;
      border-radius: 8px;
      background: #F5F5DC;
      margin: 10px 0;
    }

    .nutrition-table th {
      background: #4A7C59;
      color: #FFFFFF;
      padding: 10px;
      font-weight: 600;
    }

    .nutrition-table td {
      padding: 10px;
      text-align: center;
      border: 1px solid #DDDDDD;
    }

    .ingredients-box {
      background: #F5F5DC;
      padding: 15px;
      border-radius: 5px;
      margin: 10px 0;
    }

    .shopping-list-category {
      border: 2px solid #4A7C59;
      border-radius: 8px;
      padding: 15px;
      margin: 15px 0;
      background: #FFFFFF;
    }

    .footer {
      position: fixed;
      bottom: 15mm;
      width: 100%;
      text-align: center;
      font-size: 9pt;
      color: #999999;
      border-top: 1px solid #DDDDDD;
      padding-top: 5mm;
    }

    .page-break {
      page-break-after: always;
    }

    /* Print-specific styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <!-- Content dynamically generated here -->
</body>
</html>
```

### Puppeteer Configuration

```javascript
const puppeteer = require('puppeteer');

async function generatePDF(htmlContent, outputPath) {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setContent(htmlContent, {
    waitUntil: 'networkidle0'
  });

  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: {
      top: '20mm',
      right: '20mm',
      bottom: '20mm',
      left: '20mm'
    },
    displayHeaderFooter: false,
    preferCSSPageSize: true
  });

  await browser.close();
  return outputPath;
}
```

---

## ACCESSIBILITY FEATURES

### Text Accessibility
- Minimum font size: 10pt
- High contrast ratios (WCAG AA compliant)
- Clear hierarchy with size and weight
- Readable line height (1.5-1.8)

### Color Accessibility
- Green (#4A7C59) on white: 6.5:1 contrast ratio ✓
- Dark text (#333333) on white: 12.6:1 ✓
- Light text (#666666) on white: 5.7:1 ✓
- All text readable for color-blind users

### Structure
- Semantic HTML headings
- Clear visual hierarchy
- Consistent spacing
- Logical reading order

---

## OPTIONAL ENHANCEMENTS

### Phase 2 Features

1. **Recipe Images**
   - Source from free stock photo APIs (Unsplash, Pexels)
   - Or generate with AI (DALL-E, Midjourney)
   - Fallback to food category icons

2. **QR Codes**
   - Link to online version of meal plan
   - Link to instructional videos
   - Link to user dashboard

3. **Interactive Elements** (for digital PDF)
   - Clickable checkboxes for shopping list
   - Hyperlinked table of contents
   - Embedded video links

4. **Personalization**
   - User photo on cover page
   - Custom color themes
   - Motivational quotes based on goal

5. **Weekly Progress Tracker**
   - Weight logging chart
   - Meal completion checkboxes
   - Notes section

---

## FILE NAMING CONVENTION

```
keto-meal-plan-[plan_id]-[user_name]-[date].pdf

Examples:
- keto-meal-plan-456-anders-hejlsvig-2026-01-23.pdf
- keto-meal-plan-789-jane-doe-2026-02-15.pdf
```

---

## TESTING CHECKLIST

### Before Production:

- [ ] Test with 1, 3, 5, and 7 day plans
- [ ] Verify all 3 languages render correctly
- [ ] Check page breaks don't split meal cards
- [ ] Verify all ingredients categories present
- [ ] Test with long recipe names (truncation)
- [ ] Verify nutrition tables calculate correctly
- [ ] Check PDF file size < 5MB
- [ ] Test on different PDF viewers (Adobe, Preview, Chrome)
- [ ] Verify all fonts embed correctly
- [ ] Check colors print correctly

---

## EXAMPLE PDF STRUCTURE (7-Day Plan)

**Page 1:** Cover & Summary
**Pages 2-8:** Days 1-7 (each day 1 page with 3 meals)
**Page 9:** Shopping List (Page 1)
**Page 10:** Shopping List (Page 2) + Tips

**Total Pages:** ~10 pages for 7-day plan

---

**Document Complete - Ready for Implementation**
