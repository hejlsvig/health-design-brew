import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchFlows, fetchFlowWithSteps, toggleFlow, deleteFlow,
  addStep, updateStep, deleteStep,
  fetchFlowRuns, fetchRecentRuns,
  runFlow, testFlow,
  type AutomationFlow, type FlowWithSteps, type AutomationStep, type AutomationRun, type NodeType,
  TRIGGER_TYPE_LABELS,
} from '@/lib/automation'
import { supabase } from '@/lib/supabase'
import {
  Loader2, Plus, Trash2, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, ArrowDown, X,
  Play, FlaskConical, History,
  CheckCircle2, XCircle, Clock, Pause, AlertTriangle,
  User, Target, HelpCircle, Zap, Timer, GitBranch,
  ArrowUp, ArrowDownIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Node type config with Lucide icons ───

const NODE_ICONS: Record<NodeType, typeof Zap> = {
  trigger: Target,
  condition: HelpCircle,
  action: Zap,
  delay: Timer,
  branch: GitBranch,
}

const NODE_COLORS: Record<NodeType, { text: string; bg: string; border: string }> = {
  trigger:   { text: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200' },
  condition: { text: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200' },
  action:    { text: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200' },
  delay:     { text: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
  branch:    { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200' },
}

const NODE_TYPES: NodeType[] = ['trigger', 'condition', 'action', 'delay', 'branch']

export default function Flows() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'flows' | 'history'>('flows')
  const [flows, setFlows] = useState<AutomationFlow[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlow, setSelectedFlow] = useState<FlowWithSteps | null>(null)

  // Run state
  const [running, setRunning] = useState(false)
  const [runResult, setRunResult] = useState<{ status: string; log: Record<string, unknown>[] } | null>(null)
  const [recentRuns, setRecentRuns] = useState<(AutomationRun & { flow?: { name: string } })[]>([])
  const [flowRuns, setFlowRuns] = useState<AutomationRun[]>([])
  const [targetUserId, setTargetUserId] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userSearchResults, setUserSearchResults] = useState<{ id: string; email: string; first_name: string | null }[]>([])
  const [showUserSearch, setShowUserSearch] = useState(false)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, runs] = await Promise.all([fetchFlows(), fetchRecentRuns(20)])
      setFlows(f)
      setRecentRuns(runs)
    } catch (err) {
      console.error('Load flows error:', err)
    } finally {
      setLoading(false)
    }
  }

  // ─── User search ───

  async function handleUserSearch(query: string) {
    setUserSearchQuery(query)
    if (query.length < 2) { setUserSearchResults([]); return }
    try {
      const { data } = await supabase.from('profiles').select('id, email, first_name')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%`).limit(5)
      setUserSearchResults(data || [])
    } catch (err) { console.error('User search error:', err) }
  }

  function selectTargetUser(userId: string, email: string) {
    setTargetUserId(userId); setUserSearchQuery(email); setUserSearchResults([]); setShowUserSearch(false)
  }

  // ─── Run / Test ───

  async function handleRunFlow(dryRun = false) {
    if (!selectedFlow || !targetUserId) return
    setRunning(true); setRunResult(null)
    try {
      const result = dryRun ? await testFlow(selectedFlow.id, targetUserId) : await runFlow(selectedFlow.id, targetUserId)
      setRunResult({
        status: result.status || (result.error ? 'failed' : 'completed'),
        log: result.log || [{ message: result.error || 'No log returned' }],
      })
      const [recent, flowSpecific] = await Promise.all([fetchRecentRuns(20), fetchFlowRuns(selectedFlow.id)])
      setRecentRuns(recent); setFlowRuns(flowSpecific)
    } catch (err) {
      setRunResult({ status: 'failed', log: [{ message: String(err) }] })
    } finally { setRunning(false) }
  }

  // ─── Flow handlers ───

  async function handleSelectFlow(flow: AutomationFlow) {
    try {
      const [full, runs] = await Promise.all([fetchFlowWithSteps(flow.id), fetchFlowRuns(flow.id)])
      setSelectedFlow(full); setFlowRuns(runs); setRunResult(null)
    } catch (err) { console.error('Load flow error:', err) }
  }

  async function handleToggle(flowId: string, enabled: boolean) {
    try {
      await toggleFlow(flowId, enabled)
      setFlows((prev) => prev.map((f) => f.id === flowId ? { ...f, enabled } : f))
      if (selectedFlow?.id === flowId) setSelectedFlow((prev) => prev ? { ...prev, enabled } : null)
    } catch (err) { console.error('Toggle error:', err) }
  }

  async function handleDeleteFlow(flowId: string) {
    try {
      await deleteFlow(flowId)
      setFlows((prev) => prev.filter((f) => f.id !== flowId))
      if (selectedFlow?.id === flowId) setSelectedFlow(null)
    } catch (err) { console.error('Delete flow error:', err) }
  }

  async function handleAddStep(flowId: string) {
    if (!selectedFlow) return
    const nextOrder = selectedFlow.steps.length + 1
    try {
      await addStep({ flow_id: flowId, step_order: nextOrder, node_type: 'action', label: 'New Step' })
      const full = await fetchFlowWithSteps(flowId); setSelectedFlow(full)
    } catch (err) { console.error('Add step error:', err) }
  }

  async function handleUpdateStep(stepId: string, updates: Partial<AutomationStep>) {
    try {
      await updateStep(stepId, updates)
      if (selectedFlow) { const full = await fetchFlowWithSteps(selectedFlow.id); setSelectedFlow(full) }
    } catch (err) { console.error('Update step error:', err) }
  }

  async function handleDeleteStep(stepId: string) {
    try {
      await deleteStep(stepId)
      if (selectedFlow) { const full = await fetchFlowWithSteps(selectedFlow.id); setSelectedFlow(full) }
    } catch (err) { console.error('Delete step error:', err) }
  }

  async function handleMoveStep(stepId: string, direction: 'up' | 'down') {
    if (!selectedFlow) return
    const steps = [...selectedFlow.steps]
    const idx = steps.findIndex((s) => s.id === stepId)
    if (idx < 0) return
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= steps.length) return

    // Swap step_order values
    try {
      await Promise.all([
        updateStep(steps[idx].id, { step_order: steps[targetIdx].step_order }),
        updateStep(steps[targetIdx].id, { step_order: steps[idx].step_order }),
      ])
      const full = await fetchFlowWithSteps(selectedFlow.id)
      setSelectedFlow(full)
    } catch (err) { console.error('Move step error:', err) }
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
  }

  return (
    <div>
      <h1 className="font-serif text-2xl text-foreground mb-6">{t('flows.title')}</h1>

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {(['flows', 'history'] as const).map((key) => (
          <button key={key} onClick={() => { setTab(key); setRunResult(null) }}
            className={cn('px-4 py-3 text-sm font-medium border-b-2 transition-colors',
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {key === 'history'
              ? <span className="flex items-center gap-1.5"><History className="w-3.5 h-3.5" />{t('flows.tabs.history')}</span>
              : t(`flows.tabs.${key}`)
            }
          </button>
        ))}
      </div>

      {/* ═══ FLOWS TAB ═══ */}
      {tab === 'flows' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Flow list */}
          <div className="space-y-3">
            {flows.map((flow) => (
              <div key={flow.id}
                className={cn('p-4 rounded-xl border transition-all cursor-pointer',
                  selectedFlow?.id === flow.id ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/50'
                )}
                onClick={() => handleSelectFlow(flow)}
              >
                <div className="flex items-center gap-3">
                  <Zap className={cn('w-4 h-4', flow.enabled ? 'text-green-500' : 'text-muted-foreground')} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{flow.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{TRIGGER_TYPE_LABELS[flow.trigger_type]}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleToggle(flow.id, !flow.enabled) }} className="flex-shrink-0">
                    {flow.enabled ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6 text-muted-foreground" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteFlow(flow.id) }} className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {flow.description && <p className="text-xs text-muted-foreground mt-2">{flow.description}</p>}
              </div>
            ))}
            {flows.length === 0 && <p className="text-center text-muted-foreground py-12">{t('flows.noFlows')}</p>}
          </div>

          {/* Flow builder */}
          <div>
            {selectedFlow ? (
              <div className="bg-card rounded-xl border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-foreground">{selectedFlow.name}</h2>
                    <p className="text-xs text-muted-foreground">{TRIGGER_TYPE_LABELS[selectedFlow.trigger_type]} • {selectedFlow.steps.length} {t('flows.steps')}</p>
                  </div>
                  <button onClick={() => setSelectedFlow(null)} className="p-1.5 rounded-lg hover:bg-muted">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>

                {/* Visual steps */}
                <div className="space-y-0">
                  {selectedFlow.steps.map((step, i) => (
                    <FlowStepCard
                      key={step.id}
                      step={step}
                      isFirst={i === 0}
                      isLast={i === selectedFlow.steps.length - 1}
                      onUpdate={(updates) => handleUpdateStep(step.id, updates)}
                      onDelete={() => handleDeleteStep(step.id)}
                      onMove={(dir) => handleMoveStep(step.id, dir)}
                    />
                  ))}
                </div>

                {/* Add step */}
                <button onClick={() => handleAddStep(selectedFlow.id)}
                  className="w-full mt-4 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4" />{t('flows.addStep')}
                </button>

                {/* ─── Run / Test ─── */}
                <div className="mt-6 pt-4 border-t border-border space-y-3">
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Play className="w-4 h-4" />{t('flows.runFlow')}
                  </h3>

                  {/* User selector */}
                  <div className="relative">
                    <label className="text-xs text-muted-foreground">{t('flows.targetUser')}</label>
                    <div className="relative mt-1">
                      <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <input type="text" value={userSearchQuery}
                        onChange={(e) => { handleUserSearch(e.target.value); setShowUserSearch(true) }}
                        onFocus={() => setShowUserSearch(true)}
                        placeholder={t('flows.searchUser')}
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-border bg-background text-sm"
                      />
                    </div>
                    {showUserSearch && userSearchResults.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                        {userSearchResults.map((u) => (
                          <button key={u.id} onClick={() => selectTargetUser(u.id, u.email)} className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors">
                            <span className="font-medium">{u.first_name || 'Unknown'}</span>
                            <span className="text-muted-foreground ml-2">{u.email}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <button onClick={() => handleRunFlow(false)} disabled={running || !targetUserId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}{t('flows.run')}
                    </button>
                    <button onClick={() => handleRunFlow(true)} disabled={running || !targetUserId}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 text-white text-sm font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <FlaskConical className="w-4 h-4" />}{t('flows.dryRun')}
                    </button>
                  </div>

                  {/* Result */}
                  {runResult && (
                    <div className={cn('p-3 rounded-lg border',
                      runResult.status === 'completed' ? 'border-green-200 bg-green-50' :
                      runResult.status === 'failed' ? 'border-red-200 bg-red-50' :
                      'border-amber-200 bg-amber-50'
                    )}>
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

                  {/* Flow runs */}
                  {flowRuns.length > 0 && (
                    <div className="mt-3">
                      <p className="text-xs text-muted-foreground mb-2">{t('flows.recentRuns')}</p>
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
                <Zap className="w-12 h-12 mb-3" />
                <p className="text-sm">{t('flows.selectFlow')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ HISTORY TAB ═══ */}
      {tab === 'history' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{recentRuns.length} {t('flows.recentRuns').toLowerCase()}</p>
            <button onClick={async () => { const runs = await fetchRecentRuns(50); setRecentRuns(runs) }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <History className="w-3.5 h-3.5" />{t('flows.refresh')}
            </button>
          </div>
          <div className="space-y-2">
            {recentRuns.map((run) => <RunCard key={run.id} run={run} flowName={run.flow?.name} />)}
            {recentRuns.length === 0 && <p className="text-center text-muted-foreground py-12">{t('flows.noRuns')}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Run Status Icon ───

function RunStatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
    case 'failed': return <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
    case 'running': return <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin flex-shrink-0" />
    case 'paused': return <Pause className="w-3.5 h-3.5 text-purple-600 flex-shrink-0" />
    case 'skipped': return <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
    default: return <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
  }
}

// ─── Run Card ───

function RunCard({ run, flowName }: { run: AutomationRun; flowName?: string }) {
  const [expanded, setExpanded] = useState(false)
  const logEntries = (run.log || []) as Record<string, unknown>[]

  return (
    <div className={cn('p-3 rounded-lg border transition-all cursor-pointer',
      run.status === 'completed' ? 'border-green-200 bg-green-50/50' :
      run.status === 'failed' ? 'border-red-200 bg-red-50/50' :
      'border-border bg-card'
    )} onClick={() => setExpanded(!expanded)}>
      <div className="flex items-center gap-3">
        <RunStatusIcon status={run.status} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground">{flowName || 'Unknown Flow'}</p>
          <p className="text-xs text-muted-foreground">
            {run.target_user_id?.slice(0, 8)}... • {new Date(run.started_at).toLocaleDateString('da-DK', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium capitalize',
          run.status === 'completed' ? 'bg-green-100 text-green-700' :
          run.status === 'failed' ? 'bg-red-100 text-red-700' :
          'bg-gray-100 text-gray-600'
        )}>{run.status}</span>
        {expanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
      </div>
      {run.error_message && <p className="text-xs text-red-600 mt-1.5">{run.error_message}</p>}
      {expanded && logEntries.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50 space-y-1">
          {logEntries.map((entry, i) => {
            const nodeType = entry.node_type as NodeType | undefined
            const NodeIcon = nodeType ? NODE_ICONS[nodeType] : null
            const colors = nodeType ? NODE_COLORS[nodeType] : null
            return (
              <div key={i} className="flex items-start gap-2 text-xs">
                <span className="text-muted-foreground font-mono flex-shrink-0 w-6 text-right">{(entry.step_order as number) || i + 1}</span>
                {NodeIcon && colors && <NodeIcon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', colors.text)} />}
                <span className={entry.success === false ? 'text-red-600' : 'text-foreground'}>{String(entry.message || '')}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Flow Step Card ───

function FlowStepCard({ step, isFirst, isLast, onUpdate, onDelete, onMove }: {
  step: AutomationStep
  isFirst: boolean
  isLast: boolean
  onUpdate: (updates: Partial<AutomationStep>) => void
  onDelete: () => void
  onMove: (direction: 'up' | 'down') => void
}) {
  const [expanded, setExpanded] = useState(false)
  const colors = NODE_COLORS[step.node_type]
  const StepIcon = NODE_ICONS[step.node_type]

  function getConfigSummary(): string {
    const c = step.config
    if (step.node_type === 'delay') return `${c.value || '?'} ${c.unit || 'minutes'}`
    if (step.node_type === 'action') return String(c.type || 'action')
    if (step.node_type === 'condition') return `${c.type || 'check'} ${c.operator || ''} ${c.value || ''}`
    return ''
  }

  return (
    <div>
      <div className={cn('p-3 rounded-lg border cursor-pointer transition-all', colors.bg, colors.border, expanded && 'ring-2 ring-primary/30')} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-3">
          <StepIcon className={cn('w-4 h-4', colors.text)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={cn('text-xs font-medium uppercase', colors.text)}>{step.node_type}</span>
              <span className="text-sm text-foreground">{step.label || `Step ${step.step_order}`}</span>
            </div>
            {getConfigSummary() && <p className="text-xs text-muted-foreground mt-0.5">{getConfigSummary()}</p>}
          </div>

          {/* Move buttons */}
          <div className="flex flex-col gap-0.5" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => onMove('up')} disabled={isFirst}
              className="p-0.5 rounded hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Flyt op"
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button onClick={() => onMove('down')} disabled={isLast}
              className="p-0.5 rounded hover:bg-white/50 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Flyt ned"
            >
              <ArrowDownIcon className="w-3 h-3" />
            </button>
          </div>

          <button onClick={(e) => { e.stopPropagation(); onDelete() }}
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
            <input type="text" value={step.label || ''} onChange={(e) => onUpdate({ label: e.target.value })} className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Node Type</label>
            <select value={step.node_type} onChange={(e) => onUpdate({ node_type: e.target.value as NodeType })} className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-sm">
              {NODE_TYPES.map((nt) => {
                return <option key={nt} value={nt}>{nt}</option>
              })}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Config (JSON)</label>
            <textarea value={JSON.stringify(step.config, null, 2)} onChange={(e) => { try { onUpdate({ config: JSON.parse(e.target.value) }) } catch { /* invalid JSON */ } }}
              rows={3} className="w-full mt-1 px-2 py-1.5 rounded border border-border bg-background text-xs font-mono" />
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
