'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAPI } from '../lib/api'
import KpiCard from '../components/KpiCard'
import EventiChart from '../components/EventiChart'

export default function HomePage() {
  const [kpis, setKpis] = useState(null)
  const [partite, setPartite] = useState([])
  const [eventiChart, setEventiChart] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetchAPI('/dashboard/kpis'),
      fetchAPI('/stats/calendario'),
      fetchAPI('/dashboard/eventi-per-partita'),
    ]).then(([k, p, e]) => {
      setKpis(k)
      setPartite(p.data || [])
      setEventiChart(e.data || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [])

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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
          DASHBOARD
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Sangiovannese 1927 — Stagione in corso
        </p>
      </div>

      {/* KPI Cards */}
      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
          <KpiCard label="Partite" value={kpis.totale_partite} icon="⚽" color="var(--primary)" />
          <KpiCard label="Tiri totali" value={kpis.totale_tiri} icon="🎯" color="var(--accent)" />
          <KpiCard label="Occasioni" value={kpis.totale_occasioni} icon="🔥" color="var(--warning)" />
          <KpiCard label="Disciplina" value={kpis.totale_disciplina} icon="🟨" color="var(--danger)" />
          <KpiCard label="Eventi totali" value={kpis.totale_eventi} icon="📊" color="var(--success)" />
        </div>
      )}

      {/* Grafico eventi per partita */}
      {eventiChart.length > 0 && (
        <div style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '1.5rem',
          marginBottom: '2rem'
        }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            EVENTI PER PARTITA
          </h2>
          <EventiChart data={eventiChart} />
        </div>
      )}

      {/* Calendario partite */}
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
        PARTITE
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        {partite.map((p) => (
          <Link key={p.match_name} href={`/partita/${p.match_name}`}>
            <div style={{
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.25rem',
              cursor: 'pointer',
              transition: 'all 0.2s',
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
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(0,229,255,0.08)', padding: '2px 8px', borderRadius: '4px' }}>
                  {p.match_name}
                </span>
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                {p.homeTeam}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '0.25rem 0' }}>vs</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.03em' }}>
                {p.awayTeam}
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
