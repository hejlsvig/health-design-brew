// Supabase Edge Function: social-publisher
// Handles OAuth flows and publishing to Instagram, Facebook, YouTube, TikTok
// Deploy: supabase functions deploy social-publisher
// Required secrets:
//   META_APP_ID, META_APP_SECRET
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
//   TIKTOK_CLIENT_KEY, TIKTOK_CLIENT_SECRET

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// ── Types ──────────────────────────────────────────────

type Platform = 'instagram' | 'facebook' | 'youtube' | 'tiktok'

interface OAuthConfig {
  clientId: string
  clientSecret: string
  authUrl: string
  tokenUrl: string
  scopes: string[]
}

// ── Platform OAuth Configs ─────────────────────────────

function getOAuthConfig(platform: Platform): OAuthConfig {
  switch (platform) {
    case 'instagram':
    case 'facebook':
      return {
        clientId: Deno.env.get('META_APP_ID') ?? '',
        clientSecret: Deno.env.get('META_APP_SECRET') ?? '',
        authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
        tokenUrl: 'https://graph.facebook.com/v21.0/oauth/access_token',
        scopes: platform === 'instagram'
          ? ['instagram_basic', 'instagram_content_publish', 'pages_show_list', 'pages_read_engagement']
          : ['pages_manage_posts', 'pages_read_engagement', 'pages_show_list'],
      }
    case 'youtube':
      return {
        clientId: Deno.env.get('GOOGLE_CLIENT_ID') ?? '',
        clientSecret: Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '',
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        scopes: ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube'],
      }
    case 'tiktok':
      return {
        clientId: Deno.env.get('TIKTOK_CLIENT_KEY') ?? '',
        clientSecret: Deno.env.get('TIKTOK_CLIENT_SECRET') ?? '',
        authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
        tokenUrl: 'https://open.tiktokapis.com/v2/oauth/token/',
        scopes: ['user.info.basic', 'video.publish', 'video.upload'],
      }
  }
}

// ── Helpers ────────────────────────────────────────────

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status)
}

async function getAuthenticatedUser(req: Request) {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Check admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') return null

  return { user, supabase, authHeader }
}

function getServiceClient() {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )
}

// ── OAuth: Start Flow ──────────────────────────────────

