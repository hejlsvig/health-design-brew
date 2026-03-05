/**
 * Supabase Edge Function: proxy-kieai
 * Proxies Kie.ai Nanobanana Pro API calls server-side.
 * Solves CORS issues and keeps the API key secure (not exposed in browser).
 *
 * Endpoints:
 *   POST { action: "createTask", prompt, aspectRatio }
 *   POST { action: "recordInfo", taskId }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const KIEAI_BASE = 'https://api.kie.ai/api/v1/jobs'

/** Helper to return JSON with CORS headers */
function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

/** Fetch API key from admin_settings table */
async function getKieaiApiKey(authHeader: string): Promise<string | null> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Verify the caller is an admin
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabase.auth.getUser(token)

  if (authError || !user) {
    return null
  }

  // Check admin status via crm_users (matches frontend AuthContext logic)
  const { data: crmUser } = await supabase
    .from('crm_users')
    .select('role, active')
    .eq('id', user.id)
    .single()

  if (!crmUser || crmUser.role !== 'admin' || !crmUser.active) {
    return null
  }

  // Get the API key
  const { data } = await supabase
    .from('admin_settings')
    .select('value')
    .eq('key', 'kieai_api_key')
    .single()

  return data?.value || null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization') || ''
    const { action, prompt, aspectRatio, taskId } = await req.json()

    // Get API key from database (also verifies admin)
    const apiKey = await getKieaiApiKey(authHeader)
    if (!apiKey) {
      return jsonResponse({
        error: 'Ikke autoriseret eller Kie.ai API key mangler.',
        code: 'AUTH_OR_KEY_MISSING',
      }, 401)
    }

    // -- createTask --
    if (action === 'createTask') {
      if (!prompt) {
        return jsonResponse({ error: 'Manglende prompt parameter' }, 400)
      }

      console.log(`[proxy-kieai] Creating task (aspect: ${aspectRatio || '16:9'})...`)

      const createResponse = await fetch(`${KIEAI_BASE}/createTask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'nano-banana-pro',
          input: {
            prompt,
            aspect_ratio: aspectRatio || '16:9',
            resolution: '1K',
            output_format: 'png',
          },
        }),
      })

      const responseText = await createResponse.text()
      console.log(`[proxy-kieai] createTask response: ${createResponse.status}`, responseText.slice(0, 500))

      if (!createResponse.ok) {
        let errorMsg = `Kie.ai API fejl: ${createResponse.status}`
        try {
          const errJson = JSON.parse(responseText)
          errorMsg = errJson?.msg || errJson?.message || errJson?.error || errorMsg
        } catch { /* ignore parse error */ }

        return jsonResponse({
          error: errorMsg,
          code: 'KIEAI_CREATE_FAILED',
          status: createResponse.status,
        }, 502)
      }

      let data: Record<string, unknown>
      try {
        data = JSON.parse(responseText)
      } catch {
        return jsonResponse({
          error: 'Kie.ai returnerede ugyldigt JSON',
          code: 'KIEAI_INVALID_JSON',
        }, 502)
      }

      // Extract taskId from various response formats
      const resultTaskId = (data.data as any)?.taskId
        || data.taskId
        || (data.data as any)?.task_id
        || data.task_id

      if (!resultTaskId) {
        console.error('[proxy-kieai] No taskId in response:', JSON.stringify(data))
        return jsonResponse({
          error: 'Intet task ID i Kie.ai respons',
          code: 'KIEAI_NO_TASK_ID',
          responseKeys: Object.keys(data),
        }, 502)
      }

      return jsonResponse({ taskId: resultTaskId })
    }

    // -- recordInfo (poll) --
    if (action === 'recordInfo') {
      if (!taskId) {
        return jsonResponse({ error: 'Manglende taskId parameter' }, 400)
      }

      const pollUrl = `${KIEAI_BASE}/recordInfo?taskId=${encodeURIComponent(taskId)}`
      const pollResponse = await fetch(pollUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}` },
      })

      if (!pollResponse.ok) {
        return jsonResponse({
          error: `Poll fejlede: ${pollResponse.status}`,
          code: 'KIEAI_POLL_FAILED',
        }, 502)
      }

      const pollData = await pollResponse.json()
      const state = pollData?.data?.state

      // Pass through the result
      return jsonResponse({
        state,
        resultJson: pollData?.data?.resultJson || null,
        failMsg: pollData?.data?.failMsg || null,
      })
    }

    return jsonResponse({ error: `Ukendt action: ${action}` }, 400)

  } catch (err) {
    console.error('[proxy-kieai] Error:', err)
    return jsonResponse({
      error: err.message || 'Intern server fejl',
      code: 'INTERNAL_ERROR',
    }, 500)
  }
})
