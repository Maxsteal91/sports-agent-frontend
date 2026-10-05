'use client'
import { useEffect, useState } from 'react'
import { fetchAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'
import { useTenant } from '../../lib/TenantContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

// Etichetta leggibile per le barre
const getBarLabels = (evento, noi, avv) => ({
  home_tot:  `${evento} ${noi}`,
  away_tot:  `${evento} ${avv}`,
  home_comp: `Completati ${noi}`,
  away_comp: `Completati ${avv}`,
})

const BAR_COLORS = {
  home_tot:  '#00E5FF',
  away_tot:  '#CC44FF',
  home_comp: 'rgba(0,229,255,0.4)',
  away_comp: 'rgba(204,68,255,0.4)',
}

export default function ConfrontoPage() {
  const { tenant, ready }      = useTenant()
  const [user,                 setUser]                 = useState(null)
  const [categoria,            setCategoria]            = useState(null)
  const [evento,               setEvento]               = useState('shot')
  const [eventiDisponibili,    setEventiDisponibili]    = useState([])
  const [eventiLoading,        setEventiLoading]        = useState(false)
  const [data,                 setData]                 = useState([])
  const [partite,              setPartite]              = useState([])
  const [loading,              setLoading]              = useState(false)
  const [tenantTeam,           setTenantTeam]           = useState(null)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.role === 'manager' && u?.categoria) setCategoria(u.categoria)
  }, [])

  useEffect(() => {
    if (!tenant || !ready) return
    fetchAPI(`/upload/v2/partite?tenant=${tenant}`)
      .then(res => {
        const ps = res.data || []
        setPartite(ps)
        if (ps.length > 0) {
          const counts = {}
          ps.forEach(p => {
            if (p.home_team) counts[p.home_team] = (counts[p.home_team] || 0) + 1
            if (p.away_team) counts[p.away_team] = (counts[p.away_team] || 0) + 1
          })
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
          setTenantTeam(top)
        }
      })
      .catch(() => setPartite([]))
  }, [tenant, ready])

  // Scopri i tipi di evento disponibili per questo tenant
  useEffect(() => {
    if (!tenant || !ready) return
    setEventiLoading(true)
    fetchAPI(`/v2/analytics/${tenant}/aggregati?period=Totale`)
      .then(res => {
        const tipi = [...new Set((res.data || [])
          .filter(r => r.totale > 0)
          .map(r => r.event_type)
        )].sort()
        setEventiDisponibili(tipi)
        if (tipi.length > 0 && !tipi.includes(evento)) setEvento(tipi[0])
      })
      .catch(() => setEventiDisponibili([]))
      .finally(() => setEventiLoading(false))
  }, [tenant, ready])

  useEffect(() => {
    if (!tenant || !evento) return
    setLoading(true)
    fetchAPI(`/v2/analytics/${tenant}/aggregati?event_type=${encodeURIComponent(evento)}&period=Totale`)
      .then(res => { setData(res.data || []); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [tenant, evento])

  // Categorie disponibili e filtraggio
  const categorieDisponibili = [...new Set(partite.map(p => p.category).filter(Boolean))].sort()
  const partiteFiltrate = categoria ? partite.filter(p => p.category === categoria) : partite
  const matchNamesFiltrati = new Set(partiteFiltrate.map(p => p.match_name))
  const dataFiltrati = categoria ? data.filter(d => matchNamesFiltrati.has(d.match_name)) : data
  const teamNoi = tenantTeam || tenant
  const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
  const BAR_LABELS = getBarLabels(evento.charAt(0).toUpperCase() + evento.slice(1), cap(teamNoi), 'Avversario')

  // Mappa match_name → label e squadre
  const partiteMap = {}
  partite.forEach(p => {
    const home = p.home_team || ''
    const away = p.away_team || ''
    partiteMap[p.match_name] = {
      label:     `${cap(home)} vs ${cap(away)}`,
      home_team: home,
      away_team: away,
    }
  })

  const hasTeam  = dataFiltrati.some(d => d.team)
  const useExtra = !hasTeam
  const partiteUniche = [...new Set(dataFiltrati.map(d => d.match_name))]

  const chartData = partiteUniche.map(mn => {
    const info   = partiteMap[mn] || { label: mn }
    const rows   = dataFiltrati.filter(d => d.match_name === mn)
    const label  = info.label || mn

    if (useExtra) {
      // duelli / palle recuperate — leggi da extra
      const row = rows[0]
      if (!row?.extra) return null
      const keys = Object.keys(row.extra)
      // trova chiave tenant e avversario
      const tt = tenantTeam || tenant
      const homeKey = keys.find(k => k.includes(tt.split(' ')[0]))
      const awayKey = keys.find(k => k !== homeKey)
      return {
        partita:   label,
        home_tot:  homeKey ? (row.extra[homeKey] || 0) : 0,
        away_tot:  awayKey ? (row.extra[awayKey] || 0) : 0,
        home_comp: null,
        away_comp: null,
      }
    } else {
      // eventi normali con team
      const tt = tenantTeam || tenant
      const homeRow = rows.find(r => r.team === tt)
      const awayRow = rows.find(r => r.team !== tt)
      return {
        partita:   label,
        home_tot:  homeRow?.totale      ?? 0,
        away_tot:  awayRow?.totale      ?? 0,
        home_comp: homeRow?.completati  ?? null,
        away_comp: awayRow?.completati  ?? null,
      }
    }
  }).filter(Boolean).filter(d => d.home_tot > 0 || d.away_tot > 0)

  // Mostra barre completati solo se hanno valori
  const showComp = chartData.some(d => d.home_comp !== null && d.home_comp > 0)
  const barKeys  = showComp
    ? ['home_tot', 'away_tot', 'home_comp', 'away_comp']
    : ['home_tot', 'away_tot']

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
            CONFRONTO PARTITE
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Confronta un tipo di evento tra tutte le partite
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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

      {/* Selettore evento — solo tipi con dati reali */}
      <div style={{ marginBottom: '2rem' }}>
        {eventiLoading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Caricamento eventi...</div>
        ) : eventiDisponibili.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nessun dato disponibile per questo tenant.</div>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {eventiDisponibili.map(e => (
              <button key={e} onClick={() => setEvento(e)} style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: `1px solid ${evento === e ? 'var(--primary)' : 'var(--border)'}`,
                background: evento === e ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
                color: evento === e ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
                fontWeight: 600, letterSpacing: '0.03em', transition: 'all 0.2s',
                textTransform: 'capitalize',
              }}>{e}</button>
            ))}
          </div>
        )}
      </div>

      {/* Grafico */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text)' }}>
          {evento.toUpperCase()} — TUTTE LE PARTITE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          <span style={{ color: '#00E5FF' }}>■</span> {cap(teamNoi)} &nbsp;
          <span style={{ color: '#CC44FF' }}>■</span> Avversario
        </p>
        {loading ? (
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Caricamento...
          </div>
        ) : chartData.length === 0 ? (
          <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Nessun dato disponibile per questo evento
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 60 }} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="partita"
                tick={{ fill: '#7A8BA8', fontSize: 11 }}
                angle={-35} textAnchor="end" interval={0}
              />
              <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#F0F4FF' }}
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                formatter={(value, name) => [value, BAR_LABELS[name] || name]}
              />
              <Legend
                verticalAlign="top"
                align="right"
                wrapperStyle={{ fontSize: 11, color: '#7A8BA8', paddingBottom: 8 }}
                formatter={name => BAR_LABELS[name] || name}
              />
              {barKeys.map(key => (
                <Bar key={key} dataKey={key} fill={BAR_COLORS[key]} radius={[3,3,0,0]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabella */}
      {chartData.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            DETTAGLIO
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Partita', `${cap(teamNoi)} Tot.`, 'Avvers. Tot.', `${cap(teamNoi)} Comp.`, 'Avvers. Comp.', `${cap(teamNoi)} %`, 'Avvers. %'].map(h => (
                  <th key={h} style={{ padding: '0.5rem', textAlign: h === 'Partita' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((row, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-display)', fontSize: '0.85rem' }}>{row.partita}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#00E5FF', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{row.home_tot}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: '#CC44FF', fontFamily: 'var(--font-display)', fontWeight: 600 }}>{row.away_tot}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text)' }}>{row.home_comp ?? '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text)' }}>{row.away_comp ?? '—'}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {row.home_tot > 0 && row.home_comp !== null ? Math.round(row.home_comp / row.home_tot * 100) + '%' : '—'}
                  </td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)' }}>
                    {row.away_tot > 0 && row.away_comp !== null ? Math.round(row.away_comp / row.away_tot * 100) + '%' : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
