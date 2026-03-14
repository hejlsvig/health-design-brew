/**
 * ChatWidget — Floating chat bubble (bottom-right) with AI assistant.
 * Supports text + image upload (max 3 images per session).
 * Language-aware: uses i18n locale to pick system prompt & UI strings.
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { MessageCircle, X, Send, ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Render chat message text with basic markdown support (bold)
 * and strip emoji characters from assistant messages.
 */
function formatChatMessage(text: string, role: 'user' | 'assistant') {
  let processed = text

  // Strip emojis from assistant messages
  if (role === 'assistant') {
    // Remove emoji characters (Unicode ranges for common emojis)
    processed = processed
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '')  // Emoticons
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '')  // Misc symbols & pictographs
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '')  // Transport & map symbols
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '')  // Flags
      .replace(/[\u{2600}-\u{26FF}]/gu, '')    // Misc symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '')    // Dingbats
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '')    // Variation selectors
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '')  // Supplemental symbols
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '')  // Chess symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '')  // Symbols extended-A
      .replace(/[\u{200D}]/gu, '')              // Zero-width joiner
      .replace(/[\u{20E3}]/gu, '')              // Combining enclosing keycap
      .replace(/[\u{E0020}-\u{E007F}]/gu, '')  // Tags
      .replace(/  +/g, ' ')                    // Collapse double spaces left by removed emojis
      .trim()
  }

  // Split on **bold** markers and render
  const parts = processed.split(/(\*\*[^*]+\*\*)/g)
  return (
    <p className="whitespace-pre-wrap">
      {parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={i}>{part.slice(2, -2)}</strong>
        }
        return <span key={i}>{part}</span>
      })}
    </p>
  )
}
import {
  sendChatMessage,
  fileToDataUrl,
  supportsVision,
  type ChatMessage,
  type ChatContentPart,
} from '@/lib/chatai'
import { getSettings } from '@/lib/openai'

const MAX_IMAGES_PER_SESSION = 3

