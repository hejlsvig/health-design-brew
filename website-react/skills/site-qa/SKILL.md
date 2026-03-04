---
name: site-qa
description: >
  Full QA test of the Shifting Source website. Runs through every page, checks rendering,
  navigation, data loading, images, i18n, admin features, and interactive elements.
  Use this skill whenever the user says "test the site", "QA", "check everything works",
  "run through the site", or wants to verify the site after changes.
---

# Shifting Source — Full Site QA

This skill systematically tests every page and feature of the Shifting Source keto & fasting
lifestyle platform. It uses Claude in Chrome to navigate the running dev server and verify
that everything renders, loads, and functions correctly.

## Prerequisites

- The dev server must be running at `http://localhost:5173`
- You must be logged in as an admin user (for admin page testing)
- Use the Chrome browser tools (tabs_context_mcp, navigate, screenshot, find, etc.)

## Test Strategy

Work through the checklist below in order. For each page:

1. Navigate to the URL
2. Take a screenshot
3. Verify the expected elements are visible
4. Test interactive elements where applicable
5. Log any issues found

Report results as a summary at the end: total checks, passed, failed, with details on failures.

---

## QA Checklist

### 1. Public Pages

#### 1.1 Home (`/`)
- [ ] Page loads without errors
- [ ] Hero section renders with image/title/CTA
- [ ] Latest recipes section shows recipe cards with images, titles, categories
- [ ] Latest articles section shows article cards
- [ ] Footer renders with links, newsletter form, social links
- [ ] Navbar shows: Home, Recipes, Guides, Research & Articles, Calorie Calculator
- [ ] Language switcher works (try EN → DA → back)

#### 1.2 Recipes (`/recipes`)
- [ ] Recipe grid loads with cards
- [ ] Each card shows: image (or placeholder), title overlay on image, category badges, description, meta (time, servings, kcal, carbs)
- [ ] Category filter buttons render and filter correctly (click a category, verify list changes)
- [ ] Search field filters recipes by title
- [ ] Click a recipe card → detail view opens with hero image, title overlay, back button, ingredients, instructions, nutrition sidebar, macro chart

#### 1.3 Recipe Detail (click any recipe with an image)
- [ ] Hero image displays with title, categories, and tags overlaid
- [ ] "All recipes" back button works
- [ ] Ingredients list renders
- [ ] Instructions render with numbered steps
- [ ] Nutrition panel shows: kcal, protein, fat, carbs, fiber (NO "net carbs")
- [ ] Macro distribution chart renders
- [ ] Servings +/- buttons scale ingredients and nutrition
- [ ] Print button opens print-friendly version
- [ ] Favorite/save button works (if logged in)

#### 1.4 Blog (`/blog`)
- [ ] Article list loads
- [ ] Each article shows: image, title, excerpt, read time, categories
- [ ] Search filters articles
- [ ] Category filter works
- [ ] Click article → navigates to `/blog/:slug`

#### 1.5 Blog Post (`/blog/:slug`)
- [ ] Hero section with image, title, metadata
- [ ] Article content renders (HTML from Tiptap)
- [ ] Source URL link shown if present
- [ ] Back to blog link works

#### 1.6 Guides (`/guides`)
- [ ] Guide list loads with cards
- [ ] Category filter (keto, fasting, lifestyle) works
- [ ] Search works
- [ ] Difficulty badges visible

#### 1.7 Guide Post (`/guides/:slug`)
- [ ] Hero with image, title, category, difficulty
- [ ] Content renders
- [ ] Reading time shown
- [ ] Back link works

#### 1.8 Calorie Calculator (`/calculator`)
- [ ] Step 1 loads (gender selection)
- [ ] Can progress through all steps
- [ ] Unit toggle (metric/imperial) works
- [ ] Final result shows calculated calories
- [ ] Meal planner steps are accessible

#### 1.9 About (`/about`)
- [ ] Page loads with dynamic sections
- [ ] Content blocks render

#### 1.10 Privacy & Terms (`/privacy`, `/terms`)
- [ ] Pages load with content sections

#### 1.11 Login (`/login`)
- [ ] Email input field renders
- [ ] Magic link button is present

#### 1.12 Profile (`/profile`)
- [ ] Shows user info (if logged in)
- [ ] Saved recipes section visible
- [ ] Diet preferences shown

---

### 2. Navigation & Layout

