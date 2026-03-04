/**
 * CRM Supabase API Adapter
 * Replaces all Express/SQLite fetch() calls with direct Supabase queries.
 * Exposes a global `CRM` object used by all CRM HTML pages.
 *
 * Depends on: supabase-config.js (must be loaded first)
 */

window.CRM = (function () {
  // ─── Internal helpers ───────────────────────────────────────

  function sb() {
    const client = window.getSupabase()
    if (!client) throw new Error('Supabase not initialized')
    return client
  }

  // ─── Auth ───────────────────────────────────────────────────

  const auth = {
    /** Send magic link (OTP) to email */
    async login(email) {
      const { error } = await sb().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false }
      })
      if (error) throw error
      return { success: true }
    },

    /** Get current authenticated user + profile */
    async getUser() {
      const { data: { user }, error } = await sb().auth.getUser()
      if (error || !user) return null

      // Fetch profile + admin status
      const { data: profile } = await sb()
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      const { data: crmUser } = await sb()
        .from('crm_users')
        .select('role, name')
        .eq('profile_id', user.id)
        .single()

      return {
        id: user.id,
        email: user.email,
        name: crmUser?.name || profile?.name || user.email,
        role: crmUser?.role || 'viewer',
        language: profile?.language || 'da',
        isAdmin: crmUser?.role === 'admin',
      }
    },

    /** Logout */
    async logout() {
      await sb().auth.signOut()
    },

    /** Listen for auth state changes */
    onAuthStateChange(callback) {
      return sb().auth.onAuthStateChange(callback)
    },
  }

  // ─── Leads ──────────────────────────────────────────────────

  const leads = {
    /** Get all leads with profile data (replaces /api/admin/leads) */
    async getAll() {
      const { data, error } = await sb()
        .from('lead_status')
        .select(`
          *,
          profile:profiles!lead_status_user_id_profiles_fkey (
            id, email, name, language, age, gender, height, weight,
            activity_level, weight_goal, daily_calories, tdee, bmr,
            meals_per_day, prep_time, diet_type, excluded_ingredients,
            newsletter_consent, marketing_consent, coaching_contact_consent,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map to the format the old CRM expects
      return (data || []).map(lead => {
        const p = lead.profile || {}
        return {
          id: lead.user_id,
          email: p.email || '',
          name: p.name || null,
          language: p.language || 'da',
          age: p.age || null,
          gender: p.gender || null,
          height: p.height || null,
          weight: p.weight || null,
          activity: p.activity_level || null,
          weight_goal: p.weight_goal || null,
          daily_calories: p.daily_calories || null,
          tdee: p.tdee || null,
          bmr: p.bmr || null,
          meals_per_day: p.meals_per_day || 3,
          prep_time: p.prep_time || 'medium',
          diet_type: p.diet_type || null,
          excluded_ingredients: p.excluded_ingredients || '',
          gdpr_consent: p.newsletter_consent || p.marketing_consent || p.coaching_contact_consent,
          status: lead.status,
          lead_score: lead.lead_score,
          source: lead.source,
          assigned_to: lead.assigned_to,
          notes: lead.notes,
          last_contact_date: lead.last_contact_date,
          follow_up_date: lead.follow_up_date,
          created_at: p.created_at || lead.created_at,
          // Keep raw profile for detail views
          _profile: p,
          _lead: lead,
        }
      })
    },

    /** Get a single lead by user_id (replaces /api/admin/leads/:id) */
    async getById(userId) {
      const { data: lead, error: leadErr } = await sb()
        .from('lead_status')
        .select('*')
        .eq('user_id', userId)
        .single()

      const { data: profile } = await sb()
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      const { data: consentLog } = await sb()
        .from('consent_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      const { data: activityLog } = await sb()
        .from('lead_activity')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (leadErr) throw leadErr

      const p = profile || {}
      return {
        id: userId,
        email: p.email || '',
        name: p.name || null,
        language: p.language || 'da',
        age: p.age || null,
        gender: p.gender || null,
        height: p.height || null,
        weight: p.weight || null,
        activity: p.activity_level || null,
        weight_goal: p.weight_goal || null,
        daily_calories: p.daily_calories || null,
        tdee: p.tdee || null,
        bmr: p.bmr || null,
        meals_per_day: p.meals_per_day || 3,
        prep_time: p.prep_time || 'medium',
        num_days: p.num_days || 7,
        leftovers: p.leftovers || false,
        diet_type: p.diet_type || null,
        excludedIngredients: p.excluded_ingredients ? (Array.isArray(p.excluded_ingredients) ? p.excluded_ingredients : String(p.excluded_ingredients).split(',').map(s => s.trim()).filter(Boolean)) : [],
        gdpr_consent: p.newsletter_consent || p.marketing_consent || p.coaching_contact_consent,
        admin_comments: lead?.notes || '',
        last_contact_date: lead?.last_contact_date || null,
        status: lead?.status || 'new',
        lead_score: lead?.lead_score || 0,
        source: lead?.source || 'website_signup',
        created_at: p.created_at || lead?.created_at,
        consentLog: consentLog || [],
        activityLog: activityLog || [],
        _profile: p,
        _lead: lead,
      }
    },

    /** Get leads assigned to current user (replaces /api/my-leads) */
    async getMyLeads(adminUserId) {
      const { data, error } = await sb()
        .from('lead_status')
        .select('user_id')
        .eq('assigned_to', adminUserId)

      if (error) throw error
      return { leads: (data || []).map(l => ({ id: l.user_id })) }
    },

    /** Get unassigned leads (replaces /api/leads/unassigned) */
    async getUnassigned() {
      const { data, error } = await sb()
        .from('lead_status')
        .select('user_id')
        .is('assigned_to', null)

      if (error) throw error
      return { leads: (data || []).map(l => ({ id: l.user_id })) }
    },

    /** Update lead status */
    async updateStatus(userId, newStatus, adminId, notes) {
      const { error } = await sb()
        .from('lead_status')
        .update({
          status: newStatus,
          last_contact_date: new Date().toISOString(),
        })
        .eq('user_id', userId)

      if (error) throw error

      await sb().from('lead_activity').insert({
        user_id: userId,
        activity_type: 'status_changed',
        activity_details: { new_status: newStatus },
        created_by: adminId || null,
        notes: notes || null,
      })
    },

    /** Save admin comments (replaces /api/admin/update-comments/:id) */
    async saveComments(userId, comments) {
      const { error } = await sb()
        .from('lead_status')
        .update({ notes: comments })
        .eq('user_id', userId)

      if (error) throw error
    },

    /** Update last contact date (replaces /api/admin/update-last-contact/:id) */
    async updateLastContact(userId, date) {
      const { error } = await sb()
        .from('lead_status')
        .update({ last_contact_date: date })
        .eq('user_id', userId)

      if (error) throw error
    },

    /** Add a note to lead activity */
    async addNote(userId, note, adminId) {
      const { error } = await sb().from('lead_activity').insert({
        user_id: userId,
        activity_type: 'note_added',
        activity_details: {},
        created_by: adminId || null,
        notes: note,
      })
      if (error) throw error
    },

    /** Get lead assignment info */
    async getAssignment(userId) {
      const { data, error } = await sb()
        .from('lead_status')
        .select('assigned_to, assigned_at')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data || {}
    },

    /** Assign a lead to a coach/user */
    async assignTo(userId, coachId) {
      const { error } = await sb()
        .from('lead_status')
        .update({ assigned_to: coachId, assigned_at: new Date().toISOString() })
        .eq('user_id', userId)
      if (error) throw error
    },

    /** Get notes for a specific lead */
    async getNotes(userId) {
      const { data, error } = await sb()
        .from('lead_activity')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_type', 'note_added')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },

    /** Delete a lead activity note */
    async deleteNote(noteId) {
      const { error } = await sb()
        .from('lead_activity')
        .delete()
        .eq('id', noteId)
      if (error) throw error
    },

    /** Create a new lead (profile + lead_status) */
    async createLead(data) {
      // Call the SECURITY DEFINER function that creates auth.users + profile + lead_status
      const { data: newUserId, error } = await sb().rpc('admin_create_lead', {
        p_email: data.email,
        p_name: data.name || null,
        p_gender: data.gender || null,
        p_age: data.age ? parseInt(data.age) : null,
        p_height: data.height ? parseFloat(data.height) : null,
        p_weight: data.weight ? parseFloat(data.weight) : null,
        p_language: data.language || 'da',
        p_gdpr_consent: data.gdpr_consent || false,
        p_source: data.source || 'manual',
      })
      if (error) throw error

      return { id: newUserId, email: data.email, name: data.name }
    },
  }

  // ─── Coaching ───────────────────────────────────────────────

  const coaching = {
    /** Get all active coaching clients (replaces /api/admin/coaching-clients) */
    async getAll() {
      const { data, error } = await sb()
        .from('coaching_clients')
        .select(`
          *,
          profile:profiles!coaching_clients_profile_id_fkey (
            id, email, name, language, age, gender, weight,
            weight_goal, daily_calories, activity_level, created_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Map to old format
      return {
        clients: (data || []).map(c => {
          const p = c.profile || {}
          return {
            id: c.id,
            lead_id: c.profile_id,
            email: p.email || '',
            name: p.name || null,
            weight: p.weight || null,
            weight_goal: p.weight_goal || null,
            daily_calories: p.daily_calories || null,
            age: p.age || null,
            language: p.language || 'da',
            start_date: c.start_date || c.created_at,
            status: c.status,
            check_in_frequency: c.check_in_frequency,
            coach_name: c.assigned_coach || null,
            notes: c.notes,
            _raw: c,
          }
        })
      }
    },

    /** Check if lead has active coaching (replaces /api/admin/check-coaching/:id) */
    async checkActive(userId) {
      const { data, error } = await sb()
        .from('coaching_clients')
        .select('id, status')
        .eq('profile_id', userId)
        .eq('status', 'active')
        .limit(1)

      if (error) throw error
      return { hasActiveCoaching: (data && data.length > 0), coachingData: data?.[0] || null }
    },

    /** Activate coaching for a lead (replaces /api/admin/activate-coaching/:id) */
    async activate(userId, opts = {}) {
      // Check existing
      const { data: existing } = await sb()
        .from('coaching_clients')
        .select('id, status')
        .eq('profile_id', userId)
        .limit(1)

      if (existing && existing.length > 0) {
        // Reactivate
        await sb()
          .from('coaching_clients')
          .update({
            status: 'active',
            start_date: new Date().toISOString().split('T')[0],
            end_date: null,
            check_in_frequency: opts.checkInFrequency || 'weekly',
            notes: opts.notes || null,
          })
          .eq('id', existing[0].id)
      } else {
        // Create new
        await sb().from('coaching_clients').insert({
          profile_id: userId,
          status: 'active',
          check_in_frequency: opts.checkInFrequency || 'weekly',
          notes: opts.notes || null,
        })
      }

      // Update lead status
      await leads.updateStatus(userId, 'coaching_active', opts.adminId, 'Coaching activated')

      // Update profile type
      await sb()
        .from('profiles')
        .update({ profile_type: 'coaching' })
        .eq('id', userId)

      // Log activity
      await sb().from('lead_activity').insert({
        user_id: userId,
        activity_type: 'coaching_activated',
        activity_details: { frequency: opts.checkInFrequency || 'weekly' },
        created_by: opts.adminId || null,
      })
    },

    /** Get check-ins for a coaching client */
    async getCheckins(clientId) {
      const { data, error } = await sb()
        .from('weekly_checkins')
        .select('*')
        .eq('coaching_client_id', clientId)
        .order('check_in_date', { ascending: false })

      if (error) throw error
      return data || []
    },
  }

  // ─── Check-ins ──────────────────────────────────────────────

  const checkins = {
    /** Get all check-ins (replaces /api/admin/checkins) */
    async getAll() {
      const { data, error } = await sb()
        .from('weekly_checkins')
        .select(`
          *,
          coaching_client:coaching_clients (
            profile_id,
            profile:profiles!coaching_clients_profile_id_fkey (
              email, name
            )
          )
        `)
        .order('check_in_date', { ascending: false })

      if (error) throw error
      return data || []
    },

    /** Create a new check-in */
    async create(data) {
      const { error } = await sb()
        .from('weekly_checkins')
        .insert(data)

      if (error) throw error
    },
  }

  // ─── Emails ─────────────────────────────────────────────────

  const emails = {
    /** Get email templates (replaces /api/email-templates) */
    async getTemplates() {
      const { data, error } = await sb()
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },

    /** Get email send history, optionally for a specific lead */
    async getHistory(userId) {
      let query = sb()
        .from('email_sends')
        .select('*')
        .order('created_at', { ascending: false })
      if (userId) {
        query = query.eq('user_id', userId)
      }
      const { data, error } = await query
      if (error) throw error
      return data || []
    },
  }

  // ─── Stats ──────────────────────────────────────────────────

  const stats = {
    /** Get CRM dashboard stats */
    async dashboard() {
      const now = new Date()
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

      const [totalRes, newRes, qualifiedRes, coachingRes] = await Promise.all([
        sb().from('lead_status').select('id', { count: 'exact', head: true }),
        sb().from('lead_status').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
        sb().from('lead_status').select('id', { count: 'exact', head: true }).eq('status', 'qualified'),
        sb().from('lead_status').select('id', { count: 'exact', head: true }).eq('status', 'coaching_active'),
      ])

      return {
        totalLeads: totalRes.count || 0,
        newThisWeek: newRes.count || 0,
        qualified: qualifiedRes.count || 0,
        activeCoaching: coachingRes.count || 0,
      }
    },
  }

  // ─── CRM Users ──────────────────────────────────────────────

  const users = {
    /** Get all CRM users (replaces /api/crm-users) */
    async getAll() {
      const { data, error } = await sb()
        .from('crm_users')
        .select(`
          *,
          profile:profiles!crm_users_profile_id_fkey (
            email, name
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
  }

  // ─── Notes ──────────────────────────────────────────────────

  const notes = {
    /** Get all notes */
    async getAll() {
      const { data, error } = await sb()
        .from('crm_notes')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },

    /** Create a new note */
    async create(data) {
      const { error } = await sb()
        .from('crm_notes')
        .insert({
          title: data.title,
          content: data.content,
          category: data.category || null,
          priority: data.priority || 'medium',
          lead_id: data.lead_id || null,
          created_by: data.created_by || null,
        })

      if (error) throw error
    },

    /** Update a note */
    async update(id, data) {
      const { error } = await sb()
        .from('crm_notes')
        .update({
          title: data.title,
          content: data.content,
          category: data.category,
          priority: data.priority,
          lead_id: data.lead_id,
        })
        .eq('id', id)

      if (error) throw error
    },

    /** Delete a note */
    async delete(id) {
      const { error } = await sb()
        .from('crm_notes')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
  }

  // ─── Settings ───────────────────────────────────────────────

  const settings = {
    /** Get a single setting by key */
    async get(key) {
      const { data, error } = await sb()
        .from('crm_settings')
        .select('value')
        .eq('key', key)
        .single()

      if (error) return null
      return data?.value || null
    },

    /** Set a setting (upsert) */
    async set(key, value) {
      const { error } = await sb()
        .from('crm_settings')
        .upsert(
          { key, value },
          { onConflict: 'key' }
        )

      if (error) throw error
    },

    /** Get all settings */
    async getAll() {
      const { data, error } = await sb()
        .from('crm_settings')
        .select('*')

      if (error) throw error
      return data || []
    },
  }

  // ─── Email Automation ───────────────────────────────────────

  const emailAutomation = {
    /** Get email automation settings from dedicated table */
    async getSettings() {
      const { data, error } = await sb()
        .from('email_automation_settings')
        .select('*')
        .eq('automation_type', 'checkin_reminder')
        .single()

      if (error && error.code !== 'PGRST116') {
        // Fallback to admin_settings if table doesn't exist yet
        const settingsJson = await settings.get('email_automation_settings')
        return settingsJson ? JSON.parse(settingsJson) : { enabled: false, frequency_days: 7, grace_days: 2, auto_pause_enabled: true, sender_mode: 'coach', email_provider: 'resend' }
      }

      return data || { enabled: false, frequency_days: 7, grace_days: 2, auto_pause_enabled: true, sender_mode: 'coach', email_provider: 'resend' }
    },

    /** Save email automation settings */
    async saveSettings(automationSettings) {
      const { error } = await sb()
        .from('email_automation_settings')
        .upsert({
          automation_type: automationSettings.automationType || 'checkin_reminder',
          enabled: automationSettings.enabled,
          frequency_days: automationSettings.frequency_days,
          grace_days: automationSettings.grace_days || 2,
          auto_pause_enabled: automationSettings.auto_pause_enabled !== false,
          sender_mode: automationSettings.sender_mode || 'coach',
          custom_from_email: automationSettings.custom_from_email || null,
          custom_from_name: automationSettings.custom_from_name || null,
          email_provider: automationSettings.email_provider || 'resend',
          provider_config: automationSettings.provider_config || {},
          last_run: automationSettings.last_run,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'automation_type' })

      if (error) {
        // Fallback to admin_settings
        await settings.set('email_automation_settings', JSON.stringify(automationSettings))
      }
    },

    /** Get all clients with automation fields + last check-in date */
    async getClients() {
      const { data, error } = await sb()
        .from('coaching_clients')
        .select(`
          *,
          profile:profiles!coaching_clients_profile_id_fkey (
            id, email, name, language, age, gender, weight,
            weight_goal, daily_calories, activity_level, created_at
          )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Fetch last check-in for each client
      const clientIds = (data || []).map(c => c.id)
      let checkinMap = {}

      if (clientIds.length > 0) {
        const { data: checkins } = await sb()
          .from('weekly_checkins')
          .select('coaching_client_id, created_at')
          .in('coaching_client_id', clientIds)
          .order('created_at', { ascending: false })

        // Build map: client_id → most recent check-in date
        for (const ci of (checkins || [])) {
          if (!checkinMap[ci.coaching_client_id]) {
            checkinMap[ci.coaching_client_id] = ci.created_at
          }
        }
      }

      return {
        clients: (data || []).map(c => {
          const p = c.profile || {}
          return {
            id: c.id,
            lead_id: c.profile_id,
            email: p.email || '',
            name: p.name || null,
            weight: p.weight || null,
            weight_goal: p.weight_goal || null,
            daily_calories: p.daily_calories || null,
            age: p.age || null,
            language: p.language || 'da',
            start_date: c.start_date || c.created_at,
            status: c.status,
            check_in_frequency: c.check_in_frequency,
            coach_name: c.assigned_coach || null,
            notes: c.notes,
            lastCheckinDate: checkinMap[c.id] || null,
            _raw: c,
          }
        })
      }
    },

    /** Run check-in reminder flow via Edge Function */
    async run() {
      try {
        const supabaseUrl = window.SUPABASE_URL || 'https://hllprmlkuchhfmexzpad.supabase.co'
        const { data: { session } } = await sb().auth.getSession()
        if (!session) throw new Error('Not authenticated')

        const response = await fetch(`${supabaseUrl}/functions/v1/run-checkin-flow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ manual: true }),
        })

        if (!response.ok) {
          const err = await response.json().catch(() => ({}))
          throw new Error(err.error || `Edge Function error: ${response.status}`)
        }

        const result = await response.json()

        // Update last_run timestamp
        await sb()
          .from('email_automation_settings')
          .update({ last_run: new Date().toISOString() })
          .eq('automation_type', 'checkin_reminder')

        return {
          success: true,
          ...result,
        }
      } catch (err) {
        console.error('Run automation error:', err)
        return {
          success: false,
          message: err.message || 'Fejl ved kørsel af automation'
        }
      }
    },
  }

  // ─── Email Send ─────────────────────────────────────────────

  const emailSend = {
    /** Send an email and log to database */
    async send(to, subject, message, opts = {}) {
      // Log to email log table
      const { error } = await sb()
        .from('crm_email_log')
        .insert({
          to_address: to,
          subject: subject,
          message: message,
          template_id: opts.templateId || null,
          sent_by: opts.sentBy || null,
          status: 'pending',
          notes: 'Actual SMTP sending requires server-side Edge Function',
        })

      if (error) throw error

      return {
        success: true,
        message: 'Email logged. Actual SMTP sending requires server-side Edge Function.'
      }
    },
  }

  // ─── Meal Plans ─────────────────────────────────────────────

  const mealPlans = {
    /** Get all meal plans */
    async getAll() {
      const { data, error } = await sb()
        .from('meal_plans')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },

    /** Get meal plan statistics */
    async getStats() {
      const { data, error: countErr } = await sb()
        .from('meal_plans')
        .select('id, total_cost', { count: 'exact' })

      if (countErr) throw countErr

      const totalCost = (data || []).reduce((sum, plan) => sum + (plan.total_cost || 0), 0)

      return {
        totalPlans: data?.length || 0,
        totalCost: totalCost,
        averageCost: data?.length ? totalCost / data.length : 0,
      }
    },

    /** Get meal plans for a specific user */
    async getByUserId(userId) {
      const { data, error } = await sb()
        .from('meal_plans')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data || []
    },

    /** Save a generated meal plan to the database */
    async savePlan(profileId, planData, model, tokensUsed, totalCost) {
      const { data, error } = await sb()
        .from('meal_plans')
        .insert({
          profile_id: profileId,
          plan_data: planData,
          model_used: model,
          tokens_used: tokensUsed,
          total_cost: totalCost,
        })
        .select()
        .single()
      if (error) throw error
      return data
    },

    /**
     * Generate a keto meal plan via Supabase Edge Function (secure proxy).
     * API key is stored server-side as a Supabase secret — never sent to browser.
     * Model config is read from crm_settings.
     */
    async generate(leadData) {
      // 1. Read model config from settings
      const modelConfigRaw = await settings.get('model_config')
      let modelConfig = {}
      try { modelConfig = modelConfigRaw ? JSON.parse(modelConfigRaw) : {} } catch {}
      const model = modelConfig.model || 'gpt-4o-mini'
      const maxTokens = parseInt(modelConfig.maxTokens) || 16000
      const temperature = parseFloat(modelConfig.temperature) || 0.7

      // 2. Build prompt
      const prompt = mealPlans._buildPrompt(leadData)

      // 3. Build excluded-ingredients warning
      const excludedRaw = leadData.excluded_ingredients || ''
      let excludedParsed = ''
      try {
        const arr = typeof excludedRaw === 'string' ? JSON.parse(excludedRaw) : excludedRaw
        if (Array.isArray(arr) && arr.length) excludedParsed = arr.join(', ')
      } catch { excludedParsed = excludedRaw }
      const excludedWarning = excludedParsed
        ? `\n\nKRITISK REGEL: Klienten har allergier/præferencer. Du må ALDRIG bruge disse ingredienser: ${excludedParsed}. Brug alternativer i stedet!`
        : ''

      // 4. Build request body for the Edge Function
      const requestBody = {
        model,
        messages: [
          { role: 'system', content: `Du er en professionel keto ernæringsekspert og kok. Du laver personlige, detaljerede madplaner med nøjagtige opskrifter, ingredienslister og næringsværdier.${excludedWarning}` },
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: maxTokens,
      }
      if (model === 'gpt-5.1' || model === 'gpt-4o') {
        requestBody.temperature = temperature
      }

      // 5. Call Supabase Edge Function (API key stays server-side)
      const session = (await sb().auth.getSession()).data.session
      if (!session) throw new Error('Du skal være logget ind for at generere madplaner.')

      const res = await fetch(`${window.SUPABASE_URL}/functions/v1/generate-mealplan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': window.SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(requestBody),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Edge Function fejl (${res.status})`)
      }

      const completion = await res.json()
      const mealPlanText = completion.choices?.[0]?.message?.content || ''
      const usage = completion.usage || {}

      // 6. Calculate cost
      const cost = mealPlans._calcCost(model, usage)

      // 7. Save to database
      const saved = await mealPlans.savePlan(
        leadData.id,
        { text: mealPlanText, lead_email: leadData.email, lead_name: leadData.name },
        model,
        usage.total_tokens || 0,
        cost.total
      )

      return {
        success: true,
        mealPlan: mealPlanText,
        tokens: usage.total_tokens || 0,
        cost,
        model,
        savedId: saved.id,
      }
    },

    /** Build GPT prompt from lead data (internal) */
    _buildPrompt(ld) {
      const lang = { da: 'dansk', en: 'engelsk', se: 'svensk' }[ld.language] || 'dansk'
      const act = { sedentary: 'stillesiddende', light: 'let aktiv', moderate: 'moderat aktiv', active: 'meget aktiv', very_active: 'ekstrem aktiv' }[ld.activity] || ld.activity || 'moderat aktiv'
      const prep = { fast: 'hurtige retter (15-20 min)', medium: 'medium (20-40 min)', long: 'ingen tidsbegrænsning (40+ min)', mix: 'blandet' }[ld.prep_time] || ld.prep_time || 'blandet'
      const days = ld.num_days || 7
      const meals = ld.meals_per_day || 3
      const cal = ld.daily_calories || 2000
      const name = ld.name || 'Klient'

      let excl = 'ingen'
      if (ld.excluded_ingredients) {
        try {
          const p = typeof ld.excluded_ingredients === 'string' ? JSON.parse(ld.excluded_ingredients) : ld.excluded_ingredients
          if (Array.isArray(p) && p.length) excl = p.join(', ')
        } catch { excl = ld.excluded_ingredients }
      }

      return `Lav en personlig ${days}-dages keto madplan på ${lang}.

PERSON PROFIL:
- Navn: ${name}
- Køn: ${ld.gender === 'male' ? 'Mand' : ld.gender === 'female' ? 'Kvinde' : ld.gender || 'Ukendt'}
- Alder: ${ld.age || '?'} år
- Vægt: ${ld.weight || '?'} kg
- Højde: ${ld.height || '?'} cm
- Aktivitetsniveau: ${act}
- Dagligt kaloriebehov: ${cal} kcal
- Antal måltider per dag: ${meals}
- Tilberedningstid: ${prep}
- Leftovers: ${ld.leftovers ? 'Ja' : 'Nej'}
- Ekskluderede ingredienser: ${excl}

KRAV TIL MADPLANEN:
1. KETO MAKROER: Hver dag skal være ~70% fedt, ~25% protein, ~5% kulhydrat (max 20-30g netto karbs)
2. KALORIER: Total daglig skal være omkring ${cal} kcal (±50 kcal acceptabelt)
3. MÅLTIDER: ${meals} måltider per dag
4. SPROG: Skriv HELE madplanen på ${lang}
5. ANTAL DAGE: Du skal lave PRÆCIS ${days} dage. IKKE færre!
${excl !== 'ingen' ? `6. ⚠️ EKSKLUDEREDE INGREDIENSER: Du må ALDRIG bruge: ${excl}. Brug ALTID alternativer!` : ''}
${ld.leftovers ? `${excl !== 'ingen' ? '7' : '6'}. LEFTOVERS: Design aftenmadsopskrifter med ekstra portioner der kan bruges som frokost næste dag` : ''}

OUTPUT FORMAT:
# ${days}-Dages Keto Madplan for ${name}

## Uge Oversigt
[Kort introduktion]

## Indkøbsliste
[Komplet liste efter kategorier: Kød & Fisk, Grøntsager, Mejeriprodukter, Andet]

---

## Dag 1

### Morgenmad: [Navn] (XX min)
**Ingredienser:**
- [ingrediens] - [mængde]

**Tilberedning:**
1. [step-by-step]

**Næringsværdi:**
Kalorier: XX kcal | Protein: XX g | Fedt: XX g | Kulhydrat: XX g | Netto karbs: XX g

[Gentag for alle måltider og ALLE ${days} dage]

## Tips & Tricks
[3-5 praktiske keto tips]`
    },

    /** Calculate cost from token usage (internal) */
    _calcCost(model, usage) {
      const pricing = {
        'gpt-4o':      { input: 2.50,  output: 10.00 },
        'gpt-4o-mini': { input: 0.150, output: 0.600 },
        'gpt-5-mini':  { input: 0.150, output: 0.600 },
        'gpt-5-nano':  { input: 0.030, output: 0.120 },
        'gpt-5.1':     { input: 5.00,  output: 15.00 },
      }
      const p = pricing[model] || pricing['gpt-4o-mini']
      const inputCost  = ((usage.prompt_tokens || 0) / 1_000_000) * p.input
      const outputCost = ((usage.completion_tokens || 0) / 1_000_000) * p.output
      return { input: +inputCost.toFixed(6), output: +outputCost.toFixed(6), total: +(inputCost + outputCost).toFixed(6) }
    },
  }

  // ─── Public API ─────────────────────────────────────────────

  return { auth, leads, coaching, checkins, emails, stats, users, notes, settings, emailAutomation, emailSend, mealPlans }
})()
