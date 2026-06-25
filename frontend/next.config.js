/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // Proxy /api/* and /auth/* to the backend (works in both dev and production)
    const backendBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
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
