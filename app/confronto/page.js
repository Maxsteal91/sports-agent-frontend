'use client'
import { useEffect, useState } from 'react'
import { fetchAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const ALL_TENANTS = ['mazzola', 'sangiovannese']

const EVENTI_DISPONIBILI = [
  'shot', 'passaggi', 'dribbling', 'duelli', 'occasioni goal',
  'corner', 'cross', 'palle recuperate', 'disciplina', 'lanci'
]

// Etichetta leggibile per le barre
// BAR_LABELS viene costruito dinamicamente in base all'evento selezionato
const getBarLabels = (evento) => ({
  home_tot:  `${evento} Casa`,
  away_tot:  `${evento} Ospite`,
  home_comp: `Completati Casa`,
  away_comp: `Completati Ospite`,
})

const BAR_COLORS = {
  home_tot:  '#00E5FF',
  away_tot:  '#CC44FF',
  home_comp: 'rgba(0,229,255,0.4)',
  away_comp: 'rgba(204,68,255,0.4)',
}

export default function ConfrontoPage() {
  const [user,    setUser]    = useState(null)
  const [tenant,  setTenant]  = useState('mazzola')
  const [evento,  setEvento]  = useState('shot')
  const [data,    setData]    = useState([])
  const [partite, setPartite] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.tenant) setTenant(u.tenant)
  }, [])

  useEffect(() => {
    fetchAPI(`/upload/v2/partite?tenant=${tenant}`)
      .then(res => setPartite(res.data || []))
      .catch(() => setPartite([]))
  }, [tenant])

  useEffect(() => {
    setLoading(true)
    fetchAPI(`/v2/analytics/${tenant}/aggregati?event_type=${encodeURIComponent(evento)}&period=Totale`)
      .then(res => { setData(res.data || []); setLoading(false) })
      .catch(err => { console.error(err); setLoading(false) })
  }, [tenant, evento])

  // Team del tenant
  const tenantTeam = tenant === 'mazzola' ? 'mazzola' : 'san giovannese 1927'
  const BAR_LABELS = getBarLabels(evento.charAt(0).toUpperCase() + evento.slice(1))

  // Mappa match_name → label e squadre
  const partiteMap = {}
  partite.forEach(p => {
    const home = p.home_team || ''
    const away = p.away_team || ''
    // Capitalizza prima lettera
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
    partiteMap[p.match_name] = {
      label:     `${cap(home)} vs ${cap(away)}`,
      home_team: home,
      away_team: away,
    }
  })

  const hasTeam  = data.some(d => d.team)
  const useExtra = !hasTeam
  const partiteUniche = [...new Set(data.map(d => d.match_name))]

  const chartData = partiteUniche.map(mn => {
    const info   = partiteMap[mn] || { label: mn }
    const rows   = data.filter(d => d.match_name === mn)
    const label  = info.label || mn

    if (useExtra) {
      // duelli / palle recuperate — leggi da extra
      const row = rows[0]
      if (!row?.extra) return null
      const keys = Object.keys(row.extra)
      // trova chiave tenant e avversario
      const homeKey = keys.find(k => k.includes(tenantTeam.split(' ')[0]))
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
      const homeRow = rows.find(r => r.team === tenantTeam)
      const awayRow = rows.find(r => r.team !== tenantTeam)
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
        {user?.role === 'admin' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {ALL_TENANTS.map(t => (
              <button key={t} onClick={() => setTenant(t)} style={{
                padding: '0.5rem 1.2rem', borderRadius: '8px',
                border: `1px solid ${tenant === t ? 'var(--primary)' : 'var(--border)'}`,
                background: tenant === t ? 'rgba(0,229,255,0.1)' : 'transparent',
                color: tenant === t ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem',
                fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', transition: 'all 0.2s',
              }}>{t}</button>
            ))}
          </div>
        )}
      </div>

      {/* Selettore evento */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {EVENTI_DISPONIBILI.map(e => (
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
      </div>

      {/* Grafico */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text)' }}>
          {evento.toUpperCase()} — TUTTE LE PARTITE
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1rem' }}>
          <span style={{ color: '#00E5FF' }}>■</span> {tenantTeam} &nbsp;
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
                {['Partita', 'Tenant Tot.', 'Avvers. Tot.', 'Tenant Comp.', 'Avvers. Comp.', 'Tenant %', 'Avvers. %'].map(h => (
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
