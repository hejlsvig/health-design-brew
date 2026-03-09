/**
 * Supabase Edge Function: upload-image-ftp
 *
 * Downloads an image from a URL and uploads it to one.com via SFTP.
 * Uses npm:ssh2-sftp-client (pure JS, no native dependencies).
 *
 * Request body:
 *   { url: string, folder: "articles" | "recipes", filename?: string }
 *
 * Returns:
 *   { publicUrl: string, path: string }
 *
 * SFTP credentials are read from admin_settings:
 *   sftp_host, sftp_username, sftp_password (falls back to ftp_* keys for backwards compat)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Buffer } from 'node:buffer'
import SftpClient from 'npm:ssh2-sftp-client@11'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Helper: Get settings from admin_settings ──

async function getSettings(supabaseClient: any): Promise<Record<string, string>> {
  const { data, error } = await supabaseClient
    .from('admin_settings')
    .select('key, value')
    .in('key', [
      'sftp_host', 'sftp_username', 'sftp_password', 'sftp_port',
      'ftp_host', 'ftp_username', 'ftp_password', // backwards compat
      'site_url',
    ])

  if (error) throw new Error(`Failed to fetch settings: ${error.message}`)

  const settings: Record<string, string> = {}
  for (const row of data || []) {
    settings[row.key] = row.value
  }
  return settings
}

// ── Main handler ──

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parse request
    const { url, folder, filename } = await req.json()

    if (!url || !folder) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: url, folder' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!['articles', 'recipes'].includes(folder)) {
      return new Response(
        JSON.stringify({ error: 'folder must be "articles" or "recipes"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Verify auth
    const authHeader = req.headers.get('authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabaseClient = createClient(supabaseUrl, serviceRoleKey)

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      console.error('[upload-sftp] Auth error:', authError?.message || 'No user returned')
      return new Response(
        JSON.stringify({ error: `Autentificering fejlede: ${authError?.message || 'Ugyldig eller udløbet token'}. Log ud og ind igen.` }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[upload-sftp] User verified: ${user.id} (${user.email})`)

    const { data: crmUser, error: crmError } = await supabaseClient
      .from('crm_users')
      .select('role, active')
      .eq('id', user.id)
      .single()

    if (crmError) {
      console.error('[upload-sftp] crm_users lookup error:', crmError.message)
      return new Response(
        JSON.stringify({ error: `Bruger ikke fundet i CRM-systemet. Kontakt admin. (${crmError.message})` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    if (!crmUser || crmUser.role !== 'admin' || !crmUser.active) {
      console.error(`[upload-sftp] Access denied: role=${crmUser?.role}, active=${crmUser?.active}`)
      return new Response(
        JSON.stringify({ error: `Adgang nægtet — kræver admin-rolle. Din rolle: ${crmUser?.role || 'ukendt'}` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Get SFTP settings (with fallback to ftp_* keys for backwards compat)
    const settings = await getSettings(supabaseClient)
    const sftpHost = settings.sftp_host || settings.ftp_host
    const sftpUser = settings.sftp_username || settings.ftp_username
    const sftpPass = settings.sftp_password || settings.ftp_password
    const sftpPort = parseInt(settings.sftp_port || '22', 10)
    const siteUrl = settings.site_url || 'https://shiftingsource.com'

    if (!sftpHost || !sftpUser || !sftpPass) {
      return new Response(
        JSON.stringify({ error: 'SFTP-credentials ikke konfigureret. Sæt sftp_host, sftp_username, sftp_password i Admin → Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[upload-sftp] Downloading image from: ${url}`)

    // Download image
    const imgResponse = await fetch(url, {
      headers: { 'Accept': 'image/*', 'User-Agent': 'ShiftingSource/1.0' },
      redirect: 'follow',
    })

    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Kunne ikke downloade billede: ${imgResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const imageBuffer = Buffer.from(await imgResponse.arrayBuffer())
    const contentType = imgResponse.headers.get('Content-Type') || 'image/png'

    // Determine file extension from content type
    let ext = 'png'
    if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
    else if (contentType.includes('png')) ext = 'png'

    // Build filename
    const finalFilename = filename || `ai-${Date.now()}.${ext}`

    console.log(`[upload-sftp] Connecting to ${sftpHost}:${sftpPort} ...`)

    // Upload via SFTP
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

      // Detect the correct webroot path
      const homeDir = await sftp.cwd()
      console.log(`[upload-sftp] Home directory (cwd): ${homeDir}`)

      // Thorough SFTP exploration to find the webroot
      // CI/CD uses: mirror -R dist/ webroots/by-route/shiftingsource.com_/
      // So we need to find webroots/by-route/shiftingsource.com_/ relative to SFTP root
      let webRoot = ''

      // Step 1: Explore SFTP root '/' — this is the chroot root, may differ from cwd
      try {
        const rootList = await sftp.list('/')
        const rootDirs = rootList.filter((f: any) => f.type === 'd').map((f: any) => f.name)
        console.log(`[upload-sftp] Root (/) directories: ${rootDirs.join(', ')}`)
      } catch (e: any) {
        console.log(`[upload-sftp] Cannot list /: ${e.message}`)
      }

      // Step 2: Try all possible paths — including from SFTP root
      const candidates = [
        // CI/CD uses this RELATIVE path — try it from root
        '/webroots/by-route/shiftingsource.com_',
        '/webroots',
        // Try relative from cwd
        'webroots/by-route/shiftingsource.com_',
        // Extract customer base and try absolute
        ...(() => {
          const usersIndex = homeDir.indexOf('/users/')
          if (usersIndex > 0) {
            const base = homeDir.substring(0, usersIndex)
            return [
              `${base}/webroots/by-route/shiftingsource.com_`,
              `${base}/webroots`,
            ]
          }
          return []
        })(),
        // Relative navigation from home
        `${homeDir}/../../webroots/by-route/shiftingsource.com_`,
        // Fallback: common webroot paths
        `${homeDir}/www`,
        `${homeDir}/public_html`,
        `${homeDir}/dist`,
      ]

      for (const candidate of candidates) {
        try {
          const exists = await sftp.exists(candidate)
          console.log(`[upload-sftp] Checking: ${candidate} → ${exists || 'not found'}`)
          if (exists === 'd' || exists === 'l') {  // 'd' = directory, 'l' = symlink
            webRoot = candidate
            break
          }
        } catch (e: any) {
          console.log(`[upload-sftp] Error checking ${candidate}: ${e.message}`)
        }
      }

      if (!webRoot) {
        // Last resort: list home directory for debugging
        const homeList = await sftp.list(homeDir)
        const allEntries = homeList.map((f: any) => `${f.name}(${f.type}${f.type === 'l' ? '→symlink' : ''})`).join(', ')
        console.log(`[upload-sftp] Home entries: ${allEntries}`)
        throw new Error(`Kunne ikke finde webroot. Root dirs logged above. Home: ${homeDir}`)
      }

      console.log(`[upload-sftp] Using webroot: ${webRoot}`)

      // Ensure images/folder directory exists
      const imagesDir = `${webRoot}/images`
      const folderDir = `${webRoot}/images/${folder}`

      if (!(await sftp.exists(imagesDir))) {
        console.log(`[upload-sftp] Creating: ${imagesDir}`)
        await sftp.mkdir(imagesDir, true)
      }

      if (!(await sftp.exists(folderDir))) {
        console.log(`[upload-sftp] Creating: ${folderDir}`)
        await sftp.mkdir(folderDir, true)
      }

      // Upload the file
      const remotePath = `${folderDir}/${finalFilename}`
      console.log(`[upload-sftp] Uploading ${imageBuffer.length} bytes to ${remotePath}`)
      await sftp.put(imageBuffer, remotePath)
      await sftp.end()

      console.log(`[upload-sftp] SFTP upload complete`)
    } catch (sftpErr: any) {
      console.error('[upload-sftp] SFTP error:', sftpErr)
      try { await sftp.end() } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: `SFTP upload fejlede: ${sftpErr.message}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build public URL
    const publicUrl = `${siteUrl.replace(/\/$/, '')}/images/${folder}/${finalFilename}`

    console.log(`[upload-sftp] Upload complete: ${publicUrl}`)

    return new Response(
      JSON.stringify({ publicUrl, path: `images/${folder}/${finalFilename}` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err: any) {
    console.error('[upload-sftp] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