- [ ] Navbar is sticky on scroll
- [ ] All nav links route correctly (Home, Recipes, Guides, Research & Articles, Calculator)
- [ ] Mobile menu works (resize to mobile width, check hamburger menu)
- [ ] Footer links work (Privacy, Terms, About)
- [ ] Logo links to home

---

### 3. i18n / Language

Test with at least 2 languages:

- [ ] Switch to Danish (DA) → page content changes to Danish
- [ ] Switch to English (EN) → content changes to English
- [ ] Recipe titles/descriptions change per language
- [ ] UI labels (buttons, navigation) change per language
- [ ] Switch to Swedish (SE) → verify content updates

---

### 4. Admin Pages (requires admin login)

#### 4.1 Dashboard (`/admin`)
- [ ] Stats cards show counts (articles, recipes, guides, users)
- [ ] Navigation to other admin pages works

#### 4.2 Admin Blog (`/admin/blog`)
- [ ] Article list loads
- [ ] Create new article form works
- [ ] Tiptap editor loads and is functional
- [ ] Language tabs (DA/EN/SE) switch editor content
- [ ] Image upload section visible
- [ ] AI image generator button visible (when no image)
- [ ] Categories/tags input works
- [ ] Save button works
- [ ] AI article generation from URL visible

#### 4.3 Admin Recipes (`/admin/recipes`)
- [ ] Recipe list loads
- [ ] Create/edit form has all fields: title, description, ingredients, instructions, macros, image
- [ ] Language tabs work
- [ ] Ingredient parser works
- [ ] Nutrition fields present: kcal, protein, fat, carbs, fiber (NO net_carbs field)
- [ ] AI image generator visible when no image
- [ ] Categories and tags inputs work
- [ ] Save works

#### 4.4 Admin Guides (`/admin/guides`)
- [ ] Guide list loads
- [ ] Create/edit form with Tiptap editor
- [ ] Category selection (keto/fasting/lifestyle)
- [ ] Difficulty selection
- [ ] Image upload works

#### 4.5 Admin Homepage (`/admin/homepage`)
- [ ] Section list loads
- [ ] Sections can be reordered (drag/drop)
- [ ] Sections can be toggled visible/hidden
- [ ] Edit section content works

#### 4.6 Admin Users (`/admin/users`)
- [ ] User list loads with emails and roles
- [ ] Role filter works

#### 4.7 Admin Settings (`/admin/settings`)
- [ ] OpenAI API key field (masked)
- [ ] AI model selector
- [ ] Kie.ai API key field (masked)
- [ ] FTP credentials section (host, username, password)
- [ ] Save button works and shows confirmation

#### 4.8 Admin About/Privacy/Terms (`/admin/about`, `/admin/privacy`, `/admin/terms`)
- [ ] Section editors load
- [ ] Content is editable

---

### 5. Image & Media

- [ ] Recipe cards with AI images display correctly (no broken images)
- [ ] Blog post hero images load
- [ ] Guide hero images load
- [ ] Placeholder icons show for items without images
- [ ] Image overlay gradient renders (text readable over images)

---

### 6. Interactive Features

- [ ] Recipe favorite toggle works (heart icon)
- [ ] Recipe servings scaler works (+/- buttons)
- [ ] Search inputs respond to typing
- [ ] Category filters respond to clicks
- [ ] Newsletter signup form in footer is present
- [ ] Calorie calculator step navigation works

---

### 7. Console Errors

After visiting key pages, check browser console for errors:
- [ ] No JavaScript errors on Home
- [ ] No JavaScript errors on Recipes
- [ ] No JavaScript errors on Blog
- [ ] No JavaScript errors on Admin pages
- [ ] No failed network requests (broken API calls)

---

## Reporting

After completing all checks, provide a summary:

```
## QA Report — Shifting Source
Date: [date]

### Summary
- Total checks: X
- Passed: X
- Failed: X
- Skipped: X

### Issues Found
1. [Page] — [Description of issue] — [Severity: Critical/Major/Minor]
2. ...

### Screenshots
[Reference screenshots taken during testing]

### Recommendations
- [Any improvements noticed during testing]
```

Severity guide:
- **Critical**: Page won't load, data loss, security issue
- **Major**: Feature broken, layout severely broken, wrong data displayed
- **Minor**: Visual glitch, typo, minor UI inconsistency
