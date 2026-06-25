'use client'

import { useState } from 'react'
import ProtectedRoute from './components/ProtectedRoute'
import TeamSelector from './components/TeamSelector'
import ClusterSelector from './components/ClusterSelector'
import HealthDashboard from './components/HealthDashboard'
import AgentChat from './components/AgentChat'
import { logout } from './lib/api'
import type { User } from './lib/types'

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      {(user) => <Dashboard user={user} />}
    </ProtectedRoute>
  )
}

function Dashboard({ user }: { user: User }) {
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(user.selected_team_id)
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null)

  const handleLogout = async () => {
    await logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-neutral-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo and title */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary-500 rounded flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <span className="font-semibold text-neutral-900">DOKS Doctor AI</span>
          </div>

          {/* Selectors */}
          <div className="flex items-center gap-4">
            <TeamSelector
              selectedTeamId={selectedTeamId}
              onTeamSelected={(teamId) => {
                setSelectedTeamId(teamId)
                setSelectedClusterId(null) // Reset cluster when team changes
              }}
            />
            <ClusterSelector
              selectedTeamId={selectedTeamId}
              selectedClusterId={selectedClusterId}
              onClusterSelected={setSelectedClusterId}
              onTeamRequired={() => setSelectedTeamId(null)}
            />
          </div>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-600">{user.email}</span>
            <button
              onClick={handleLogout}
              className="btn-secondary py-1 px-3 text-sm"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 p-4">
        <div className="max-w-7xl mx-auto">
          {!selectedTeamId && (
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-neutral-900 mb-2">Select a Team</h2>
              <p className="text-neutral-600">Choose a team from the dropdown above to view clusters.</p>
            </div>
          )}

          {selectedTeamId && !selectedClusterId && (
            <div className="card p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-full mb-4">
                <svg className="w-6 h-6 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h2 className="text-lg font-medium text-neutral-900 mb-2">Select a Cluster</h2>
              <p className="text-neutral-600">Choose a cluster from the dropdown above to start diagnosing.</p>
            </div>
          )}

          {selectedTeamId && selectedClusterId && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Health dashboard - 2 columns */}
              <div className="lg:col-span-2">
                <HealthDashboard clusterId={selectedClusterId} />
              </div>

              {/* Agent chat - 1 column */}
              <div className="lg:col-span-1 h-[calc(100vh-140px)]">
                <AgentChat clusterId={selectedClusterId} />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
