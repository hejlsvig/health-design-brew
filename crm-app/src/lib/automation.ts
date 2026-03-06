import { supabase } from './supabase'

export type TriggerType = 'on_signup' | 'on_coaching_activate' | 'on_checkin_missed' | 'on_tier_change' | 'on_date' | 'manual'
export type NodeType = 'trigger' | 'condition' | 'action' | 'delay' | 'branch'
export type RunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'

export interface AutomationFlow {
  id: string
  name: string
  description: string | null
  trigger_type: TriggerType
  trigger_config: Record<string, unknown>
  enabled: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface AutomationStep {
  id: string
  flow_id: string
  step_order: number
  node_type: NodeType
  label: string | null
  config: Record<string, unknown>
  on_true_step_id: string | null
  on_false_step_id: string | null
  created_at: string
}

export interface AutomationRun {
  id: string
  flow_id: string
  target_user_id: string | null
  status: RunStatus
  current_step_id: string | null
  started_at: string
  completed_at: string | null
  error_message: string | null
  log: Record<string, unknown>[]
  created_at: string
}

export interface FlowWithSteps extends AutomationFlow {
  steps: AutomationStep[]
}

// ─── Flows ───

export async function fetchFlows(): Promise<AutomationFlow[]> {
  const { data, error } = await supabase
    .from('automation_flows')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []) as AutomationFlow[]
}

export async function fetchFlowWithSteps(flowId: string): Promise<FlowWithSteps | null> {
  const [flowResult, stepsResult] = await Promise.all([
    supabase.from('automation_flows').select('*').eq('id', flowId).single(),
    supabase.from('automation_flow_steps').select('*').eq('flow_id', flowId).order('step_order'),
  ])

  if (flowResult.error) throw flowResult.error
  if (stepsResult.error) throw stepsResult.error

  return {
    ...(flowResult.data as AutomationFlow),
    steps: (stepsResult.data || []) as AutomationStep[],
  }
}

export async function createFlow(flow: {
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_config?: Record<string, unknown>
  created_by?: string
}): Promise<AutomationFlow> {
  const { data, error } = await supabase
    .from('automation_flows')
    .insert({
      name: flow.name,
      description: flow.description || null,
      trigger_type: flow.trigger_type,
      trigger_config: flow.trigger_config || {},
      enabled: false,
      created_by: flow.created_by || null,
    })
    .select()
    .single()

  if (error) throw error
  return data as AutomationFlow
}

export async function updateFlow(flowId: string, updates: Partial<AutomationFlow>): Promise<void> {
  const { error } = await supabase
    .from('automation_flows')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', flowId)

  if (error) throw error
}

export async function toggleFlow(flowId: string, enabled: boolean): Promise<void> {
  const { error } = await supabase
    .from('automation_flows')
    .update({ enabled, updated_at: new Date().toISOString() })
    .eq('id', flowId)

  if (error) throw error
}

export async function deleteFlow(flowId: string): Promise<void> {
  const { error } = await supabase
    .from('automation_flows')
    .delete()
    .eq('id', flowId)

  if (error) throw error
}

// ─── Steps ───

export async function addStep(step: {
  flow_id: string
  step_order: number
  node_type: NodeType
  label?: string
  config?: Record<string, unknown>
}): Promise<AutomationStep> {
  const { data, error } = await supabase
    .from('automation_flow_steps')
    .insert({
      flow_id: step.flow_id,
      step_order: step.step_order,
      node_type: step.node_type,
      label: step.label || null,
      config: step.config || {},
    })
    .select()
    .single()

  if (error) throw error
  return data as AutomationStep
}

export async function updateStep(stepId: string, updates: Partial<AutomationStep>): Promise<void> {
  const { error } = await supabase
    .from('automation_flow_steps')
    .update(updates)
    .eq('id', stepId)

  if (error) throw error
}

export async function deleteStep(stepId: string): Promise<void> {
  const { error } = await supabase
    .from('automation_flow_steps')
    .delete()
    .eq('id', stepId)

  if (error) throw error
}

// ─── Runs ───

export async function fetchFlowRuns(flowId: string, limit = 50): Promise<AutomationRun[]> {
  const { data, error } = await supabase
    .from('automation_flow_runs')
    .select('*')
    .eq('flow_id', flowId)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as AutomationRun[]
}

export async function fetchRecentRuns(limit = 50): Promise<(AutomationRun & { flow?: { name: string } })[]> {
  const { data, error } = await supabase
    .from('automation_flow_runs')
    .select(`*, flow:automation_flows (name)`)
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data || []) as (AutomationRun & { flow?: { name: string } })[]
}

// ─── Helper: Node type display config ───

export const NODE_TYPE_CONFIG: Record<NodeType, { emoji: string; color: string; bgColor: string }> = {
  trigger: { emoji: '🎯', color: 'text-blue-600', bgColor: 'bg-blue-50 border-blue-200' },
  condition: { emoji: '❓', color: 'text-amber-600', bgColor: 'bg-amber-50 border-amber-200' },
  action: { emoji: '⚡', color: 'text-green-600', bgColor: 'bg-green-50 border-green-200' },
  delay: { emoji: '⏱', color: 'text-purple-600', bgColor: 'bg-purple-50 border-purple-200' },
  branch: { emoji: '🔀', color: 'text-orange-600', bgColor: 'bg-orange-50 border-orange-200' },
}

export const TRIGGER_TYPE_LABELS: Record<TriggerType, string> = {
  on_signup: 'New Signup',
  on_coaching_activate: 'Coaching Activated',
  on_checkin_missed: 'Missed Check-in',
  on_tier_change: 'Tier Changed',
  on_date: 'Scheduled Date',
  manual: 'Manual Trigger',
}
