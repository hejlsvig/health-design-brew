/**
 * Edge Function: run-checkin-flow
 *
 * Automated check-in reminder pipeline:
 * 1. Check each active coaching client's last check-in
 * 2. If overdue + grace period passed → send reminder email
 * 3. If already reminded and still no check-in → pause + flag
 *
 * Sender modes:
 *   - "coach"   → email comes from the logged-in CRM user (personal)
 *   - "noreply"  → email comes from FROM_EMAIL env var (system)
 *   - "custom"   → email comes from custom_from_email in settings
 *
 * Email providers:
 *   - "resend"  → Resend API (default, low-volume)
 *   - "klaviyo"  → Klaviyo transactional (future, high-volume)
 *   - "smtp"     → Generic SMTP relay (future)
 */

import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const NOREPLY_EMAIL = Deno.env.get('FROM_EMAIL') || 'noreply@shiftingsource.com'
const NOREPLY_NAME = Deno.env.get('FROM_NAME') || 'Shifting Source'

// ─── Email provider abstraction ─────────────────────────────────
interface EmailPayload {
  from: string       // "Name <email>"
  to: string
  subject: string
  html: string
}

async function sendViaResend(payload: EmailPayload): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.log(`[DRY RUN] Would send: ${payload.from} → ${payload.to}: "${payload.subject}"`)
    return true
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: payload.from,
      to: [payload.to],
      subject: payload.subject,
      html: payload.html,
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    console.error(`Resend failed for ${payload.to}:`, err)
    return false
  }

  console.log(`Resend OK: ${payload.from} → ${payload.to}`)
  return true
}

async function sendViaKlaviyo(payload: EmailPayload, _config: Record<string, unknown>): Promise<boolean> {
  // Future: implement Klaviyo transactional API
  // https://developers.klaviyo.com/en/reference/send_transactional_email
  console.log(`[KLAVIYO NOT YET IMPLEMENTED] Would send: ${payload.from} → ${payload.to}`)
  console.log('Falling back to Resend...')
  return sendViaResend(payload)
}

async function sendEmail(
  provider: string,
  payload: EmailPayload,
  providerConfig: Record<string, unknown> = {},
): Promise<boolean> {
  switch (provider) {
    case 'klaviyo':
      return sendViaKlaviyo(payload, providerConfig)
    case 'resend':
    default:
      return sendViaResend(payload)
  }
}

