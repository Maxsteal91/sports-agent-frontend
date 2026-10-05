'use client'
import { useEffect, useState } from 'react'
import { fetchAPI } from '../../lib/api'
import { getUser } from '../../lib/auth'

const COLOR_HOME = '#00E5FF'

// Fallback statici usati solo se il backend non risponde
const SUB_COLS_DEFAULT = {
  shot:     [['Tot','totale'],['Gol','gol'],['In porta','in_porta'],['Murato','murato'],['Fuori','fuori'],['Palo','palo_traversa'],['In area','in_area'],['Fuori area','fuori_area'],['Destro','destro'],['Sinistro','sinistro'],['Testa','testa']],
  cross:    [['Tot','totale'],['Riusciti','riuscito'],['Respinti','respinto'],['In area','in_area'],['Fuori area','fuori_area'],['Destro','destro'],['Sinistro','sinistro']],
  freekick: [['Tot','totale']],
  corner:   [['Tot','totale']],
  gkout:    [['Tot','totale']],
}

export default function GiocatoriPage() {
  const [user,              setUser]              = useState(null)
  const [tenant,            setTenant]            = useState('')
  const [allTenants,        setAllTenants]        = useState([])
  const [categoria,         setCategoria]         = useState(null)
  const [matchFiltro,       setMatchFiltro]       = useState(null)
  const [periodo,           setPeriodo]           = useState('Totale')
  const [eventoTab,         setEventoTab]         = useState(null)
  const [data,              setData]              = useState([])
  const [eventTypes,        setEventTypes]        = useState([])
  const [partite,           setPartite]           = useState([])
  const [loading,           setLoading]           = useState(false)
  const [homeTeam,          setHomeTeam]          = useState(null)
  const [colConfig,         setColConfig]          = useState({})

  useEffect(() => {
    const u = getUser()
    setUser(u)
    if (u?.tenant) setTenant(u.tenant)
    if (u?.role === 'manager' && u?.categoria) setCategoria(u.categoria)
  }, [])

  // Carica tenant (admin)
  useEffect(() => {
    const u = getUser()
    if (u?.role !== 'admin') return
    fetchAPI('/upload/v2/tenants')
      .then(d => {
        const ts = d.tenants || []
        setAllTenants(ts)
        if (!u?.tenant && ts.length > 0) setTenant(ts[0])
      })
      .catch(() => setAllTenants([]))
  }, [])

  // Carica column_config per il tenant
  useEffect(() => {
    if (!tenant) return
    fetchAPI(`/v2/analytics/${tenant}/column_config`)
      .then(d => setColConfig(d.config || {}))
      .catch(() => setColConfig({}))
  }, [tenant])

  // Carica partite per filtro + team name
  useEffect(() => {
    if (!tenant) return
    fetchAPI(`/upload/v2/partite?tenant=${tenant}`)
      .then(res => {
        const ps = res.data || []
        setPartite(ps)
        // Il team del tenant appare in ogni partita (home o away) → è il più frequente
        if (ps.length > 0) {
          const counts = {}
          ps.forEach(p => {
            if (p.home_team) counts[p.home_team] = (counts[p.home_team] || 0) + 1
            if (p.away_team) counts[p.away_team] = (counts[p.away_team] || 0) + 1
          })
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null
          setHomeTeam(top)
        }
      })
      .catch(() => setPartite([]))
  }, [tenant])

  // Carica dati giocatori
  useEffect(() => {
    if (!tenant || !homeTeam) return
    setLoading(true)
    const params = new URLSearchParams()
    params.set('team', homeTeam)
    params.set('period', periodo)
    if (categoria)  params.set('category', categoria)
    if (matchFiltro) params.set('match_name', matchFiltro)

    fetchAPI(`/v2/analytics/${tenant}/giocatori?${params}`)
      .then(res => {
        const ets = res.event_types || []
        setData(res.data || [])
        setEventTypes(ets)
        setEventoTab(prev => (prev === 'all' || ets.includes(prev) ? prev : 'all'))
      })
      .catch(() => { setData([]); setEventTypes([]) })
      .finally(() => setLoading(false))
  }, [tenant, homeTeam, categoria, matchFiltro, periodo])

  const categorieDisponibili = [...new Set(partite.map(p => p.category).filter(Boolean))].sort()
  const partiteFiltrate = categoria ? partite.filter(p => p.category === categoria) : partite

  const isAll = eventoTab === 'all'
  const byNumber = (a, b) => parseInt(a.player, 10) - parseInt(b.player, 10)
  const playerRows = isAll
    ? [...data].sort(byNumber)
    : data.filter(p => p.events?.[eventoTab]).sort(byNumber)

  // Ricava colonne visibili per un event type dal config dinamico (fallback ai default statici)
  const getCols = (et) => {
    const cfg = colConfig[et]
    if (cfg && cfg.length > 0) return cfg.filter(c => c.visibile).map(c => [c.label, c.nome])
    return SUB_COLS_DEFAULT[et] || [['Tot', 'totale']]
  }

  const cols = eventoTab && !isAll ? getCols(eventoTab) : []

  // Per tab "all": prima colonna (tot) + seconda colonna visibile di ogni evento
  const getAllCols = (et) => {
    const full = getCols(et)
    if (full.length <= 1) return full
    return [full[0], full[1]]
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      {/* Header */}
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
            GIOCATORI
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
            Statistiche per giocatore su tutte le partite
          </p>
        </div>

        {/* Selettori */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {user?.role === 'admin' && (
            <select value={tenant} onChange={e => { setTenant(e.target.value); setCategoria(null); setMatchFiltro(null) }}
              style={selectStyle(COLOR_HOME)}>
              {allTenants.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
            </select>
          )}
          {categorieDisponibili.length > 1 && (
            <select value={categoria || ''} onChange={e => { setCategoria(e.target.value || null); setMatchFiltro(null) }}
              style={selectStyle(categoria ? '#8B5CF6' : null)}>
              <option value="">Tutte le categorie</option>
              {categorieDisponibili.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          <select value={matchFiltro || ''} onChange={e => setMatchFiltro(e.target.value || null)}
            style={selectStyle(matchFiltro ? '#F59E0B' : null)}>
            <option value="">Tutte le partite</option>
            {partiteFiltrate.map(p => {
              const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s
              return <option key={p.match_name} value={p.match_name}>{cap(p.home_team)} vs {cap(p.away_team)}</option>
            })}
          </select>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)}
            style={selectStyle(periodo !== 'Totale' ? '#10B981' : null)}>
            <option value="Totale">Totale</option>
            <option value="Primo_Tempo">Primo Tempo</option>
            <option value="Secondo_Tempo">Secondo Tempo</option>
          </select>
        </div>
      </div>

      {/* Tab evento */}
      {eventTypes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {['all', ...eventTypes].map(et => (
            <button key={et} onClick={() => setEventoTab(et)} style={{
              padding: '0.5rem 1rem', borderRadius: '8px',
              border: `1px solid ${eventoTab === et ? 'var(--primary)' : 'var(--border)'}`,
              background: eventoTab === et ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
              color: eventoTab === et ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
              fontWeight: 600, letterSpacing: '0.03em', textTransform: 'capitalize',
            }}>{et === 'all' ? 'Tutti' : et}</button>
          ))}
        </div>
      )}

      {/* Tabella */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
        {loading ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Caricamento...</div>
        ) : playerRows.length === 0 ? (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            {eventTypes.length === 0 ? 'Nessun dato giocatore disponibile per questo tenant.' : 'Nessun dato per questo filtro.'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                {isAll ? (
                  <>
                    <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                      <th style={thStyle('left')} rowSpan={2}>#</th>
                      {eventTypes.map(et => (
                        <th key={et} colSpan={getAllCols(et).length}
                          style={{ ...thStyle('center'), borderLeft: '1px solid var(--border)', paddingBottom: '0.25rem', textTransform: 'capitalize' }}>
                          {et}
                        </th>
                      ))}
                    </tr>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {eventTypes.flatMap(et => getAllCols(et).map(([label], ci) => (
                        <th key={et+label} style={{ ...thStyle('right'), borderLeft: ci === 0 ? '1px solid var(--border)' : 'none' }}>
                          {label}
                        </th>
                      )))}
                    </tr>
                  </>
                ) : (
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    <th style={thStyle('left')}>#</th>
                    {cols.map(([label]) => (
                      <th key={label} style={thStyle('right')}>{label}</th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody>
                {playerRows.map((p, i) => (
                  <tr key={p.player} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '0.55rem 0.75rem', color: COLOR_HOME, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem' }}>
                      {p.player}
                    </td>
                    {isAll
                      ? eventTypes.flatMap(et => getAllCols(et).map(([label, field], ci) => {
                          const val = p.events[et]?.[field] ?? 0
                          const isGoal = field === 'gol' && val > 0
                          return (
                            <td key={et+label} style={{
                              padding: '0.55rem 0.6rem', textAlign: 'right',
                              color: isGoal ? '#EF4444' : val > 0 ? 'var(--text)' : 'var(--text-muted)',
                              fontWeight: isGoal ? 700 : field === 'totale' ? 600 : 400,
                              borderLeft: ci === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            }}>
                              {val > 0 ? val : <span style={{ opacity: 0.25 }}>—</span>}
                            </td>
                          )
                        }))
                      : cols.map(([label, field]) => {
                          const val = p.events[eventoTab]?.[field] ?? 0
                          const isGoal = field === 'gol' && val > 0
                          return (
                            <td key={label} style={{
                              padding: '0.55rem 0.75rem', textAlign: 'right',
                              color: isGoal ? '#EF4444' : val > 0 ? 'var(--text)' : 'var(--text-muted)',
                              fontWeight: isGoal ? 700 : field === 'totale' ? 600 : 400,
                            }}>
                              {val > 0 ? val : <span style={{ opacity: 0.3 }}>—</span>}
                            </td>
                          )
                        })
                    }
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function selectStyle(accentColor) {
  return {
    background: 'var(--bg-card)',
    border: `1px solid ${accentColor || 'var(--border)'}`,
    borderRadius: '8px', padding: '0.5rem 1rem',
    color: accentColor || 'var(--text-muted)',
    fontSize: '0.85rem', fontFamily: 'var(--font-display)',
    fontWeight: 600, letterSpacing: '0.06em',
    cursor: 'pointer', appearance: 'none',
  }
}

function thStyle(align) {
  return {
    padding: '0.5rem 0.75rem', textAlign: align,
    color: 'var(--text-muted)', fontWeight: 500,
    textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem',
  }
}
