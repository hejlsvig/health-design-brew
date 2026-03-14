---
name: crm-qa
description: >
  Full QA test of the Shifting Source CRM system. Tests lead management, coaching,
  activity logs, user management, Social Publisher, and admin settings.
  Use this skill whenever the user says "test CRM", "QA CRM", "check CRM works",
  or wants to verify CRM functionality after changes.
---

# Shifting Source — CRM & Admin QA

This skill systematically tests every CRM and admin feature of the Shifting Source platform.
It uses Claude in Chrome to navigate the running dev server and verify that everything
renders, loads, and functions correctly.

## Prerequisites

- The dev server must be running at `http://localhost:5173`
- **VIGTIGT:** CRM'et der skal testes er det LOKALE dev-miljø på `http://localhost:5173` — IKKE produktionssitet på shiftingsource.com. Brug altid localhost-URL'en indtil CRM'et er deployet live.
- You must be logged in as an admin user
- Use the Chrome browser tools (tabs_context_mcp, navigate, screenshot, find, etc.)

## Test Strategy

Work through the checklist below in order. For each page:

1. Navigate to the URL
2. Take a screenshot
3. Verify the expected elements are visible
4. Check console for errors
5. Test interactive elements where applicable
6. Log any issues found

Report results as a summary at the end.

---

## QA Checklist

### 1. Admin Dashboard (`/admin`)

- [ ] Page loads without errors
- [ ] Cards are grouped into sections: Indhold, Sider, Marketing & Social, Brugere & CRM, System
- [ ] Each section has a heading with border separator
- [ ] Stats shown on content cards (articles published/total, recipes published/total)
- [ ] User stats shown (admins count, users count)
- [ ] All card links navigate to correct pages
- [ ] CRM & Leads card links to `/admin/crm`
- [ ] CRM icon visible in admin navbar

---

### 2. CRM Lead Management (`/admin/crm`)

- [ ] Page loads with lead list
- [ ] Stats cards at top: Total leads, New, Qualified, Active coaching
- [ ] Lead table shows: name/email, status badge, score, source, last contact, created date
- [ ] Status filter dropdown works (all, new, contacted, qualified, coaching_active, etc.)
- [ ] Source filter dropdown works (all, calculator, newsletter, website_signup, manual, imported)
- [ ] Search by email/name works
- [ ] Sort options work (newest, oldest, highest score, lowest score, last contacted)
- [ ] Click on a lead → navigates to `/admin/crm/:userId`

### 2.1 Lead Detail (`/admin/crm/:userId`)

- [ ] Lead profile loads with name, email, status, score
- [ ] Status can be changed via dropdown
- [ ] Score can be updated
- [ ] Activity log shows timeline of events
- [ ] Add note form works (enter text, submit, note appears in log)
- [ ] Notes can be pinned/unpinned
- [ ] Coaching activation section visible
- [ ] Follow-up date can be set
- [ ] Back link returns to lead list

### 2.2 Coaching Detail (from CRM app or lead detail)

- [ ] Coaching client details load (profile + subscription info)
- [ ] Check-in tab shows weekly check-ins list
- [ ] Check-in entries show weight, notes, date
- [ ] Email history tab shows sent emails for this client
- [ ] Notes tab shows CRM notes with pin support
- [ ] Meal plan generation available for coaching clients
- [ ] Coach can send check-in reminder

---

### 3. Social Publisher (`/admin/social-publisher`)

#### 3.1 Compose Tab (Skriv Post)
- [ ] Tab navigation works (Skriv Post, Kø & Planlagt, Historik, Konti)
- [ ] Platform toggle buttons render (Instagram, Facebook, YouTube, TikTok)
- [ ] At least one platform can be selected
- [ ] Text area accepts input with live character count
- [ ] Character count updates as you type
- [ ] Format validation shows warnings when text exceeds platform limits
- [ ] Media upload section visible (drag-drop or click)
- [ ] Tags input works (comma-separated)
- [ ] Schedule datetime picker renders
- [ ] Live preview panel shows formatted post
- [ ] "Gem kladde" saves to queue
- [ ] "Publicer nu" button present

#### 3.2 Queue Tab (Kø & Planlagt)
- [ ] Saved drafts appear in list
- [ ] Each item shows: content preview, platforms, status badge, created date
- [ ] "Publicer" button on each draft
- [ ] "Slet" button on each draft
- [ ] Deleting a draft removes it from list

#### 3.3 History Tab (Historik)
- [ ] Published posts shown (or empty state message)
- [ ] Each shows: content, platforms, result per platform, timestamps

