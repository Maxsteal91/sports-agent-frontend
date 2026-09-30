/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      // RAILWAY (produzione)
      {
        source: '/api/:path*',
        destination: 'https://sports-agent-backend-production.up.railway.app/:path*',
      },
      // LOCALE
      // {
      //   source: '/api/:path*',
      //   destination: 'http://localhost:8000/:path*',
      // }
    ]
  },
}
export default nextConfig