export default function ChatWidget() {
  const { t, i18n } = useTranslation()
  const lang = (i18n.language || 'da') as string

  // ── State ─────────────────────────────────────────────
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; text: string; images?: string[] }[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [imageCount, setImageCount] = useState(0)
  const [pendingImages, setPendingImages] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [modelSupportsVision, setModelSupportsVision] = useState(true)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // ── Scroll to bottom on new messages ──────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  // ── Focus input when chat opens ───────────────────────
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  }, [isOpen])

  // ── Check model vision support on mount ───────────────
  useEffect(() => {
    getSettings().then(s => {
      const model = s.ai_model || 'gpt-5.2-chat-latest'
      setModelSupportsVision(supportsVision(model))
    }).catch(() => {})
  }, [])

  // ── Build conversation history for API ────────────────
  // System prompt is added server-side by the edge function
  const buildApiMessages = useCallback(
    (userText: string, userImages: string[]): ChatMessage[] => {
      const apiMsgs: ChatMessage[] = []

      // Add conversation history (last 20 messages max)
      const history = messages.slice(-20)
      for (const msg of history) {
        if (msg.role === 'user') {
          if (msg.images && msg.images.length > 0) {
            const parts: ChatContentPart[] = [{ type: 'text', text: msg.text }]
            for (const img of msg.images) {
              parts.push({ type: 'image_url', image_url: { url: img, detail: 'low' } })
            }
            apiMsgs.push({ role: 'user', content: parts })
          } else {
            apiMsgs.push({ role: 'user', content: msg.text })
          }
        } else {
          apiMsgs.push({ role: 'assistant', content: msg.text })
        }
      }

      // Add current message
      if (userImages.length > 0) {
        const parts: ChatContentPart[] = [{ type: 'text', text: userText }]
        for (const img of userImages) {
          parts.push({ type: 'image_url', image_url: { url: img, detail: 'low' } })
        }
        apiMsgs.push({ role: 'user', content: parts })
      } else {
        apiMsgs.push({ role: 'user', content: userText })
      }

      return apiMsgs
    },
    [messages],
  )

  // ── Send message ──────────────────────────────────────
  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text && pendingImages.length === 0) return

    const userImages = [...pendingImages]
    const userText = text || (userImages.length > 0 ? t('chat.imageAnalysisRequest') : '')

    // Add user message to UI
    setMessages(prev => [...prev, { role: 'user', text: userText, images: userImages }])
    setInput('')
    setPendingImages([])
    setError(null)
    setIsLoading(true)

    try {
      const controller = new AbortController()
      abortRef.current = controller
      const apiMessages = buildApiMessages(userText, userImages)
      const reply = await sendChatMessage(apiMessages, lang, controller.signal)
      setMessages(prev => [...prev, { role: 'assistant', text: reply }])
    } catch (err: any) {
      if (err.name === 'AbortError') return
      setError(err.message || t('chat.errorGeneric'))
    } finally {
      setIsLoading(false)
      abortRef.current = null
    }
  }, [input, pendingImages, buildApiMessages, t])

  // ── Handle image upload ───────────────────────────────
  const handleImageUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = '' // reset

    if (imageCount >= MAX_IMAGES_PER_SESSION) {
      setError(t('chat.imageLimitReached'))
      return
    }

    if (!file.type.startsWith('image/')) {
      setError(t('chat.imageOnly'))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('chat.imageTooLarge'))
      return
    }

    try {
      const dataUrl = await fileToDataUrl(file)
      setPendingImages(prev => [...prev, dataUrl])
      setImageCount(prev => prev + 1)
      setError(null)
    } catch {
      setError(t('chat.imageUploadError'))
    }
  }, [imageCount, t])

  // ── Remove pending image ──────────────────────────────
  const removePendingImage = useCallback((index: number) => {
    setPendingImages(prev => prev.filter((_, i) => i !== index))
    setImageCount(prev => Math.max(0, prev - 1))
  }, [])

  // ── Keyboard handler ──────────────────────────────────
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // ── Clear chat ────────────────────────────────────────
  const handleClear = () => {
    abortRef.current?.abort()
    setMessages([])
    setImageCount(0)
    setPendingImages([])
    setError(null)
    setIsLoading(false)
  }

  const imagesLeft = MAX_IMAGES_PER_SESSION - imageCount

  return (
    <>
      {/* ── Floating bubble ── */}
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          'fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full',
          'bg-accent text-accent-foreground shadow-lg',
          'flex items-center justify-center',
          'hover:bg-accent/90 hover:scale-105 active:scale-95',
          'transition-all duration-200',
          isOpen && 'scale-0 opacity-0 pointer-events-none',
        )}
        aria-label={t('chat.open')}
      >
        <MessageCircle className="w-6 h-6" />
      </button>

      {/* ── Chat panel ── */}
      <div
        className={cn(
          'fixed bottom-5 right-5 z-50',
          'w-[440px] max-w-[calc(100vw-2.5rem)] h-[620px] max-h-[calc(100vh-6rem)]',
          'bg-background rounded-2xl shadow-2xl border border-primary/10',
          'flex flex-col overflow-hidden',
          'transition-all duration-300 ease-out origin-bottom-right',
          isOpen
            ? 'scale-100 opacity-100'
            : 'scale-0 opacity-0 pointer-events-none',
        )}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground shrink-0">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-serif font-bold text-sm">{t('chat.title')}</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleClear}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              title={t('chat.clear')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
              aria-label={t('chat.close')}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Messages area ── */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground text-sm py-8 px-2">
              <p className="font-serif font-bold text-base mb-2">{t('chat.welcomeTitle')}</p>
              <p className="leading-relaxed">{t('chat.welcomeMessage')}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start',
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-accent text-accent-foreground rounded-br-sm'
                    : 'bg-sage/20 text-foreground rounded-bl-sm',
                )}
              >
                {/* User images */}
                {msg.images && msg.images.length > 0 && (
                  <div className="flex gap-1.5 mb-2 flex-wrap">
                    {msg.images.map((img, j) => (
                      <img
                        key={j}
                        src={img}
                        alt=""
                        className="w-16 h-16 rounded-md object-cover"
                      />
                    ))}
                  </div>
                )}
                {formatChatMessage(msg.text, msg.role)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-sage/20 rounded-xl rounded-bl-sm px-3 py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            </div>
          )}

          {error && (
            <div className="text-center text-xs text-red-500 py-1">{error}</div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* ── Pending images preview ── */}
        {pendingImages.length > 0 && (
          <div className="px-4 py-2 border-t border-primary/10 flex gap-2 flex-wrap">
            {pendingImages.map((img, i) => (
              <div key={i} className="relative group">
                <img src={img} alt="" className="w-12 h-12 rounded-md object-cover" />
                <button
                  onClick={() => removePendingImage(i)}
                  className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── Input area ── */}
        <div className="px-3 py-2 border-t border-primary/10 shrink-0 bg-background">
          <div className="flex items-end gap-2">
            {/* Image upload */}
            {modelSupportsVision && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={imagesLeft <= 0}
                className={cn(
                  'p-2 rounded-md transition-colors shrink-0',
                  imagesLeft > 0
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-muted-foreground/40 cursor-not-allowed',
                )}
                title={
                  imagesLeft > 0
                    ? `${t('chat.uploadImage')} (${imagesLeft} ${t('chat.remaining')})`
                    : t('chat.imageLimitReached')
                }
              >
                <ImagePlus className="w-5 h-5" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />

            {/* Text input */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('chat.placeholder')}
              rows={1}
              className={cn(
                'flex-1 resize-none rounded-lg px-3 py-2 text-sm',
                'bg-sage/10 border border-primary/10',
                'placeholder:text-muted-foreground/50',
                'focus:outline-none focus:ring-1 focus:ring-accent/50',
                'max-h-24 overflow-y-auto',
              )}
              style={{ minHeight: '38px' }}
            />

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && pendingImages.length === 0)}
              className={cn(
                'p-2 rounded-md transition-colors shrink-0',
                isLoading || (!input.trim() && pendingImages.length === 0)
                  ? 'text-muted-foreground/40 cursor-not-allowed'
                  : 'text-accent hover:bg-accent/10',
              )}
              aria-label={t('chat.send')}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
