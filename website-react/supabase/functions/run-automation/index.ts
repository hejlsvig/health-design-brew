/**
 * Supabase Edge Function: run-automation
 *
 * Executes an automation flow step-by-step for a given user.
 * Supports: trigger evaluation, conditions, email actions, delays, branching.
 *
 * Endpoints:
 *   POST { action: "run",     flow_id, user_id }       — Execute a full flow
 *   POST { action: "trigger", trigger_type, user_id }   — Fire all flows matching a trigger
 *   POST { action: "resume",  run_id }                  — Resume a paused run (after delay)
 *   POST { action: "test",    flow_id, user_id }        — Dry-run (logs only, no emails sent)
 *
 * Required Supabase secrets:
 *   RESEND_API_KEY — for sending emails
 *
 * Deploy:
 *   supabase functions deploy run-automation
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ─── Types ──────────────────────────────────────────────────────

type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'branch'
type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused' | 'skipped'

interface FlowStep {
  id: string
  flow_id: string
  step_order: number
  node_type: NodeType
  label: string | null
  config: Record<string, unknown>
  on_true_step_id: string | null
  on_false_step_id: string | null
}

interface FlowRun {
  id: string
  flow_id: string
  target_user_id: string | null
  status: RunStatus
  current_step_id: string | null
  started_at: string
  completed_at: string | null
  error_message: string | null
  log: Record<string, unknown>[]
}

interface UserProfile {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  language: string | null
  subscription_tier: string | null
  coaching_enabled: boolean | null
}

// ─── Helpers ────────────────────────────────────────────────────

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

/** Substitute template variables: {{first_name}} → actual value */
function substituteVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`)
}

/** Build variable map from user profile + custom data */
function buildVariableMap(user: UserProfile, extra: Record<string, string> = {}): Record<string, string> {
  return {
    first_name: user.first_name || 'there',
    last_name: user.last_name || '',
    full_name: `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'User',
    email: user.email,
    tier: user.subscription_tier || 'free',
    language: user.language || 'da',
    ...extra,
  }
}

// ─── Step Executors ─────────────────────────────────────────────

async function executeTriggerStep(
  _step: FlowStep,
  _user: UserProfile,
  _dryRun: boolean,
): Promise<{ success: boolean; message: string }> {
  // Trigger steps are entry points — always pass through
  return { success: true, message: 'Trigger step passed' }
}

async function executeConditionStep(
  step: FlowStep,
  user: UserProfile,
  _dryRun: boolean,
): Promise<{ success: boolean; message: string; result?: boolean }> {
  const config = step.config
  const field = config.field as string
  const operator = config.operator as string
  const value = config.value as string

  // Get the user field value
  const userValue = (user as Record<string, unknown>)[field]
  let result = false

  switch (operator) {
    case 'equals':
      result = String(userValue) === String(value)
      break
    case 'not_equals':
      result = String(userValue) !== String(value)
      break
    case 'contains':
      result = String(userValue || '').toLowerCase().includes(String(value).toLowerCase())
      break
    case 'is_true':
      result = Boolean(userValue)
      break
    case 'is_false':
      result = !userValue
      break
    case 'greater_than':
      result = Number(userValue) > Number(value)
      break
    case 'less_than':
      result = Number(userValue) < Number(value)
      break
    case 'exists':
      result = userValue !== null && userValue !== undefined
      break
    default:
      return { success: false, message: `Unknown operator: ${operator}` }
  }

  return {
    success: true,
    message: `Condition [${field} ${operator} ${value}] → ${result}`,
    result,
  }
}

async function executeActionStep(
  step: FlowStep,
  user: UserProfile,
  dryRun: boolean,
  siteSettings: Record<string, string>,
): Promise<{ success: boolean; message: string }> {
  const config = step.config
  const actionType = config.action_type as string

  switch (actionType) {
    case 'send_email':
      return await executeSendEmail(step, user, dryRun, siteSettings)
    case 'update_profile':
      return await executeUpdateProfile(step, user, dryRun)
    case 'add_tag':
      return await executeAddTag(step, user, dryRun)
    case 'webhook':
      return await executeWebhook(step, user, dryRun)
    default:
      return { success: false, message: `Unknown action type: ${actionType}` }
  }
}

