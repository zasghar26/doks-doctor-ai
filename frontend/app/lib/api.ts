// DOKS Doctor AI — API Client
// All fetch calls include credentials for cookie-based auth

import type {
  User,
  TeamsResponse,
  ClustersResponse,
  ClusterScanResult,
  AgentRunCreated,
  AgentRunResult,
  APIError,
} from './types'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ''

// ─────────────────────────────────────────────────────────────────────────────
// Fetch Wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${path}`
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Always send cookies
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!response.ok) {
    let errorBody: APIError
    try {
      const data = await response.json()
      // Handle nested error detail from FastAPI
      errorBody = typeof data.detail === 'object' ? data.detail : { error: data.detail || data.error || 'Unknown error' }
    } catch {
      errorBody = { error: `HTTP ${response.status}` }
    }
    
    // Redirect to login on 401
    if (response.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login'
    }
    
    throw errorBody
  }

  return response.json()
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

export async function getMe(): Promise<User> {
  return apiFetch<User>('/api/me')
}

export async function logout(): Promise<void> {
  await apiFetch('/auth/logout', { method: 'POST' })
}

export function getLoginUrl(): string {
  return `${API_BASE}/auth/login`
}

// ─────────────────────────────────────────────────────────────────────────────
// Teams
// ─────────────────────────────────────────────────────────────────────────────

export async function getTeams(): Promise<TeamsResponse> {
  return apiFetch<TeamsResponse>('/api/teams')
}

export async function selectTeam(teamId: string): Promise<{ status: string; selected_team_id: string }> {
  return apiFetch(`/api/teams/${teamId}/select`, { method: 'POST' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Clusters
// ─────────────────────────────────────────────────────────────────────────────

export async function getClusters(): Promise<ClustersResponse> {
  return apiFetch<ClustersResponse>('/api/clusters', { method: 'POST' })
}

export async function scanCluster(clusterId: string): Promise<ClusterScanResult> {
  return apiFetch<ClusterScanResult>(`/api/clusters/${clusterId}/scan`, { method: 'POST' })
}

// ─────────────────────────────────────────────────────────────────────────────
// Agent Runs
// ─────────────────────────────────────────────────────────────────────────────

export async function createAgentRun(
  clusterId: string,
  question: string,
  mode: 'fast' | 'deep' = 'fast'
): Promise<AgentRunCreated> {
  return apiFetch<AgentRunCreated>('/api/agent/runs', {
    method: 'POST',
    body: JSON.stringify({ cluster_id: clusterId, question, mode }),
  })
}

export async function getAgentRunResult(runId: string): Promise<{ run_id: string; status: string; result: AgentRunResult | null }> {
  return apiFetch(`/api/agent/runs/${runId}`)
}

export function getAgentRunEventsUrl(runId: string): string {
  return `${API_BASE}/api/agent/runs/${runId}/events`
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE Helper
// ─────────────────────────────────────────────────────────────────────────────

export function subscribeToAgentRun(
  runId: string,
  onEvent: (event: { type: string; data: unknown }) => void,
  onError?: (error: Event) => void
): () => void {
  const url = getAgentRunEventsUrl(runId)
  const eventSource = new EventSource(url, { withCredentials: true })

  eventSource.addEventListener('stage', (e) => {
    try {
      onEvent({ type: 'stage', data: JSON.parse(e.data) })
    } catch {
      console.error('Failed to parse stage event', e.data)
    }
  })

  eventSource.addEventListener('result', (e) => {
    try {
      onEvent({ type: 'result', data: JSON.parse(e.data) })
      eventSource.close()
    } catch {
      console.error('Failed to parse result event', e.data)
    }
  })

  eventSource.onerror = (e) => {
    onError?.(e)
    eventSource.close()
  }

  return () => eventSource.close()
}
