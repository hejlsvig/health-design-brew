/**
 * Supabase Edge Function: generate-mealplan
 * Generates a personalised keto meal plan using OpenAI, creates a PDF,
 * uploads it to one.com via SFTP, emails the user, and logs CRM activity.
 *
 * Flow:
 *   1. Verify user authentication
 *   2. Read AI settings from admin_settings (openai_api_key / mealplan_openai_api_key)
 *   3. Generate meal plan via OpenAI
 *   4. Generate HTML → PDF via external service
 *   5. Upload PDF to one.com via SFTP (/mealplans/)
 *   6. Email PDF link to user via Resend
 *   7. Save meal plan + PDF URL to user profile
 *   8. Log CRM activity
 *   9. Return meal plan text + PDF URL to frontend
 *
 * POST body:
 * {
 *   name, email, language, gender, age, weight, height, activity,
 *   daily_calories, meals_per_day, num_days, prep_time,
 *   leftovers, leftovers_strategy, excluded_ingredients, diet_type,
 *   budget, health_anti_inflammatory, health_avoid_processed,
 *   weight_goal, units,
 *   coach_id (optional — if set, uses coach's SMTP credentials from crm_users)
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import SftpClient from 'npm:ssh2-sftp-client@11'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Read multiple settings from admin_settings in one query */
async function getSettings(
  supabase: ReturnType<typeof createClient>,
  keys: string[],
): Promise<Record<string, string>> {
  const { data } = await supabase
    .from('admin_settings')
    .select('key, value')
    .in('key', keys)
  const settings: Record<string, string> = {}
  for (const row of data || []) settings[row.key] = row.value
  return settings
}

// ── Markdown → HTML for PDF ──