async function executeSendEmail(
  step: FlowStep,
  user: UserProfile,
  dryRun: boolean,
  siteSettings: Record<string, string>,
): Promise<{ success: boolean; message: string }> {
  const db = getSupabaseAdmin()
  const config = step.config
  const templateId = config.template_id as string

  if (!templateId) {
    return { success: false, message: 'No template_id configured for send_email action' }
  }

  // Load template
  const { data: template, error: tmplErr } = await db
    .from('email_templates')
    .select('*')
    .eq('id', templateId)
    .eq('is_active', true)
    .single()

  if (tmplErr || !template) {
    return { success: false, message: `Template not found or inactive: ${templateId}` }
  }

  // Pick language
  const lang = user.language || 'da'
  const subject = template.subject[lang] || template.subject['en'] || template.subject['da'] || 'No subject'
  const bodyHtml = template.body_html[lang] || template.body_html['en'] || template.body_html['da'] || ''

  // Build variables
  const siteUrl = siteSettings['site_url'] || 'https://shiftingsource.com'
  const siteName = siteSettings['site_name'] || 'Shifting Source'
  const vars = buildVariableMap(user, {
    site_url: siteUrl,
    site_name: siteName,
    login_url: `${siteUrl}/login`,
    profile_url: `${siteUrl}/profile`,
    unsubscribe_url: `${siteUrl}/profile?unsubscribe=true`,
    ...(config.extra_variables as Record<string, string> || {}),
  })

  const finalSubject = substituteVariables(subject, vars)
  const finalHtml = substituteVariables(bodyHtml, vars)
  const fromEmail = siteSettings['from_email'] || 'noreply@shiftingsource.com'
  const fromName = siteSettings['from_name'] || siteName

  if (dryRun) {
    console.log(`[DRY RUN] Would send "${finalSubject}" to ${user.email}`)
    return { success: true, message: `[DRY RUN] Email "${finalSubject}" → ${user.email}` }
  }

  // Send via Resend
  if (!RESEND_API_KEY) {
    console.log(`[NO API KEY] Would send "${finalSubject}" to ${user.email}`)
    // Still log it
    await logEmailSend(db, user, template, finalSubject, 'sent')
    return { success: true, message: `[NO API KEY] Email logged but not sent: "${finalSubject}" → ${user.email}` }
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [user.email],
        subject: finalSubject,
        html: finalHtml,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      await logEmailSend(db, user, template, finalSubject, 'failed')
      return { success: false, message: `Resend error: ${JSON.stringify(err)}` }
    }

    await logEmailSend(db, user, template, finalSubject, 'sent')
    return { success: true, message: `Email sent: "${finalSubject}" → ${user.email}` }
  } catch (e) {
    await logEmailSend(db, user, template, finalSubject, 'failed')
    return { success: false, message: `Email send failed: ${(e as Error).message}` }
  }
}

async function logEmailSend(
  db: ReturnType<typeof createClient>,
  user: UserProfile,
  template: Record<string, unknown>,
  subject: string,
  status: string,
) {
  await db.from('email_sends').insert({
    user_id: user.id,
    email_address: user.email,
    template_id: template.id,
    subject,
    email_type: template.email_type,
    status,
    sent_at: status === 'sent' ? new Date().toISOString() : null,
  })
}

async function executeUpdateProfile(
  step: FlowStep,
  user: UserProfile,
  dryRun: boolean,
): Promise<{ success: boolean; message: string }> {
  const config = step.config
  const updates = config.updates as Record<string, unknown>

  if (!updates || Object.keys(updates).length === 0) {
    return { success: false, message: 'No profile updates configured' }
  }

  if (dryRun) {
    return { success: true, message: `[DRY RUN] Would update profile: ${JSON.stringify(updates)}` }
  }

  const db = getSupabaseAdmin()
  const { error } = await db
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return { success: false, message: `Profile update failed: ${error.message}` }
  }

  return { success: true, message: `Profile updated: ${JSON.stringify(updates)}` }
}

