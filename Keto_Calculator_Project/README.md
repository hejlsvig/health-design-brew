# Keto Calculator & Meal Planner - Complete Project Documentation

**Version:** 1.0 MVP
**Date:** 2026-01-23
**Status:** Design Phase Complete - Ready for Development

---

## 📋 PROJECT OVERVIEW

This is a comprehensive web application that calculates personalized daily caloric needs using the Mifflin-St Jeor formula and generates customized keto meal plans using AI (ChatGPT). The application includes:

- **BMR/TDEE Calculator** with activity levels
- **Weight goal setting** (0-3 kg/month)
- **Intermittent fasting protocols** (No Fast, 16:8, 18:6, 20:4, OMAD)
- **Ingredient preference matrix** (40+ keto ingredients)
- **AI-powered meal plan generation** via N8N & ChatGPT
- **PDF generation** with recipes and shopping list
- **Email delivery** with personalized content
- **Multi-language support** (Danish, English, Swedish)
- **User authentication** and data persistence

---

## 🎯 PROJECT GOALS

### Primary Objectives
1. Provide accurate calorie calculations for weight loss
2. Generate personalized keto meal plans in under 90 seconds
3. Deliver professionally formatted PDF via email
4. Support 3 languages (Da, En, Se)
5. Save user preferences for repeat usage

### Target Audience
- People interested in starting a keto diet
- Users wanting structured meal planning
- Individuals practicing intermittent fasting
- People seeking 0-3 kg/month weight loss

---

## 📁 PROJECT STRUCTURE

```
Keto_Calculator_Project/
│
├── README.md (this file)
│
├── docs/
│   ├── technical/
│   │   └── TECHNICAL_SPECIFICATION.md (Complete tech specs)
│   ├── wireframes/
│   │   └── USER_FLOW.md (Complete user flow & wireframes)
│   └── database/
│       └── (Database schema in technical spec)
│
├── design/
│   ├── ui-mockups/
│   │   └── (To be created in development)
│   ├── flows/
│   │   └── (Flow diagrams)
│   └── PDF_TEMPLATE_DESIGN.md (PDF layout specification)
│
├── n8n-workflows/
│   └── N8N_WORKFLOW_DETAILED.md (Complete N8N documentation)
│
├── translations/
│   └── TRANSLATIONS_COMPLETE.json (All 3 languages)
│
└── src/ (To be created during development)
    ├── frontend/
    ├── backend/
    └── wordpress-plugin/
```

---

## 🚀 QUICK START GUIDE

### What Has Been Completed (Design Phase)

✅ **Complete Technical Specification**
- System architecture defined
- Database schema designed (4 custom MySQL tables)
- API endpoints documented
- Calculation formulas specified

✅ **User Flow & Wireframes**
- 10-step user journey mapped
- Mobile responsive layouts
- Accessibility features defined
- State management specified

✅ **N8N Workflow Architecture**
- Complete node-by-node workflow
- Error handling strategy
- ChatGPT prompt engineering
- PDF generation pipeline

✅ **Multi-language Translations**
- 3 complete language files (Da, En, Se)
- 200+ translation keys
- Consistent terminology

✅ **PDF Template Design**
- Professional layout specification
- Color palette & typography
- Shopping list format
- Nutrition facts tables

---

## 🛠 TECHNOLOGY STACK

### Frontend
- **Framework:** React.js or Vue.js (embedded in WordPress)
- **Styling:** CSS3 with responsive design
- **State Management:** LocalStorage + WordPress user sessions

### Backend
- **Platform:** WordPress (hosted on One.com)
- **Database:** MySQL (WordPress database + custom tables)
- **Server:** PHP 8.0+
- **REST API:** WordPress REST API + custom endpoints

### External Services
- **AI Generation:** OpenAI ChatGPT API (GPT-4 Turbo)
- **Workflow Automation:** N8N (self-hosted or cloud)
- **PDF Generation:** Puppeteer or PDF service API
- **Email Delivery:** SMTP or SendGrid

### Development Tools
- Git for version control
- Node.js for build tools
- Postman for API testing

---

## 📊 DATABASE SCHEMA SUMMARY

### Custom WordPress Tables