function markdownToHtml(md: string, meta: { name: string; calories: number; days: number; language: string }): string {
  const langLabels: Record<string, Record<string, string>> = {
    da: { title: 'Personlig Keto Kostplan', generated: 'Genereret', calories: 'kalorier/dag', days: 'dage', for: 'Til', by: 'Udarbejdet af', platform: 'Shifting Source' },
    en: { title: 'Personal Keto Meal Plan', generated: 'Generated', calories: 'calories/day', days: 'days', for: 'For', by: 'Created by', platform: 'Shifting Source' },
    se: { title: 'Personlig Keto Matplan', generated: 'Genererad', calories: 'kalorier/dag', days: 'dagar', for: 'Till', by: 'Utarbetad av', platform: 'Shifting Source' },
  }
  const l = langLabels[meta.language] || langLabels['da']
  const date = new Date().toLocaleDateString(meta.language === 'se' ? 'sv-SE' : meta.language === 'en' ? 'en-GB' : 'da-DK', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Convert markdown to simple HTML
  // First, normalise line endings and remove triple+ newlines
  let bodyHtml = md.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n')

  // Headers
  bodyHtml = bodyHtml
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Inline formatting
  bodyHtml = bodyHtml
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Unordered lists: mark items, then group consecutive items
  bodyHtml = bodyHtml.replace(/^- (.+)$/gm, '<li class="ul">$1</li>')
  bodyHtml = bodyHtml.replace(/((?:<li class="ul">.*<\/li>\n?)+)/g, (match) =>
    `<ul>${match.replace(/ class="ul"/g, '')}</ul>`,
  )

  // Ordered lists: capture the number so we can set <ol start="N">
  bodyHtml = bodyHtml.replace(/^(\d+)\. (.+)$/gm, '<li class="ol" data-n="$1">$2</li>')
  bodyHtml = bodyHtml.replace(/((?:<li class="ol"[^>]*>.*<\/li>\n?)+)/g, (match) => {
    // Extract the first item's number to set start attribute
    const startMatch = match.match(/data-n="(\d+)"/)
    const start = startMatch ? parseInt(startMatch[1], 10) : 1
    const cleaned = match.replace(/ class="ol" data-n="\d+"/g, '')
    return `<ol${start > 1 ? ` start="${start}"` : ''}>${cleaned}</ol>`
  })

  // Horizontal rules
  bodyHtml = bodyHtml.replace(/^---$/gm, '<hr/>')

  // Remove empty lines between block elements (h1-h3, ul, ol, hr, div) to avoid extra spacing
  bodyHtml = bodyHtml.replace(/(<\/(?:h[123]|ul|ol|hr|div)>)\n+(<(?:h[123]|ul|ol|hr|div|br))/g, '$1\n$2')

  // Remaining double newlines become paragraph breaks (but not <br><br>)
  bodyHtml = bodyHtml.replace(/\n\n/g, '</p><p>')

  // Detect shopping list section: match from shopping-list header to the NEXT h1
  // (shopping list is typically at the end, or before a new day/major section)
  // Use h1 as boundary (not h2, since categories within shopping list use h2/h3)
  bodyHtml = bodyHtml.replace(
    /(<h[12]>.*?(?:indkøb|shopping|inköp|inkøb|handl).*?<\/h[12]>)([\s\S]*?)(?=<h1>|<div class="footer">|$)/gi,
    (match, header, content) => {
      // Wrap ALL <ul> blocks inside the shopping section in shopping-list divs
      const wrapped = content.replace(
        /(<ul>[\s\S]*?<\/ul>)/g,
        '<div class="shopping-list">$1</div>',
      )
      return header + wrapped
    },
  )

  return `<!DOCTYPE html>
<html lang="${meta.language}">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${l.title} — ${meta.name}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito+Sans:wght@400;600;700&display=swap" rel="stylesheet"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    html, body { width: 100%; min-height: 100%; }

    body {
      font-family: 'Nunito Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background-color: #f5f0e8;
      color: #4d3d2d;
      line-height: 1.65;
      padding: 24px;
    }

    .container {
      max-width: 860px;
      margin: 0 auto;
      background-color: #faf8f5;
      border-radius: 8px;
      padding: 48px 44px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.06);
    }

    /* ── Header ── */
    .header {
      text-align: center;
      margin-bottom: 36px;
      padding-bottom: 24px;
      border-bottom: 2px solid #ddd9d0;
    }
    .header-accent {
      display: block;
      width: 60px;
      height: 4px;
      background: #c8702a;
      margin: 0 auto 20px;
      border-radius: 2px;
    }
    .header h1 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 2.2em;
      color: #2d5a3d;
      font-weight: 400;
      margin-bottom: 6px;
    }
    .header .meta {
      font-size: 14px;
      color: #6b6058;
    }
    .header .meta strong { color: #2d5a3d; }

    /* ── Summary boxes ── */
    .summary {
      display: flex;
      gap: 16px;
      margin-bottom: 32px;
    }
    .summary-box {
      flex: 1;
      background: #f5f0e8;
      border-left: 3px solid #c8702a;
      padding: 14px 18px;
      border-radius: 0 6px 6px 0;
    }
    .summary-box .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #6b6058;
      margin-bottom: 2px;
    }
    .summary-box .value {
      font-size: 22px;
      font-weight: 700;
      color: #2d5a3d;
    }

    /* ── Typography ── */
    h1 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.6em;
      color: #2d5a3d;
      margin: 28px 0 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #ddd9d0;
      font-weight: 400;
    }
    h2 {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 1.35em;
      color: #2d5a3d;
      margin: 24px 0 10px;
      font-weight: 400;
    }
    h3 {
      font-size: 1.05em;
      font-weight: 700;
      color: #4d3d2d;
      margin: 16px 0 8px;
    }
    p, br { margin-bottom: 0; }
    strong { color: #2d5a3d; font-weight: 700; }
    em { color: #6b6058; }

    /* ── Lists ── */
    ul, ol { padding-left: 22px; margin: 8px 0 14px; }
    li { margin: 4px 0; font-size: 14px; }
    ol { list-style-type: decimal; }

    hr { border: none; border-top: 1px solid #ddd9d0; margin: 24px 0; }

    /* ── Shopping list 2-column ── */
    .shopping-list ul {
      columns: 2;
      column-gap: 36px;
    }
    .shopping-list li {
      break-inside: avoid;
      margin-bottom: 6px;
    }

    /* ── Footer ── */
    .footer {
      text-align: center;
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #ddd9d0;
    }
    .footer .brand {
      font-family: 'DM Serif Display', Georgia, serif;
      font-size: 18px;
      color: #2d5a3d;
      margin-bottom: 4px;
    }
    .footer .brand a {
      color: #2d5a3d;
      text-decoration: none;
    }
    .footer .brand a:hover { color: #c8702a; }
    .footer .by {
      font-size: 13px;
      color: #6b6058;
      margin-top: 6px;
    }
    .footer .by a {
      color: #c8702a;
      text-decoration: none;
      border-bottom: 1px solid transparent;
    }
    .footer .by a:hover { border-bottom-color: #c8702a; }

    /* ── Print ── */
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 24px; }
      .footer { page-break-inside: avoid; }
    }

    /* ── Mobile ── */
    @media (max-width: 640px) {
      body { padding: 12px; }
      .container { padding: 24px 20px; }
      .header h1 { font-size: 1.6em; }
      .summary { flex-direction: column; gap: 10px; }
      .shopping-list ul { columns: 1; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <span class="header-accent"></span>
      <h1>${l.title}</h1>
      <div class="meta">${l.for} <strong>${meta.name}</strong> &middot; ${l.generated} ${date}</div>
    </div>
    <div class="summary">
      <div class="summary-box"><div class="label">${l.calories}</div><div class="value">${meta.calories} kcal</div></div>
      <div class="summary-box"><div class="label">${l.days}</div><div class="value">${meta.days}</div></div>
    </div>
    ${bodyHtml}
    <div class="footer">
      <div class="brand"><a href="https://www.shiftingsource.com">${l.platform}</a></div>
      <div class="by">${l.by} <a href="https://www.hejlsvigconsulting.com">Hejlsvig Consulting</a></div>
    </div>
  </div>
</body>
</html>`
}

// ── HTML → PDF via external rendering ──

async function htmlToPdf(html: string): Promise<Uint8Array> {
  try {
    // Try html2pdf.app free API
    const pdfResponse = await fetch('https://api.html2pdf.app/v1/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        apiKey: '', // Free tier works without key for basic usage
        options: {
          format: 'A4',
          margin: { top: '15mm', right: '15mm', bottom: '15mm', left: '15mm' },
        },
      }),
    })

    if (pdfResponse.ok) {
      const pdfBuffer = await pdfResponse.arrayBuffer()
      if (pdfBuffer.byteLength > 1000) { // Valid PDF
        console.log(`[generate-mealplan] PDF generated via html2pdf.app: ${pdfBuffer.byteLength} bytes`)
        return new Uint8Array(pdfBuffer)
      }
    }
    console.warn('[generate-mealplan] html2pdf.app failed, falling back to HTML file')
  } catch (e) {
    console.warn('[generate-mealplan] PDF generation error:', e)
  }

  // Fallback: return HTML as-is (will be uploaded as .html instead of .pdf)
  return new TextEncoder().encode(html)
}