function handleOAuthStart(platform: Platform, redirectUri: string): Response {
  const config = getOAuthConfig(platform)
  if (!config.clientId) {
    return errorResponse(`OAuth not configured for ${platform}. Set the required secrets.`)
  }

  let authUrl: string

  if (platform === 'tiktok') {
    const params = new URLSearchParams({
      client_key: config.clientId,
      scope: config.scopes.join(','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state: platform,
    })
    authUrl = `${config.authUrl}?${params}`
  } else {
    const params = new URLSearchParams({
      client_id: config.clientId,
      scope: config.scopes.join(platform === 'youtube' ? ' ' : ','),
      response_type: 'code',
      redirect_uri: redirectUri,
      state: platform,
      access_type: platform === 'youtube' ? 'offline' : '',
    })
    authUrl = `${config.authUrl}?${params}`
  }

  // Return redirect URL for the frontend to navigate to
  return jsonResponse({ authUrl })
}

// ── OAuth: Callback (Exchange Code for Token) ──────────

async function handleOAuthCallback(
  platform: Platform,
  code: string,
  redirectUri: string,
  userId: string
): Promise<Response> {
  const config = getOAuthConfig(platform)
  const db = getServiceClient()

  try {
    // Exchange code for token
    let tokenData: Record<string, unknown>

    if (platform === 'tiktok') {
      const res = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: config.clientId,
          client_secret: config.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      })
      tokenData = await res.json()
    } else {
      const body: Record<string, string> = {
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }

      const res = await fetch(config.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(body),
      })
      tokenData = await res.json()
    }

    const accessToken = (tokenData.access_token as string) || (tokenData.data as Record<string, string>)?.access_token
    const refreshToken = (tokenData.refresh_token as string) || (tokenData.data as Record<string, string>)?.refresh_token
    const expiresIn = (tokenData.expires_in as number) || (tokenData.data as Record<string, number>)?.expires_in

    if (!accessToken) {
      return errorResponse('Failed to obtain access token: ' + JSON.stringify(tokenData))
    }

    // Get user info from platform
    let platformUserId = ''
    let platformUsername = ''
    let pageId: string | null = null
    let pageName: string | null = null

    if (platform === 'instagram' || platform === 'facebook') {
      // Get Facebook pages
      const pagesRes = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`
      )
      const pagesData = await pagesRes.json()
      const pages = pagesData.data || []

      if (platform === 'instagram' && pages.length > 0) {
        // Get Instagram Business Account linked to first page
        const page = pages[0]
        pageId = page.id
        pageName = page.name
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token || accessToken}`
        )
        const igData = await igRes.json()
        if (igData.instagram_business_account?.id) {
          platformUserId = igData.instagram_business_account.id
          // Get IG username
          const igUserRes = await fetch(
            `https://graph.facebook.com/v21.0/${platformUserId}?fields=username&access_token=${page.access_token || accessToken}`
          )
          const igUserData = await igUserRes.json()
          platformUsername = igUserData.username ? `@${igUserData.username}` : ''
        }
        // Use page access token (long-lived) for Instagram
        // Store the page access token instead
        if (page.access_token) {
          // Exchange for long-lived token
          const llRes = await fetch(
            `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${config.clientId}&client_secret=${config.clientSecret}&fb_exchange_token=${page.access_token}`
          )
          const llData = await llRes.json()
          if (llData.access_token) {
            // Save with long-lived page token
            const { error } = await db.from('social_connected_accounts').upsert({
              user_id: userId,
              platform,
              platform_user_id: platformUserId,
              platform_username: platformUsername,
              access_token: llData.access_token,
              refresh_token: refreshToken || null,
              token_expires_at: llData.expires_in
                ? new Date(Date.now() + llData.expires_in * 1000).toISOString()
                : null,
              scopes: config.scopes,
              page_id: pageId,
              page_name: pageName,
              is_active: true,
            }, { onConflict: 'user_id,platform,platform_user_id' })

            if (error) return errorResponse('Database error: ' + error.message)
            return jsonResponse({ success: true, platform, username: platformUsername })
          }
        }
      } else if (platform === 'facebook' && pages.length > 0) {
        const page = pages[0]
        pageId = page.id
        pageName = page.name
        platformUserId = page.id
        platformUsername = page.name
      }
    } else if (platform === 'youtube') {
      const res = await fetch(
        'https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      if (data.items?.length > 0) {
        platformUserId = data.items[0].id
        platformUsername = data.items[0].snippet?.title || ''
      }
    } else if (platform === 'tiktok') {
      const openId = (tokenData.data as Record<string, string>)?.open_id || ''
      platformUserId = openId
      // Get TikTok user info
      const res = await fetch(
        'https://open.tiktokapis.com/v2/user/info/?fields=display_name,avatar_url',
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )
      const data = await res.json()
      platformUsername = data.data?.user?.display_name || ''
    }

    // Save to database
    const expiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null

    const { error } = await db.from('social_connected_accounts').upsert({
      user_id: userId,
      platform,
      platform_user_id: platformUserId || `${platform}_${userId}`,
      platform_username: platformUsername,
      access_token: accessToken,
      refresh_token: refreshToken || null,
      token_expires_at: expiresAt,
      scopes: config.scopes,
      page_id: pageId,
      page_name: pageName,
      is_active: true,
    }, { onConflict: 'user_id,platform,platform_user_id' })

    if (error) return errorResponse('Database error: ' + error.message)

    return jsonResponse({ success: true, platform, username: platformUsername })

  } catch (err) {
    return errorResponse(`OAuth callback failed: ${(err as Error).message}`)
  }
}

