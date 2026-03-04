# 🥑 Keto Calculator - Working Prototype

## ✨ What This Is

This is a **fully functional standalone prototype** of the Keto Calculator & Meal Planner. It demonstrates all the core functionality without requiring any backend setup.

## 🎯 Features Included

✅ **Multi-language Support** (Danish, English, Swedish)
✅ **Unit Conversion** (Metric/Imperial)
✅ **BMR/TDEE Calculator** (Mifflin-St Jeor Formula)
✅ **Weight Goal Setting** (0-3 kg/month with slider)
✅ **Calorie Deficit Calculation**
✅ **5 Fasting Protocols** (No Fast, 16:8, 18:6, 20:4, OMAD)
✅ **Ingredient Preferences** (Simplified version)
✅ **Meal Plan Configuration** (Days, leftovers, diet type)
✅ **Progress Bar** (6 steps with percentages)
✅ **Responsive Design** (Works on desktop, tablet, mobile)
✅ **Local Storage** (Saves your progress)
✅ **Beautiful UI** (Modern, clean design)

## 🚀 How to Use

### Option 1: Open Directly
1. Navigate to the prototype folder on your Desktop:
   ```
   Desktop/Bog /Calculator/Keto_Calculator_Project/prototype/
   ```

2. **Double-click** `index.html` to open in your browser

3. That's it! The prototype will run completely in your browser.

### Option 2: Use a Local Server (Recommended)
For best experience with modern browsers:

```bash
# Navigate to prototype folder
cd "/Users/andershejlsvig/Desktop/Bog /Calculator/Keto_Calculator_Project/prototype"

# Start a simple HTTP server (Python)
python3 -m http.server 8000

# OR with Node.js (if you have it)
npx http-server -p 8000
```

Then open: `http://localhost:8000`

## 📱 Test It Out

### Try These Scenarios:

**Scenario 1: Danish User, Moderate Weight Loss**
- Language: 🇩🇰 Dansk
- Units: Metric
- Age: 35, Male, 85kg, 180cm
- Activity: Moderately Active
- Goal: 2 kg/month
- Fasting: 16:8
- Days: 7, with leftovers

**Scenario 2: English User, Aggressive Weight Loss**
- Language: 🇬🇧 English
- Units: Imperial
- Age: 42, Female, 180lb, 65 inches
- Activity: Lightly Active
- Goal: 3 kg/month (6.6 lb)
- Fasting: OMAD
- Days: 4, no leftovers

**Scenario 3: Swedish User, Maintenance**
- Language: 🇸🇪 Svenska
- Units: Metric
- Age: 28, Male, 75kg, 175cm
- Activity: Very Active
- Goal: 0 kg/month (maintain)
- Fasting: No Fast
- Days: 5, with leftovers

## 🧪 Features to Test

### 1. Language Switching
- Click any of the 3 language flags
- Watch all text update instantly
- Language persists if you refresh

### 2. Unit Conversion
- Switch between Metric and Imperial
- Notice how labels change (kg↔lb, cm↔inches)

### 3. BMR/TDEE Calculator
- Enter your personal stats
- See real-time calculations
- Formula: Mifflin-St Jeor (medically accurate)

### 4. Weight Goal Slider
- Drag slider or use quick select buttons
- Watch calorie deficit update in real-time
- See expected monthly weight loss

### 5. Fasting Protocols
- Click each fasting card
- See visual timeline
- Example eating windows shown

### 6. Ingredient Preferences
- Check/uncheck ingredients
- Watch counter update
- Simulates full 40+ ingredient matrix

### 7. Final Configuration
- Select number of days (1-7)
- Choose leftovers preference
- Pick diet variant

### 8. Summary Page
- See all your choices summarized
- Demonstrates what would be sent to AI
- Restart to try again

## 💻 Technical Details

### Files:
- `index.html` - Main structure (all 7 steps)
- `styles.css` - Complete styling (responsive, animations)
- `calculator.js` - Logic (calculations, navigation, state)
- `translations.js` - 3 languages (Da, En, Se)

