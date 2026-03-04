/**
 * Supabase Edge Function: proxy-image
 * Downloads a remote image server-side and returns it as binary.
 * Solves CORS issues when fetching AI-generated images from external services
 * like Kie.ai (tempfile.aiquickdraw.com).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Only allow image downloads from these domains
const ALLOWED_DOMAINS = [
  'tempfile.aiquickdraw.com',
  'api.kie.ai',
  'cdn.kie.ai',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Missing or invalid "url" parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Validate URL
    let parsedUrl: URL
    try {
      parsedUrl = new URL(url)
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Security: only allow whitelisted domains
    if (!ALLOWED_DOMAINS.some(d => parsedUrl.hostname === d || parsedUrl.hostname.endsWith('.' + d))) {
      return new Response(
        JSON.stringify({ error: `Domain not allowed: ${parsedUrl.hostname}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Fetch the image server-side (no CORS issues here)
    const imgResponse = await fetch(parsedUrl.toString(), {
      headers: {
        'Accept': 'image/*',
        'User-Agent': 'ShiftingSource/1.0',
      },
      redirect: 'follow',
    })

    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to fetch image: ${imgResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const contentType = imgResponse.headers.get('Content-Type') || 'image/png'
    const imageData = await imgResponse.arrayBuffer()

    // Return the image binary with CORS headers
    return new Response(imageData, {
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    })

  } catch (err) {
    console.error('[proxy-image] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
