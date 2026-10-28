'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchAPI } from '../lib/api'

const RUOLO_COLOR = { POR: '#F59E0B', DIF: '#3B82F6', CEN: '#10B981', ATT: '#EF4444' }

// ─── SVG PITCH ────────────────────────────────────────────────
const W = 320, H = 210, PAD = 2
const fx = x => PAD + (x / 100) * (W - 2 * PAD)
const fy = y => PAD + (y / 100) * (H - 2 * PAD)

const OUTCOME_COLOR = {
  gol:          '#EF4444',
  in_porta:     '#00E5FF',
  murato:       '#F59E0B',
  fuori:        '#6B7280',
  palo_traversa:'#A78BFA',
  riuscito:     '#00E5FF',
  respinto:     '#F59E0B',
}

function MiniPitch({ events, eventType }) {
  const legend = [
    eventType === 'shot' && { label: 'Gol',       color: '#EF4444', filled: true },
    eventType === 'shot' && { label: 'In porta',   color: '#00E5FF', filled: false },
    eventType === 'shot' && { label: 'Fuori/murato', color: '#6B7280', filled: false },
    eventType === 'cross'  && { label: 'Riuscito', color: '#00E5FF', filled: true },
    eventType === 'cross'  && { label: 'Respinto', color: '#F59E0B', filled: false },
  ].filter(Boolean)

  return (
    <svg viewBox={`0 0 ${W} ${H + 20}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {/* sfondo erba */}
      <rect x={0} y={0} width={W} height={H} rx={4} fill="rgba(34,197,94,0.07)" />
      {/* bordo */}
      <rect x={PAD} y={PAD} width={W - 2*PAD} height={H - 2*PAD} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      {/* metà campo */}
      <line x1={fx(50)} y1={fy(0)} x2={fx(50)} y2={fy(100)} stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      <circle cx={fx(50)} cy={fy(50)} r={H * 0.12} fill="none" stroke="rgba(255,255,255,0.09)" strokeWidth={1} />
      {/* area di rigore destra */}
      <rect x={fx(83)} y={fy(21)} width={fx(100) - fx(83)} height={fy(79) - fy(21)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      {/* area piccola destra */}
      <rect x={fx(94)} y={fy(37)} width={fx(100) - fx(94)} height={fy(63) - fy(37)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {/* porta destra */}
      <rect x={W - PAD - 3} y={fy(42)} width={3} height={fy(58) - fy(42)} fill="rgba(255,255,255,0.3)" />
      {/* area di rigore sinistra */}
      <rect x={PAD} y={fy(21)} width={fx(17) - PAD} height={fy(79) - fy(21)} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={1} />
      {/* area piccola sinistra */}
      <rect x={PAD} y={fy(37)} width={fx(6) - PAD} height={fy(63) - fy(37)} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={1} />
      {/* porta sinistra */}
      <rect x={PAD} y={fy(42)} width={3} height={fy(58) - fy(42)} fill="rgba(255,255,255,0.3)" />
      {/* dischetti */}
      <circle cx={fx(11)} cy={fy(50)} r={2} fill="rgba(255,255,255,0.2)" />
      <circle cx={fx(89)} cy={fy(50)} r={2} fill="rgba(255,255,255,0.2)" />

      {/* PUNTI */}
      {events.map((e, i) => {
        const color = OUTCOME_COLOR[e.outcome] || '#00E5FF'
        const filled = e.outcome === 'gol' || e.outcome === 'riuscito'
        return (
          <circle
            key={i}
            cx={fx(e.x)} cy={fy(e.y)}
            r={filled ? 5 : 4}
            fill={filled ? color : 'transparent'}
            stroke={color}
            strokeWidth={1.8}
            opacity={0.85}
          />
        )
      })}

      {/* LEGENDA */}
      {legend.length > 0 && (() => {
        let lx = 4
        return legend.map(({ label, color, filled }, i) => (
          <g key={i}>
            <circle cx={lx + 4} cy={H + 11} r={3.5} fill={filled ? color : 'transparent'} stroke={color} strokeWidth={1.5} />
            <text x={lx + 10} y={H + 15} fontSize={8} fill="rgba(150,160,170,0.9)" fontFamily="Inter,sans-serif">
              {label}
            </text>
            {(() => { lx += label.length * 5.5 + 14; return null })()}
          </g>
        ))
      })()}
    </svg>
  )
}

// ─── SEZIONI STATS ─────────────────────────────────────────────
function PerfGrid({ pf, compact }) {
  if (!pf) return null
  const tiles = [
    { label: 'Partite',    value: pf.partite_giocate ?? '—', unit: '' },
    { label: 'Min tot',    value: pf.minuti ?? '—',          unit: '' },
    { label: 'Min medi',   value: pf.minuti_medi ?? '—',     unit: '' },
    { label: 'Distanza',   value: pf.distanza_km ?? '—',     unit: ' km' },
    { label: 'Vel. media', value: pf.velocita_media_kmh ?? '—', unit: ' km/h' },
    { label: 'Vel. max',   value: pf.velocita_massima_kmh ?? '—', unit: ' km/h' },
    { label: 'Sprint',     value: pf.sprint ?? '—',          unit: '' },
    { label: 'Corse A.I.', value: pf.corse_alta_intensita ?? '—', unit: '' },
  ]
  const cols = compact ? 2 : 4
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={sSectionTitle}>Performance fisica</div>
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '0.5rem' }}>
        {tiles.map(({ label, value, unit }) => (
          <div key={label} style={sTile}>
            <div style={sTileLabel}>{label}</div>
            <div>
              <span style={sTileValue}>{value}</span>
              {unit && value !== '—' && <span style={sTileUnit}>{unit}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EventiList({ player, getCols }) {
  const entries = Object.entries(player.events || {})
  if (!entries.length) return (
    <div>
      <div style={sSectionTitle}>Statistiche eventi</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}>Nessun evento disponibile</div>
    </div>
  )
  return (
    <div>
      <div style={sSectionTitle}>Statistiche eventi</div>
      {entries.map(([et, stats]) => {
        const cols = getCols(et)
        return (
          <div key={et} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.7rem', background: 'var(--bg-table)', borderRadius: 8, border: '1px solid var(--border)', marginBottom: '0.4rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'capitalize', color: 'var(--text)' }}>{et}</div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {cols.slice(0, 5).map(([label, field]) => (
                <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 28 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: field === 'gol' && stats[field] > 0 ? '#EF4444' : 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>
                    {stats[field] ?? 0}
                  </span>
                  <span style={{ fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── PLAYER COLUMN (usata sia in single che dual) ──────────────
function PlayerColumn({ player, getCols, compact, activeMapType, coordsCache, onMapTypeChange, showMapTab }) {
  const rc = RUOLO_COLOR[player.ruolo]
  const eventTypesWithCoords = Object.keys(player.events || {})

  if (showMapTab) {
    if (!eventTypesWithCoords.length) {
      return <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontStyle: 'italic' }}>Nessuna coordinata disponibile per questo giocatore</div>
    }
    const selectedEt = activeMapType || eventTypesWithCoords[0]
    const cacheKey = `${player.nome_norm}__${selectedEt}`
    const coords = coordsCache[cacheKey]
    return (
      <div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
          {eventTypesWithCoords.map(et => (
            <button key={et} onClick={() => onMapTypeChange(et)} style={{
              background: 'none',
              border: `1px solid ${et === selectedEt ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 5, padding: '0.25rem 0.6rem',
              fontSize: '0.72rem', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: '0.04em',
              color: et === selectedEt ? 'var(--primary)' : 'var(--text-muted)',
              cursor: 'pointer', textTransform: 'capitalize',
              background: et === selectedEt ? 'var(--primary-dim)' : 'none',
            }}>{et}</button>
          ))}
        </div>
        <div style={{ background: 'var(--bg-table)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem' }}>
          {coords === undefined
            ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>Caricamento...</div>
            : coords.length === 0
              ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem' }}>Nessuna coordinata per questo evento</div>
              : <MiniPitch events={coords} eventType={selectedEt} />
          }
        </div>
      </div>
    )
  }

  return (
    <>
      <PerfGrid pf={player.performance} compact={compact} />
      <EventiList player={player} getCols={getCols} />
    </>
  )
}