### Technologies:
- Vanilla JavaScript (no frameworks)
- CSS3 (animations, grid, flexbox)
- Local Storage API
- Google Fonts (Montserrat, Open Sans)

### Calculations Used:

**BMR (Mifflin-St Jeor):**
```
Men: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) + 5
Women: BMR = (10 × weight_kg) + (6.25 × height_cm) - (5 × age) - 161
```

**TDEE:**
```
TDEE = BMR × Activity_Multiplier
(Sedentary: 1.2, Lightly Active: 1.375, Moderate: 1.55, etc.)
```

**Daily Calories:**
```
Daily = TDEE - ((weight_goal_kg × 7700) / 30)
```

## 🎨 Design Highlights

- **Color Palette:**
  - Primary Green: #4A7C59
  - Light Green: #7CAE7A
  - Beige: #F5F5DC
  - Coral: #FF6B6B

- **Typography:**
  - Headers: Montserrat (Bold)
  - Body: Open Sans (Regular)

- **Animations:**
  - Smooth transitions (0.3s)
  - Fade-in for step changes
  - Bouncing avocado emoji 🥑
  - Hover effects on all interactive elements

## 📊 What's Missing (Full Version Only)

This prototype demonstrates the **user experience** but doesn't include:

❌ User registration/login
❌ Database storage
❌ N8N workflow integration
❌ ChatGPT API connection
❌ Real recipe generation
❌ PDF creation
❌ Email delivery
❌ Full 40+ ingredient matrix
❌ Progress tracking over time

**These features exist in the full design documentation!**

## 🔄 Saved Progress

The prototype uses **LocalStorage** to save your progress:
- Your language selection
- Your current step
- All entered data

**To reset:**
- Use the browser's developer tools
- Clear localStorage for this page
- Or just click "Try Again" on the final screen

## 🐛 Known Limitations

- No actual API calls (it's a prototype!)
- Simplified ingredient list (11 items vs. full 47)
- No real PDF generation
- No email functionality
- Summary page is static demonstration

## 🎯 Next Steps

### To Build the Full Version:

1. **Read the Complete Documentation**
   - `/docs/technical/TECHNICAL_SPECIFICATION.md`
   - `/docs/wireframes/USER_FLOW.md`
   - `/n8n-workflows/N8N_WORKFLOW_DETAILED.md`

2. **Set Up Backend**
   - WordPress plugin
   - MySQL database (4 tables)
   - REST API endpoints

3. **Integrate N8N**
   - Create workflow (11 nodes)
   - Connect ChatGPT API
   - Set up PDF generation

4. **Deploy**
   - Upload to One.com
   - Configure DNS & SSL
   - Test end-to-end

## 💡 Tips for Testing

1. **Test on Different Devices:**
   - Desktop (Chrome, Safari, Firefox)
   - Tablet (iPad, Android tablet)
   - Mobile (iPhone, Android phone)

2. **Test Different Paths:**
   - Minimal weight loss (0 kg)
   - Maximum weight loss (3 kg)
   - Different fasting protocols
   - All 3 languages

3. **Check Calculations:**
   - Use online BMR calculator to verify
   - Test with extreme values (very young/old, light/heavy)
   - Verify calorie deficit math

4. **Test Error Handling:**
   - Try submitting with empty fields
   - Enter invalid ages (< 18, > 100)
   - Switch units mid-calculation

## 🎉 Enjoy!

This prototype represents **weeks of design work** condensed into a working demonstration. It shows:

- ✅ Complete user flow (7 steps)
- ✅ Real calculations (medically accurate)
- ✅ Beautiful design (responsive, animated)
- ✅ Multi-language support (3 languages)
- ✅ Professional UX (progress bars, validation, feedback)

**Have fun testing it!** 🥑

---

**Questions?** Check the main project README:
```
../README.md
```

**Want to build it?** Start here:
```
../GETTING_STARTED.md
```