async function executeAddTag(
  step: FlowStep,
  user: UserProfile,
  dryRun: boolean,
): Promise<{ success: boolean; message: string }> {
  const config = step.config
  const tag = config.tag as string

  if (!tag) {
    return { success: false, message: 'No tag configured' }
  }

  if (dryRun) {
    return { success: true, message: `[DRY RUN] Would add tag "${tag}" to user ${user.id}` }
  }

  // Add tag via lead_status (CRM)
  const db = getSupabaseAdmin()
  const { data: existing } = await db
    .from('lead_status')
    .select('tags')
    .eq('user_id', user.id)
    .single()

  const currentTags: string[] = existing?.tags || []
  if (!currentTags.includes(tag)) {
    currentTags.push(tag)
    await db
      .from('lead_status')
      .upsert({ user_id: user.id, tags: currentTags }, { onConflict: 'user_id' })
  }

  return { success: true, message: `Tag "${tag}" added to user` }
}

async function executeWebhook(
  step: FlowStep,
  user: UserProfile,
  dryRun: boolean,
): Promise<{ success: boolean; message: string }> {
  const config = step.config
  const url = config.webhook_url as string
  const method = (config.method as string || 'POST').toUpperCase()

  if (!url) {
    return { success: false, message: 'No webhook_url configured' }
  }

  if (dryRun) {
    return { success: true, message: `[DRY RUN] Would call webhook: ${method} ${url}` }
  }

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user.id,
        email: user.email,
        first_name: user.first_name,
        tier: user.subscription_tier,
        timestamp: new Date().toISOString(),
      }),
    })

    return {
      success: response.ok,
      message: `Webhook ${method} ${url} → ${response.status}`,
    }
  } catch (e) {
    return { success: false, message: `Webhook failed: ${(e as Error).message}` }
  }
}

async function executeDelayStep(
  step: FlowStep,
  run: FlowRun,
  dryRun: boolean,
): Promise<{ success: boolean; message: string; paused?: boolean }> {
  const config = step.config
  const delayMinutes = Number(config.delay_minutes || 0)
  const delayHours = Number(config.delay_hours || 0)
  const delayDays = Number(config.delay_days || 0)

  const totalMinutes = delayMinutes + (delayHours * 60) + (delayDays * 1440)

  if (totalMinutes <= 0) {
    return { success: true, message: 'No delay configured, continuing' }
  }

  if (dryRun) {
    return { success: true, message: `[DRY RUN] Would pause for ${totalMinutes} minutes` }
  }

  // Calculate resume time
  const resumeAt = new Date(Date.now() + totalMinutes * 60 * 1000).toISOString()

  // Update the run to paused status with resume timestamp
  const db = getSupabaseAdmin()
  await db
    .from('automation_flow_runs')
    .update({
      status: 'paused',
      current_step_id: step.id,
      log: [
        ...run.log,
        {
          step_id: step.id,
          node_type: 'delay',
          message: `Paused for ${totalMinutes} minutes. Resume at ${resumeAt}`,
          resume_at: resumeAt,
          timestamp: new Date().toISOString(),
        },
      ],
    })
    .eq('id', run.id)

  return {
    success: true,
    message: `Paused for ${totalMinutes} min. Resume at ${resumeAt}`,
    paused: true,
  }
}

// ─── Flow Engine ────────────────────────────────────────────────

async function loadSiteSettings(db: ReturnType<typeof createClient>): Promise<Record<string, string>> {
  const { data } = await db
    .from('admin_settings')
    .select('key, value')
    .in('key', ['site_url', 'site_name', 'from_email', 'from_name', 'admin_notification_email'])

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }
  return settings
}

async function loadUser(db: ReturnType<typeof createClient>, userId: string): Promise<UserProfile | null> {
  const { data, error } = await db
    .from('profiles')
    .select('id, email, first_name, last_name, language, subscription_tier, coaching_enabled')
    .eq('id', userId)
    .single()

  if (error || !data) return null
  return data as UserProfile
}

