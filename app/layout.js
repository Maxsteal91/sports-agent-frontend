'use client'
import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearAuth, isLoggedIn } from '../lib/auth'

export default function RootLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)

  useEffect(() => {
    if (pathname === '/login') return
    if (!isLoggedIn()) { router.push('/login'); return }
    setUser(getUser())
  }, [pathname])

  const handleLogout = () => {
    clearAuth()
    router.push('/login')
  }

  const navTitle = user?.tenant
    ? `⚽ ${user.tenant.toUpperCase()} ANALYTICS`
    : '⚽ SPORTS ANALYTICS'

  const navLinks = [
    { href: '/',          label: 'Dashboard' },
    { href: '/confronto', label: 'Confronto' },
    { href: '/chat',      label: 'AI Chat' },
    { href: '/upload',    label: 'Upload' },
    ...(user?.role === 'admin' ? [{ href: '/admin', label: 'Admin' }] : []),
  ]

  return (
    <html lang="it">
      <body>
        {pathname !== '/login' && (
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
              fontSize: '1.4rem',
              fontWeight: 700,
              color: 'var(--primary)',
              letterSpacing: '0.05em'
            }}>
              {navTitle}
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
              {navLinks.map(({ href, label }) => (
                <Link key={href} href={href} style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: pathname === href ? 'var(--primary)' : 'var(--text-muted)',
                  textTransform: 'uppercase',
                  borderBottom: pathname === href ? '2px solid var(--primary)' : '2px solid transparent',
                  paddingBottom: 2,
                }}>
                  {label}
                </Link>
              ))}

              {/* Info utente + logout */}
              {user && (
                <div style={{ display:'flex', alignItems:'center', gap:12, marginLeft:8 }}>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:11, color:'var(--text-muted)', letterSpacing:'0.05em' }}>
                      {user.email}
                    </div>
                    {user.categoria && (
                      <div style={{ fontSize:10, color:'#334155', letterSpacing:'0.05em' }}>
                        {user.categoria.toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button onClick={handleLogout} style={{
                    padding:'4px 12px', borderRadius:6,
                    border:'1px solid rgba(255,255,255,0.1)',
                    background:'transparent', color:'var(--text-muted)',
                    fontSize:12, cursor:'pointer', fontFamily:'var(--font-display)',
                    letterSpacing:'0.05em',
                  }}>
                    Esci
                  </button>
                </div>
              )}
            </div>
          </nav>
        )}
        <main style={{ minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  )
}
