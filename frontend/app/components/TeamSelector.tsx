'use client'

import { useEffect, useState } from 'react'
import { getTeams, selectTeam } from '../lib/api'
import type { Team } from '../lib/types'

interface TeamSelectorProps {
  selectedTeamId: string | null
  onTeamSelected: (teamId: string) => void
}

export default function TeamSelector({ selectedTeamId, onTeamSelected }: TeamSelectorProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [selecting, setSelecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTeams()
  }, [])

  async function loadTeams() {
    try {
      setLoading(true)
      setError(null)
      const response = await getTeams()
      setTeams(response.teams)
      
      // Auto-select first team if none selected and teams exist
      if (!response.selected_team_id && response.teams.length > 0) {
        handleSelectTeam(response.teams[0].id)
      } else if (response.selected_team_id) {
        onTeamSelected(response.selected_team_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  async function handleSelectTeam(teamId: string) {
    try {
      setSelecting(true)
      setError(null)
      await selectTeam(teamId)
      onTeamSelected(teamId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select team')
    } finally {
      setSelecting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-neutral-500 text-sm">
        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading teams...
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-sm text-danger flex items-center gap-2">
        <span>{error}</span>
        <button onClick={loadTeams} className="underline hover:no-underline">Retry</button>
      </div>
    )
  }

  if (teams.length === 0) {
    return <div className="text-sm text-neutral-500">No teams found</div>
  }

  // Single team — show as label
  if (teams.length === 1) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-neutral-500">Team:</span>
        <span className="font-medium text-neutral-900">{teams[0].name}</span>
      </div>
    )
  }

  // Multiple teams — show dropdown
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="team-select" className="text-sm text-neutral-500">
        Team:
      </label>
      <select
        id="team-select"
        value={selectedTeamId || ''}
        onChange={(e) => handleSelectTeam(e.target.value)}
        disabled={selecting}
        className="select text-sm py-1 px-2 min-w-[150px]"
      >
        <option value="" disabled>Select team</option>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
      {selecting && (
        <svg className="animate-spin h-4 w-4 text-neutral-400" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
    </div>
  )
}