// ─── Main handler ───────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Identify the coach (CRM user) who triggered the flow ──
    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user } } = await userClient.auth.getUser()

    let coachEmail = NOREPLY_EMAIL
    let coachName = NOREPLY_NAME

    if (user) {
      const { data: crmUser } = await supabase
        .from('crm_users')
        .select('email, name')
        .eq('id', user.id)
        .single()

      if (crmUser) {
        coachEmail = crmUser.email
        coachName = crmUser.name
      }
    }

    // ── 1. Load flow settings ──
    const { data: flowSettings } = await supabase
      .from('email_automation_settings')
      .select('*')
      .eq('automation_type', 'checkin_reminder')
      .single()

    if (!flowSettings || !flowSettings.enabled) {
      return new Response(
        JSON.stringify({ success: true, message: 'Flow is disabled', stats: { ok: 0, reminded: 0, flagged: 0 } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const frequencyDays = flowSettings.frequency_days || 7
    const graceDays = flowSettings.grace_days || 2
    const autoPauseEnabled = flowSettings.auto_pause_enabled !== false
    const senderMode: string = flowSettings.sender_mode || 'coach'
    const emailProvider: string = flowSettings.email_provider || 'resend'
    const providerConfig: Record<string, unknown> = flowSettings.provider_config || {}

    // ── Determine "from" address based on sender_mode ──
    let fromEmail: string
    let fromName: string

    switch (senderMode) {
      case 'noreply':
        fromEmail = NOREPLY_EMAIL
        fromName = NOREPLY_NAME
        break
      case 'custom':
        fromEmail = flowSettings.custom_from_email || NOREPLY_EMAIL
        fromName = flowSettings.custom_from_name || NOREPLY_NAME
        break
      case 'coach':
      default:
        fromEmail = coachEmail
        fromName = coachName
        break
    }

    // ── 2. Load active coaching clients with reminders enabled ──
    const { data: clients, error: clientsError } = await supabase
      .from('coaching_clients')
      .select(`
        id, profile_id, reminder_status, last_checkin_reminder_sent,
        reminder_frequency_days, checkin_reminders_enabled,
        profile:profiles!coaching_clients_profile_id_fkey (
          id, email, name, language
        )
      `)
      .eq('status', 'active')
      .eq('checkin_reminders_enabled', true)

    if (clientsError) throw clientsError

    const now = new Date()
    const stats = { ok: 0, reminded: 0, flagged: 0, emailsSent: 0, errors: [] as string[] }

    for (const client of (clients || [])) {
      try {
        const profile = client.profile as any
        if (!profile?.email) continue

        const clientFreq = client.reminder_frequency_days || frequencyDays
        const deadlineMs = (clientFreq + graceDays) * 24 * 60 * 60 * 1000

        // ── Get last check-in for this client ──
        const { data: lastCheckin } = await supabase
          .from('weekly_checkins')
          .select('created_at')
          .eq('coaching_client_id', client.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        const lastCheckinDate = lastCheckin ? new Date(lastCheckin.created_at) : null
        const timeSinceCheckin = lastCheckinDate ? now.getTime() - lastCheckinDate.getTime() : Infinity
        const isOverdue = timeSinceCheckin > deadlineMs

        if (!isOverdue) {
          // ── CHECK-IN OK → reset if needed ──
          if (client.reminder_status !== 'none') {
            await supabase
              .from('coaching_clients')
              .update({ reminder_status: 'none', flagged_at: null, flag_reason: null })
              .eq('id', client.id)
          }
          stats.ok++
          continue
        }

        // ── OVERDUE ──
        if (client.reminder_status === 'none' || !client.reminder_status) {
          // Step 2: Send reminder email
          const emailPayload = buildReminderEmail(profile, fromEmail, fromName, senderMode)

          const emailSent = await sendEmail(emailProvider, emailPayload, providerConfig)

          await supabase
            .from('coaching_clients')
            .update({
              reminder_status: 'reminded',
              last_checkin_reminder_sent: now.toISOString(),
            })
            .eq('id', client.id)

          await supabase
            .from('crm_email_log')
            .insert({
              coaching_client_id: client.id,
              user_id: client.profile_id,
              email_address: profile.email,
              email_type: 'checkin_reminder',
              subject: emailPayload.subject,
              status: emailSent ? 'sent' : 'failed',
              metadata: {
                flow: 'checkin_reminder',
                step: 'remind',
                sender_mode: senderMode,
                provider: emailProvider,
                from: emailPayload.from,
              },
            })

          if (emailSent) stats.emailsSent++
          stats.reminded++

        } else if (client.reminder_status === 'reminded' && autoPauseEnabled) {
          // Step 3: Already reminded, still no check-in → flag + pause
          await supabase
            .from('coaching_clients')
            .update({
              reminder_status: 'flagged',
              checkin_reminders_enabled: false,
              flagged_at: now.toISOString(),
              flag_reason: 'Ingen check-in efter reminder',
            })
            .eq('id', client.id)

          await supabase
            .from('crm_email_log')
            .insert({
              coaching_client_id: client.id,
              user_id: client.profile_id,
              email_address: profile.email,
              email_type: 'checkin_auto_flagged',
              subject: 'Klient auto-pauseret',
              status: 'sent',
              metadata: { flow: 'checkin_reminder', step: 'flag', reason: 'No response after reminder' },
            })

          stats.flagged++
        } else {
          stats.reminded++
        }
      } catch (clientErr) {
        const errMsg = `Client ${client.id}: ${(clientErr as Error).message}`
        console.error(errMsg)
        stats.errors.push(errMsg)
      }
    }

    // Update last_run
    await supabase
      .from('email_automation_settings')
      .update({ last_run: now.toISOString() })
      .eq('automation_type', 'checkin_reminder')

    return new Response(
      JSON.stringify({
        success: true,
        message: `Flow completed: ${stats.ok} OK, ${stats.reminded} reminded, ${stats.flagged} flagged, ${stats.emailsSent} emails sent`,
        stats,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    console.error('Flow error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// ─── Email template builder ─────────────────────────────────────
function buildReminderEmail(
  profile: any,
  fromEmail: string,
  fromName: string,
  senderMode: string,
): EmailPayload {
  const name = profile.name || 'der'
  const lang = profile.language || 'da'
  const isPersonal = senderMode === 'coach'

  const subjects: Record<string, string> = {
    da: 'Husk din ugentlige check-in',
    en: 'Remember your weekly check-in',
    se: 'Kom ihåg din veckovisa check-in',
  }

  // Personal tone ("Jeg har…") vs. system tone ("Vi har…")
  const bodies: Record<string, string> = isPersonal
    ? {
        da: `<p>Hej ${name},</p>
<p>Jeg har bemærket at din ugentlige check-in ikke er indsendt endnu. Det tager kun et par minutter og hjælper mig med at følge din fremgang.</p>
<p>Log ind og udfyld dit check-in skema så jeg kan støtte dig bedst muligt.</p>
<p>Med venlig hilsen,<br>${fromName}</p>`,
        en: `<p>Hi ${name},</p>
<p>I noticed your weekly check-in hasn't been submitted yet. It only takes a few minutes and helps me track your progress.</p>
<p>Log in and complete your check-in form so I can support you best.</p>
<p>Best regards,<br>${fromName}</p>`,
        se: `<p>Hej ${name},</p>
<p>Jag har märkt att din veckovisa check-in inte har skickats in ännu. Det tar bara ett par minuter och hjälper mig att följa din framsteg.</p>
<p>Logga in och fyll i ditt check-in-formulär så att jag kan stödja dig på bästa sätt.</p>
<p>Med vänliga hälsningar,<br>${fromName}</p>`,
      }
    : {
        da: `<p>Hej ${name},</p>
<p>Vi har bemærket at din ugentlige check-in ikke er indsendt endnu. Det tager kun et par minutter og hjælper os med at følge din fremgang.</p>
<p>Log ind og udfyld dit check-in skema så vi kan støtte dig bedst muligt.</p>
<p>Med venlig hilsen,<br>${fromName}</p>`,
        en: `<p>Hi ${name},</p>
<p>We noticed your weekly check-in hasn't been submitted yet. It only takes a few minutes and helps us track your progress.</p>
<p>Log in and complete your check-in form so we can support you best.</p>
<p>Best regards,<br>${fromName}</p>`,
        se: `<p>Hej ${name},</p>
<p>Vi har märkt att din veckovisa check-in inte har skickats in ännu. Det tar bara ett par minuter och hjälper oss att följa din framsteg.</p>
<p>Logga in och fyll i ditt check-in-formulär så att vi kan stödja dig på bästa sätt.</p>
<p>Med vänliga hälsningar,<br>${fromName}</p>`,
      }

  return {
    from: `${fromName} <${fromEmail}>`,
    to: profile.email,
    subject: subjects[lang] || subjects.da,
    html: bodies[lang] || bodies.da,
  }
}