// ── SFTP Upload ──

async function uploadToSftp(
  settings: Record<string, string>,
  fileBuffer: Buffer,
  filename: string,
): Promise<string> {
  const sftpHost = settings.sftp_host || settings.ftp_host
  const sftpUser = settings.sftp_username || settings.ftp_username
  const sftpPass = settings.sftp_password || settings.ftp_password
  const sftpPort = parseInt(settings.sftp_port || '22', 10)
  const siteUrl = settings.site_url || 'https://shiftingsource.com'

  if (!sftpHost || !sftpUser || !sftpPass) {
    throw new Error('SFTP credentials ikke konfigureret i admin_settings')
  }

  const sftp = new SftpClient()

  try {
    await sftp.connect({
      host: sftpHost,
      port: sftpPort,
      username: sftpUser,
      password: sftpPass,
      readyTimeout: 10000,
      retries: 1,
    })

    // Find webroot (same logic as upload-image-ftp)
    let webRoot = ''
    const candidates = [
      '/webroots/by-route/shiftingsource.com_',
      'webroots/by-route/shiftingsource.com_',
    ]

    for (const candidate of candidates) {
      try {
        const resolved = await sftp.realPath(candidate)
        const list = await sftp.list(resolved)
        if (list.some((f: any) => f.name === 'index.html' || f.name === 'assets' || f.name === 'images')) {
          webRoot = resolved
          break
        }
      } catch { /* try next */ }
    }

    if (!webRoot) {
      // Fallback: try common paths
      for (const p of ['/www', '/public_html']) {
        try {
          await sftp.list(p)
          webRoot = p
          break
        } catch { /* try next */ }
      }
    }

    if (!webRoot) throw new Error('Kunne ikke finde webroot via SFTP')

    // Ensure /mealplans/ directory exists
    const mealplanDir = `${webRoot}/mealplans`
    try { await sftp.mkdir(mealplanDir, true) } catch { /* might exist */ }

    const remotePath = `${mealplanDir}/${filename}`
    await sftp.put(fileBuffer, remotePath)

    console.log(`[generate-mealplan] Uploaded to ${remotePath}`)

    const publicUrl = `${siteUrl}/mealplans/${filename}`
    return publicUrl
  } finally {
    await sftp.end().catch(() => {})
  }
}

// ── Email via SMTP (one.com / any SMTP provider) ──

