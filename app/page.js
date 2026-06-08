'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAPI } from '../lib/api'
import { getUser } from '../lib/auth'
import KpiCard from '../components/KpiCard'
import EventiChart from '../components/EventiChart'

const ALL_TENANTS = ['mazzola', 'sangiovannese']

export default function HomePage() {
  const [user,        setUser]        = useState(null)
  const [tenant,      setTenant]      = useState('mazzola')
  const [partite,     setPartite]     = useState([])
  const [kpis,        setKpis]        = useState(null)
  const [eventiChart, setEventiChart] = useState([])
  const [loading,     setLoading]     = useState(true)

  // Leggi utente loggato e imposta tenant/categoria
  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.tenant) setTenant(u.tenant)
  }, [])

  useEffect(() => {
    if (!tenant) return
    setLoading(true)

    Promise.all([
      // Lista partite v2
      fetchAPI(`/upload/v2/partite?tenant=${tenant}${user?.role === 'viewer' && user?.categoria ? '&category=' + user.categoria : ''}`),
      // Aggregati cross-partita per tiri (KPI principale)
      fetchAPI(`/v2/analytics/${tenant}/aggregati?event_type=shot&period=Totale`),
    ]).then(([partiteRes, tiriRes]) => {
      const ps = partiteRes.data || []
      setPartite(ps)

      // ── KPI ──────────────────────────────────
      const tiriData = tiriRes.data || []
      // Tiri totali del tenant (solo la squadra di casa = tenant)
      const tenantTeam = tenant === 'mazzola' ? 'mazzola' : 'san giovannese 1927'
      const tiriTotali = tiriData
        .filter(r => r.team === tenantTeam)
        .reduce((s, r) => s + (r.totale || 0), 0)
      const goalTotali = tiriData
        .filter(r => r.team === tenantTeam)
        .reduce((s, r) => s + (r.extra?.goal || 0), 0)
      const specchioTotali = tiriData
        .filter(r => r.team === tenantTeam)
        .reduce((s, r) => s + (r.extra?.nello_specchio || 0), 0)

      // Tag totali dal catalogo
      const percSpecchio = tiriTotali > 0
        ? Math.round(specchioTotali / tiriTotali * 100)
        : 0

      setKpis({
        totale_partite:  ps.length,
        totale_tiri:     tiriTotali,
        totale_goal:     goalTotali,
        totale_specchio: specchioTotali,
        perc_specchio:   percSpecchio,
      })

      // ── Grafico eventi per partita ────────────
      // Usa il totale degli eventi per partita da tag_config
      const eventiPerPartita = ps.map(p => ({
        match_name: p.match_name,
        homeTeam:   p.home_team,
        awayTeam:   p.away_team,
        date:       p.date,
        totale:     0, // verrà aggiornato sotto
      }))

      // Calcola eventi per partita dai tiri (disponibili subito)
      // Per un dato più preciso useremo i tag
      setEventiChart(eventiPerPartita)
      setLoading(false)

      // Carica eventi per partita in background
      Promise.all(
        ps.map(p =>
          fetchAPI(`/v2/analytics/${tenant}/tags/${p.match_name}`)
            .then(r => ({
              match_name: p.match_name,
              homeTeam:   p.home_team,
              awayTeam:   p.away_team,
              date:       p.date,
              totale:     (r.data || []).reduce((s, t) => s + (t.conteggio || 0), 0),
            }))
            .catch(() => ({ match_name: p.match_name, totale: 0 }))
        )
      ).then(chartData => setEventiChart(chartData))

    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [tenant, user])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)', letterSpacing: '0.1em' }}>
        CARICAMENTO...
      </div>
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
            DASHBOARD
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            {tenant === 'mazzola' ? 'Valentino Mazzola Siena' : 'Sangiovannese 1927'} — Stagione in corso
          </p>
        </div>

        {/* Selettore tenant — solo admin */}
        {user?.role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ALL_TENANTS.map(t => (
              <button
                key={t}
                onClick={() => setTenant(t)}
                style={{
                  padding: '0.5rem 1.2rem',
                  borderRadius: '8px',
                  border: `1px solid ${tenant === t ? 'var(--primary)' : 'var(--border)'}`,
                  background: tenant === t ? 'rgba(0,229,255,0.1)' : 'transparent',
                  color: tenant === t ? 'var(--primary)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  transition: 'all 0.2s',
                }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <KpiCard label="Partite"        value={kpis.totale_partite}  icon="📅" color="var(--primary)" />
          <KpiCard label="Tiri totali"    value={kpis.totale_tiri}     icon="🎯" color="var(--accent)" />
          <KpiCard label="Goal segnati"   value={kpis.totale_goal}     icon="⚽" color="var(--success)" />
          <KpiCard label="Nello specchio" value={kpis.totale_specchio} icon="🥅" color="var(--warning, #F59E0B)" />
          <KpiCard label="% Nello specchio" value={kpis.perc_specchio ? kpis.perc_specchio + '%' : '—'} icon="🎯" color="var(--warning, #F59E0B)" />
        </div>
      )}

      {/* Grafico eventi per partita */}
      {eventiChart.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            EVENTI PER PARTITA
          </h2>
          <EventiChart data={eventiChart} />
        </div>
      )}

      {/* Lista partite */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
        PARTITE
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {partite.map((p) => (
          <Link key={p.match_name} href={`/partita/${p.match_name}?tenant=${tenant}`}>
            <div
              style={{
                background: 'var(--bg-card)', border: '1px solid var(--border)',
                borderRadius: '12px', padding: '1.25rem',
                cursor: 'pointer', transition: 'all 0.2s',
              }}
              onMouseOver={e => {
                e.currentTarget.style.borderColor = 'var(--primary)'
                e.currentTarget.style.background = 'var(--bg-card-hover)'
              }}
              onMouseOut={e => {
                e.currentTarget.style.borderColor = 'var(--border)'
                e.currentTarget.style.background = 'var(--bg-card)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: 'var(--primary)', letterSpacing: '0.05em' }}>
                  {p.date ? new Date(p.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                  {p.category && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>
                      {p.category.toUpperCase()}
                    </span>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                    {p.match_name}
                  </span>
                </div>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                {p.home_team || '—'}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0' }}>vs</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                {p.away_team || '—'}
              </div>
              <div style={{ marginTop: '0.75rem', color: 'var(--primary)', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Dettaglio →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
