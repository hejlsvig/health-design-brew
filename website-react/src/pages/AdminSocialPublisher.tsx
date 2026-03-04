import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Share2, Plus, Send, Clock, CheckCircle, XCircle, AlertTriangle,
  Instagram, Youtube, Facebook, Trash2, Link2, Image, Video,
  Calendar, RefreshCw, Eye, Loader2,
  Upload, X, Hash, BookOpen
} from 'lucide-react'
// Auth context available if needed
// import { useAuth } from '@/contexts/AuthContext'
import {
  getConnectedAccounts, disconnectAccount, getPublishQueue,
  createPost, deletePost, publishNow, getPublishLogs,
  uploadMedia, getOAuthUrl, PLATFORM_INFO, validatePostForPlatforms,
  type ConnectedAccount, type PublishQueueItem, type PublishLogEntry,
  type Platform, type MediaType, type QueueStatus, type ValidationError
} from '@/lib/socialPublisher'
import { supabase } from '@/lib/supabase'

// TikTok icon (not in lucide-react)
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.27 6.27 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.34-6.34V9.48a8.2 8.2 0 004.76 1.52V7.56a4.84 4.84 0 01-1-.87z" />
    </svg>
  )
}

const PLATFORM_ICONS: Record<Platform, React.ReactNode> = {
  instagram: <Instagram className="h-5 w-5" />,
  facebook: <Facebook className="h-5 w-5" />,
  youtube: <Youtube className="h-5 w-5" />,
  tiktok: <TikTokIcon className="h-5 w-5" />,
}

const STATUS_ICONS: Record<QueueStatus, React.ReactNode> = {
  draft: <Clock className="h-4 w-4 text-muted-foreground" />,
  scheduled: <Calendar className="h-4 w-4 text-blue-500" />,
  publishing: <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />,
  published: <CheckCircle className="h-4 w-4 text-green-500" />,
  partial: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
}

type Tab = 'compose' | 'queue' | 'history' | 'accounts'