async function executeFlow(
  flowId: string,
  userId: string,
  dryRun = false,
  resumeFromStepId?: string,
  existingRunId?: string,
): Promise<{ run_id: string; status: string; log: Record<string, unknown>[] }> {
  const db = getSupabaseAdmin()

  // Load flow + steps
  const { data: flow, error: flowErr } = await db
    .from('automation_flows')
    .select('*')
    .eq('id', flowId)
    .single()

  if (flowErr || !flow) {
    throw new Error(`Flow not found: ${flowId}`)
  }

  if (!flow.enabled && !dryRun) {
    throw new Error(`Flow "${flow.name}" is disabled`)
  }

  const { data: steps, error: stepsErr } = await db
    .from('automation_flow_steps')
    .select('*')
    .eq('flow_id', flowId)
    .order('step_order')

  if (stepsErr) throw new Error(`Failed to load steps: ${stepsErr.message}`)
  if (!steps || steps.length === 0) throw new Error('Flow has no steps')

  // Load user
  const user = await loadUser(db, userId)
  if (!user) throw new Error(`User not found: ${userId}`)

  // Load site settings
  const siteSettings = await loadSiteSettings(db)

  // Create or resume run
  let run: FlowRun
  if (existingRunId) {
    const { data: existingRun } = await db
      .from('automation_flow_runs')
      .select('*')
      .eq('id', existingRunId)
      .single()

    if (!existingRun) throw new Error(`Run not found: ${existingRunId}`)
    run = existingRun as FlowRun

    // Update status to running
    await db
      .from('automation_flow_runs')
      .update({ status: 'running' })
      .eq('id', run.id)
  } else {
    const { data: newRun, error: runErr } = await db
      .from('automation_flow_runs')
      .insert({
        flow_id: flowId,
        target_user_id: userId,
        status: dryRun ? 'running' : 'running',
        current_step_id: steps[0].id,
        started_at: new Date().toISOString(),
        log: [],
      })
      .select()
      .single()

    if (runErr || !newRun) throw new Error(`Failed to create run: ${runErr?.message}`)
    run = newRun as FlowRun
  }

  const logEntries: Record<string, unknown>[] = [...(run.log || [])]

  // Determine starting point
  let startIndex = 0
  if (resumeFromStepId) {
    const idx = steps.findIndex((s: FlowStep) => s.id === resumeFromStepId)
    if (idx >= 0) startIndex = idx + 1 // Resume from NEXT step
  }

  // Execute steps sequentially
  let finalStatus: RunStatus = 'completed'
  let errorMessage: string | null = null

  for (let i = startIndex; i < steps.length; i++) {
    const step = steps[i] as FlowStep

    // Update current step
    await db
      .from('automation_flow_runs')
      .update({ current_step_id: step.id })
      .eq('id', run.id)

    let result: { success: boolean; message: string; result?: boolean; paused?: boolean }

    try {
      switch (step.node_type) {
        case 'trigger':
          result = await executeTriggerStep(step, user, dryRun)
          break
        case 'condition':
          result = await executeConditionStep(step, user, dryRun)
          break
        case 'action':
          result = await executeActionStep(step, user, dryRun, siteSettings)
          break
        case 'delay':
          result = await executeDelayStep(step, run, dryRun)
          break
        case 'branch':
          result = await executeConditionStep(step, user, dryRun) // Branch is condition with path
          break
        default:
          result = { success: false, message: `Unknown node type: ${step.node_type}` }
      }
    } catch (e) {
      result = { success: false, message: `Step error: ${(e as Error).message}` }
    }

    // Log the step result
    logEntries.push({
      step_id: step.id,
      step_order: step.step_order,
      node_type: step.node_type,
      label: step.label,
      success: result.success,
      message: result.message,
      timestamp: new Date().toISOString(),
    })

    // Handle delay pause
    if (result.paused) {
      finalStatus = 'paused'
      break
    }

    // Handle failure
    if (!result.success) {
      finalStatus = 'failed'
      errorMessage = result.message
      break
    }

    // Handle branching (condition/branch with on_true/on_false paths)
    if ((step.node_type === 'condition' || step.node_type === 'branch') && 'result' in result) {
      const condResult = result.result
      const nextStepId = condResult ? step.on_true_step_id : step.on_false_step_id

      if (nextStepId) {
        // Jump to the specified step
        const jumpIndex = steps.findIndex((s: FlowStep) => s.id === nextStepId)
        if (jumpIndex >= 0) {
          i = jumpIndex - 1 // -1 because the for loop will increment
          logEntries.push({
            step_id: step.id,
            message: `Branch ${condResult ? 'TRUE' : 'FALSE'} → jumping to step ${jumpIndex + 1}`,
            timestamp: new Date().toISOString(),
          })
        }
      } else if (!condResult) {
        // No false path → skip remaining steps
        logEntries.push({
          step_id: step.id,
          message: `Condition FALSE with no false path → flow ends`,
          timestamp: new Date().toISOString(),
        })
        finalStatus = 'skipped'
        break
      }
    }
  }

  // Finalize run
  await db
    .from('automation_flow_runs')
    .update({
      status: finalStatus,
      completed_at: finalStatus !== 'paused' ? new Date().toISOString() : null,
      error_message: errorMessage,
      log: logEntries,
    })
    .eq('id', run.id)

  return {
    run_id: run.id,
    status: finalStatus,
    log: logEntries,
  }
}

