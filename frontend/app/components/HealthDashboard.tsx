'use client'

import { useEffect, useState, useCallback } from 'react'
import { scanCluster } from '../lib/api'
import type { ClusterScanResult, Issue } from '../lib/types'

interface HealthDashboardProps {
  clusterId: string
}

export default function HealthDashboard({ clusterId }: HealthDashboardProps) {
  const [scan, setScan] = useState<ClusterScanResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const loadScan = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await scanCluster(clusterId)
      setScan(result)
      setLastRefresh(new Date())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to scan cluster')
    } finally {
      setLoading(false)
    }
  }, [clusterId])

  useEffect(() => {
    loadScan()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadScan, 30000)
    return () => clearInterval(interval)
  }, [loadScan])

  if (loading && !scan) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 text-neutral-500">
          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span>Scanning cluster...</span>
        </div>
      </div>
    )
  }

  if (error && !scan) {
    return (
      <div className="card p-6">
        <div className="text-danger flex items-center gap-2">
          <span>{error}</span>
          <button onClick={loadScan} className="underline hover:no-underline">Retry</button>
        </div>
      </div>
    )
  }

  if (!scan) return null

  const { summary, issues } = scan
  const criticalIssues = issues.filter(i => i.severity === 'critical')
  const warningIssues = issues.filter(i => i.severity === 'warning')
  const infoIssues = issues.filter(i => i.severity === 'info')

  return (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">
          {scan.cluster_name}
        </h2>
        <div className="flex items-center gap-3 text-sm text-neutral-500">
          {lastRefresh && (
            <span>
              Updated {formatTimestamp(lastRefresh)}
            </span>
          )}
          <button
            onClick={loadScan}
            disabled={loading}
            className="btn-secondary py-1 px-2 text-sm flex items-center gap-1"
          >
            {loading ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <SummaryCard
          label="Pods"
          value={`${summary.pods_healthy}/${summary.pods_total}`}
          status={summary.pods_unhealthy > 0 ? 'warning' : 'healthy'}
          detail={summary.pods_unhealthy > 0 ? `${summary.pods_unhealthy} unhealthy` : 'All healthy'}
        />
        <SummaryCard
          label="Nodes"
          value={`${summary.nodes_ready}/${summary.nodes_total}`}
          status={summary.nodes_not_ready > 0 ? 'critical' : 'healthy'}
          detail={summary.nodes_not_ready > 0 ? `${summary.nodes_not_ready} not ready` : 'All ready'}
        />
        <SummaryCard
          label="Services"
          value={String(summary.services_total)}
          status="info"
          detail="Total services"
        />
        <SummaryCard
          label="Issues"
          value={String(summary.issues_total)}
          status={summary.issues_critical > 0 ? 'critical' : summary.issues_warning > 0 ? 'warning' : 'healthy'}
          detail={`${summary.issues_critical} critical, ${summary.issues_warning} warning`}
        />
      </div>

      {/* Issues list */}
      {issues.length > 0 && (
        <div className="card">
          <div className="p-4 border-b border-neutral-200">
            <h3 className="font-medium text-neutral-900">Issues</h3>
          </div>
          <div className="divide-y divide-neutral-100">
            {criticalIssues.map((issue, i) => (
              <IssueRow key={`critical-${i}`} issue={issue} />
            ))}
            {warningIssues.map((issue, i) => (
              <IssueRow key={`warning-${i}`} issue={issue} />
            ))}
            {infoIssues.map((issue, i) => (
              <IssueRow key={`info-${i}`} issue={issue} />
            ))}
          </div>
        </div>
      )}

      {issues.length === 0 && (
        <div className="card p-6 text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full mb-3">
            <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-neutral-600">No issues detected. Cluster is healthy.</p>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  status,
  detail,
}: {
  label: string
  value: string
  status: 'critical' | 'warning' | 'healthy' | 'info'
  detail: string
}) {
  const statusColors = {
    critical: 'text-danger',
    warning: 'text-warning',
    healthy: 'text-success',
    info: 'text-info',
  }

  return (
    <div className="card p-4">
      <div className="text-sm text-neutral-500 mb-1">{label}</div>
      <div className={`text-2xl font-semibold ${statusColors[status]}`}>{value}</div>
      <div className="text-xs text-neutral-400 mt-1">{detail}</div>
    </div>
  )
}

function IssueRow({ issue }: { issue: Issue }) {
  const severityBadge = {
    critical: 'badge-critical',
    warning: 'badge-warning',
    info: 'badge-info',
  }

  return (
    <div className="p-4 hover:bg-neutral-50">
      <div className="flex items-start gap-3">
        <span className={`badge ${severityBadge[issue.severity]} mt-0.5`}>
          {issue.severity}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-neutral-900">{issue.type}</div>
          <div className="text-sm text-neutral-600 mt-0.5">
            {issue.resource}
            {issue.namespace && <span className="text-neutral-400"> in {issue.namespace}</span>}
          </div>
          {issue.evidence.length > 0 && (
            <div className="text-sm text-neutral-500 mt-2 font-mono bg-neutral-50 p-2 rounded">
              {issue.evidence[0]}
            </div>
          )}
          <div className="text-sm text-primary-600 mt-2">{issue.suggested_fix}</div>
        </div>
      </div>
    </div>
  )
}

function formatTimestamp(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
  if (seconds < 60) return 'just now'
  if (seconds < 120) return '1 minute ago'
  return `${Math.floor(seconds / 60)} minutes ago`
}
