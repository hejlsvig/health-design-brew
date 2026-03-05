/**
 * Supabase Edge Function: upload-image-ftp
 *
 * Downloads an image from a URL and uploads it to one.com via FTP.
 * Uses passive mode FTP with Deno.connect() for TCP connections.
 *
 * Request body:
 *   { url: string, folder: "articles" | "recipes", filename?: string }
 *
 * Returns:
 *   { publicUrl: string, path: string }
 *
 * FTP credentials are read from admin_settings (ftp_host, ftp_username, ftp_password).
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Minimal FTP Client ──────────────────────────────────────────────

class FtpClient {
  private conn!: Deno.Conn
  private encoder = new TextEncoder()
  private decoder = new TextDecoder()

  async connect(host: string, port = 21): Promise<string> {
    this.conn = await Deno.connect({ hostname: host, port })
    return await this.readResponse()
  }

  async command(cmd: string): Promise<string> {
    await this.conn.write(this.encoder.encode(cmd + '\r\n'))
    return await this.readResponse()
  }

  async login(user: string, pass: string): Promise<void> {
    const userResp = await this.command(`USER ${user}`)
    if (!userResp.startsWith('331') && !userResp.startsWith('230')) {
      throw new Error(`FTP USER failed: ${userResp}`)
    }
    if (userResp.startsWith('230')) return // Already logged in

    const passResp = await this.command(`PASS ${pass}`)
    if (!passResp.startsWith('230')) {
      throw new Error(`FTP PASS failed: ${passResp}`)
    }
  }

  async setBinary(): Promise<void> {
    const resp = await this.command('TYPE I')
    if (!resp.startsWith('200')) {
      throw new Error(`FTP TYPE failed: ${resp}`)
    }
  }

  /**
   * Enter passive mode and return { host, port } for the data connection.
   */
  async pasv(): Promise<{ host: string; port: number }> {
    const resp = await this.command('PASV')
    if (!resp.startsWith('227')) {
      throw new Error(`FTP PASV failed: ${resp}`)
    }

    // Parse "227 Entering Passive Mode (h1,h2,h3,h4,p1,p2)"
    const match = resp.match(/\((\d+),(\d+),(\d+),(\d+),(\d+),(\d+)\)/)
    if (!match) throw new Error(`Could not parse PASV response: ${resp}`)

    const host = `${match[1]}.${match[2]}.${match[3]}.${match[4]}`
    const port = parseInt(match[5]) * 256 + parseInt(match[6])
    return { host, port }
  }

  /**
   * Ensure directory exists (create if needed). Non-recursive — creates one level.
   */
  async ensureDir(dir: string): Promise<void> {
    // Try to CWD into it; if it fails, MKD then CWD
    const cwdResp = await this.command(`CWD ${dir}`)
    if (cwdResp.startsWith('250')) {
      // Go back to root after check
      await this.command('CWD /')
      return
    }
    // Try to create
    const mkdResp = await this.command(`MKD ${dir}`)
    // 257 = created, 550 = already exists (some servers)
    if (!mkdResp.startsWith('257') && !mkdResp.startsWith('550')) {
      console.warn(`[upload-image-ftp] MKD warning: ${mkdResp}`)
    }
    await this.command('CWD /')
  }

  /**
   * Upload a file in passive mode.
   */
  async upload(remotePath: string, data: Uint8Array): Promise<void> {
    const { host, port } = await this.pasv()

    // Open data connection
    const dataConn = await Deno.connect({ hostname: host, port })

    // Send STOR command on control connection
    const storResp = await this.command(`STOR ${remotePath}`)
    if (!storResp.startsWith('150') && !storResp.startsWith('125')) {
      dataConn.close()
      throw new Error(`FTP STOR failed: ${storResp}`)
    }

    // Write data in chunks to avoid memory issues
    const CHUNK_SIZE = 65536
    for (let i = 0; i < data.length; i += CHUNK_SIZE) {
      const chunk = data.subarray(i, Math.min(i + CHUNK_SIZE, data.length))
      await dataConn.write(chunk)
    }

    // Close data connection to signal end of transfer
    dataConn.close()

    // Read transfer complete response
    const doneResp = await this.readResponse()
    if (!doneResp.startsWith('226') && !doneResp.startsWith('250')) {
      throw new Error(`FTP transfer not confirmed: ${doneResp}`)
    }
  }

  async quit(): Promise<void> {
    try {
      await this.command('QUIT')
    } catch {
      // Ignore errors on quit
    }
    try {
      this.conn.close()
    } catch {
      // Ignore
    }
  }

  /**
   * Read FTP response lines until we get a complete response.
   * FTP responses end with "NNN text\r\n" (3-digit code + space).
   * Multi-line responses use "NNN-" prefix until final "NNN " line.
   */
  private async readResponse(): Promise<string> {
    const buffer = new Uint8Array(4096)
    let result = ''
    const maxAttempts = 20

    for (let i = 0; i < maxAttempts; i++) {
      const n = await this.conn.read(buffer)
      if (n === null) break
      result += this.decoder.decode(buffer.subarray(0, n))

      // Check if we have a complete response
      const lines = result.split('\r\n').filter(l => l.length > 0)
      if (lines.length === 0) continue

      const lastLine = lines[lines.length - 1]
      // Complete response: 3 digits followed by a space
      if (/^\d{3} /.test(lastLine)) {
        return result.trim()
      }
    }

    return result.trim()
  }
}

