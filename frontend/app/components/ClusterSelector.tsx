'use client'

import { useEffect, useState } from 'react'
import { getClusters } from '../lib/api'
import type { ClusterInfo } from '../lib/types'
import { isActionRequiredError } from '../lib/types'

interface ClusterSelectorProps {
  selectedTeamId: string | null
  selectedClusterId: string | null
  onClusterSelected: (clusterId: string) => void
  onTeamRequired: () => void
}

export default function ClusterSelector({
  selectedTeamId,
  selectedClusterId,
  onClusterSelected,
  onTeamRequired,
}: ClusterSelectorProps) {
  const [clusters, setClusters] = useState<ClusterInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (selectedTeamId) {
      loadClusters()
    }
  }, [selectedTeamId])

  async function loadClusters() {
    try {
      setLoading(true)
      setError(null)
      const response = await getClusters()
      setClusters(response.clusters)
      
      // Auto-select default cluster from backend
      if (response.default_selected_cluster_id && !selectedClusterId) {
        onClusterSelected(response.default_selected_cluster_id)
      }
    } catch (err) {
      if (isActionRequiredError(err)) {
        onTeamRequired()
        setError('Select a team first')
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load clusters')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!selectedTeamId) {
    return (
      <div className="text-sm text-neutral-500 italic">
        Select a team to view clusters
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 text-sm">
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading clusters...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-danger flex items-center gap-2">
        <span>{error}</span>
        <button onClick={loadClusters} className="underline hover:no-underline">Retry</button>
      </div>
    )
  }

  if (clusters.length === 0) {
    return (
      <div className="text-sm text-neutral-500">
        No clusters found for this team
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="cluster-select" className="text-sm text-neutral-500">
        Cluster:
      </label>
      <select
        id="cluster-select"
        value={selectedClusterId || ''}
        onChange={(e) => onClusterSelected(e.target.value)}
        className="select text-sm py-1 px-2 min-w-[200px]"
      >
        <option value="" disabled>Select cluster</option>
        {clusters.map((cluster) => (
          <option key={cluster.id} value={cluster.id}>
            {cluster.name} ({cluster.region || 'unknown'})
          </option>
        ))}
      </select>
    </div>
  )
}
