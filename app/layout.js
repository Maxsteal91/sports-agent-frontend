'use client'
import './globals.css'
import Link from 'next/link'

export default function RootLayout({ children }) {
  return (
    <html lang="it">
      <body>
        <nav style={{
          background: 'rgba(10,14,26,0.95)',
          borderBottom: '1px solid var(--border)',
          padding: '0 2rem',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backdropFilter: 'blur(10px)'
        }}>
          <Link href="/" style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.5rem',
            fontWeight: 700,
            color: 'var(--primary)',
            letterSpacing: '0.05em'
          }}>
            ⚽ MAZZOLA ANALYTICS
          </Link>
          <div style={{ display: 'flex', gap: '2rem' }}>
            {[
              { href: '/', label: 'Dashboard' },
              { href: '/confronto', label: 'Confronto' },
              { href: '/chat', label: 'AI Chat' },
            ].map(({ href, label }) => (
              <Link key={href} href={href} style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase'
              }}>
                {label}
              </Link>
            ))}
          </div>
        </nav>
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}