export default function AdminSocialPublisher() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>(
    (searchParams.get('tab') as Tab) || 'compose'
  )

  // Connected accounts
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loadingAccounts, setLoadingAccounts] = useState(true)

  // Queue
  const [queue, setQueue] = useState<PublishQueueItem[]>([])
  const [loadingQueue, setLoadingQueue] = useState(false)

  // History/Logs
  const [logs, setLogs] = useState<PublishLogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)

  // Composer state
  const [composerText, setComposerText] = useState('')
  const [composerPlatforms, setComposerPlatforms] = useState<Platform[]>([])
  const [composerMediaUrls, setComposerMediaUrls] = useState<string[]>([])
  const [composerMediaType, setComposerMediaType] = useState<MediaType>('text')
  const [composerSchedule, setComposerSchedule] = useState<string>('')
  const [composerTags, setComposerTags] = useState('')
  const [composerSaving, setComposerSaving] = useState(false)
  const [composerPublishing, setComposerPublishing] = useState(false)
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Import from content
  const [importItems, setImportItems] = useState<{ id: string; type: 'article' | 'recipe'; title: string; image?: string; slug: string }[]>([])
  const [importOpen, setImportOpen] = useState(false)
  const [loadingImport, setLoadingImport] = useState(false)

  // Feedback
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // OAuth callback handling
  useEffect(() => {
    const code = searchParams.get('code')
    const platform = searchParams.get('platform') as Platform | null
    if (code && platform) {
      handleOAuthCallback(code, platform)
      // Clean URL
      searchParams.delete('code')
      searchParams.delete('platform')
      searchParams.delete('state')
      setSearchParams(searchParams, { replace: true })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load data
  const loadAccounts = useCallback(async () => {
    setLoadingAccounts(true)
    try {
      const data = await getConnectedAccounts()
      setAccounts(data)
    } catch (err) {
      console.error('Failed to load accounts:', err)
    } finally {
      setLoadingAccounts(false)
    }
  }, [])

  const loadQueue = useCallback(async () => {
    setLoadingQueue(true)
    try {
      const data = await getPublishQueue()
      setQueue(data)
    } catch (err) {
      console.error('Failed to load queue:', err)
    } finally {
      setLoadingQueue(false)
    }
  }, [])

  const loadLogs = useCallback(async () => {
    setLoadingLogs(true)
    try {
      const data = await getPublishLogs()
      setLogs(data)
    } catch (err) {
      console.error('Failed to load logs:', err)
    } finally {
      setLoadingLogs(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  useEffect(() => {
    if (activeTab === 'queue') loadQueue()
    if (activeTab === 'history') loadLogs()
  }, [activeTab, loadQueue, loadLogs])

  // ── Handlers ─────────────────────────────────────────

  async function handleOAuthCallback(code: string, platform: Platform) {
    try {
      const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/social-publisher`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ action: 'oauth_callback', platform, code, redirect_uri: `${window.location.origin}/admin/social-publisher/callback` }),
        }
      )

      if (res.ok) {
        setFeedback({ type: 'success', message: `${PLATFORM_INFO[platform].name} tilsluttet!` })
        loadAccounts()
        setActiveTab('accounts')
      } else {
        const err = await res.json().catch(() => ({}))
        setFeedback({ type: 'error', message: err.error || 'OAuth fejlede' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'OAuth callback fejl' })
    }
  }

  function handleConnect(platform: Platform) {
    const url = getOAuthUrl(platform)
    window.location.href = url
  }

  async function handleDisconnect(accountId: string) {
    if (!confirm('Er du sikker på du vil frakoble denne konto?')) return
    try {
      await disconnectAccount(accountId)
      setFeedback({ type: 'success', message: 'Konto frakoblet' })
      loadAccounts()
    } catch {
      setFeedback({ type: 'error', message: 'Kunne ikke frakoble konto' })
    }
  }

  function togglePlatform(p: Platform) {
    setComposerPlatforms(prev =>
      prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
    )
  }

  async function handleMediaUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files?.length) return

    setUploadingMedia(true)
    try {
      const urls: string[] = []
      for (const file of Array.from(files)) {
        const url = await uploadMedia(file)
        urls.push(url)
      }
      setComposerMediaUrls(prev => [...prev, ...urls])

      // Auto-detect media type
      const firstFile = files[0]
      if (firstFile.type.startsWith('video/')) {
        setComposerMediaType('video')
      } else if (urls.length + composerMediaUrls.length > 1) {
        setComposerMediaType('carousel')
      } else {
        setComposerMediaType('image')
      }
    } catch (err) {
      setFeedback({ type: 'error', message: 'Medie-upload fejlede' })
    } finally {
      setUploadingMedia(false)
    }
  }

  function removeMedia(index: number) {
    setComposerMediaUrls(prev => prev.filter((_, i) => i !== index))
    if (composerMediaUrls.length <= 2) setComposerMediaType('image')
    if (composerMediaUrls.length <= 1) setComposerMediaType('text')
  }

  async function handleSaveDraft() {
    if (!composerText.trim() && composerMediaUrls.length === 0) return
    setComposerSaving(true)
    try {
      await createPost({
        content_text: composerText,
        media_urls: composerMediaUrls.length > 0 ? composerMediaUrls : undefined,
        media_type: composerMediaUrls.length > 0 ? composerMediaType : 'text',
        platforms: composerPlatforms,
        scheduled_at: composerSchedule || null,
        tags: composerTags ? composerTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      })
      setFeedback({ type: 'success', message: composerSchedule ? 'Post planlagt!' : 'Kladde gemt!' })
      resetComposer()
      loadQueue()
    } catch {
      setFeedback({ type: 'error', message: 'Kunne ikke gemme post' })
    } finally {
      setComposerSaving(false)
    }
  }

  async function handlePublishImmediately() {
    if (!composerText.trim() && composerMediaUrls.length === 0) return
    if (composerPlatforms.length === 0) {
      setFeedback({ type: 'error', message: 'Vælg mindst én platform' })
      return
    }
    setComposerPublishing(true)
    try {
      const post = await createPost({
        content_text: composerText,
        media_urls: composerMediaUrls.length > 0 ? composerMediaUrls : undefined,
        media_type: composerMediaUrls.length > 0 ? composerMediaType : 'text',
        platforms: composerPlatforms,
        tags: composerTags ? composerTags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
      })
      const result = await publishNow(post.id)
      if (result.success) {
        setFeedback({ type: 'success', message: 'Publiceret!' })
      } else {
        setFeedback({ type: 'error', message: 'Delvis fejl ved publicering' })
      }
      resetComposer()
      loadQueue()
    } catch (err) {
      setFeedback({ type: 'error', message: 'Publicering fejlede' })
    } finally {
      setComposerPublishing(false)
    }
  }

  async function handlePublishQueued(postId: string) {
    try {
      await publishNow(postId)
      setFeedback({ type: 'success', message: 'Publiceret!' })
      loadQueue()
    } catch {
      setFeedback({ type: 'error', message: 'Publicering fejlede' })
    }
  }

  async function handleDeleteQueued(postId: string) {
    if (!confirm('Slet denne post?')) return
    try {
      await deletePost(postId)
      loadQueue()
    } catch {
      setFeedback({ type: 'error', message: 'Kunne ikke slette' })
    }
  }

  function resetComposer() {
    setComposerText('')
    setComposerPlatforms([])
    setComposerMediaUrls([])
    setComposerMediaType('text')
    setComposerSchedule('')
    setComposerTags('')
  }

  async function loadImportItems() {
    setLoadingImport(true)
    try {
      const [articlesRes, recipesRes] = await Promise.all([
        supabase.from('articles').select('id, title, featured_image, slug').eq('status', 'published').order('published_at', { ascending: false }).limit(20),
        supabase.from('recipes').select('id, title, image_url, slug').eq('status', 'published').order('published_at', { ascending: false }).limit(20),
      ])
      const items: typeof importItems = []
      for (const a of articlesRes.data || []) {
        items.push({ id: a.id, type: 'article', title: a.title?.da || a.title?.en || '(Ingen titel)', image: a.featured_image, slug: a.slug })
      }
      for (const r of recipesRes.data || []) {
        items.push({ id: r.id, type: 'recipe', title: r.title?.da || r.title?.en || '(Ingen titel)', image: r.image_url, slug: r.slug })
      }
      setImportItems(items)
    } catch {
      setFeedback({ type: 'error', message: 'Kunne ikke hente indhold' })
    } finally {
      setLoadingImport(false)
    }
  }

  async function handleImportContent(item: typeof importItems[0]) {
    // Pre-fill composer with content data
    if (item.image) {
      setComposerMediaUrls([item.image])
      setComposerMediaType('image')
    }
    setComposerText(`${item.title}\n\n`)
    setComposerTags(item.type === 'recipe' ? 'keto, opskrift, shiftingsource' : 'keto, artikel, shiftingsource')
    setImportOpen(false)
    setFeedback({ type: 'success', message: `"${item.title}" importeret — vælg platforme og tilpas teksten` })
  }

  // Auto-clear feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000)
      return () => clearTimeout(timer)
    }
  }, [feedback])

  // ── Validation per platform ───────────────────────────
  const validationErrors: ValidationError[] = composerPlatforms.length > 0
    ? validatePostForPlatforms(composerPlatforms, composerText, composerMediaUrls, composerMediaType)
    : []
  const hasBlockingErrors = validationErrors.some(e => e.severity === 'error')

  // Available platforms = those with connected accounts
  const connectedPlatforms = [...new Set(accounts.map(a => a.platform))]

  return (
    <div className="container max-w-5xl py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Share2 className="h-7 w-7 text-accent" />
          <div>
            <h1 className="text-2xl font-serif font-bold">Social Publisher</h1>
            <p className="text-sm text-muted-foreground">
              Del indhold på tværs af sociale medier
            </p>
          </div>
        </div>
      </div>

      {/* Feedback banner */}
      {feedback && (
        <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${
          feedback.type === 'success'
            ? 'bg-green-500/10 text-green-700 border border-green-500/20'
            : 'bg-red-500/10 text-red-700 border border-red-500/20'
        }`}>
          {feedback.type === 'success' ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {feedback.message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([
          { key: 'compose', label: 'Skriv Post', icon: <Plus className="h-4 w-4" /> },
          { key: 'queue', label: 'Kø & Planlagt', icon: <Clock className="h-4 w-4" /> },
          { key: 'history', label: 'Historik', icon: <Eye className="h-4 w-4" /> },
          { key: 'accounts', label: 'Konti', icon: <Link2 className="h-4 w-4" /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB: Compose ── */}
      {activeTab === 'compose' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Composer */}
          <div className="lg:col-span-2 space-y-4">
            {/* Import from content */}
            <div className="relative">
              <button
                onClick={() => { setImportOpen(!importOpen); if (!importOpen && importItems.length === 0) loadImportItems() }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-accent/40 text-sm text-accent hover:bg-accent/5 transition-colors w-full justify-center"
              >
                <BookOpen className="h-4 w-4" />
                Importer fra artikel eller opskrift
              </button>
              {importOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 z-20 rounded-lg border border-border bg-background shadow-xl max-h-60 overflow-y-auto">
                  {loadingImport ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin mx-auto mb-1" /> Henter indhold...
                    </div>
                  ) : importItems.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">Intet publiceret indhold fundet</div>
                  ) : (
                    importItems.map(item => (
                      <button
                        key={item.id}
                        onClick={() => handleImportContent(item)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-muted/50 transition-colors border-b border-border last:border-0"
                      >
                        {item.image ? (
                          <img src={item.image} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                            <Image className="h-4 w-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.type === 'recipe' ? 'Opskrift' : 'Artikel'}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Platform selector */}
            <div>
              <label className="text-sm font-medium mb-2 block">Platforme</label>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(PLATFORM_INFO) as Platform[]).map(p => {
                  const connected = connectedPlatforms.includes(p)
                  const selected = composerPlatforms.includes(p)
                  return (
                    <button
                      key={p}
                      onClick={() => connected && togglePlatform(p)}
                      disabled={!connected}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                        selected
                          ? 'border-accent bg-accent/10 text-accent'
                          : connected
                          ? 'border-border hover:border-accent/50'
                          : 'border-border/50 opacity-40 cursor-not-allowed'
                      }`}
                      title={!connected ? `${PLATFORM_INFO[p].name} ikke tilsluttet` : ''}
                    >
                      <span style={{ color: selected ? PLATFORM_INFO[p].color : undefined }}>
                        {PLATFORM_ICONS[p]}
                      </span>
                      {PLATFORM_INFO[p].name}
                      {!connected && <span className="text-xs">(ikke tilsluttet)</span>}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Text content */}
            <div>
              <label className="text-sm font-medium mb-2 block">Indhold</label>
              <textarea
                value={composerText}
                onChange={e => setComposerText(e.target.value)}
                placeholder="Skriv din post her... Brug #hashtags for at tagge"
                className="w-full h-40 p-3 rounded-lg border border-border bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>{composerText.length} tegn</span>
                {composerPlatforms.length > 0 && (
                  <span>
                    {composerPlatforms.map(p => (
                      <span key={p} className={composerText.length > PLATFORM_INFO[p].maxChars ? 'text-red-500' : 'text-green-600'}>
                        {PLATFORM_INFO[p].name}: {PLATFORM_INFO[p].maxChars - composerText.length}
                        {composerPlatforms.indexOf(p) < composerPlatforms.length - 1 ? ' · ' : ''}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            </div>

            {/* Media upload */}
            <div>
              <label className="text-sm font-medium mb-2 block">Medier</label>
              <div className="flex flex-wrap gap-3">
                {composerMediaUrls.map((url, i) => (
                  <div key={i} className="relative group w-24 h-24 rounded-lg overflow-hidden border border-border">
                    {composerMediaType === 'video' ? (
                      <div className="w-full h-full bg-charcoal/10 flex items-center justify-center">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    ) : (
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeMedia(i)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-accent/50 flex flex-col items-center justify-center cursor-pointer transition-colors">
                  {uploadingMedia ? (
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground mt-1">Upload</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleMediaUpload}
                    className="hidden"
                    disabled={uploadingMedia}
                  />
                </label>
              </div>
            </div>

            {/* Tags */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1">
                <Hash className="h-4 w-4" /> Tags
              </label>
              <input
                type="text"
                value={composerTags}
                onChange={e => setComposerTags(e.target.value)}
                placeholder="keto, faste, opskrift (kommasepareret)"
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Schedule */}
            <div>
              <label className="text-sm font-medium mb-2 flex items-center gap-1">
                <Calendar className="h-4 w-4" /> Planlæg (valgfrit)
              </label>
              <input
                type="datetime-local"
                value={composerSchedule}
                onChange={e => setComposerSchedule(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>

            {/* Validation errors & warnings */}
            {validationErrors.length > 0 && (
              <div className="space-y-1.5">
                {validationErrors.map((err, i) => (
                  <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded-lg ${
                    err.severity === 'error'
                      ? 'bg-red-500/10 text-red-700 border border-red-500/20'
                      : 'bg-amber-500/10 text-amber-700 border border-amber-500/20'
                  }`}>
                    {err.severity === 'error' ? <XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
                    <span><strong>{PLATFORM_INFO[err.platform].name}:</strong> {err.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Platform format guide */}
            {composerPlatforms.length > 0 && (
              <details className="text-xs text-muted-foreground border border-border rounded-lg">
                <summary className="px-3 py-2 cursor-pointer hover:text-foreground transition-colors font-medium">
                  Formatguide for valgte platforme
                </summary>
                <div className="px-3 pb-3 space-y-3 divide-y divide-border">
                  {composerPlatforms.map(p => {
                    const spec = PLATFORM_INFO[p]
                    return (
                      <div key={p} className="pt-2 first:pt-0">
                        <h4 className="font-medium text-foreground flex items-center gap-1.5 mb-1.5">
                          <span style={{ color: spec.color }}>{PLATFORM_ICONS[p]}</span>
                          {spec.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                          <span className="text-muted-foreground">Billede:</span>
                          <span>{spec.image.recommended}</span>
                          <span className="text-muted-foreground">Video:</span>
                          <span>{spec.video.recommended}</span>
                          <span className="text-muted-foreground">Videoformat:</span>
                          <span>{spec.video.codecsNote}</span>
                          <span className="text-muted-foreground">Max filstørrelse:</span>
                          <span>Billede {spec.image.maxSizeMB}MB · Video {spec.video.maxSizeMB >= 1024 ? `${(spec.video.maxSizeMB/1024).toFixed(0)}GB` : `${spec.video.maxSizeMB}MB`}</span>
                          <span className="text-muted-foreground">Video varighed:</span>
                          <span>{spec.video.minDurationSec}s – {spec.video.maxDurationSec >= 3600 ? `${(spec.video.maxDurationSec/3600).toFixed(0)} timer` : `${(spec.video.maxDurationSec/60).toFixed(0)} min`}</span>
                          <span className="text-muted-foreground">Max hashtags:</span>
                          <span>{spec.maxHashtags}</span>
                        </div>
                        {spec.notes.length > 0 && (
                          <div className="mt-1.5 text-muted-foreground/80 space-y-0.5">
                            {spec.notes.map((note, i) => (
                              <p key={i}>• {note}</p>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handlePublishImmediately}
                disabled={composerPublishing || hasBlockingErrors || composerPlatforms.length === 0 || (!composerText.trim() && composerMediaUrls.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent text-accent-foreground font-medium text-sm hover:bg-accent/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {composerPublishing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Publicer nu
              </button>
              <button
                onClick={handleSaveDraft}
                disabled={composerSaving || (!composerText.trim() && composerMediaUrls.length === 0)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm hover:bg-muted/50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {composerSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock className="h-4 w-4" />}
                {composerSchedule ? 'Planlæg' : 'Gem kladde'}
              </button>
            </div>
          </div>

          {/* Right: Preview */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-border bg-muted/30">
              <h3 className="text-sm font-medium mb-3">Forhåndsvisning</h3>
              {composerMediaUrls.length > 0 && composerMediaType !== 'video' && (
                <div className="rounded-lg overflow-hidden mb-3">
                  <img src={composerMediaUrls[0]} alt="" className="w-full aspect-square object-cover" />
                </div>
              )}
              {composerMediaUrls.length > 0 && composerMediaType === 'video' && (
                <div className="rounded-lg overflow-hidden mb-3 bg-charcoal/10 aspect-video flex items-center justify-center">
                  <Video className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
              <p className="text-sm whitespace-pre-wrap">
                {composerText || <span className="text-muted-foreground italic">Din tekst vises her...</span>}
              </p>
              {composerTags && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {composerTags.split(',').map((tag, i) => (
                    <span key={i} className="text-xs text-accent">#{tag.trim()}</span>
                  ))}
                </div>
              )}
            </div>

            {composerPlatforms.length > 0 && (
              <div className="p-4 rounded-lg border border-border bg-muted/30">
                <h3 className="text-sm font-medium mb-2">Publiceres til</h3>
                <div className="space-y-2">
                  {composerPlatforms.map(p => {
                    const account = accounts.find(a => a.platform === p)
                    return (
                      <div key={p} className="flex items-center gap-2 text-sm">
                        <span style={{ color: PLATFORM_INFO[p].color }}>{PLATFORM_ICONS[p]}</span>
                        <span>{account?.platform_username || account?.page_name || PLATFORM_INFO[p].name}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB: Queue ── */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Kø & Planlagte Posts</h2>
            <button onClick={loadQueue} className="flex items-center gap-1 text-sm text-accent hover:underline">
              <RefreshCw className="h-4 w-4" /> Opdater
            </button>
          </div>

          {loadingQueue ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Henter kø...
            </div>
          ) : queue.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Ingen posts i køen</p>
              <button onClick={() => setActiveTab('compose')} className="text-accent text-sm mt-2 hover:underline">
                Opret en ny post
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {queue.map(item => (
                <div key={item.id} className="p-4 rounded-lg border border-border hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {STATUS_ICONS[item.status]}
                        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          {item.status}
                        </span>
                        {item.scheduled_at && (
                          <span className="text-xs text-blue-500">
                            {new Date(item.scheduled_at).toLocaleString('da-DK')}
                          </span>
                        )}
                      </div>
                      <p className="text-sm line-clamp-2">{item.content_text || '(Ingen tekst)'}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {item.platforms.map(p => (
                          <span key={p} style={{ color: PLATFORM_INFO[p]?.color }} title={PLATFORM_INFO[p]?.name}>
                            {PLATFORM_ICONS[p]}
                          </span>
                        ))}
                        {item.media_urls && item.media_urls.length > 0 && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Image className="h-3 w-3" /> {item.media_urls.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(item.status === 'draft' || item.status === 'scheduled') && (
                        <button
                          onClick={() => handlePublishQueued(item.id)}
                          className="p-2 rounded-lg hover:bg-accent/10 text-accent transition-colors"
                          title="Publicer nu"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      )}
                      {(item.status === 'draft' || item.status === 'scheduled' || item.status === 'failed') && (
                        <button
                          onClick={() => handleDeleteQueued(item.id)}
                          className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                          title="Slet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── TAB: History ── */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Publiceringshistorik</h2>
            <button onClick={loadLogs} className="flex items-center gap-1 text-sm text-accent hover:underline">
              <RefreshCw className="h-4 w-4" /> Opdater
            </button>
          </div>

          {loadingLogs ? (
            <div className="text-center py-12 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Henter historik...
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Eye className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>Ingen publiceringshistorik endnu</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="pb-2 pr-4">Platform</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Tidspunkt</th>
                    <th className="pb-2">Detaljer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {logs.map(log => (
                    <tr key={log.id}>
                      <td className="py-2.5 pr-4">
                        <span style={{ color: PLATFORM_INFO[log.platform as Platform]?.color }}>
                          {PLATFORM_ICONS[log.platform as Platform]}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          log.status === 'success' ? 'bg-green-500/10 text-green-700' :
                          log.status === 'failed' ? 'bg-red-500/10 text-red-700' :
                          'bg-amber-500/10 text-amber-700'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">
                        {new Date(log.attempted_at).toLocaleString('da-DK')}
                      </td>
                      <td className="py-2.5">
                        {log.platform_post_url ? (
                          <a href={log.platform_post_url} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                            Se post
                          </a>
                        ) : log.error_message ? (
                          <span className="text-red-500 text-xs">{log.error_message}</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TAB: Accounts ── */}
      {activeTab === 'accounts' && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium">Tilsluttede Konti</h2>
          {loadingAccounts && (
            <div className="text-center py-4 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mx-auto" />
            </div>
          )}

          {/* Connect new */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(Object.keys(PLATFORM_INFO) as Platform[]).map(platform => {
              const connected = accounts.find(a => a.platform === platform)
              return (
                <div key={platform} className={`p-4 rounded-lg border transition-colors ${
                  connected ? 'border-green-500/30 bg-green-500/5' : 'border-border'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span style={{ color: PLATFORM_INFO[platform].color }}>
                        {PLATFORM_ICONS[platform]}
                      </span>
                      <div>
                        <h3 className="font-medium">{PLATFORM_INFO[platform].name}</h3>
                        {connected ? (
                          <p className="text-xs text-green-600">
                            {connected.platform_username || connected.page_name || 'Tilsluttet'}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Ikke tilsluttet</p>
                        )}
                      </div>
                    </div>
                    {connected ? (
                      <button
                        onClick={() => handleDisconnect(connected.id)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        Frakobel
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(platform)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-accent text-accent-foreground text-sm font-medium hover:bg-accent/90 transition-colors"
                      >
                        <Link2 className="h-3.5 w-3.5" />
                        Tilslut
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Current accounts list */}
          {accounts.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Aktive forbindelser</h3>
              {accounts.map(account => (
                <div key={account.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span style={{ color: PLATFORM_INFO[account.platform]?.color }}>
                      {PLATFORM_ICONS[account.platform]}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {account.platform_username || account.page_name || PLATFORM_INFO[account.platform].name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Tilsluttet {new Date(account.connected_at).toLocaleDateString('da-DK')}
                        {account.token_expires_at && (
                          <> · Token udløber {new Date(account.token_expires_at).toLocaleDateString('da-DK')}</>
                        )}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account.id)}
                    className="p-2 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Setup instructions */}
          <div className="p-4 rounded-lg border border-border bg-muted/30 text-sm space-y-2">
            <h3 className="font-medium">Opsætning af OAuth-apps</h3>
            <p className="text-muted-foreground">
              For at tilslutte platforme skal du oprette developer-apps og konfigurere OAuth credentials i Supabase Edge Function secrets:
            </p>
            <ul className="text-muted-foreground space-y-1 pl-4">
              <li>• <strong>Meta (Instagram/Facebook):</strong> Opret en Meta App på developers.facebook.com → Sæt META_APP_ID og META_APP_SECRET</li>
              <li>• <strong>YouTube:</strong> Opret et Google Cloud projekt med YouTube Data API → Sæt GOOGLE_CLIENT_ID og GOOGLE_CLIENT_SECRET</li>
              <li>• <strong>TikTok:</strong> Opret en TikTok Developer App → Sæt TIKTOK_CLIENT_KEY og TIKTOK_CLIENT_SECRET</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