// ─── MODAL PRINCIPALE ─────────────────────────────────────────
export default function PlayerModal({ player, allPlayers, tenant, matchFiltro, getCols, onClose }) {
  const [compareId,    setCompareId]    = useState(null)
  const [activeTab,    setActiveTab]    = useState('stats')
  const [mapTypes,     setMapTypes]     = useState({})      // { nome_norm: eventType }
  const [coordsCache,  setCoordsCache]  = useState({})

  const comparePlayer = compareId ? allPlayers.find(p => p.nome_norm === compareId) : null
  const isDual = Boolean(comparePlayer)

  // Escape
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  // Blocca scroll body
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const fetchCoords = useCallback(async (nomeNorm, eventType) => {
    if (!nomeNorm || nomeNorm.match(/^\d+$/)) return  // skip se è solo un numero
    const key = `${nomeNorm}__${eventType}`
    if (coordsCache[key] !== undefined) return
    const params = new URLSearchParams({ event_type: eventType, player: nomeNorm })
    if (matchFiltro) params.set('match_name', matchFiltro)
    try {
      const res = await fetchAPI(`/v2/analytics/${tenant}/mappa_stagione?${params}`)
      setCoordsCache(prev => ({ ...prev, [key]: res.data || [] }))
    } catch {
      setCoordsCache(prev => ({ ...prev, [key]: [] }))
    }
  }, [tenant, matchFiltro, coordsCache])

  // Fetch coords quando si apre la tab mappe
  useEffect(() => {
    if (activeTab !== 'mappe') return
    const players = [player, comparePlayer].filter(Boolean)
    players.forEach(p => {
      const et = mapTypes[p.nome_norm] || Object.keys(p.events || {})[0]
      if (et) fetchCoords(p.nome_norm, et)
    })
  }, [activeTab, compareId])

  const handleMapTypeChange = (nomeNorm, et) => {
    setMapTypes(prev => ({ ...prev, [nomeNorm]: et }))
    fetchCoords(nomeNorm, et)
  }

  const rc = RUOLO_COLOR[player.ruolo]

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 16,
        width: '100%', maxWidth: isDual ? 880 : 560,
        maxHeight: '92vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 12px 48px rgba(0,0,0,0.5)',
        transition: 'max-width 0.3s ease',
      }}>

        {/* HEADER */}
        <div style={{ padding: '1.1rem 1.4rem 0.9rem', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.8rem', fontWeight: 700, letterSpacing: '0.06em', color: rc || 'var(--primary)', lineHeight: 1 }}>
                {player.player}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                {player.ruolo && (
                  <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${rc}22`, color: rc, border: `1px solid ${rc}55`, fontFamily: 'var(--font-display)', letterSpacing: '0.06em' }}>{player.ruolo}</span>
                )}
                {player.anno_nascita && (
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Cl. {player.anno_nascita}</span>
                )}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '0.2rem', flexShrink: 0 }}>✕</button>
          </div>

          {/* Compare dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Confronta con</span>
            <select
              value={compareId || ''}
              onChange={e => setCompareId(e.target.value || null)}
              style={{ flex: 1, maxWidth: 200, background: 'var(--bg-table)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: '0.8rem', padding: '0.3rem 0.5rem', cursor: 'pointer', outline: 'none' }}
            >
              <option value="">— seleziona giocatore —</option>
              {allPlayers.filter(p => p.nome_norm !== player.nome_norm && p.nome_norm && !p.nome_norm.match(/^\d+$/)).map(p => (
                <option key={p.nome_norm} value={p.nome_norm}>{p.player}</option>
              ))}
            </select>
            {compareId && (
              <button onClick={() => setCompareId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.8rem', padding: '0.2rem 0.4rem', borderRadius: 4 }}>
                ✕ Rimuovi
              </button>
            )}
          </div>
        </div>

        {/* TABS */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          {['stats', 'mappe'].map(t => (
            <button key={t} onClick={() => setActiveTab(t)} style={{
              background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? 'var(--primary)' : 'transparent'}`,
              cursor: 'pointer', padding: '0.65rem 1.1rem', marginBottom: -1,
              fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.04em',
              color: activeTab === t ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {t === 'stats' ? 'Statistiche' : 'Mappe'}
            </button>
          ))}
        </div>

        {/* BODY */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {isDual ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)' }}>
              {[player, comparePlayer].map((p, idx) => {
                const prc = RUOLO_COLOR[p.ruolo]
                return (
                  <div key={p.nome_norm} style={{ padding: '1.2rem 1.4rem', borderRight: idx === 0 ? '1px solid var(--border)' : 'none' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, letterSpacing: '0.05em', color: prc || 'var(--primary)' }}>{p.player}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.2rem' }}>
                        {p.ruolo && <span style={{ fontSize: '0.62rem', fontWeight: 700, padding: '2px 5px', borderRadius: 3, background: `${prc}22`, color: prc, border: `1px solid ${prc}55`, fontFamily: 'var(--font-display)' }}>{p.ruolo}</span>}
                        {p.anno_nascita && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Cl. {p.anno_nascita}</span>}
                      </div>
                    </div>
                    <PlayerColumn
                      player={p} getCols={getCols} compact={true}
                      activeMapType={mapTypes[p.nome_norm]}
                      coordsCache={coordsCache}
                      onMapTypeChange={et => handleMapTypeChange(p.nome_norm, et)}
                      showMapTab={activeTab === 'mappe'}
                    />
                  </div>
                )
              })}
            </div>
          ) : (
            <div style={{ padding: '1.2rem 1.4rem' }}>
              <PlayerColumn
                player={player} getCols={getCols} compact={false}
                activeMapType={mapTypes[player.nome_norm]}
                coordsCache={coordsCache}
                onMapTypeChange={et => handleMapTypeChange(player.nome_norm, et)}
                showMapTab={activeTab === 'mappe'}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── STILI ────────────────────────────────────────────────────
const sSectionTitle = { fontFamily: 'var(--font-display)', fontSize: '0.68rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '0.65rem' }
const sTile        = { background: 'var(--bg-table)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.55rem 0.65rem' }
const sTileLabel   = { fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }
const sTileValue   = { fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 700, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }
const sTileUnit    = { fontSize: '0.6rem', color: 'var(--text-muted)' }
