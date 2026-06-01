/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // LOCALE
      {
        source: '/api/:path*',
        destination: 'http://localhost:8000/:path*',
      },
      // RAILWAY (produzione)
      // {
      //   source: '/api/:path*',
      //   destination: 'https://sports-agent-backend-production.up.railway.app/:path*',
      // },
    ]
  },
}
export default nextConfig