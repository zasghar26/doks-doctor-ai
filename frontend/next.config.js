/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    // Proxy API calls to backend in development
    return process.env.NODE_ENV === 'development'
      ? [
          {
            source: '/api/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/api/:path*`,
          },
          {
            source: '/auth/:path*',
            destination: `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'}/auth/:path*`,
          },
        ]
      : []
  },
}

module.exports = nextConfig