/** Fire all enabled flows matching a trigger type for a user */
async function triggerFlows(
  triggerType: string,
  userId: string,
  dryRun = false,
): Promise<{ results: Record<string, unknown>[] }> {
  const db = getSupabaseAdmin()

  const { data: flows } = await db
    .from('automation_flows')
    .select('id, name')
    .eq('trigger_type', triggerType)
    .eq('enabled', true)

  if (!flows || flows.length === 0) {
    return { results: [{ message: `No enabled flows for trigger: ${triggerType}` }] }
  }

  const results: Record<string, unknown>[] = []

  for (const flow of flows) {
    try {
      const result = await executeFlow(flow.id, userId, dryRun)
      results.push({ flow_id: flow.id, flow_name: flow.name, ...result })
    } catch (e) {
      results.push({
        flow_id: flow.id,
        flow_name: flow.name,
        status: 'failed',
        error: (e as Error).message,
      })
    }
  }

  return { results }
}

/** Resume paused runs that are past their delay time */
async function resumePausedRuns(): Promise<{ resumed: number; results: Record<string, unknown>[] }> {
  const db = getSupabaseAdmin()

  // Find paused runs where the delay has expired
  const { data: pausedRuns } = await db
    .from('automation_flow_runs')
    .select('*')
    .eq('status', 'paused')

  if (!pausedRuns || pausedRuns.length === 0) {
    return { resumed: 0, results: [] }
  }

  const now = Date.now()
  const results: Record<string, unknown>[] = []
  let resumed = 0

  for (const run of pausedRuns) {
    // Check the last log entry for resume_at
    const logs = (run.log || []) as Record<string, unknown>[]
    const lastLog = logs[logs.length - 1]
    const resumeAt = lastLog?.resume_at as string

    if (resumeAt && new Date(resumeAt).getTime() <= now) {
      try {
        const result = await executeFlow(
          run.flow_id,
          run.target_user_id!,
          false,
          run.current_step_id || undefined,
          run.id,
        )
        results.push({ run_id: run.id, ...result })
        resumed++
      } catch (e) {
        results.push({ run_id: run.id, error: (e as Error).message })
      }
    }
  }

  return { resumed, results }
}

// ─── HTTP Handler ───────────────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'run': {
        const { flow_id, user_id } = body
        if (!flow_id || !user_id) {
          return jsonResponse({ error: 'flow_id and user_id required' }, 400)
        }
        const result = await executeFlow(flow_id, user_id)
        return jsonResponse({ success: true, ...result })
      }

      case 'trigger': {
        const { trigger_type, user_id } = body
        if (!trigger_type || !user_id) {
          return jsonResponse({ error: 'trigger_type and user_id required' }, 400)
        }
        const result = await triggerFlows(trigger_type, user_id)
        return jsonResponse({ success: true, ...result })
      }

      case 'resume': {
        const result = await resumePausedRuns()
        return jsonResponse({ success: true, ...result })
      }

      case 'test': {
        const { flow_id, user_id } = body
        if (!flow_id || !user_id) {
          return jsonResponse({ error: 'flow_id and user_id required' }, 400)
        }
        const result = await executeFlow(flow_id, user_id, true)
        return jsonResponse({ success: true, dry_run: true, ...result })
      }

      default:
        return jsonResponse({ error: `Unknown action: ${action}` }, 400)
    }
  } catch (e) {
    console.error('Automation error:', e)
    return jsonResponse({
      error: (e as Error).message || 'Internal error',
    }, 500)
  }
})
