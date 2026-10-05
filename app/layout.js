'use client'
import './globals.css'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { getUser, clearAuth, isLoggedIn } from '../lib/auth'
import { TenantProvider, useTenant } from '../lib/TenantContext'

function NavBar() {
  const router   = useRouter()
  const pathname = usePathname()
  const [user, setUser] = useState(null)
  const { tenant, setTenant, allTenants, categoria, setCategoria, categorieDisponibili } = useTenant()

  useEffect(() => {
    if (pathname === '/login') return
    if (!isLoggedIn()) { router.push('/login'); return }
    setUser(getUser())
  }, [pathname])

  const handleLogout = () => { clearAuth(); router.push('/login') }

  const navLinks = [
    { href: '/',          label: 'Squadra' },
    { href: '/partite',   label: 'Partite' },
    { href: '/giocatori', label: 'Giocatori' },
    { href: '/chat',      label: 'AI Chat' },
    { href: '/upload',    label: 'Upload' },
  ]

  const isActive = (href) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <nav style={{
      background: 'rgba(10,14,26,0.95)', borderBottom: '1px solid var(--border)',
      padding: '0 1.5rem', height: '60px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(10px)',
      gap: '1rem',
    }}>
      {/* Logo + selettore tenant — gruppo sinistra */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
        <Link href="/" style={{
          fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700,
          color: 'var(--primary)', letterSpacing: '0.05em', whiteSpace: 'nowrap',
        }}>
          ⚽ SPORTA ANALYTICS
        </Link>

        {/* Selettore tenant — solo admin con più tenant */}
        {user?.role === 'admin' && allTenants.length > 1 && (
          <select
            value={tenant}
            onChange={e => setTenant(e.target.value)}
            style={{
              padding: '0.3rem 0.7rem', borderRadius: 8,
              background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.3)',
              color: 'var(--primary)', fontSize: '0.8rem', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            {allTenants.map(t => (
              <option key={t} value={t}>{t.toUpperCase()}</option>
            ))}
          </select>
        )}

        {/* Tenant fisso per manager/viewer */}
        {user?.role !== 'admin' && tenant && (
          <span style={{
            padding: '0.3rem 0.7rem', borderRadius: 8,
            background: 'rgba(0,229,255,0.06)', border: '1px solid rgba(0,229,255,0.15)',
            color: 'var(--primary)', fontSize: '0.8rem',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {tenant.toUpperCase()}
          </span>
        )}

        {/* Selettore categoria — admin e manager, se ci sono più categorie */}
        {user?.role !== 'viewer' && categorieDisponibili.length > 1 && (
          <select
            value={categoria || ''}
            onChange={e => setCategoria(e.target.value || null)}
            style={{
              padding: '0.3rem 0.7rem', borderRadius: 8,
              background: categoria ? 'rgba(139,92,246,0.1)' : 'rgba(0,229,255,0.04)',
              border: `1px solid ${categoria ? 'rgba(139,92,246,0.5)' : 'rgba(0,229,255,0.2)'}`,
              color: categoria ? '#A78BFA' : 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer',
              fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <option value="">Tutte</option>
            {categorieDisponibili.map(c => (
              <option key={c} value={c}>{c.toUpperCase()}</option>
            ))}
          </select>
        )}

        {/* Categoria fissa per viewer */}
        {user?.role === 'viewer' && categoria && (
          <span style={{
            padding: '0.3rem 0.7rem', borderRadius: 8,
            background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.2)',
            color: '#A78BFA', fontSize: '0.8rem',
            fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.05em',
            textTransform: 'uppercase',
          }}>
            {categoria.toUpperCase()}
          </span>
        )}
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1, justifyContent: 'center' }}>
        {navLinks.map(({ href, label }) => (
          <Link key={href} href={href} style={{
            fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
            letterSpacing: '0.05em', whiteSpace: 'nowrap',
            color: isActive(href) ? 'var(--primary)' : 'var(--text-muted)',
            textTransform: 'uppercase',
            borderBottom: isActive(href) ? '2px solid var(--primary)' : '2px solid transparent',
            paddingBottom: 2,
          }}>
            {label}
          </Link>
        ))}
      </div>

      {/* Utente + admin + logout */}
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {user.role === 'admin' && (
            <Link href="/admin" style={{
              fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600,
              letterSpacing: '0.05em', whiteSpace: 'nowrap', textTransform: 'uppercase',
              color: isActive('/admin') ? 'var(--primary)' : 'var(--text-muted)',
              borderBottom: isActive('/admin') ? '2px solid var(--primary)' : '2px solid transparent',
              paddingBottom: 2,
            }}>
              Admin
            </Link>
          )}
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
              {user.email}
            </div>
            {user.categoria && (
              <div style={{ fontSize: 10, color: '#334155', letterSpacing: '0.05em' }}>
                {user.categoria.toUpperCase()}
              </div>
            )}
          </div>
          <button onClick={handleLogout} style={{
            padding: '4px 12px', borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent', color: 'var(--text-muted)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-display)',
            letterSpacing: '0.05em',
          }}>
            Esci
          </button>
        </div>
      )}
    </nav>
  )
}

export default function RootLayout({ children }) {
  const pathname = usePathname()

  return (
    <html lang="it">
      <body>
        <TenantProvider>
          {pathname !== '/login' && <NavBar />}
          <main style={{ minHeight: 'calc(100vh - 60px)' }}>
            {children}
          </main>
        </TenantProvider>
      </body>
    </html>
  )
}
