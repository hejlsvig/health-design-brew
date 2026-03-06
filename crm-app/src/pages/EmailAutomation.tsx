import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  fetchFlows, fetchFlowWithSteps, toggleFlow, deleteFlow,
  addStep, updateStep, deleteStep,
  type AutomationFlow, type FlowWithSteps, type AutomationStep, type NodeType,
  NODE_TYPE_CONFIG, TRIGGER_TYPE_LABELS,
} from '@/lib/automation'
import { fetchEmailTemplates, type EmailTemplate } from '@/lib/emails'
// Auth context available if needed for future features
import {
  Loader2, Zap, Plus, Trash2, ChevronDown, ChevronRight,
  ToggleLeft, ToggleRight, ArrowDown, Settings2, X,
} from 'lucide-react'

export default function EmailAutomation() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<'flows' | 'templates'>('flows')
  const [flows, setFlows] = useState<AutomationFlow[]>([])
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedFlow, setSelectedFlow] = useState<FlowWithSteps | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [f, tmpl] = await Promise.all([fetchFlows(), fetchEmailTemplates()])
      setFlows(f)
      setTemplates(tmpl)
    } catch (err) {
      console.error('Load automation data error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectFlow(flow: AutomationFlow) {
    try {
      const full = await fetchFlowWithSteps(flow.id)
      setSelectedFlow(full)
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
        {(['flows', 'templates'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === key ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t(`automation.tabs.${key}`)}
          </button>
        ))}
      </div>

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

      {tab === 'templates' && (
        <div className="space-y-3">
          {templates.map((tmpl) => (
            <div key={tmpl.id} className="p-4 rounded-xl border border-border bg-card">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{tmpl.name}</p>
                  <p className="text-xs text-muted-foreground">{tmpl.email_type}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${tmpl.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {tmpl.is_active ? t('automation.active') : t('automation.inactive')}
                </span>
              </div>
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