async function sendMealPlanEmail(
  settings: Record<string, string>,
  email: string,
  name: string,
  pdfUrl: string,
  language: string,
  calories: number,
  days: number,
): Promise<boolean> {
  // Use mealplan-specific SMTP if configured, otherwise fall back to general SMTP
  const hasMealplanSmtp = settings.mealplan_smtp_host && settings.mealplan_smtp_user && settings.mealplan_smtp_password
  const smtpHost = hasMealplanSmtp ? settings.mealplan_smtp_host : settings.smtp_host
  const smtpPort = parseInt((hasMealplanSmtp ? settings.mealplan_smtp_port : settings.smtp_port) || '465', 10)
  const smtpUser = hasMealplanSmtp ? settings.mealplan_smtp_user : settings.smtp_user
  const smtpPass = hasMealplanSmtp ? settings.mealplan_smtp_password : settings.smtp_password
  const fromEmail = settings.mealplan_smtp_from_email || (hasMealplanSmtp ? smtpUser : settings.smtp_from_email) || smtpUser
  const fromName = settings.mealplan_smtp_from_name || settings.smtp_from_name || 'Hejlsvig Consulting'

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[generate-mealplan] SMTP not configured in admin_settings, skipping email')
    return false
  }

  console.log(`[generate-mealplan] Using ${hasMealplanSmtp ? 'mealplan-specific' : 'general'} SMTP: ${smtpHost}, from: ${fromEmail}`)

  const subjects: Record<string, string> = {
    da: `Din personlige keto madplan er klar!`,
    en: `Your personal keto meal plan is ready!`,
    se: `Din personliga keto matplan är klar!`,
  }

  const bodies: Record<string, string> = {
    da: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Din keto livsstilsplatform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personlige ${days}-dages keto madplan (${calories} kcal/dag) er nu klar.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download din madplan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">Du kan altid finde din seneste madplan på din profil på <a href="https://www.shiftingsource.com/profile" style="color: #c8702a;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Udarbejdet af <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          Du modtager denne email fordi du har genereret en kostplan.
        </p>
      </div>`,
    en: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Your keto lifestyle platform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hi ${name}!</h2>
        <p>Your personal ${days}-day keto meal plan (${calories} kcal/day) is now ready.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download your meal plan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">You can always find your latest meal plan on your profile at <a href="https://www.shiftingsource.com/profile" style="color: #c8702a;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Created by <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          You received this email because you generated a meal plan.
        </p>
      </div>`,
    se: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Din keto-livsstilsplattform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personliga ${days}-dagars keto matplan (${calories} kcal/dag) är nu klar.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Ladda ner din matplan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">Du kan alltid hitta din senaste matplan på din profil på <a href="https://www.shiftingsource.com/profile" style="color: #c8702a;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Utarbetad av <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          Du fick detta e-postmeddelande för att du genererade en matplan.
        </p>
      </div>`,
  }

  const subject = subjects[language] || subjects['da']
  const htmlBody = bodies[language] || bodies['da']

  try {
    // Use Nodemailer via npm for SMTP
    const nodemailer = await import('npm:nodemailer@6')
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: email,
      subject,
      html: htmlBody,
    })

    console.log(`[generate-mealplan] Email sent to ${email} via SMTP (${smtpHost})`)
    return true
  } catch (e) {
    console.error('[generate-mealplan] SMTP email error:', e)
    return false
  }
}

// ── Email via explicit SMTP credentials (for coach-specific sending) ──

async function sendMealPlanEmailWithSmtp(
  smtpHost: string,
  smtpPort: number,
  smtpUser: string,
  smtpPass: string,
  fromEmail: string,
  fromName: string,
  toEmail: string,
  name: string,
  pdfUrl: string,
  language: string,
  calories: number,
  days: number,
): Promise<boolean> {
  const subjects: Record<string, string> = {
    da: `Din personlige keto madplan er klar!`,
    en: `Your personal keto meal plan is ready!`,
    se: `Din personliga keto matplan är klar!`,
  }

  const bodies: Record<string, string> = {
    da: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Din keto livsstilsplatform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personlige ${days}-dages keto madplan (${calories} kcal/dag) er nu klar. Den er lavet specifikt til dig af din coach.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download din madplan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">Har du spørgsmål til din madplan? Svar direkte på denne email.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Udarbejdet af <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          Sendt af ${fromName}
        </p>
      </div>`,
    en: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Your keto lifestyle platform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hi ${name}!</h2>
        <p>Your personal ${days}-day keto meal plan (${calories} kcal/day) is now ready. It was created specifically for you by your coach.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download your meal plan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">Got questions about your meal plan? Reply directly to this email.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Created by <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          Sent by ${fromName}
        </p>
      </div>`,
    se: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #4d3d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;"><a href="https://www.shiftingsource.com" style="color: #2d5a3d; text-decoration: none;">Shifting Source</a></h1>
          <p style="color: #6b6058; font-size: 14px;">Din keto-livsstilsplattform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personliga ${days}-dagars keto matplan (${calories} kcal/dag) är nu klar. Den är skapad specifikt för dig av din coach.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Ladda ner din matplan
          </a>
        </p>
        <p style="font-size: 14px; color: #6b6058;">Har du frågor om din matplan? Svara direkt på detta mail.</p>
        <hr style="border: none; border-top: 1px solid #ddd9d0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #6b6058;">
          Utarbetad av <a href="https://www.hejlsvigconsulting.com" style="color: #c8702a;">Hejlsvig Consulting</a><br/>
          Skickat av ${fromName}
        </p>
      </div>`,
  }

  const subject = subjects[language] || subjects['da']
  const htmlBody = bodies[language] || bodies['da']

  try {
    const nodemailer = await import('npm:nodemailer@6')
    const transporter = nodemailer.default.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
      tls: { rejectUnauthorized: false },
    })

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: toEmail,
      subject,
      html: htmlBody,
    })

    console.log(`[generate-mealplan] Coach email sent to ${toEmail} via ${fromEmail} (${smtpHost})`)
    return true
  } catch (e) {
    console.error('[generate-mealplan] Coach SMTP email error:', e)
    return false
  }
}

