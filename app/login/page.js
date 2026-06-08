'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { loginAPI } from '../../lib/api'
import { saveAuth } from '../../lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const [loading,  setLoading]  = useState(false)

  // Mostra messaggio se sessione scaduta
  useState(() => {
    if (typeof window !== 'undefined') {
      const msg = sessionStorage.getItem('auth_message')
      if (msg) {
        setError(msg)
        sessionStorage.removeItem('auth_message')
      }
    }
  }, [])

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      const { token, user } = await loginAPI(email, password)
      saveAuth(token, user)
      router.push('/')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const T = {
    bg: '#0A0E1A', card: '#111827', primary: '#00E5FF',
    border: 'rgba(255,255,255,0.08)', muted: '#64748B', text: '#F1F5F9',
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: '2.5rem', width: '100%', maxWidth: 400,
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontSize: '1.8rem',
            fontWeight: 700, color: T.primary, letterSpacing: '0.08em',
          }}>
            ⚽ SPORTS ANALYTICS
          </div>
          <div style={{ color: T.muted, fontSize: '0.85rem', marginTop: 6 }}>
            Accedi al tuo account
          </div>
        </div>

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: 11, color: T.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="tua@email.it"
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.border}`,
                color: T.text, fontSize: '0.95rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 11, color: T.muted, letterSpacing: '0.08em',
              textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              placeholder="••••••••"
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: 8,
                background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${T.border}`,
                color: T.text, fontSize: '0.95rem', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
              borderRadius: 8, padding: '0.75rem', color: '#EF4444', fontSize: '0.85rem',
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            style={{
              width: '100%', padding: '0.85rem', borderRadius: 8,
              background: loading ? 'rgba(0,229,255,0.3)' : T.primary,
              border: 'none', color: '#0A0E1A', fontFamily: 'var(--font-display)',
              fontSize: '1rem', fontWeight: 700, letterSpacing: '0.08em',
              textTransform: 'uppercase', cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </button>
        </div>
      </div>
    </div>
  )
}
