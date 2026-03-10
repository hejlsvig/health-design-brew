// deno-lint-ignore-file no-explicit-any
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const {
      coaching_client_id,
      coach_id,
      custom_message,
      language,
    } = await req.json()

    if (!coaching_client_id || !coach_id) {
      return new Response(
        JSON.stringify({ error: 'coaching_client_id and coach_id are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Get coach SMTP details from crm_users
    const { data: coach, error: coachErr } = await supabase
      .from('crm_users')
      .select('sender_email, sender_name, smtp_password, email_footer, email_logo')
      .eq('id', coach_id)
      .single()

    if (coachErr || !coach) {
      return new Response(
        JSON.stringify({ error: 'Coach not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Get coaching client + profile
    const { data: client, error: clientErr } = await supabase
      .from('coaching_clients')
      .select('id, profile_id, check_in_frequency, profiles (id, name, email, language)')
      .eq('id', coaching_client_id)
      .single()

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ error: 'Coaching client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const profile = (client as any).profiles
    if (!profile?.email) {
      return new Response(
        JSON.stringify({ error: 'Client has no email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const lang = language || profile.language || 'da'
    const clientName = profile.name || profile.email.split('@')[0]
    const coachName = coach.sender_name || 'Din coach'

    // 3. Get SMTP settings (host/port from admin_settings, auth from coach)
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('key, value')
      .in('key', ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'site_url'])

    const settingsMap: Record<string, string> = {}
    for (const s of (settings || [])) {
      settingsMap[s.key] = s.value
    }

    const smtpHost = settingsMap.smtp_host || 'send.one.com'
    const smtpPort = parseInt(settingsMap.smtp_port || '465', 10)
    const siteUrl = settingsMap.site_url || 'https://shiftingsource.com'

    // Determine SMTP auth — use coach credentials if available, else general
    const smtpUser = coach.sender_email && coach.smtp_password ? coach.sender_email : (settingsMap.smtp_user || '')
    const smtpPass = coach.sender_email && coach.smtp_password ? coach.smtp_password : (settingsMap.smtp_password || '')
    const fromEmail = coach.sender_email || smtpUser
    const fromName = coachName

    if (!smtpUser || !smtpPass) {
      return new Response(
        JSON.stringify({ error: 'SMTP credentials not configured. Set sender_email + smtp_password on your CRM user, or configure general SMTP in admin settings.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Build check-in link
    const checkinUrl = `${siteUrl}/checkin`

    // 5. Build email
    const subjects: Record<string, string> = {
      da: `Tid til check-in, ${clientName}`,
      en: `Time for check-in, ${clientName}`,
      se: `Dags för check-in, ${clientName}`,
    }

    const subject = subjects[lang] || subjects.da

    // Build HTML email
    const logoHtml = coach.email_logo
      ? `<div style="text-align:center;margin-bottom:24px;"><img src="${coach.email_logo}" alt="Logo" style="max-height:60px;"/></div>`
      : ''

    const customMessageHtml = custom_message
      ? `<div style="background:#f8f9fa;border-left:3px solid #D97706;padding:16px;margin:20px 0;border-radius:0 8px 8px 0;">
           <p style="margin:0;color:#333;white-space:pre-line;">${escapeHtml(custom_message)}</p>
         </div>`
      : ''

    const greetings: Record<string, string> = {
      da: `Hej ${clientName},`,
      en: `Hi ${clientName},`,
      se: `Hej ${clientName},`,
    }

    const bodyTexts: Record<string, string> = {
      da: `Det er tid til din ugentlige check-in! Udfyld formularen, så vi kan følge din udvikling og tilpasse din plan.`,
      en: `It's time for your weekly check-in! Fill out the form so we can track your progress and adjust your plan.`,
      se: `Det är dags för din veckovisa check-in! Fyll i formuläret så vi kan följa din utveckling och anpassa din plan.`,
    }

    const ctaTexts: Record<string, string> = {
      da: 'Udfyld check-in',
      en: 'Complete check-in',
      se: 'Fyll i check-in',
    }

    const footerText = coach.email_footer
      ? coach.email_footer
          .replace('{name}', coachName)
          .replace('{email}', fromEmail || '')
          .replace('{title}', 'Coach')
          .replace('{phone}', '')
      : `Med venlig hilsen,\n${coachName}`

    const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="font-family:'Nunito Sans',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333;">
  ${logoHtml}
  <h2 style="color:#1a1a1a;font-family:'DM Serif Display',Georgia,serif;margin-bottom:16px;">
    ${greetings[lang] || greetings.da}
  </h2>
  <p style="line-height:1.6;margin-bottom:16px;">
    ${bodyTexts[lang] || bodyTexts.da}
  </p>
  ${customMessageHtml}
  <div style="text-align:center;margin:32px 0;">
    <a href="${checkinUrl}" style="display:inline-block;background:#D97706;color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:bold;font-size:16px;">
      ${ctaTexts[lang] || ctaTexts.da}
    </a>
  </div>
  <hr style="border:none;border-top:1px solid #eee;margin:32px 0;" />
  <p style="color:#666;font-size:14px;white-space:pre-line;">${escapeHtml(footerText)}</p>
</body>
</html>`

    // 6. Send email via SMTP using npm:nodemailer (same pattern as generate-mealplan)
    const nodemailer = await import('npm:nodemailer@6')
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    const fromDisplay = fromName
      ? `"${fromName}" <${fromEmail}>`
      : fromEmail

    await transporter.sendMail({
      from: fromDisplay,
      to: profile.email,
      subject,
      html: htmlBody,
    })

    // 7. Log the email send
    await supabase.from('email_sends').insert({
      user_id: profile.id,
      email_address: profile.email,
      subject,
      email_type: 'checkin_reminder',
      status: 'sent',
      sent_at: new Date().toISOString(),
    })

    // 8. Update coaching client reminder status
    await supabase
      .from('coaching_clients')
      .update({
        reminder_status: 'reminded',
        last_checkin_reminder_sent: new Date().toISOString(),
      })
      .eq('id', coaching_client_id)

    return new Response(
      JSON.stringify({ success: true, sent_to: profile.email }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('send-checkin-email error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
