'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { fetchAPI } from '../lib/api'
import { getUser } from '../lib/auth'
import { useTenant } from '../lib/TenantContext'
import KpiCard from '../components/KpiCard'
import EventiChart from '../components/EventiChart'

export default function HomePage() {
  const { tenant, ready }      = useTenant()
  const [user,                 setUser]                 = useState(null)
  const [categoria,            setCategoria]            = useState(null)
  const [categorieDisponibili, setCategorieDisponibili] = useState([])
  const [partite,              setPartite]              = useState([])
  const [kpis,                 setKpis]                 = useState(null)
  const [eventiChart,          setEventiChart]          = useState([])
  const [loading,              setLoading]              = useState(true)
  const [orderDate,            setOrderDate]            = useState('desc')

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.role === 'manager' && u?.categoria) setCategoria(u.categoria)
  }, [])

  useEffect(() => {
    if (!tenant || !ready) return
    setLoading(true)

    // Viewer è filtrato al suo tenant+categoria lato API; admin/manager filtrano client-side
    const viewerCatParam = user?.role === 'viewer' && user?.categoria
      ? `&category=${user.categoria}` : ''

    Promise.all([
      // Lista partite v2 — sempre tutte per poter derivare le categorie disponibili
      fetchAPI(`/upload/v2/partite?tenant=${tenant}${viewerCatParam}&order=${orderDate}`),
      // Aggregati cross-partita per tiri (KPI principale)
      fetchAPI(`/v2/analytics/${tenant}/aggregati?event_type=shot&period=Totale`),
    ]).then(([partiteRes, tiriRes]) => {
      const allPs = partiteRes.data || []

      // Categorie disponibili (da tutte le partite del tenant)
      const cats = [...new Set(allPs.map(p => p.category).filter(Boolean))].sort()
      setCategorieDisponibili(cats)

      // Filtra per categoria selezionata (client-side, non per viewer)
      const ps = (categoria && user?.role !== 'viewer')
        ? allPs.filter(p => p.category === categoria)
        : allPs
      setPartite(ps)

      const matchNames = new Set(ps.map(p => p.match_name))

      // ── KPI ──────────────────────────────────
      // Filtra aggregati per le sole partite visibili
      const tiriData = (tiriRes.data || []).filter(r => matchNames.has(r.match_name))
      // Tiri totali del tenant — usa home_team dalla prima partita come nome squadra nel DB
      const tenantTeam = ps[0]?.home_team || allPs[0]?.home_team || tenant
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
  }, [tenant, categoria, user, orderDate, ready])

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
            {tenant.charAt(0).toUpperCase() + tenant.slice(1)} — Stagione in corso
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

          {/* Selettore categoria — admin e manager, se ci sono più categorie */}
          {user?.role !== 'viewer' && categorieDisponibili.length > 1 && (
            <select
              value={categoria || ''}
              onChange={e => setCategoria(e.target.value || null)}
              style={{
                background: 'var(--bg-card)', border: `1px solid ${categoria ? '#8B5CF6' : 'var(--border)'}`,
                borderRadius: '8px', padding: '0.5rem 1rem',
                color: categoria ? '#A78BFA' : 'var(--text-muted)',
                fontSize: '0.85rem', fontFamily: 'var(--font-display)',
                fontWeight: 600, letterSpacing: '0.06em',
                cursor: 'pointer', appearance: 'none',
              }}
            >
              <option value="">Tutte le categorie</option>
              {categorieDisponibili.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}

        </div>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em', color: 'var(--text)', margin: 0 }}>
          PARTITE
        </h2>
        <button
          onClick={() => setOrderDate(o => o === 'desc' ? 'asc' : 'desc')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '0.35rem 0.85rem', borderRadius: 8, cursor: 'pointer',
            border: '1px solid var(--border)', background: 'transparent',
            color: 'var(--text-muted)', fontSize: '0.8rem',
            fontFamily: 'var(--font-display)', letterSpacing: '0.04em',
          }}
        >
          {orderDate === 'desc' ? '↓ Più recenti' : '↑ Più vecchie'}
        </button>
      </div>
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