// ══════════════════════════════════════
// Main handler
// ══════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? supabaseServiceKey

    // 1. Try to get authenticated user (optional — meal plans work without login)
    const authHeader = req.headers.get('Authorization') || ''
    let user: { id: string; email?: string } | null = null
    if (authHeader) {
      const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      })
      const { data: { user: authUser } } = await supabaseUser.auth.getUser()
      user = authUser
    }

    // 2. Service-role client for admin_settings & profile updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body = await req.json()
    const {
      name = 'Klient',
      email = user?.email || '',
      language = 'da',
      gender,
      age,
      weight,
      height,
      activity,
      daily_calories,
      meals_per_day = 3,
      num_days = 7,
      prep_time,
      leftovers = false,
      leftovers_strategy = '',
      excluded_ingredients = '',
      diet_type = 'Custom Keto',
      budget = 'medium',
      health_anti_inflammatory = false,
      health_avoid_processed = false,
      weight_goal = 0,
      units = 'metric',
      coach_id = null, // Optional: CRM coach sending meal plan to client
      // Consent flags from frontend
      gdpr_consent = false,
      newsletter_consent = false,
      contact_consent = false,
    } = body

    if (!daily_calories) {
      return jsonResponse({ error: 'daily_calories er påkrævet' }, 400)
    }

    // 3. Fetch ALL settings we need in one query
    const settings = await getSettings(supabase, [
      'openai_api_key', 'mealplan_openai_api_key',
      'ai_model', 'mealplan_ai_model',
      'mealplan_system_prompt',
      'sftp_host', 'sftp_username', 'sftp_password', 'sftp_port',
      'ftp_host', 'ftp_username', 'ftp_password',
      'site_url',
      'smtp_host', 'smtp_port', 'smtp_user', 'smtp_password',
      'smtp_from_email', 'smtp_from_name',
      'mealplan_smtp_from_email', 'mealplan_smtp_from_name',
      'mealplan_smtp_host', 'mealplan_smtp_port', 'mealplan_smtp_user', 'mealplan_smtp_password',
    ])

    // Use mealplan-specific keys if available, fallback to shared keys
    const openaiKey = settings.mealplan_openai_api_key || settings.openai_api_key
    if (!openaiKey) {
      return jsonResponse({ error: 'OpenAI API key er ikke konfigureret. Gå til Admin → Indstillinger.' }, 500)
    }

    const model = settings.mealplan_ai_model || settings.ai_model || 'gpt-5.2-chat-latest'

    // ── Build the user prompt ──
    const langMap: Record<string, string> = { da: 'dansk', en: 'engelsk', se: 'svensk' }
    const activityMap: Record<string, string> = {
      sedentary: 'stillesiddende', light: 'let aktiv', moderate: 'moderat aktiv',
      active: 'meget aktiv', very_active: 'ekstrem aktiv',
    }
    const prepTimeMap: Record<string, string> = {
      quick: 'hurtige retter (15-20 min)', medium: 'medium (20-40 min)',
      long: 'ingen tidsbegrænsning (40+ min)', mix: 'blandet',
    }
    const budgetMap: Record<string, string> = {
      cheap: 'billigt (fokusér på prisbillige ingredienser)',
      medium: 'moderat budget (god variation)',
      expensive: 'højt budget (premium ingredienser)',
      mixed: 'blandet (variér mellem budget- og premium-dage)',
    }
    const leftoversMap: Record<string, string> = {
      daily: 'Lav frisk mad hver dag',
      batch: 'Batch-cooking: større portioner, brug resterne næste dag',
      mixed: 'Blandet: Nogle dage frisk, andre dage med rester',
    }
    const weightGoalMap = (goal: number): string => {
      if (goal < -0.3) return 'Vægttab (kalorieunderskud)'
      if (goal > 0.3) return 'Vægtøgning (kalorieoverskud)'
      return 'Vægtvedligehold'
    }
    const countryMap: Record<string, string> = {
      da: 'Danmark — brug ingredienser fra danske supermarkeder',
      en: 'International/UK/US',
      se: 'Sverige — brug ingredienser fra svenske supermarkeder',
    }

    let excludedList = 'ingen'
    if (excluded_ingredients) {
      try {
        const parsed = typeof excluded_ingredients === 'string' ? JSON.parse(excluded_ingredients) : excluded_ingredients
        if (Array.isArray(parsed) && parsed.length > 0) excludedList = parsed.join(', ')
      } catch {
        if (typeof excluded_ingredients === 'string' && excluded_ingredients.length > 0) excludedList = excluded_ingredients
      }
    }

    const measurementNote = units === 'imperial'
      ? 'Brug IMPERIALE mål (oz, lbs, cups, tbsp). Temperaturer i °F.'
      : 'Brug METRISKE mål (gram, dl, ml, spsk). Temperaturer i °C.'

    const healthNotes: string[] = []
    if (health_anti_inflammatory) healthNotes.push('Anti-inflammatorisk fokus: omega-3, gurkemeje, ingefær.')
    if (health_avoid_processed) healthNotes.push('Undgå forarbejdede fødevarer: kun hele, uforarbejdede ingredienser.')

    // Language-specific instruction block
    const langInstructions: Record<string, string> = {
      da: '',
      en: `\n\n🔴 MANDATORY LANGUAGE: Write the ENTIRE meal plan in ENGLISH. Every heading, ingredient, instruction, and note must be in English. Do NOT use any Danish or Swedish words anywhere.`,
      se: `\n\n🔴 OBLIGATORISKT SPRÅK: Skriv HELA matplanen på SVENSKA. Alla rubriker, ingredienser, instruktioner och kommentarer ska vara på svenska. Använd INTE danska eller engelska ord någonstans. Exempel: "Frukost" (inte "Morgenmad"), "Lunch" (inte "Frokost"), "Middag" (inte "Aftensmad"), "Tillagning" (inte "Tilberedning"), "Näringsvärde" (inte "Næringsværdi"), "Inköpslista" (inte "Indkøbsliste"), "Grönsaker" (inte "Grøntsager"), "Dag" (inte "Dag" — detta är samma), "Daglig total" → "Daglig total".`,
    }

    const userPrompt = `Lav en personlig ${num_days}-dages keto madplan på ${langMap[language] || 'dansk'}.${langInstructions[language] || ''}

PERSON PROFIL:
- Navn: ${name}
- Køn: ${gender === 'male' ? 'Mand' : 'Kvinde'}
- Alder: ${age} år
- Vægt: ${weight} ${units === 'imperial' ? 'lbs' : 'kg'}
- Højde: ${height} ${units === 'imperial' ? 'inches' : 'cm'}
- Aktivitetsniveau: ${activityMap[activity] || activity}
- Mål: ${weightGoalMap(weight_goal)}
- Dagligt kaloriebehov: ${daily_calories} kcal (SKAL overholdes ±50 kcal per dag)
- Antal måltider per dag: ${meals_per_day}
- Tilberedningstid: ${prepTimeMap[prep_time] || prep_time}
- Budget: ${budgetMap[budget] || budget}
- Rester-strategi: ${leftovers_strategy ? (leftoversMap[leftovers_strategy] || leftovers_strategy) : (leftovers ? 'Batch-cooking med rester' : 'Frisk mad hver dag')}
- Ekskluderede ingredienser: ${excludedList}
- Diet type: ${diet_type}
- Land/tilgængelighed: ${countryMap[language] || countryMap['da']}
- Måleenheder: ${measurementNote}
${healthNotes.length > 0 ? '\nSUNDHEDSPRÆFERENCER:\n' + healthNotes.map(n => `- ${n}`).join('\n') : ''}

VIGTIGE REGLER:
1. MORGENMAD: æg, omeletter, pandekager (keto), smoothies, yoghurt-skåle. ALDRIG tungt kød/supper.
2. FROKOST: lettere retter — salater, wraps, supper, rester.
3. AFTENSMAD: hovedmåltidet — bøffer, stege, gratiner, gryderetter.
4. Korrekt kaloriefordeling så total matcher ${daily_calories} kcal.
5. Variér proteinkilder — aldrig samme protein 2+ dage i træk.
6. INGEN snacks — kun ${meals_per_day} hovedmåltider.
7. ALDRIG inkluder marketing, reklame, upsell eller forslag om at bestille yderligere planer/services. Ingen sætninger som "kontakt os", "bestil en længere plan", "7-dages version" osv. Kun madplanen.
8. For HVER dag skal du inkludere KOMPLETTE tilberedningsinstruktioner for ALLE måltider — ikke kun dag 1. Hver opskrift skal have en trin-for-trin tilberedningsvejledning med alle trin.
9. Indkøbslisten skal organiseres efter kategori (Kød & Fisk, Mejeriprodukter, Grøntsager, Fedtstoffer & Olier, Krydderier & Andet).

Lav ALLE ${num_days} dage med komplette opskrifter og tilberedningsinstruktioner for hvert enkelt måltid.${
  excludedList !== 'ingen' ? `\n\n⚠️ KRITISK: ALDRIG bruge: ${excludedList}. Brug alternativer!` : ''
}`

    const systemPromptLang: Record<string, string> = {
      da: 'Du er en professionel keto ernæringsekspert og kok. Du laver personlige, detaljerede madplaner med nøjagtige opskrifter, ingredienslister og næringsværdier.',
      en: 'You are a professional keto nutrition expert and chef. You create personalized, detailed meal plans with exact recipes, ingredient lists, and nutritional values. Always respond in English.',
      se: 'Du är en professionell keto-nutritionsexpert och kock. Du skapar personliga, detaljerade matplaner med exakta recept, ingredienslistor och näringsvärden. Svara ALLTID på svenska.',
    }
    const defaultSystemPrompt = systemPromptLang[language] || systemPromptLang['da']
    const systemPrompt = settings.mealplan_system_prompt || defaultSystemPrompt

    const excludedWarning = excludedList !== 'ingen'
      ? `\n\nKRITISK REGEL: ALDRIG bruge: ${excludedList}. Brug alternativer!`
      : ''

    // Dynamic token limit: 7-day plan with full prep needs ~30K+ tokens
    // GPT-5.x models don't support max_tokens or max_completion_tokens
    const maxTokens = Math.min(64000, Math.max(16000, num_days * 5000))
    const isGpt5 = model.startsWith('gpt-5') || model.startsWith('o3') || model.startsWith('o4')

    console.log(`[generate-mealplan] model=${model}, isGpt5=${isGpt5}, calories=${daily_calories}, days=${num_days}, maxTokens=${isGpt5 ? 'auto' : maxTokens}, user=${user?.email || email}`)

    // ── 4. Call OpenAI ──
    const startTime = Date.now()

    const requestBody: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemPrompt + excludedWarning },
        { role: 'user', content: userPrompt },
      ],
    }
    // Only add token limit for models that support it (GPT-4.x and earlier)
    if (!isGpt5) {
      requestBody.max_completion_tokens = maxTokens
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify(requestBody),
    })

    if (!openaiResponse.ok) {
      const err = await openaiResponse.json().catch(() => ({}))
      const msg = (err as any)?.error?.message || `OpenAI API fejl: ${openaiResponse.status}`
      console.error('[generate-mealplan] OpenAI error:', msg)
      return jsonResponse({ error: msg }, 502)
    }

    const completionData = await openaiResponse.json()
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    const mealPlanText = completionData.choices?.[0]?.message?.content?.trim()

    if (!mealPlanText) {
      return jsonResponse({ error: 'Tom respons fra OpenAI' }, 502)
    }

    console.log(`[generate-mealplan] OpenAI done in ${elapsed}s, tokens: ${JSON.stringify(completionData.usage)}`)

    // ── 5. Generate PDF from meal plan ──
    let pdfUrl = ''
    let fileUploaded = false

    try {
      const html = markdownToHtml(mealPlanText, { name, calories: daily_calories, days: num_days, language })
      const pdfBytes = await htmlToPdf(html)
      const isPdf = pdfBytes[0] === 0x25 && pdfBytes[1] === 0x50 // %P (PDF magic bytes)
      const ext = isPdf ? 'pdf' : 'html'
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const safeUserName = (name || 'user').toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)
      const filename = `mealplan-${safeUserName}-${timestamp}.${ext}`

      // Upload to one.com via SFTP
      const fileBuffer = Buffer.from(pdfBytes)
      pdfUrl = await uploadToSftp(settings, fileBuffer, filename)
      fileUploaded = true
      console.log(`[generate-mealplan] File uploaded: ${pdfUrl}`)
    } catch (uploadErr) {
      console.error('[generate-mealplan] PDF/upload error (non-fatal):', uploadErr)
      // Continue without PDF — the meal plan text is still returned
    }

    // ── 6. Email the user ──
    let emailSent = false
    if (pdfUrl && email) {
      try {
        // If coach_id is set, look up coach SMTP credentials from crm_users
        let coachSmtp: { sender_email: string; sender_name: string; smtp_password: string } | null = null
        if (coach_id) {
          const { data: coachData } = await supabase
            .from('crm_users')
            .select('sender_email, sender_name, smtp_password')
            .eq('id', coach_id)
            .single()

          if (coachData?.sender_email && coachData?.smtp_password) {
            coachSmtp = coachData
            console.log(`[generate-mealplan] Using coach SMTP: ${coachData.sender_email}`)
          } else {
            console.warn(`[generate-mealplan] Coach ${coach_id} missing sender_email or smtp_password, falling back to default SMTP`)
          }
        }

        if (coachSmtp) {
          // Send via coach's own SMTP credentials (same host as mealplan/general SMTP)
          const smtpHost = settings.mealplan_smtp_host || settings.smtp_host || 'send.one.com'
          const smtpPort = parseInt(settings.mealplan_smtp_port || settings.smtp_port || '465', 10)

          emailSent = await sendMealPlanEmailWithSmtp(
            smtpHost, smtpPort,
            coachSmtp.sender_email, coachSmtp.smtp_password,
            coachSmtp.sender_email, coachSmtp.sender_name || 'Hejlsvig Consulting',
            email, name, pdfUrl, language, daily_calories, num_days,
          )
        } else {
          emailSent = await sendMealPlanEmail(settings, email, name, pdfUrl, language, daily_calories, num_days)
        }
      } catch (emailErr) {
        console.error('[generate-mealplan] Email error (non-fatal):', emailErr)
      }
    }

    // ── 7. Save to user profile (only if logged in) ──
    if (user) {
      try {
        await supabase
          .from('profiles')
          .update({
            latest_meal_plan: mealPlanText,
            meal_plan_generated_at: new Date().toISOString(),
            ...(pdfUrl ? { meal_plan_pdf_url: pdfUrl } : {}),
          })
          .eq('id', user.id)
      } catch (saveErr) {
        console.warn('[generate-mealplan] Failed to save to profile:', saveErr)
      }
    }

    // ── 8. Create/update lead + log consent (ALL users, including non-logged-in) ──
    if (email) {
      try {
        // 8a. Upsert newsletter_subscriber (as a lead from meal_plan)
        await supabase.from('newsletter_subscribers').upsert(
          {
            email,
            name: name || null,
            source: 'meal_plan',
            language: language || 'da',
            is_active: true,
            tags: [
              'meal_plan',
              ...(newsletter_consent ? ['newsletter'] : []),
              ...(contact_consent ? ['contact_ok'] : []),
            ],
          },
          { onConflict: 'email' },
        )
        console.log(`[generate-mealplan] Lead upserted: ${email}`)

        // 8b. If user is logged in, also upsert lead_status
        if (user) {
          await supabase.from('lead_status').upsert(
            {
              user_id: user.id,
              source: 'meal_plan',
              status: 'new',
              notes: `Genereret ${num_days}-dages kostplan (${daily_calories} kcal)`,
            },
            { onConflict: 'user_id' },
          ).then(() => {}, () => {}) // best-effort
        }

        // 8c. Log consent entries in consent_log
        const consentEntries = [
          {
            user_id: user?.id || null,
            consent_type: 'meal_plan_delivery',
            granted: gdpr_consent,
            source: 'meal_plan',
            notes: `Email: ${email}, Name: ${name || '-'}`,
          },
        ]

        if (newsletter_consent) {
          consentEntries.push({
            user_id: user?.id || null,
            consent_type: 'newsletter',
            granted: true,
            source: 'meal_plan',
            notes: `Opted in via meal plan form. Email: ${email}`,
          })
        }

        if (contact_consent) {
          consentEntries.push({
            user_id: user?.id || null,
            consent_type: 'contact_permission',
            granted: true,
            source: 'meal_plan',
            notes: `Opted in via meal plan form. Email: ${email}`,
          })
        }

        await supabase.from('consent_log').insert(consentEntries).then(() => {}, () => {})

        // 8d. Log CRM activity (if logged in)
        if (user) {
          await supabase.from('lead_activity').insert({
            user_id: user.id,
            activity_type: 'meal_plan_generated',
            activity_details: {
              calories: daily_calories,
              days: num_days,
              meals_per_day,
              language,
              model,
              pdf_url: pdfUrl || null,
              email_sent: emailSent,
              tokens: completionData.usage?.total_tokens || 0,
              newsletter_consent,
              contact_consent,
            },
            notes: `Madplan genereret: ${num_days} dage, ${daily_calories} kcal/dag${coach_id ? ' (sendt af coach)' : ''}`,
          }).then(() => {}, () => {})
        }
      } catch (leadErr) {
        console.warn('[generate-mealplan] Lead/consent log error (non-fatal):', leadErr)
      }
    }

    // ── 9. Return response ──
    console.log(`[generate-mealplan] Complete. elapsed=${elapsed}s, pdf=${fileUploaded}, email=${emailSent}`)

    return jsonResponse({
      mealPlan: mealPlanText,
      pdfUrl: pdfUrl || null,
      emailSent,
      model,
      tokens: completionData.usage?.total_tokens || 0,
      elapsed: parseFloat(elapsed),
    })
  } catch (err) {
    console.error('[generate-mealplan] Error:', err)
    return jsonResponse({ error: (err as Error).message || 'Intern server fejl' }, 500)
  }
})
