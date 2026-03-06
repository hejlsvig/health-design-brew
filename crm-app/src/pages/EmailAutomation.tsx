import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchFlows, fetchFlowWithSteps, toggleFlow, deleteFlow,
  addStep, updateStep, deleteStep,
  fetchFlowRuns, fetchRecentRuns,
  runFlow, testFlow,
  type AutomationFlow, type FlowWithSteps, type AutomationStep, type AutomationRun, type NodeType,
  NODE_TYPE_CONFIG, TRIGGER_TYPE_LABELS,
} from '@/lib/automation'
import {
  fetchEmailTemplates, createEmailTemplate, updateEmailTemplate,
  type EmailTemplate,
} from '@/lib/emails'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Zap, Plus, Trash2, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, ArrowDown, Settings2, X,
  Mail, Eye, Code, Save, Globe, Tag,
  Play, FlaskConical, History, CheckCircle2, XCircle, Clock, Pause, AlertTriangle,
  User,
} from 'lucide-react'

const LANGUAGES = ['da', 'en', 'se'] as const
const LANG_LABELS: Record<string, string> = { da: 'Dansk', en: 'English', se: 'Svenska' }
const EMAIL_TYPES = ['onboarding', 'coaching', 'reminder', 'engagement', 'upsell', 'transactional', 'notification']