#### 3.4 Accounts Tab (Konti)
- [ ] Platform connection cards shown (Instagram, Facebook, YouTube, TikTok)
- [ ] Each shows connect/disconnect status
- [ ] OAuth connect buttons present

---

### 4. User Management (`/admin/users`)

- [ ] User list loads with table
- [ ] Columns: email, profile type, created date
- [ ] Users count matches dashboard stat
- [ ] Role filter works (if present)
- [ ] Search works (if present)

---

### 5. Admin Settings (`/admin/settings`)

- [ ] Tab navigation: AI & Indhold, Sociale Medier, Hosting & Email, SEO & Sikkerhed
- [ ] AI tab: OpenAI API key (masked), model selector (kun GPT 5.x), Kie.ai key
- [ ] AI tab → AI Prompts: Chat system prompts (DA/EN/SE), article prompt, image generation prompt
- [ ] AI tab → Kostplan AI: Separate mealplan OpenAI key + model (fallback til generel AI config)
- [ ] AI tab → Kostplan Email (SMTP): Host, port, user, password, from email, from name
- [ ] Social tab: Profile links (Instagram, YouTube, TikTok, Facebook URLs), Social Publisher quick link
- [ ] Hosting tab: FTP host, username, password + generel SMTP settings
- [ ] SEO tab: Site URL, site name, meta description, Google verification, GA measurement ID, robots disallow
- [ ] Save button works and shows confirmation toast
- [ ] Back link goes to `/admin`

---

### 6. Content Management Quick Checks

#### 6.1 Admin Blog (`/admin/blog`)
- [ ] Article list loads
- [ ] "New" button creates new article form
- [ ] Language tabs (DA/EN/SE) switch content
- [ ] Social Share button visible on published articles

#### 6.2 Admin Recipes (`/admin/recipes`)
- [ ] Recipe list loads
- [ ] "New" button creates new recipe form
- [ ] Language tabs work
- [ ] Social Share button visible on published recipes

#### 6.3 Admin Guides (`/admin/guides`)
- [ ] Guide list loads
- [ ] Create/edit form works

---

### 7. Page Editors Quick Checks

- [ ] Homepage editor (`/admin/homepage`) loads with sections
- [ ] About editor (`/admin/about`) loads with sections
- [ ] Privacy editor (`/admin/privacy`) loads with sections
- [ ] Terms editor (`/admin/terms`) loads with sections

---

### 8. Meal Plan Generation (Admin/CRM context)

- [ ] Admin can generate meal plans for coaching clients from CRM
- [ ] Generated meal plan stored in `generated_meal_plans` table
- [ ] PDF generated and uploaded via SFTP to one.com
- [ ] Email sent to client via separate mealplan SMTP (`meal@shiftingsource.com`)
- [ ] Generation history visible in admin/CRM interface

---

### 9. Email System

- [ ] SMTP settings configurable in Admin → Settings → Hosting & Email
- [ ] Mealplan-specific SMTP configurable in Admin → Settings → AI & Indhold → Kostplan Email
- [ ] Email sends tracked (check `email_sends` table for logs)
- [ ] No Resend API usage — all email via SMTP (one.com)

---

### 10. Console & Network Errors

After visiting all admin pages, check:
- [ ] No JavaScript errors on `/admin`
- [ ] No JavaScript errors on `/admin/crm`
- [ ] No JavaScript errors on `/admin/crm/:userId` (lead detail)
- [ ] No JavaScript errors on `/admin/social-publisher`
- [ ] No JavaScript errors on `/admin/settings`
- [ ] No JavaScript errors on `/admin/blog`
- [ ] No JavaScript errors on `/admin/recipes`
- [ ] No JavaScript errors on `/mealplan` (meal plan wizard)
- [ ] No failed network requests (401, 500 errors)
- [ ] No CORS errors on Edge Function calls

---

## Reporting

After completing all checks, provide a summary:

```
## CRM QA Report — Shifting Source
Date: [date]

### Summary
- Total checks: X
- Passed: X
- Failed: X
- Skipped: X

### Issues Found
1. [Page] — [Description of issue] — [Severity: Critical/Major/Minor]
2. ...

### Recommendations
- [Any improvements noticed during testing]
```

Severity guide:
- **Critical**: Page won't load, data loss, security issue, broken CRUD
- **Major**: Feature broken, layout severely broken, wrong data displayed
- **Minor**: Visual glitch, typo, minor UI inconsistency