**1. wp_keto_user_profiles**
- User demographics (age, gender, weight, height)
- Calculated metrics (BMR, TDEE, daily calories)
- Preferences (language, units, fasting protocol)

**2. wp_keto_ingredients**
- Ingredient library (47 items)
- Multi-language names
- Category classification

**3. wp_keto_user_preferences**
- Junction table for user-ingredient relationships
- Tracks excluded ingredients per user

**4. wp_keto_meal_plans**
- Generated meal plans (JSON storage)
- Shopping lists
- PDF URLs
- ChatGPT prompts & responses
- Status tracking

---

## 🔄 USER JOURNEY OVERVIEW

```
1. Landing Page
   ├─ Select language (Da/En/Se)
   ├─ Select units (Metric/Imperial)
   └─ Click START

2. Personal Stats Input
   ├─ Gender, Age, Weight, Height
   ├─ Activity level selection
   └─ Real-time validation

3. BMR & TDEE Results
   ├─ Display calculated BMR
   ├─ Display calculated TDEE
   └─ Brief explanation

4. Weight Goal Setting
   ├─ Slider (0-3 kg/month)
   ├─ Calculate calorie deficit
   └─ Show daily calorie target

5. Fasting Protocol
   ├─ No Fast, 16:8, 18:6, 20:4, OMAD
   ├─ Visual timeline for each
   └─ Automatic meal count calculation

6. Ingredient Preferences
   ├─ 40+ ingredients in categories
   ├─ Select/deselect by category or item
   └─ Counter showing selections

7. Meal Plan Configuration
   ├─ Choose days (1-7)
   ├─ Leftovers yes/no
   └─ Diet variant (Standard/Vegetarian/Pescatarian)

8. Review & Login
   ├─ Summary of all choices
   ├─ Create account or login
   └─ Accept terms

9. Processing (30-90 seconds)
   ├─ Loading animation
   ├─ Progress steps
   └─ Educational tips

10. Success
    ├─ Confirmation message
    ├─ Email sent notification
    ├─ PDF download link
    └─ Option to create new plan
```

---

## 🤖 N8N WORKFLOW SUMMARY

### Workflow Steps (11 Nodes)

1. **Webhook Trigger** - Receives POST from WordPress
2. **Validate Input** - Checks all required fields
3. **IF Validation** - Routes to error or continue
4. **Build ChatGPT Prompt** - Formats user data into prompt
5. **ChatGPT API Call** - Generates meal plan (30-60s)
6. **IF ChatGPT Success** - Routes based on success
7. **Parse Response** - Extracts and validates JSON
8. **Generate PDF** - Creates PDF from meal plan
9. **Send Email** - Delivers PDF to user
10. **Update WordPress** - Sets status to "sent"
11. **Success Response** - Returns to WordPress

### Error Handler
- Logs all errors
- Updates WordPress with failed status
- Sends admin notification
- Returns error response

---

## 💰 ESTIMATED COSTS (Monthly)

### Development Costs (One-time)
- Design & Planning: ✅ Complete (8-10 hours)
- Frontend Development: 40-60 hours
- Backend Development: 30-40 hours
- N8N Setup: 10-15 hours
- Testing & QA: 15-20 hours
- **Total Estimated:** 95-145 hours

### Operational Costs (Monthly)
- **WordPress Hosting (One.com):** ~$5-15/month
- **OpenAI ChatGPT API:** ~$0.01-0.06 per meal plan (GPT-4 Turbo)
  - Average: $0.03 × 100 users = $3/month
- **N8N Hosting (if cloud):** $0-20/month (or self-host for free)
- **Email Service:** $0-10/month (depending on volume)
- **Domain & SSL:** $10-15/year

**Total Monthly (100 users):** ~$10-50/month

---

## 📈 SCALING CONSIDERATIONS

### Performance Targets
- **Page Load Time:** < 2 seconds
- **Meal Plan Generation:** 30-90 seconds
- **PDF Generation:** 5-15 seconds
- **Email Delivery:** < 30 seconds
- **Concurrent Users:** 20-50 (MVP)

### Scaling Strategy (Future)
- Implement caching for common calculations
- Queue system for meal plan generation
- CDN for static assets
- Database query optimization
- Dedicated server upgrade

