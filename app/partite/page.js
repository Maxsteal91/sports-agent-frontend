'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'
import { useTenant } from '../../lib/TenantContext'

const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : '—'

export default function PartitePage() {
  const { tenant, ready, categoria } = useTenant()
  const [user,      setUser]     = useState(null)
  const [partite,   setPartite]  = useState([])
  const [goalMap,   setGoalMap]  = useState({})
  const [orderDate, setOrderDate] = useState('desc')
  const [loading,   setLoading]  = useState(true)

  useEffect(() => { setUser(getUser()) }, [])

  useEffect(() => {
    if (!tenant || !ready) return
    setLoading(true)

    const catParam = categoria ? `&category=${categoria}` : ''

    Promise.all([
      fetchAPI(`/upload/v2/partite?tenant=${tenant}${catParam}&order=${orderDate}`),
      fetchAPI(`/v2/analytics/${tenant}/aggregati?event_type=shot&period=Totale`),
    ]).then(([partiteRes, tiriRes]) => {
      const allPs = partiteRes.data || []
      setPartite(allPs)

      // Calcola goal per partita e per squadra dagli aggregati
      const gm = {}
      ;(tiriRes.data || []).forEach(r => {
        if (!r.match_name || !r.team) return
        if (!gm[r.match_name]) gm[r.match_name] = {}
        gm[r.match_name][r.team] = (gm[r.match_name][r.team] || 0) + (r.extra?.goal || 0)
      })
      setGoalMap(gm)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [tenant, ready, categoria, orderDate])

  // Il filtro categoria è già applicato lato API tramite catParam
  const partiteFiltrate = partite

  const formatDate = d => d
    ? new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—'

  const getResult = (p) => {
    const match = goalMap[p.match_name]
    if (!match) return null
    const homeGoal = match[p.home_team] ?? null
    const awayGoal = match[p.away_team] ?? null
    if (homeGoal === null && awayGoal === null) return null
    return `${homeGoal ?? 0} - ${awayGoal ?? 0}`
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
            PARTITE
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {partiteFiltrate.length} partite{categoria ? ` — ${categoria.toUpperCase()}` : ''}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => setOrderDate(o => o === 'desc' ? 'asc' : 'desc')}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '0.5rem 1rem', borderRadius: 8, cursor: 'pointer',
              border: '1px solid var(--border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.85rem',
              fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
            }}
          >
            {orderDate === 'desc' ? '↓ Più recenti' : '↑ Più vecchie'}
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.1em' }}>
          CARICAMENTO...
        </div>
      ) : partiteFiltrate.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem' }}>Nessuna partita trovata.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Intestazione colonne */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr 90px 90px 110px',
            gap: '1rem', padding: '0.4rem 1rem',
            color: 'var(--text-muted)', fontSize: '0.72rem',
            fontFamily: 'var(--font-display)', letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>
            <span>Data</span>
            <span>Partita</span>
            <span style={{ textAlign: 'center' }}>Risultato</span>
            <span style={{ textAlign: 'center' }}>Categoria</span>
            <span></span>
          </div>

          {partiteFiltrate.map(p => {
            const result = getResult(p)
            return (
              <div
                key={p.match_name}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '120px 1fr 90px 90px 110px',
                  gap: '1rem', alignItems: 'center',
                  padding: '0.85rem 1rem',
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: '10px',
                  transition: 'border-color 0.15s',
                }}
                onMouseOver={e => e.currentTarget.style.borderColor = 'var(--primary)'}
                onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                {/* Data */}
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {formatDate(p.date)}
                </span>

                {/* Squadre */}
                <div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.03em' }}>
                    {cap(p.home_team)}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0 0.4rem' }}>vs</span>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text)', letterSpacing: '0.03em' }}>
                    {cap(p.away_team)}
                  </span>
                </div>

                {/* Risultato */}
                <div style={{ textAlign: 'center' }}>
                  {result ? (
                    <span style={{
                      fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
                      color: 'var(--primary)', letterSpacing: '0.1em',
                    }}>{result}</span>
                  ) : (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                  )}
                </div>

                {/* Categoria */}
                <div style={{ textAlign: 'center' }}>
                  {p.category ? (
                    <span style={{
                      fontSize: '0.72rem', color: '#A78BFA',
                      background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.25)',
                      padding: '2px 8px', borderRadius: '4px',
                      fontFamily: 'var(--font-display)', letterSpacing: '0.06em',
                    }}>
                      {p.category.toUpperCase()}
                    </span>
                  ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>}
                </div>

                {/* Bottone dettaglio */}
                <div style={{ textAlign: 'right' }}>
                  <Link href={`/partita/${p.match_name}?tenant=${tenant}`}>
                    <button style={{
                      padding: '0.35rem 0.85rem', borderRadius: 6, cursor: 'pointer',
                      border: '1px solid rgba(0,229,255,0.3)',
                      background: 'rgba(0,229,255,0.06)',
                      color: 'var(--primary)', fontSize: '0.8rem',
                      fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                    }}>
                      Dettaglio →
                    </button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
