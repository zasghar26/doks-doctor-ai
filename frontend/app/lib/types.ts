// DOKS Doctor AI — Shared TypeScript Types

// ─────────────────────────────────────────────────────────────────────────────
// User and Auth
// ─────────────────────────────────────────────────────────────────────────────

export interface User {
  user_id: string
  email: string
  expires: number
  selected_team_id: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams
// ─────────────────────────────────────────────────────────────────────────────

export interface Team {
  id: string
  name: string
  uuid?: string
}

export interface TeamsResponse {
  teams: Team[]
  selected_team_id: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Clusters
// ─────────────────────────────────────────────────────────────────────────────

export interface ClusterInfo {
  id: string
  name: string
  region: string | null
  version: string | null
}

export interface ClustersResponse {
  selected_team_id: string
  default_selected_cluster_id: string | null
  clusters: ClusterInfo[]
  message: string | null
}

// ─────────────────────────────────────────────────────────────────────────────
// Cluster Scan
// ─────────────────────────────────────────────────────────────────────────────

export type Severity = 'critical' | 'warning' | 'info'

export interface Issue {
  severity: Severity
  resource: string
  namespace: string | null
  type: string
  evidence: string[]
  suggested_fix: string
}

export interface ClusterSummary {
  pods_total: number
  pods_healthy: number
  pods_unhealthy: number
  nodes_total: number
  nodes_ready: number
  nodes_not_ready: number
  services_total: number
  issues_critical: number
  issues_warning: number
  issues_info: number
  issues_total: number
}

export interface ClusterScanResult {
  cluster_name: string
  summary: ClusterSummary
  issues: Issue[]
  raw_context: Record<string, unknown>
  data_freshness_seconds: number
  selected_team_id?: string
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Runs
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStage = 'discover' | 'gather' | 'analyze' | 'answer' | 'done' | 'error'

export interface AgentRunEvent {
  run_id: string
  stage: AgentStage
  message: string
  timestamp: string
  payload?: Record<string, unknown>
}

export interface AgentRunResult {
  answer: string
  evidence: string[]
  confidence: 'high' | 'medium' | 'low'
  verification_commands: string[]
  data_freshness_seconds: number
}

export interface AgentRunCreated {
  run_id: string
  status: 'queued' | 'running' | 'completed' | 'failed'
}

// ─────────────────────────────────────────────────────────────────────────────
// API Errors
// ─────────────────────────────────────────────────────────────────────────────

export interface APIError {
  error: string
  code?: string
  message?: string
  request_id?: string
}

export function isActionRequiredError(error: unknown): error is APIError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as APIError).code === 'ACTION_REQUIRED_TEAM_SELECTION'
  )
}