---

## 🔒 SECURITY & PRIVACY

### Data Protection
- WordPress password hashing (bcrypt)
- HTTPS only (SSL required)
- CSRF token protection
- SQL injection prevention (prepared statements)
- XSS prevention (output escaping)

### GDPR Compliance
- Cookie consent banner
- Privacy policy
- Terms of service
- Right to data deletion
- Data export functionality

### API Security
- Rate limiting on endpoints
- WordPress nonce verification
- N8N webhook authentication
- OpenAI API key in environment variables

---

## ✅ TESTING REQUIREMENTS

### Unit Tests
- Calculator functions (BMR, TDEE, deficit)
- Input validation
- Data transformation

### Integration Tests
- WordPress API endpoints
- N8N webhook integration
- ChatGPT API responses
- PDF generation
- Email delivery

### User Acceptance Testing
- Complete user flow (all 10 steps)
- All 3 languages
- Mobile, tablet, desktop
- Multiple browsers (Chrome, Safari, Firefox)

### Load Testing
- Concurrent user simulation
- API rate limiting verification
- Database performance

---

## 🚧 IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
- [ ] Set up WordPress development environment
- [ ] Create database tables
- [ ] Build basic calculator UI
- [ ] Implement BMR/TDEE calculations

### Phase 2: User Interface (Week 3-4)
- [ ] Build all 10 steps of user flow
- [ ] Implement language switcher
- [ ] Create ingredient preference matrix
- [ ] Add form validation

### Phase 3: Backend & Integration (Week 5-6)
- [ ] Create WordPress REST API endpoints
- [ ] Set up N8N workflow
- [ ] Integrate ChatGPT API
- [ ] Implement user authentication

### Phase 4: PDF & Email (Week 7)
- [ ] Build PDF generation system
- [ ] Create HTML/CSS template
- [ ] Set up email delivery
- [ ] Test end-to-end workflow

### Phase 5: Testing & Polish (Week 8)
- [ ] Complete testing checklist
- [ ] Fix bugs and issues
- [ ] Optimize performance
- [ ] Final QA

### Phase 6: Deployment (Week 9)
- [ ] Deploy to production (One.com)
- [ ] Configure DNS and SSL
- [ ] Set up monitoring
- [ ] Launch!

---

## 📚 KEY DOCUMENTS REFERENCE

### Must-Read Before Development

1. **TECHNICAL_SPECIFICATION.md**
   - Complete system architecture
   - Database schema with SQL
   - API endpoint specifications
   - Calculation formulas
   - Security considerations

2. **USER_FLOW.md**
   - Detailed wireframes for all 10 steps
   - Mobile responsive layouts
   - Validation rules
   - Error handling
   - State management

3. **N8N_WORKFLOW_DETAILED.md**
   - Node-by-node configuration
   - JavaScript code for function nodes
   - Error handling strategy
   - Testing examples
   - Environment variables

4. **TRANSLATIONS_COMPLETE.json**
   - All UI text in 3 languages
   - Consistent terminology
   - Easy to extend

5. **PDF_TEMPLATE_DESIGN.md**
   - Complete PDF layout
   - HTML/CSS structure
   - Puppeteer configuration
   - Accessibility features

---

## 🤝 DEVELOPMENT WORKFLOW

### Git Workflow (Recommended)
```
main (production)
  └── develop (staging)
       ├── feature/calculator-ui
       ├── feature/n8n-integration
       ├── feature/pdf-generation
       └── feature/user-auth
```

### Branch Naming
- `feature/[feature-name]` - New features
- `bugfix/[bug-description]` - Bug fixes
- `hotfix/[critical-fix]` - Production hotfixes

### Commit Messages
```
feat: Add BMR calculator component
fix: Correct TDEE calculation for activity level
docs: Update API endpoint documentation
style: Format code according to style guide
test: Add unit tests for calculator functions
```

---

## 🐛 KNOWN LIMITATIONS (MVP)

### Current Scope Limitations
- ❌ No mobile app (web only)
- ❌ No recipe images (placeholder only)
- ❌ No progress tracking dashboard
- ❌ No social sharing features
- ❌ No nutrition coach chat
- ❌ No integration with fitness trackers