// ── Publishing: Platform Handlers ──────────────────────

async function publishToInstagram(
  account: Record<string, unknown>,
  text: string,
  mediaUrls: string[],
  mediaType: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const accessToken = account.access_token as string
  const igUserId = account.platform_user_id as string

  try {
    if (mediaType === 'video') {
      // Video: Create media container → wait → publish
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'VIDEO',
            video_url: mediaUrls[0],
            caption: text,
            access_token: accessToken,
          }),
        }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message }

      // Poll until ready
      const creationId = container.id
      let ready = false
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 5000))
        const statusRes = await fetch(
          `https://graph.facebook.com/v21.0/${creationId}?fields=status_code&access_token=${accessToken}`
        )
        const statusData = await statusRes.json()
        if (statusData.status_code === 'FINISHED') { ready = true; break }
        if (statusData.status_code === 'ERROR') return { success: false, error: 'Video processing failed' }
      }
      if (!ready) return { success: false, error: 'Video processing timeout' }

      // Publish
      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: creationId, access_token: accessToken }),
        }
      )
      const publishData = await publishRes.json()
      if (publishData.error) return { success: false, error: publishData.error.message }
      return { success: true, postId: publishData.id }

    } else if (mediaType === 'carousel' && mediaUrls.length > 1) {
      // Carousel: Create children → Create carousel container → Publish
      const childIds: string[] = []
      for (const url of mediaUrls) {
        const childRes = await fetch(
          `https://graph.facebook.com/v21.0/${igUserId}/media`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              image_url: url,
              is_carousel_item: true,
              access_token: accessToken,
            }),
          }
        )
        const child = await childRes.json()
        if (child.error) return { success: false, error: child.error.message }
        childIds.push(child.id)
      }

      const carouselRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: childIds,
            caption: text,
            access_token: accessToken,
          }),
        }
      )
      const carousel = await carouselRes.json()
      if (carousel.error) return { success: false, error: carousel.error.message }

      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: carousel.id, access_token: accessToken }),
        }
      )
      const publishData = await publishRes.json()
      if (publishData.error) return { success: false, error: publishData.error.message }
      return { success: true, postId: publishData.id }

    } else {
      // Single image
      const containerRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaUrls[0],
            caption: text,
            access_token: accessToken,
          }),
        }
      )
      const container = await containerRes.json()
      if (container.error) return { success: false, error: container.error.message }

      const publishRes = await fetch(
        `https://graph.facebook.com/v21.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ creation_id: container.id, access_token: accessToken }),
        }
      )
      const publishData = await publishRes.json()
      if (publishData.error) return { success: false, error: publishData.error.message }
      return { success: true, postId: publishData.id }
    }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

async function publishToFacebook(
  account: Record<string, unknown>,
  text: string,
  mediaUrls: string[],
  mediaType: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const accessToken = account.access_token as string
  const pageId = account.page_id as string || account.platform_user_id as string

  try {
    if (mediaType === 'video' && mediaUrls.length > 0) {
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/videos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_url: mediaUrls[0],
            description: text,
            access_token: accessToken,
          }),
        }
      )
      const data = await res.json()
      if (data.error) return { success: false, error: data.error.message }
      return { success: true, postId: data.id }

    } else if (mediaUrls.length > 0) {
      // Photo post
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/photos`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: mediaUrls[0],
            message: text,
            access_token: accessToken,
          }),
        }
      )
      const data = await res.json()
      if (data.error) return { success: false, error: data.error.message }
      return { success: true, postId: data.id, postUrl: `https://facebook.com/${data.post_id || data.id}` }

    } else {
      // Text-only
      const res = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}/feed`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text,
            access_token: accessToken,
          }),
        }
      )
      const data = await res.json()
      if (data.error) return { success: false, error: data.error.message }
      return { success: true, postId: data.id, postUrl: `https://facebook.com/${data.id}` }
    }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

