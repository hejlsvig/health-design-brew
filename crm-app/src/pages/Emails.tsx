import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchEmailTemplates, createEmailTemplate, updateEmailTemplate,
  fetchAllEmails,
  type EmailTemplate, type EmailSend,
} from '@/lib/emails'
import {
  Loader2, Plus, Mail, X, Save, Globe, Tag,
  ToggleLeft, ToggleRight, Code, Eye,
  CheckCircle2, XCircle, Clock, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const LANGUAGES = ['da', 'en', 'se'] as const
const LANG_LABELS: Record<string, string> = { da: 'Dansk', en: 'English', se: 'Svenska' }
const EMAIL_TYPES = ['onboarding', 'coaching', 'reminder', 'engagement', 'upsell', 'transactional', 'notification']

export default function Emails() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'templates' | 'sent'>('templates')
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [sentEmails, setSentEmails] = useState<EmailSend[]>([])
  const [loading, setLoading] = useState(true)

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [isNewTemplate, setIsNewTemplate] = useState(false)
  const [templateLang, setTemplateLang] = useState<string>('da')
  const [templateView, setTemplateView] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [tmpl, emails] = await Promise.all([
        fetchEmailTemplates(),
        fetchAllEmails(100),
      ])
      setTemplates(tmpl)
      setSentEmails(emails)
    } catch (err) {
      console.error('Load emails error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── Template handlers ───

  function handleNewTemplate() {
    setEditingTemplate({
      id: '', name: '', email_type: 'transactional',
      subject: { da: '', en: '', se: '' },
      body_html: { da: '', en: '', se: '' },
      variables: [], is_active: true, created_at: '', updated_at: '',
    })
    setIsNewTemplate(true)
    setTemplateLang('da')
    setTemplateView('edit')
  }

  function handleEditTemplate(tmpl: EmailTemplate) {
    setEditingTemplate({ ...tmpl })
    setIsNewTemplate(false)
    setTemplateLang('da')
    setTemplateView('edit')
  }

  async function handleSaveTemplate() {
    if (!editingTemplate) return
    setSaving(true)
    try {
      if (isNewTemplate) {
        await createEmailTemplate({
          name: editingTemplate.name,
          email_type: editingTemplate.email_type,
          subject: editingTemplate.subject,
          body_html: editingTemplate.body_html,
          variables: editingTemplate.variables,
        })
      } else {
        await updateEmailTemplate(editingTemplate.id, {
          name: editingTemplate.name,
          email_type: editingTemplate.email_type,
          subject: editingTemplate.subject,
          body_html: editingTemplate.body_html,
          variables: editingTemplate.variables,
          is_active: editingTemplate.is_active,
        })
      }
      setEditingTemplate(null)
      setIsNewTemplate(false)
      const tmpl = await fetchEmailTemplates()
      setTemplates(tmpl)
    } catch (err) {
      console.error('Save template error:', err)
    } finally {
      setSaving(false)
    }
  }

  function handleTemplateChange(field: string, value: string | boolean | string[]) {
    if (!editingTemplate) return
    setEditingTemplate({ ...editingTemplate, [field]: value })
  }

  function handleSubjectChange(lang: string, value: string) {
    if (!editingTemplate) return
    setEditingTemplate({ ...editingTemplate, subject: { ...editingTemplate.subject, [lang]: value } })
  }

  function handleBodyChange(lang: string, value: string) {
    if (!editingTemplate) return
    setEditingTemplate({ ...editingTemplate, body_html: { ...editingTemplate.body_html, [lang]: value } })
  }

  function handleAddVariable() {
    if (!editingTemplate) return
    const varName = prompt('Variable name (e.g. first_name):')
    if (varName && !editingTemplate.variables.includes(varName)) {
      setEditingTemplate({ ...editingTemplate, variables: [...editingTemplate.variables, varName] })
    }
  }

  function handleRemoveVariable(varName: string) {
    if (!editingTemplate) return
    setEditingTemplate({ ...editingTemplate, variables: editingTemplate.variables.filter((v) => v !== varName) })
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  // ─── Template Editor view ───

  if (editingTemplate) {
    return (
      <div>
        <h1 className="font-serif text-2xl text-foreground mb-6">{t('emails.title')}</h1>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => { setEditingTemplate(null); setIsNewTemplate(false) }} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <h2 className="font-serif text-lg text-foreground">
                {isNewTemplate ? t('emails.newTemplate') : t('emails.editTemplate')}
              </h2>
            </div>
            <button
              onClick={handleSaveTemplate}
              disabled={saving || !editingTemplate.name}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('common.save')}
            </button>
          </div>

          {/* Name + Type + Active */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">{t('emails.templateName')}</label>
              <input type="text" value={editingTemplate.name} onChange={(e) => handleTemplateChange('name', e.target.value)} placeholder="Welcome New User" className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('emails.templateType')}</label>
              <select value={editingTemplate.email_type} onChange={(e) => handleTemplateChange('email_type', e.target.value)} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm">
                {EMAIL_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => handleTemplateChange('is_active', !editingTemplate.is_active)}
                className={cn('flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors',
                  editingTemplate.is_active ? 'border-green-300 bg-green-50 text-green-700' : 'border-border bg-card text-muted-foreground'
                )}
              >
                {editingTemplate.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {editingTemplate.is_active ? t('emails.active') : t('emails.inactive')}
              </button>
            </div>
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-xs text-muted-foreground">{t('emails.variables')}</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {editingTemplate.variables.map((v) => (
                <span key={v} className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs font-mono text-muted-foreground group">
                  {`{{${v}}}`}
                  <button onClick={() => handleRemoveVariable(v)} className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"><X className="w-3 h-3" /></button>
                </span>
              ))}
              <button onClick={handleAddVariable} className="px-2 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                + {t('emails.addVariable')}
              </button>
            </div>
          </div>

          {/* Language + View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              {LANGUAGES.map((lang) => (
                <button key={lang} onClick={() => setTemplateLang(lang)} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', templateLang === lang ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}>
                  <Globe className="w-3 h-3" />{LANG_LABELS[lang]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              <button onClick={() => setTemplateView('edit')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', templateView === 'edit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                <Code className="w-3 h-3" />HTML
              </button>
              <button onClick={() => setTemplateView('preview')} className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors', templateView === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground')}>
                <Eye className="w-3 h-3" />Preview
              </button>
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="text-xs text-muted-foreground">{t('emails.subject')} ({LANG_LABELS[templateLang]})</label>
            <input type="text" value={editingTemplate.subject[templateLang] || ''} onChange={(e) => handleSubjectChange(templateLang, e.target.value)} placeholder={`Subject line in ${LANG_LABELS[templateLang]}...`} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm" />
          </div>

          {/* Body */}
          <div>
            <label className="text-xs text-muted-foreground">{t('emails.body')} ({LANG_LABELS[templateLang]})</label>
            {templateView === 'edit' ? (
              <textarea value={editingTemplate.body_html[templateLang] || ''} onChange={(e) => handleBodyChange(templateLang, e.target.value)} placeholder="<div>Email HTML content...</div>" rows={16} className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono leading-relaxed" />
            ) : (
              <div className="mt-1 rounded-lg border border-border bg-white overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                  <p className="text-xs text-gray-500 truncate">{t('emails.subject')}: {editingTemplate.subject[templateLang] || '(no subject)'}</p>
                </div>
                <div className="p-4" dangerouslySetInnerHTML={{ __html: editingTemplate.body_html[templateLang] || '<p style="color:#999">No content yet</p>' }} />
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ─── Main view ───

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('emails.title')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {(['templates', 'sent'] as const).map((key) => (
          <button key={key} onClick={() => setTab(key)} className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-colors', tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground')}>
            {t(`emails.tabs.${key}`)}
          </button>
        ))}
      </div>

      {/* Templates tab */}
      {tab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{templates.length} {t('emails.tabs.templates').toLowerCase()}</p>
            <button onClick={handleNewTemplate} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" />{t('emails.newTemplate')}
            </button>
          </div>
          <div className="space-y-3">
            {templates.map((tmpl) => (
              <div key={tmpl.id} className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer" onClick={() => handleEditTemplate(tmpl)}>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tmpl.email_type}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs', tmpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500')}>
                    {tmpl.is_active ? t('emails.active') : t('emails.inactive')}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2 truncate">{tmpl.subject?.da || tmpl.subject?.en || '(no subject)'}</p>
                {tmpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.variables.map((v) => <span key={v} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">{`{{${v}}}`}</span>)}
                  </div>
                )}
              </div>
            ))}
            {templates.length === 0 && <p className="text-center text-muted-foreground py-12">{t('emails.noTemplates')}</p>}
          </div>
        </div>
      )}

      {/* Sent emails tab */}
      {tab === 'sent' && (
        <div>
          <p className="text-sm text-muted-foreground mb-4">{sentEmails.length} {t('emails.tabs.sent').toLowerCase()}</p>
          <div className="space-y-2">
            {sentEmails.map((email) => (
              <div key={email.id} className="p-3 rounded-lg border border-border bg-card">
                <div className="flex items-center gap-3">
                  <EmailStatusIcon status={email.status} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{email.subject}</p>
                    <p className="text-xs text-muted-foreground">{email.email_address} • {email.email_type}</p>
                  </div>
                  <span className={cn('px-2 py-0.5 rounded-full text-xs capitalize',
                    email.status === 'delivered' || email.status === 'opened' || email.status === 'clicked' ? 'bg-green-100 text-green-700' :
                    email.status === 'failed' || email.status === 'bounced' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-600'
                  )}>
                    {email.status}
                  </span>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {email.sent_at ? new Date(email.sent_at).toLocaleDateString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
              </div>
            ))}
            {sentEmails.length === 0 && <p className="text-center text-muted-foreground py-12">{t('emails.noEmails')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

function EmailStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'delivered': case 'opened': case 'clicked':
      return <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
    case 'sent':
      return <Send className="w-4 h-4 text-blue-600 flex-shrink-0" />
    case 'failed': case 'bounced':
      return <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
    default:
      return <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
  }
}