export default function EmailAutomation() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'flows' | 'templates' | 'history'>('flows')
  const [flows, setFlows] = useState<AutomationFlow[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlow, setSelectedFlow] = useState<FlowWithSteps | null>(null)

  // Template editor state
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)
  const [isNewTemplate, setIsNewTemplate] = useState(false)
  const [templateLang, setTemplateLang] = useState<string>('da')
  const [templateView, setTemplateView] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)

  // Run state
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ status: string; log: Record<string, unknown>[] } | null>(null)
  const [recentRuns, setRecentRuns] = useState<(AutomationRun & { flow?: { name: string } })[]>([])
  const [flowRuns, setFlowRuns] = useState<AutomationRun[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; email: string; first_name: string | null }[]>([])
  const [showUserSearch, setShowUserSearch] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, tmpl, runs] = await Promise.all([
        fetchFlows(),
        fetchEmailTemplates(),
        fetchRecentRuns(20),
      ])
      setFlows(f)
      setTemplates(tmpl)
      setRecentRuns(runs)
    } catch (err) {
      console.error('Load automation data error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── User search for target selection ───

  async function handleUserSearch(query: string) {
    setUserSearchQuery(query)
    if (query.length < 2) {
      setUserSearchResults([])
      return
    }
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, email, first_name')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%`)
        .limit(5)
      setUserSearchResults(data || [])
    } catch (err) {
      console.error('User search error:', err)
    }
  }

  function selectTargetUser(userId: string, email: string) {
    setTargetUserId(userId)
    setUserSearchQuery(email)
    setUserSearchResults([])
    setShowUserSearch(false)
  }

  // ─── Run / Test handlers ───

  async function handleRunFlow(dryRun = false) {
    if (!selectedFlow || !targetUserId) return
    setRunning(true)
    setRunResult(null)
    try {
      const result = dryRun
        ? await testFlow(selectedFlow.id, targetUserId)
        : await runFlow(selectedFlow.id, targetUserId)
      setRunResult({
        status: result.status || (result.error ? 'failed' : 'completed'),
        log: result.log || [{ message: result.error || 'No log returned' }],
      })
      // Refresh runs
      const [recent, flowSpecific] = await Promise.all([
        fetchRecentRuns(20),
        fetchFlowRuns(selectedFlow.id),
      ])
      setRecentRuns(recent)
      setFlowRuns(flowSpecific)
    } catch (err) {
      setRunResult({ status: 'failed', log: [{ message: String(err) }] })
    } finally {
      setRunning(false)
    }
  }


  // ─── Flow handlers ───

  async function handleSelectFlow(flow: AutomationFlow) {
    try {
      const [full, runs] = await Promise.all([
        fetchFlowWithSteps(flow.id),
        fetchFlowRuns(flow.id),
      ])
      setSelectedFlow(full)
      setFlowRuns(runs)
      setRunResult(null)
    } catch (err) {
      console.error('Load flow error:', err)
    }
  }

  async function handleToggle(flowId: string, enabled: boolean) {
    try {
      await toggleFlow(flowId, enabled)
      setFlows((prev) => prev.map((f) => f.id === flowId ? { ...f, enabled } : f))
      if (selectedFlow?.id === flowId) {
        setSelectedFlow((prev) => prev ? { ...prev, enabled } : null)
      }
    } catch (err) {
      console.error('Toggle error:', err)
    }
  }

  async function handleDeleteFlow(flowId: string) {
    try {
      await deleteFlow(flowId)
      setFlows((prev) => prev.filter((f) => f.id !== flowId))
      if (selectedFlow?.id === flowId) setSelectedFlow(null)
    } catch (err) {
      console.error('Delete flow error:', err)
    }
  }

  async function handleAddStep(flowId: string) {
    if (!selectedFlow) return
    const nextOrder = selectedFlow.steps.length + 1
    try {
      await addStep({ flow_id: flowId, step_order: nextOrder, node_type: 'action', label: 'New Step' })
      const full = await fetchFlowWithSteps(flowId)
      setSelectedFlow(full)
    } catch (err) {
      console.error('Add step error:', err)
    }
  }

  async function handleUpdateStep(stepId: string, updates: Partial<AutomationStep>) {
    try {
      await updateStep(stepId, updates)
      if (selectedFlow) {
        const full = await fetchFlowWithSteps(selectedFlow.id)
        setSelectedFlow(full)
      }
    } catch (err) {
      console.error('Update step error:', err)
    }
  }

  async function handleDeleteStep(stepId: string) {
    try {
      await deleteStep(stepId)
      if (selectedFlow) {
        const full = await fetchFlowWithSteps(selectedFlow.id)
        setSelectedFlow(full)
      }
    } catch (err) {
      console.error('Delete step error:', err)
    }
  }

  // ─── Template handlers ───

  function handleNewTemplate() {
    setEditingTemplate({
      id: '',
      name: '',
      email_type: 'transactional',
      subject: { da: '', en: '', se: '' },
      body_html: { da: '', en: '', se: '' },
      variables: [],
      is_active: true,
      created_at: '',
      updated_at: '',
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
    setEditingTemplate({
      ...editingTemplate,
      subject: { ...editingTemplate.subject, [lang]: value },
    })
  }

  function handleBodyChange(lang: string, value: string) {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      body_html: { ...editingTemplate.body_html, [lang]: value },
    })
  }

  function handleAddVariable() {
    if (!editingTemplate) return
    const varName = prompt('Variable name (e.g. first_name):')
    if (varName && !editingTemplate.variables.includes(varName)) {
      setEditingTemplate({
        ...editingTemplate,
        variables: [...editingTemplate.variables, varName],
      })
    }
  }

  function handleRemoveVariable(varName: string) {
    if (!editingTemplate) return
    setEditingTemplate({
      ...editingTemplate,
      variables: editingTemplate.variables.filter((v) => v !== varName),
    })
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('automation.title')}</h1>

      {/* Tab bar */}
      <div className="flex border-b border-border mb-6">
        {(['flows', 'templates', 'history'] as const).map((key) => (
          <button
            key={key}
            onClick={() => { setTab(key); setEditingTemplate(null); setRunResult(null) }}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {key === 'history' ? (
              <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" />{t('automation.tabs.history')}</span>
            ) : (
              t(`automation.tabs.${key}`)
            )}
          </button>
        ))}
      </div>

      {/* ═══ FLOWS TAB ═══ */}
      {tab === 'flows' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flow list */}
          <div className="space-y-3">
            {flows.map((flow) => (
              <div
                key={flow.id}
                className={`p-4 rounded-xl border transition-all cursor-pointer ${
                  selectedFlow?.id === flow.id
                    ? 'border-primary bg-primary/5'
                    : 'border-border bg-card hover:border-primary/50'
                }`}
                onClick={() => handleSelectFlow(flow)}
              >
                <div className="flex items-center gap-3">
                  <Zap className={`w-4 h-4 ${flow.enabled ? 'text-green-500' : 'text-muted-foreground'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{flow.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {TRIGGER_TYPE_LABELS[flow.trigger_type]}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleToggle(flow.id, !flow.enabled) }}
                    className="flex-shrink-0"
                  >
                    {flow.enabled
                      ? <ToggleRight className="w-6 h-6 text-green-500" />
                      : <ToggleLeft className="w-6 h-6 text-muted-foreground" />
                    }
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id) }}
                    className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {flow.description && (
                  <p className="text-xs text-muted-foreground mt-2">{flow.description}</p>
                )}
              </div>
            ))}
            {flows.length === 0 && (
              <p className="text-center text-muted-foreground py-12">{t('automation.noFlows')}</p>
            )}
          </div>

          {/* Flow builder (visual) */}
          <div>
            {selectedFlow ? (
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-foreground">{selectedFlow.name}</h2>
                    <p className="text-xs text-muted-foreground">
                      {TRIGGER_TYPE_LABELS[selectedFlow.trigger_type]} • {selectedFlow.steps.length} {t('automation.steps')}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFlow(null)}
                    className="p-1.5 rounded-lg hover:bg-muted"
                  >
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Visual steps */}
                <div className="space-y-0">
                  {selectedFlow.steps.map((step, i) => (
                    <FlowStepCard
                      key={step.id}
                      step={step}
                      isLast={i === selectedFlow.steps.length - 1}
                      onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                      onDelete={() => handleDeleteStep(step.id)}
                    />
                  ))}
                </div>

                {/* Add step button */}
                <button
                  onClick={() => handleAddStep(selectedFlow.id)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {t('automation.addStep')}
                </button>

                {/* ─── Run / Test Controls ─── */}
                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Play className="w-4 h-4" />
                    {t('automation.runFlow')}
                  </h3>

                  {/* User selector */}
                  <div className="relative">
                    <label className="text-xs text-muted-foreground">{t('automation.targetUser')}</label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input
                        type="text"
                        value={userSearchQuery}
                        onChange={(e) => { handleUserSearch(e.target.value); setShowUserSearch(true) }}
                        onFocus={() => setShowUserSearch(true)}
                        placeholder={t('automation.searchUser')}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                    </div>
                    {showUserSearch && userSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                        {userSearchResults.map((u) => (
                          <button
                            key={u.id}
                            onClick={() => selectTargetUser(u.id, u.email)}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                          >
                            <span className="font-medium">{u.first_name || 'Unknown'}</span>
                            <span className="text-muted-foreground ml-2">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Run + Test buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleRunFlow(false)}
                      disabled={running || !targetUserId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                      {t('automation.run')}
                    </button>
                    <button
                      onClick={() => handleRunFlow(true)}
                      disabled={running || !targetUserId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}
                      {t('automation.dryRun')}
                    </button>
                  </div>

                  {/* Run result */}
                  {runResult && (
                    <div className={`p-3 rounded-lg border ${
                      runResult.status === 'completed' ? 'border-green-200 bg-green-50' :
                      runResult.status === 'failed' ? 'border-red-200 bg-red-50' :
                      runResult.status === 'paused' ? 'border-purple-200 bg-purple-50' :
                      'border-amber-200 bg-amber-50'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <RunStatusIcon status={runResult.status} />
                        <span className="text-sm font-medium capitalize">{runResult.status}</span>
                      </div>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {runResult.log.map((entry, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <span className="text-muted-foreground font-mono flex-shrink-0">
                              {(entry.step_order as number) ? `#${entry.step_order}` : '→'}
                            </span>
                            <span className={entry.success === false ? 'text-red-600' : 'text-foreground'}>
                              {String(entry.message || entry.label || JSON.stringify(entry))}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Flow runs history */}
                  {flowRuns.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">{t('automation.recentRuns')}</p>
                      <div className="space-y-1 max-h-36 overflow-y-auto">
                        {flowRuns.slice(0, 10).map((run) => (
                          <div key={run.id} className="flex items-center gap-2 px-2 py-1.5 rounded bg-muted/50 text-xs">
                            <RunStatusIcon status={run.status} />
                            <span className="flex-1 truncate">{run.target_user_id?.slice(0, 8)}...</span>
                            <span className="text-muted-foreground">
                              {new Date(run.started_at).toLocaleDateString('da-DK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Settings2 className="w-12 h-12 mb-3" />
                <p className="text-sm">{t('automation.selectFlow')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              {recentRuns.length} {t('automation.recentRuns').toLowerCase()}
            </p>
            <button
              onClick={async () => { const runs = await fetchRecentRuns(50); setRecentRuns(runs) }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              {t('automation.refresh')}
            </button>
          </div>

          <div className="space-y-2">
            {recentRuns.map((run) => (
              <RunCard key={run.id} run={run} flowName={run.flow?.name} />
            ))}
            {recentRuns.length === 0 && (
              <p className="text-center text-muted-foreground py-12">{t('automation.noRuns')}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ TEMPLATES TAB ═══ */}
      {tab === 'templates' && !editingTemplate && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">
              {templates.length} {t('automation.tabs.templates').toLowerCase()}
            </p>
            <button
              onClick={handleNewTemplate}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t('automation.newTemplate')}
            </button>
          </div>

          <div className="space-y-3">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-all cursor-pointer"
                onClick={() => handleEditTemplate(tmpl)}
              >
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                    <p className="text-xs text-muted-foreground">{tmpl.email_type}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${tmpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {tmpl.is_active ? t('automation.active') : t('automation.inactive')}
                  </span>
                </div>
                {/* Subject preview */}
                <p className="text-xs text-muted-foreground mt-2 truncate">
                  {tmpl.subject?.da || tmpl.subject?.en || '(no subject)'}
                </p>
                {tmpl.variables.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {tmpl.variables.map((v) => (
                      <span key={v} className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono text-muted-foreground">
                        {`{{${v}}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {templates.length === 0 && (
              <p className="text-center text-muted-foreground py-12">{t('automation.noTemplates')}</p>
            )}
          </div>
        </div>
      )}

      {/* ═══ TEMPLATE EDITOR ═══ */}
      {tab === 'templates' && editingTemplate && (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setEditingTemplate(null); setIsNewTemplate(false) }}
                className="p-1.5 rounded-lg hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
              <h2 className="font-serif text-lg text-foreground">
                {isNewTemplate ? t('automation.newTemplate') : t('automation.editTemplate')}
              </h2>
            </div>
            <button
              onClick={handleSaveTemplate}
              disabled={saving || !editingTemplate.name}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {t('automation.saveTemplate')}
            </button>
          </div>

          {/* Name + Type + Active row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs text-muted-foreground">{t('automation.templateName')}</label>
              <input
                type="text"
                value={editingTemplate.name}
                onChange={(e) => handleTemplateChange('name', e.target.value)}
                placeholder="Welcome New User"
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{t('automation.templateType')}</label>
              <select
                value={editingTemplate.email_type}
                onChange={(e) => handleTemplateChange('email_type', e.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
              >
                {EMAIL_TYPES.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <button
                onClick={() => handleTemplateChange('is_active', !editingTemplate.is_active)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  editingTemplate.is_active
                    ? 'border-green-300 bg-green-50 text-green-700'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {editingTemplate.is_active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                {editingTemplate.is_active ? t('automation.active') : t('automation.inactive')}
              </button>
            </div>
          </div>

          {/* Variables */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-3.5 h-3.5 text-muted-foreground" />
              <label className="text-xs text-muted-foreground">{t('automation.variables')}</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {editingTemplate.variables.map((v) => (
                <span
                  key={v}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-muted text-xs font-mono text-muted-foreground group"
                >
                  {`{{${v}}}`}
                  <button
                    onClick={() => handleRemoveVariable(v)}
                    className="opacity-0 group-hover:opacity-100 hover:text-red-500 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              <button
                onClick={handleAddVariable}
                className="px-2 py-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary hover:text-primary transition-colors"
              >
                + {t('automation.addVariable')}
              </button>
            </div>
          </div>

          {/* Language selector + View toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang}
                  onClick={() => setTemplateLang(lang)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    templateLang === lang ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Globe className="w-3 h-3" />
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-muted">
              <button
                onClick={() => setTemplateView('edit')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  templateView === 'edit' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Code className="w-3 h-3" />
                HTML
              </button>
              <button
                onClick={() => setTemplateView('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  templateView === 'preview' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'
                }`}
              >
                <Eye className="w-3 h-3" />
                Preview
              </button>
            </div>
          </div>

          {/* Subject line */}
          <div>
            <label className="text-xs text-muted-foreground">{t('automation.subject')} ({LANG_LABELS[templateLang]})</label>
            <input
              type="text"
              value={editingTemplate.subject[templateLang] || ''}
              onChange={(e) => handleSubjectChange(templateLang, e.target.value)}
              placeholder={`Subject line in ${LANG_LABELS[templateLang]}...`}
              className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
            />
          </div>

          {/* Body: HTML editor or Preview */}
          <div>
            <label className="text-xs text-muted-foreground">{t('automation.body')} ({LANG_LABELS[templateLang]})</label>
            {templateView === 'edit' ? (
              <textarea
                value={editingTemplate.body_html[templateLang] || ''}
                onChange={(e) => handleBodyChange(templateLang, e.target.value)}
                placeholder={`<div>Email HTML content...</div>`}
                rows={16}
                className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-xs font-mono leading-relaxed"
              />
            ) : (
              <div className="mt-1 rounded-lg border border-border bg-white overflow-hidden">
                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                  <p className="text-xs text-gray-500 truncate">
                    {t('automation.subject')}: {editingTemplate.subject[templateLang] || '(no subject)'}
                  </p>
                </div>
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{
                    __html: editingTemplate.body_html[templateLang] || '<p style="color:#999">No content yet</p>',
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Run Status Icon ───

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
    case 'failed':
      return <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
    case 'running':
      return <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
    case 'paused':
      return <Pause className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
    case 'skipped':
      return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
    default:
      return <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
  }
}

// ─── Run Card (for history) ───

function RunCard({ run, flowName }: { run: AutomationRun; flowName?: string }) {
  const [expanded, setExpanded] = useState(false)
  const logEntries = (run.log || []) as Record<string, unknown>[]

  return (
    <div
      className={`p-3 rounded-lg border transition-all cursor-pointer ${
        run.status === 'completed' ? 'border-green-200 bg-green-50/50' :
        run.status === 'failed' ? 'border-red-200 bg-red-50/50' :
        run.status === 'paused' ? 'border-purple-200 bg-purple-50/50' :
        'border-border bg-card'
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <div className="flex items-center gap-3">
        <RunStatusIcon status={run.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{flowName || 'Unknown Flow'}</p>
          <p className="text-xs text-muted-foreground">
            {run.target_user_id?.slice(0, 8)}... •{' '}
            {new Date(run.started_at).toLocaleDateString('da-DK', {
              day: '2-digit', month: 'short', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
          run.status === 'completed' ? 'bg-green-100 text-green-700' :
          run.status === 'failed' ? 'bg-red-100 text-red-700' :
          run.status === 'paused' ? 'bg-purple-100 text-purple-700' :
          'bg-gray-100 text-gray-600'
        }`}>
          {run.status}
        </span>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>

      {run.error_message && (
        <p className="text-xs text-red-600 mt-1.5">{run.error_message}</p>
      )}

      {expanded && logEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
          {logEntries.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 text-xs">
              <span className="text-muted-foreground font-mono flex-shrink-0 w-6 text-right">
                {(entry.step_order as number) || i + 1}
              </span>
              <span className={`${entry.node_type ? `px-1 py-0.5 rounded text-[10px] uppercase font-medium ${
                entry.node_type === 'action' ? 'bg-green-100 text-green-700' :
                entry.node_type === 'condition' ? 'bg-amber-100 text-amber-700' :
                entry.node_type === 'delay' ? 'bg-purple-100 text-purple-700' :
                'bg-blue-100 text-blue-700'
              }` : ''}`}>
                {String(entry.node_type || '')}
              </span>
              <span className={entry.success === false ? 'text-red-600' : 'text-foreground'}>
                {String(entry.message || '')}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Flow Step Card ───

const NODE_TYPES: NodeType[] = ['trigger', 'condition', 'action', 'delay', 'branch']

function FlowStepCard({ step, isLast, onUpdate, onDelete }: {
  step: AutomationStep
  isLast: boolean
  onUpdate: (updates: Partial<AutomationStep>) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const cfg = NODE_TYPE_CONFIG[step.node_type]

  function getConfigSummary(): string {
    const c = step.config
    if (step.node_type === 'delay') {
      return `${c.value || '?'} ${c.unit || 'minutes'}`
    }
    if (step.node_type === 'action') {
      return String(c.type || 'action')
    }
    if (step.node_type === 'condition') {
      return `${c.type || 'check'} ${c.operator || ''} ${c.value || ''}`
    }
    return ''
  }

  return (
    <div>
      <div
        className={`p-3 rounded-lg border cursor-pointer transition-all ${cfg.bgColor} ${expanded ? 'ring-2 ring-primary/30' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">{cfg.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium uppercase ${cfg.color}`}>{step.node_type}</span>
              <span className="text-sm text-foreground">{step.label || `Step ${step.step_order}`}</span>
            </div>
            {getConfigSummary() && (
              <p className="text-xs text-muted-foreground mt-0.5">{getConfigSummary()}</p>
            )}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete() }}
            className="p-1 rounded hover:bg-white/50 text-muted-foreground hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="ml-6 mt-2 mb-2 p-3 rounded-lg bg-card border border-border space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Label</label>
            <input
              type="text"
              value={step.label || ''}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Node Type</label>
            <select
              value={step.node_type}
              onChange={(e) => onUpdate({ node_type: e.target.value as NodeType })}
              className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm"
            >
              {NODE_TYPES.map((nt) => (
                <option key={nt} value={nt}>{NODE_TYPE_CONFIG[nt].emoji} {nt}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Config (JSON)</label>
            <textarea
              value={JSON.stringify(step.config, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value)
                  onUpdate({ config: parsed })
                } catch {
                  // Invalid JSON, don't update
                }
              }}
              rows={3}
              className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-xs font-mono"
            />
          </div>
        </div>
      )}

      {/* Connector arrow */}
      {!isLast && (
        <div className="flex justify-center py-1">
          <ArrowDown className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </div>
  )
}
