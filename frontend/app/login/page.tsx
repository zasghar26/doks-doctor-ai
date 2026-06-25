'use client'

import { getLoginUrl } from './lib/api'

export default function LoginPage() {
  const handleLogin = () => {
    window.location.href = getLoginUrl()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50">
      <div className="card p-8 max-w-md w-full mx-4">
        {/* Logo and title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <svg
              className="w-8 h-8 text-primary-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-neutral-900">DOKS Doctor AI</h1>
          <p className="text-neutral-600 mt-2">
            AI-powered Kubernetes troubleshooting
          </p>
        </div>

        {/* Trust statement */}
        <div className="bg-neutral-50 rounded-md p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-success mt-0.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-neutral-600">
              <p className="font-medium text-neutral-700 mb-1">Read-only access</p>
              <p>
                DOKS Doctor AI only reads cluster data to diagnose issues.
                No manual tokens required — login securely with DigitalOcean.
              </p>
            </div>
          </div>
        </div>

        {/* Login button */}
        <button
          onClick={handleLogin}
          className="w-full btn-primary flex items-center justify-center gap-2 py-3"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 2c5.514 0 10 4.486 10 10s-4.486 10-10 10S2 17.514 2 12 6.486 2 12 2zm0 3a7 7 0 100 14 7 7 0 000-14z" />
          </svg>
          Login with DigitalOcean
        </button>

        {/* Footer */}
        <p className="text-xs text-neutral-500 text-center mt-6">
          By logging in, you authorize read-only access to your DOKS clusters.
        </p>
      </div>
    </div>
  )
}