async function publishToYouTube(
  account: Record<string, unknown>,
  text: string,
  mediaUrls: string[],
  _mediaType: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const accessToken = account.access_token as string

  try {
    if (!mediaUrls.length) return { success: false, error: 'YouTube requires a video' }

    // Download video from URL
    const videoRes = await fetch(mediaUrls[0])
    const videoBlob = await videoRes.blob()

    // Extract title from first line of text, rest is description
    const lines = text.split('\n')
    const title = lines[0].slice(0, 100) || 'Video'
    const description = lines.slice(1).join('\n') || text

    // Upload using resumable upload
    const initRes = await fetch(
      'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': videoBlob.type || 'video/mp4',
          'X-Upload-Content-Length': String(videoBlob.size),
        },
        body: JSON.stringify({
          snippet: { title, description, tags: ['keto', 'faste', 'shifting source'] },
          status: { privacyStatus: 'public' },
        }),
      }
    )

    const uploadUrl = initRes.headers.get('Location')
    if (!uploadUrl) return { success: false, error: 'Failed to initiate YouTube upload' }

    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': videoBlob.type || 'video/mp4' },
      body: videoBlob,
    })

    const uploadData = await uploadRes.json()
    if (uploadData.error) return { success: false, error: uploadData.error.message }

    return {
      success: true,
      postId: uploadData.id,
      postUrl: `https://youtube.com/watch?v=${uploadData.id}`,
    }
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

async function publishToTikTok(
  account: Record<string, unknown>,
  text: string,
  mediaUrls: string[],
  _mediaType: string
): Promise<{ success: boolean; postId?: string; postUrl?: string; error?: string }> {
  const accessToken = account.access_token as string

  try {
    if (!mediaUrls.length) return { success: false, error: 'TikTok requires a video' }

    // Step 1: Init video upload
    const initRes = await fetch(
      'https://open.tiktokapis.com/v2/post/publish/video/init/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          post_info: {
            title: text.slice(0, 150),
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: 'PULL_FROM_URL',
            video_url: mediaUrls[0],
          },
        }),
      }
    )

    const initData = await initRes.json()
    if (initData.error?.code) return { success: false, error: initData.error.message || 'TikTok upload init failed' }

    const publishId = initData.data?.publish_id
    if (!publishId) return { success: false, error: 'No publish_id returned' }

    // Step 2: Check status (TikTok processes async)
    // In production, this should be handled by a webhook or polling job
    // For now, poll a few times
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 5000))
      const statusRes = await fetch(
        'https://open.tiktokapis.com/v2/post/publish/status/fetch/',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ publish_id: publishId }),
        }
      )
      const statusData = await statusRes.json()
      const status = statusData.data?.status
      if (status === 'PUBLISH_COMPLETE') {
        return { success: true, postId: publishId }
      }
      if (status === 'FAILED') {
        return { success: false, error: statusData.data?.fail_reason || 'TikTok publish failed' }
      }
    }

    return { success: true, postId: publishId } // Assume queued
  } catch (err) {
    return { success: false, error: (err as Error).message }
  }
}

