/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // Proxy /api/* and /auth/* to the backend.
    // BACKEND_URL is the internal URL used by the Next.js server to reach the
    // backend (e.g. http://backend:8000 on App Platform, or http://localhost:8000
    // in local development). It is never exposed to the browser.
    const backendBase = process.env.BACKEND_URL
    if (!backendBase) {
      throw new Error(
        'BACKEND_URL environment variable is required. ' +
        'Set it to the URL your Next.js server uses to reach the backend ' +
        '(e.g. http://localhost:8000 for local dev).'
      )
    }
    return [
      {
        source: '/api/:path*',
        destination: `${backendBase}/api/:path*`,
      },
      {
        source: '/auth/:path*',
        destination: `${backendBase}/auth/:path*`,
      },
    ]
  },
}

module.exports = nextConfig