### These are planned for Phase 2+

---

## 💡 FUTURE ENHANCEMENTS

### Phase 2 Features (Post-MVP)
- [ ] Progress tracking dashboard
- [ ] Weight logging over time
- [ ] Favorite recipes
- [ ] Meal swapping functionality
- [ ] Recipe rating system
- [ ] Social sharing
- [ ] Recipe images (AI-generated or stock photos)

### Phase 3 Features (Long-term)
- [ ] Mobile app (React Native)
- [ ] Integration with fitness trackers (Fitbit, Apple Health)
- [ ] Grocery delivery API integration
- [ ] Community features (forums, groups)
- [ ] Nutrition coach chat (AI-powered)
- [ ] Subscription model with premium features

---

## 📞 SUPPORT & MAINTENANCE

### Monitoring Checklist
- [ ] Daily error log review (WordPress debug.log)
- [ ] Weekly N8N workflow success rate
- [ ] Monthly user feedback review
- [ ] Quarterly performance optimization

### Backup Strategy
- Daily automated WordPress backups
- Database backups stored off-site
- N8N workflow export (version controlled)

### Update Schedule
- Security updates: As needed (within 24 hours)
- Feature updates: Monthly
- Bug fixes: Weekly

---

## 🎓 LEARNING RESOURCES

### For Developers Working on This Project

**WordPress Development:**
- [WordPress REST API Handbook](https://developer.wordpress.org/rest-api/)
- [WordPress Coding Standards](https://developer.wordpress.org/coding-standards/)

**N8N:**
- [N8N Documentation](https://docs.n8n.io/)
- [N8N Community Forums](https://community.n8n.io/)

**OpenAI API:**
- [OpenAI API Documentation](https://platform.openai.com/docs/)
- [GPT Best Practices](https://platform.openai.com/docs/guides/gpt-best-practices)

**Keto Diet:**
- Understanding macronutrient ratios (70/25/5)
- Net carbs calculation (total carbs - fiber)
- Intermittent fasting protocols

---

## 📝 CHANGELOG

### Version 1.0 - Design Phase (2026-01-23)
- ✅ Complete technical specification
- ✅ User flow and wireframes
- ✅ N8N workflow architecture
- ✅ Multi-language translations (Da, En, Se)
- ✅ PDF template design
- ✅ Database schema design
- ✅ API endpoint specifications

### Version 1.1 - Development Phase (TBD)
- To be updated during development

---

## 🙏 ACKNOWLEDGMENTS

**Project Owner:** Anders Hejlsvig

**Design Approach:**
- Option A: Complete design and specification before implementation
- User-centered design with focus on simplicity
- Mobile-first responsive design
- Accessibility considerations (WCAG AA)

---

## 📄 LICENSE & TERMS

This project documentation is proprietary and confidential.

**Copyright © 2026 Anders Hejlsvig. All rights reserved.**

---

## ✉️ CONTACT

**For questions about this project:**
- Project Owner: Anders Hejlsvig
- Email: [Your email here]
- Project Repository: [To be created]

---

## 🚀 NEXT STEPS

### Ready to Start Development?

1. **Review all documentation** in the `/docs` folder
2. **Set up development environment:**
   - Install WordPress locally (MAMP, XAMPP, or Local)
   - Install Node.js for frontend build tools
   - Set up N8N (local or cloud)
   - Get OpenAI API key

3. **Create project repository:**
   - Initialize Git repository
   - Create branches (main, develop)
   - Add .gitignore for WordPress

4. **Start with Phase 1:**
   - Begin with calculator UI
   - Test calculations thoroughly
   - Get user feedback early

5. **Iterate and improve:**
   - Build MVP first
   - Test with real users
   - Add features based on feedback

---

## 📊 PROJECT STATUS DASHBOARD

```
Design Phase:           100% ✅ COMPLETE
Development Phase:        0% ⏳ Not started
Testing Phase:            0% ⏳ Not started
Deployment Phase:         0% ⏳ Not started

Overall Progress:        25% (Design complete)
```

---

**Last Updated:** 2026-01-23
**Document Version:** 1.0
**Status:** Ready for Development

**🎉 All design documentation is complete and ready for implementation! 🎉**