// ── Main Handler ───────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // GET requests for OAuth redirect
  if (req.method === 'GET') {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const platform = url.searchParams.get('platform') as Platform
    const redirectUri = url.searchParams.get('redirect_uri') || ''

    if (action === 'oauth' && platform) {
      return handleOAuthStart(platform, redirectUri)
    }

    return errorResponse('Invalid request')
  }

  // POST requests require authentication
  const auth = await getAuthenticatedUser(req)
  if (!auth) return errorResponse('Ikke autoriseret', 401)

  const { user, supabase: userDb } = auth
  const body = await req.json()
  const { action } = body

  switch (action) {
    // ── OAuth Callback ──
    case 'oauth_callback': {
      const { platform, code, redirect_uri } = body
      if (!platform || !code) return errorResponse('Missing platform or code')
      return handleOAuthCallback(platform, code, redirect_uri, user.id)
    }

    // ── Publish ──
    case 'publish': {
      const { postId } = body
      if (!postId) return errorResponse('Missing postId')

      const db = getServiceClient()

      // Get the post
      const { data: post, error: postError } = await db
        .from('social_publish_queue')
        .select('*')
        .eq('id', postId)
        .single()

      if (postError || !post) return errorResponse('Post not found')

      // Update status
      await db.from('social_publish_queue').update({ status: 'publishing' }).eq('id', postId)

      // Get connected accounts for the platforms
      const { data: accounts } = await db
        .from('social_connected_accounts')
        .select('*')
        .eq('user_id', post.user_id)
        .eq('is_active', true)
        .in('platform', post.platforms)

      if (!accounts?.length) {
        await db.from('social_publish_queue').update({ status: 'failed' }).eq('id', postId)
        return errorResponse('No connected accounts for selected platforms')
      }

      const results = []
      let allSuccess = true

      for (const account of accounts) {
        let result: { success: boolean; postId?: string; postUrl?: string; error?: string }

        const publishFn = {
          instagram: publishToInstagram,
          facebook: publishToFacebook,
          youtube: publishToYouTube,
          tiktok: publishToTikTok,
        }[account.platform as Platform]

        if (publishFn) {
          result = await publishFn(
            account,
            post.content_text || '',
            post.media_urls || [],
            post.media_type || 'text'
          )
        } else {
          result = { success: false, error: `Unknown platform: ${account.platform}` }
        }

        // Log result
        const logEntry = {
          queue_id: postId,
          account_id: account.id,
          platform: account.platform,
          status: result.success ? 'success' : 'failed',
          platform_post_id: result.postId || null,
          platform_post_url: result.postUrl || null,
          error_message: result.error || null,
          completed_at: new Date().toISOString(),
        }

        const { data: log } = await db.from('social_publish_log').insert(logEntry).select().single()
        results.push(log)

        if (!result.success) allSuccess = false
      }

      // Update queue status
      const finalStatus = allSuccess ? 'published' : results.some((r: Record<string, unknown>) => r?.status === 'success') ? 'partial' : 'failed'
      await db.from('social_publish_queue').update({
        status: finalStatus,
        published_at: allSuccess ? new Date().toISOString() : null,
      }).eq('id', postId)

      return jsonResponse({ success: allSuccess, results })
    }

    // ── Refresh Token ──
    case 'refresh_token': {
      const { accountId } = body
      if (!accountId) return errorResponse('Missing accountId')

      const db = getServiceClient()
      const { data: account } = await db
        .from('social_connected_accounts')
        .select('*')
        .eq('id', accountId)
        .single()

      if (!account?.refresh_token) return errorResponse('No refresh token available')

      const config = getOAuthConfig(account.platform as Platform)
      let newToken: string | null = null

      if (account.platform === 'youtube') {
        const res = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        const data = await res.json()
        newToken = data.access_token
        if (newToken) {
          await db.from('social_connected_accounts').update({
            access_token: newToken,
            token_expires_at: data.expires_in
              ? new Date(Date.now() + data.expires_in * 1000).toISOString()
              : null,
          }).eq('id', accountId)
        }
      } else if (account.platform === 'tiktok') {
        const res = await fetch(config.tokenUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_key: config.clientId,
            client_secret: config.clientSecret,
            refresh_token: account.refresh_token,
            grant_type: 'refresh_token',
          }),
        })
        const data = await res.json()
        newToken = data.data?.access_token
        if (newToken) {
          await db.from('social_connected_accounts').update({
            access_token: newToken,
            refresh_token: data.data?.refresh_token || account.refresh_token,
            token_expires_at: data.data?.expires_in
              ? new Date(Date.now() + data.data.expires_in * 1000).toISOString()
              : null,
          }).eq('id', accountId)
        }
      }

      return jsonResponse({ success: !!newToken })
    }

    default:
      return errorResponse('Unknown action: ' + action)
  }
})