// ── Helper: Get settings from admin_settings ──

async function getSettings(supabaseClient: any): Promise<Record<string, string>> {
  const { data, error } = await supabaseClient
    .from('admin_settings')
    .select('key, value')
    .in('key', ['ftp_host', 'ftp_username', 'ftp_password', 'site_url'])

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
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: crmUser } = await supabaseClient
      .from('crm_users')
      .select('role, active')
      .eq('id', user.id)
      .single()

    if (!crmUser || crmUser.role !== 'admin' || !crmUser.active) {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Get FTP settings
    const settings = await getSettings(supabaseClient)
    const ftpHost = settings.ftp_host
    const ftpUser = settings.ftp_username
    const ftpPass = settings.ftp_password
    const siteUrl = settings.site_url || 'https://shiftingsource.com'

    if (!ftpHost || !ftpUser || !ftpPass) {
      return new Response(
        JSON.stringify({ error: 'FTP credentials not configured. Set ftp_host, ftp_username, ftp_password in Settings.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    console.log(`[upload-image-ftp] Downloading image from: ${url}`)

    // Download image
    const imgResponse = await fetch(url, {
      headers: { 'Accept': 'image/*', 'User-Agent': 'ShiftingSource/1.0' },
      redirect: 'follow',
    })

    if (!imgResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Failed to download image: ${imgResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const imageData = new Uint8Array(await imgResponse.arrayBuffer())
    const contentType = imgResponse.headers.get('Content-Type') || 'image/png'

    // Determine file extension from content type
    let ext = 'png'
    if (contentType.includes('webp')) ext = 'webp'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) ext = 'jpg'
    else if (contentType.includes('png')) ext = 'png'

    // Build remote path
    const finalFilename = filename || `ai-${Date.now()}.${ext}`
    const remotePath = `/www/images/${folder}/${finalFilename}`

    console.log(`[upload-image-ftp] Uploading ${imageData.length} bytes to ${remotePath} via FTP`)

    // Upload via FTP
    const ftp = new FtpClient()

    try {
      await ftp.connect(ftpHost)
      await ftp.login(ftpUser, ftpPass)
      await ftp.setBinary()

      // Ensure directory structure exists
      await ftp.ensureDir('/www/images')
      await ftp.ensureDir(`/www/images/${folder}`)

      // Upload the file
      await ftp.upload(remotePath, imageData)
      await ftp.quit()
    } catch (ftpErr: any) {
      console.error('[upload-image-ftp] FTP error:', ftpErr)
      try { await ftp.quit() } catch { /* ignore */ }
      return new Response(
        JSON.stringify({ error: `FTP upload failed: ${ftpErr.message}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    // Build public URL
    const publicUrl = `${siteUrl.replace(/\/$/, '')}/images/${folder}/${finalFilename}`

    console.log(`[upload-image-ftp] Upload complete: ${publicUrl}`)

    return new Response(
      JSON.stringify({ publicUrl, path: remotePath }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )

  } catch (err: any) {
    console.error('[upload-image-ftp] Error:', err)
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
