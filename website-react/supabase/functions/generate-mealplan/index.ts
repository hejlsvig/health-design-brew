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
 *   weight_goal, units
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
    da: { title: 'Personlig Keto Madplan', generated: 'Genereret', calories: 'kalorier/dag', days: 'dage', for: 'Til', by: 'Lavet af Shifting Source' },
    en: { title: 'Personal Keto Meal Plan', generated: 'Generated', calories: 'calories/day', days: 'days', for: 'For', by: 'Created by Shifting Source' },
    se: { title: 'Personlig Keto Matplan', generated: 'Genererad', calories: 'kalorier/dag', days: 'dagar', for: 'Till', by: 'Skapad av Shifting Source' },
  }
  const l = langLabels[meta.language] || langLabels['da']
  const date = new Date().toLocaleDateString(meta.language === 'se' ? 'sv-SE' : meta.language === 'en' ? 'en-GB' : 'da-DK', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  // Convert markdown to simple HTML
  const bodyHtml = md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`)
    .replace(/^(\d+)\. (.+)$/gm, '<li>$2</li>')
    .replace(/^---$/gm, '<hr/>')
    .replace(/\n\n/g, '<br/><br/>')

  return `<!DOCTYPE html>
<html lang="${meta.language}">
<head>
  <meta charset="UTF-8"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Nunito+Sans:wght@400;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Nunito Sans', sans-serif; color: #2d2d2d; line-height: 1.6; padding: 40px; max-width: 800px; margin: 0 auto; }
    .header { text-align: center; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #2d5a3d; }
    .header h1 { font-family: 'DM Serif Display', serif; font-size: 28px; color: #2d5a3d; margin-bottom: 5px; }
    .header .meta { font-size: 13px; color: #666; }
    .header .meta strong { color: #2d5a3d; }
    .summary { display: flex; gap: 20px; margin-bottom: 25px; }
    .summary-box { flex: 1; background: #f5f7f5; border-left: 3px solid #2d5a3d; padding: 12px 16px; border-radius: 0 6px 6px 0; }
    .summary-box .label { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 0.5px; }
    .summary-box .value { font-size: 20px; font-weight: 700; color: #2d5a3d; }
    h1 { font-family: 'DM Serif Display', serif; font-size: 22px; color: #2d5a3d; margin: 25px 0 10px; padding-bottom: 5px; border-bottom: 1px solid #e0e0e0; }
    h2 { font-family: 'DM Serif Display', serif; font-size: 18px; color: #2d5a3d; margin: 20px 0 8px; }
    h3 { font-size: 15px; font-weight: 700; color: #444; margin: 15px 0 6px; }
    ul { padding-left: 20px; margin: 8px 0; }
    li { margin: 3px 0; font-size: 14px; }
    strong { color: #333; }
    hr { border: none; border-top: 1px solid #e0e0e0; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 2px solid #2d5a3d; font-size: 12px; color: #888; }
    .footer .brand { font-family: 'DM Serif Display', serif; color: #2d5a3d; font-size: 14px; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔥 ${l.title}</h1>
    <div class="meta">${l.for} <strong>${meta.name}</strong> · ${l.generated} ${date}</div>
  </div>
  <div class="summary">
    <div class="summary-box"><div class="label">${l.calories}</div><div class="value">${meta.calories} kcal</div></div>
    <div class="summary-box"><div class="label">${l.days}</div><div class="value">${meta.days}</div></div>
  </div>
  ${bodyHtml}
  <div class="footer">
    <div class="brand">Shifting Source</div>
    <div>shiftingsource.com · ${l.by}</div>
  </div>
</body>
</html>`
}

// ── HTML → PDF via external rendering ──

async function htmlToPdf(html: string): Promise<Uint8Array> {
  // Strategy 1: Use a lightweight HTML-to-PDF approach
  // Since Deno Edge Functions can't run headless Chrome, we use a serverless
  // PDF API. If not available, we return the HTML as a fallback.
  // Using https://api.html2pdf.app (free tier: 300 pages/month)
  // Alternative: render on client side using jsPDF or similar.

  // For now, we'll encode the HTML as a self-contained document that can be
  // opened in a browser and printed to PDF. We also try the html2pdf.app API.

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
  const smtpHost = settings.smtp_host
  const smtpPort = parseInt(settings.smtp_port || '465', 10)
  const smtpUser = settings.smtp_user
  const smtpPass = settings.smtp_password
  const fromEmail = settings.smtp_from_email || smtpUser
  const fromName = settings.smtp_from_name || 'Shifting Source'

  if (!smtpHost || !smtpUser || !smtpPass) {
    console.warn('[generate-mealplan] SMTP not configured in admin_settings, skipping email')
    return false
  }

  const subjects: Record<string, string> = {
    da: `Din personlige keto madplan er klar!`,
    en: `Your personal keto meal plan is ready!`,
    se: `Din personliga keto matplan är klar!`,
  }

  const bodies: Record<string, string> = {
    da: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #2d2d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;">Shifting Source</h1>
          <p style="color: #888; font-size: 14px;">Din keto livsstilsplatform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personlige ${days}-dages keto madplan (${calories} kcal/dag) er nu klar.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download din madplan
          </a>
        </p>
        <p style="font-size: 14px; color: #666;">Du kan altid finde din seneste madplan på din profil på <a href="https://shiftingsource.com/profile" style="color: #D97706;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #888;">
          Shifting Source &middot; <a href="https://shiftingsource.com" style="color: #888;">shiftingsource.com</a><br/>
          Du modtager denne email fordi du har genereret en kostplan.
        </p>
      </div>`,
    en: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #2d2d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;">Shifting Source</h1>
          <p style="color: #888; font-size: 14px;">Your keto lifestyle platform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hi ${name}!</h2>
        <p>Your personal ${days}-day keto meal plan (${calories} kcal/day) is now ready.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Download your meal plan
          </a>
        </p>
        <p style="font-size: 14px; color: #666;">You can always find your latest meal plan on your profile at <a href="https://shiftingsource.com/profile" style="color: #D97706;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #888;">
          Shifting Source &middot; <a href="https://shiftingsource.com" style="color: #888;">shiftingsource.com</a><br/>
          You received this email because you generated a meal plan.
        </p>
      </div>`,
    se: `
      <div style="font-family: 'Nunito Sans', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; color: #2d2d2d;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="font-family: Georgia, serif; color: #2d5a3d; margin: 0;">Shifting Source</h1>
          <p style="color: #888; font-size: 14px;">Din keto-livsstilsplattform</p>
        </div>
        <h2 style="font-family: Georgia, serif; color: #2d5a3d;">Hej ${name}!</h2>
        <p>Din personliga ${days}-dagars keto matplan (${calories} kcal/dag) ar nu klar.</p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${pdfUrl}" style="display: inline-block; background: #2d5a3d; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px;">
            Ladda ner din matplan
          </a>
        </p>
        <p style="font-size: 14px; color: #666;">Du kan alltid hitta din senaste matplan pa din profil pa <a href="https://shiftingsource.com/profile" style="color: #D97706;">shiftingsource.com</a>.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;"/>
        <p style="text-align: center; font-size: 12px; color: #888;">
          Shifting Source &middot; <a href="https://shiftingsource.com" style="color: #888;">shiftingsource.com</a><br/>
          Du fick detta e-postmeddelande for att du genererade en matplan.
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

    // 1. Verify authentication — any authenticated user
    const authHeader = req.headers.get('Authorization') || ''
    if (!authHeader) {
      return jsonResponse({ error: 'Manglende autorisering' }, 401)
    }

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !user) {
      return jsonResponse({ error: 'Ikke autoriseret — log ind for at generere en kostplan' }, 401)
    }

    // 2. Service-role client for admin_settings & profile updates
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const body = await req.json()
    const {
      name = 'Klient',
      email = user.email || '',
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
    ])

    // Use mealplan-specific keys if available, fallback to shared keys
    const openaiKey = settings.mealplan_openai_api_key || settings.openai_api_key
    if (!openaiKey) {
      return jsonResponse({ error: 'OpenAI API key er ikke konfigureret. Gå til Admin → Indstillinger.' }, 500)
    }

    const model = settings.mealplan_ai_model || settings.ai_model || 'gpt-4.1'

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

    const userPrompt = `Lav en personlig ${num_days}-dages keto madplan på ${langMap[language] || 'dansk'}.

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

Lav ALLE ${num_days} dage med komplette opskrifter.${
  excludedList !== 'ingen' ? `\n\n⚠️ KRITISK: ALDRIG bruge: ${excludedList}. Brug alternativer!` : ''
}`

    const defaultSystemPrompt = 'Du er en professionel keto ernæringsekspert og kok. Du laver personlige, detaljerede madplaner med nøjagtige opskrifter, ingredienslister og næringsværdier.'
    const systemPrompt = settings.mealplan_system_prompt || defaultSystemPrompt

    const excludedWarning = excludedList !== 'ingen'
      ? `\n\nKRITISK REGEL: ALDRIG bruge: ${excludedList}. Brug alternativer!`
      : ''

    console.log(`[generate-mealplan] model=${model}, calories=${daily_calories}, days=${num_days}, user=${user.email}`)

    // ── 4. Call OpenAI ──
    const startTime = Date.now()

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt + excludedWarning },
          { role: 'user', content: userPrompt },
        ],
        max_completion_tokens: 16000,
      }),
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
        emailSent = await sendMealPlanEmail(settings, email, name, pdfUrl, language, daily_calories, num_days)
      } catch (emailErr) {
        console.error('[generate-mealplan] Email error (non-fatal):', emailErr)
      }
    }

    // ── 7. Save to user profile ──
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

    // ── 8. Log CRM activity ──
    try {
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
        },
        notes: `Madplan genereret: ${num_days} dage, ${daily_calories} kcal/dag`,
      })
    } catch (crmErr) {
      console.warn('[generate-mealplan] CRM activity log error:', crmErr)
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
