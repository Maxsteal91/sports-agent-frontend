'use client'
import { useState, useEffect, useCallback } from 'react'
import { fetchAPI } from '../lib/api'
import { useTenant } from '../lib/TenantContext'

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
  const { tagVisibili, tagLabel } = useTenant()
  const entries = tagVisibili(Object.keys(player.events || {})).map(et => [et, player.events[et]])
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
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.04em', textTransform: 'capitalize', color: 'var(--text)' }}>{tagLabel(et)}</div>
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

// ─── RETE PASSAGGI DEL GIOCATORE (una partita) ────────────────
// solo i passaggi dati (da lui) e ricevuti (verso di lui); compagni alla posizione media
// quando la squadra ha il pallone (tracking Veo), piu' grandi = piu' palloni scambiati con lui
const COL_DATI = '#00E5FF', COL_RICEVUTI = '#F59E0B'
// fasce di 15' (minuti di gioco), come FASCE_15 nel backend; null = tutta la partita
const FASCE = [[null, 'Tutta'], [1, "0-15'"], [2, "15-30'"], [3, "30-45'+"], [4, "45-60'"], [5, "60-75'"], [6, "75-90'+"]]

function RetePassaggiGiocatore({ tenant, nomeNorm, matchFiltro }) {
  const [partite, setPartite] = useState(null)
  const [partita, setPartita] = useState(matchFiltro || null)
  const [rete, setRete] = useState(null)
  const [fascia, setFascia] = useState(null)

  useEffect(() => {
    fetchAPI(`/v2/analytics/${tenant}/partite_giocatore/${encodeURIComponent(nomeNorm)}`)
      .then(res => {
        const ps = res.data || []
        setPartite(ps)
        setPartita(p => p && ps.some(x => x.match_name === p) ? p : ps[0]?.match_name || null)
      })
      .catch(() => setPartite([]))
  }, [tenant, nomeNorm])

  useEffect(() => {
    if (!partita) return
    setRete(null)
    fetchAPI(`/v2/analytics/${tenant}/rete_passaggi/${partita}?giocatore=${encodeURIComponent(nomeNorm)}${fascia ? `&fascia=${fascia}` : ''}`)
      .then(setRete)
      .catch(() => setRete({ nodi: [], archi: [] }))
  }, [tenant, nomeNorm, partita, fascia])

  const msg = t => <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>{t}</div>
  if (partite === null) return msg('Caricamento...')
  if (!partite.length) return msg('Rete disponibile dopo aver caricato la rosa della partita')

  const svg = (() => {
    if (!rete) return msg('Caricamento...')
    const io = rete.nodi.find(n => n.numero === rete.giocatore)
    if (!io) return msg(fascia ? 'Nessun passaggio in questa fascia' : 'Nessun passaggio in questa partita')
    const pos = Object.fromEntries(rete.nodi.map(n => [n.numero, { x: fx(n.x), y: fy(n.y) }]))
    const scambi = n => (n.dati || 0) + (n.ricevuti_da || 0)
    const maxS = Math.max(1, ...rete.nodi.filter(n => n !== io).map(scambi))
    const raggio = n => n === io ? 9 : 3.5 + 6 * Math.sqrt(scambi(n) / maxS)
    const maxN = Math.max(1, ...rete.archi.map(a => a.n))
    const alone = { paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.75)', strokeWidth: 2.5 }
    return (
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
        <defs>
          {[['dati', COL_DATI], ['ricevuti', COL_RICEVUTI]].map(([k, c]) => (
            <marker key={k} id={`freccia-${k}`} viewBox="0 0 10 10" refX={9} refY={5} markerWidth={5} markerHeight={5}
              markerUnits="userSpaceOnUse" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill={c} /></marker>
          ))}
        </defs>
        <rect x={0} y={0} width={W} height={H} rx={4} fill="rgba(34,197,94,0.07)" />
        <rect x={PAD} y={PAD} width={W - 2 * PAD} height={H - 2 * PAD} fill="none" stroke="rgba(255,255,255,0.2)" />
        <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} stroke="rgba(255,255,255,0.2)" />
        <circle cx={W / 2} cy={H / 2} r={(9.15 / 100) * W} fill="none" stroke="rgba(255,255,255,0.2)" />
        {[0, 100].map(x0 => (
          <rect key={x0} x={fx(x0 === 0 ? 0 : 83.5)} y={fy(16.4)} width={fx(16.5) - fx(0)} height={fy(83.6) - fy(16.4)}
            fill="none" stroke="rgba(255,255,255,0.2)" />
        ))}
        {rete.archi.map((a, i) => {
          const p = pos[a.da], q = pos[a.a]
          const dato = a.da === rete.giocatore
          const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1
          const ox = -dy / L * 2.5, oy = dx / L * 2.5            // dati e ricevuti affiancati
          const r1 = raggio(rete.nodi.find(n => n.numero === a.da)), r2 = raggio(rete.nodi.find(n => n.numero === a.a)) + 2
          const x1 = p.x + dx / L * r1 + ox, y1 = p.y + dy / L * r1 + oy
          const x2 = q.x - dx / L * r2 + ox, y2 = q.y - dy / L * r2 + oy
          const c = dato ? COL_DATI : COL_RICEVUTI
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c} strokeWidth={0.6 + 2.4 * a.n / maxN}
                opacity={0.45 + 0.45 * a.n / maxN} strokeLinecap="round" markerEnd={`url(#freccia-${dato ? 'dati' : 'ricevuti'})`} />
              {/* numero vicino al compagno (lontano dal giocatore, dove le frecce si ammucchiano) */}
              {L > 30 && <text x={x1 + (x2 - x1) * (dato ? 0.75 : 0.25) + ox * 2.2} y={y1 + (y2 - y1) * (dato ? 0.75 : 0.25) + oy * 2.2 + 3} textAnchor="middle"
                fontSize={7} fontWeight="bold" fill={c} style={alone}>{a.n}</text>}
            </g>
          )
        })}
        {rete.nodi.map(n => {
          const { x, y } = pos[n.numero], r = raggio(n)
          const cognome = (n.cognome || (n.nome || '').split(' ')[0]).toUpperCase()   // anagrafica: "Cognome Nome"
          return (
            <g key={n.numero}>
              <title>{n === io ? `${n.nome || n.numero}: ${n.passaggi} passaggi, ${n.ricevuti} ricevuti`
                : `${n.nome || n.numero}: ${n.dati} dati da lui, ${n.ricevuti_da} ricevuti da lui`}</title>
              <circle cx={x} cy={y} r={r} fill={n === io ? 'white' : '#64748B'} fillOpacity={n === io ? 1 : 0.85}
                stroke="white" strokeWidth={1.2} strokeDasharray={n.subentrato && n !== io ? '3,2' : undefined} />
              <text x={x} y={y + (n === io ? 3 : 2.2)} textAnchor="middle" fontSize={n === io ? 8 : 6} fontWeight="bold"
                fill={n === io ? '#0B1220' : 'white'}>{n.numero}</text>
              {cognome && <text x={x} y={y + r + 7} textAnchor="middle" fontSize={6} fill="white" style={alone}>{cognome}</text>}
            </g>
          )
        })}
      </svg>
    )
  })()

  const compagni = rete?.nodi.filter(n => n.numero !== rete.giocatore)
    .sort((a, b) => (b.dati + b.ricevuti_da) - (a.dati + a.ricevuti_da)) || []
  const nomePartita = p => `${p.home_team} - ${p.away_team}${p.date ? ` (${p.date.slice(0, 10)})` : ''}`
  return (
    <div>
      <select value={partita || ''} onChange={e => setPartita(e.target.value)} style={{
        width: '100%', marginBottom: '0.5rem', padding: '0.3rem', background: 'var(--bg-table)', color: 'var(--text)',
        border: '1px solid var(--border)', borderRadius: 5, fontSize: '0.75rem', textTransform: 'capitalize' }}>
        {partite.map(p => <option key={p.match_name} value={p.match_name}>{nomePartita(p)}</option>)}
      </select>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {FASCE.map(([k, label]) => (
          <button key={label} onClick={() => setFascia(k)} style={{
            padding: '2px 8px', borderRadius: 5, fontSize: '0.7rem', cursor: 'pointer',
            border: `1px solid ${fascia === k ? 'var(--primary)' : 'var(--border)'}`,
            background: fascia === k ? 'var(--primary-dim)' : 'transparent',
            color: fascia === k ? 'var(--primary)' : 'var(--text-muted)',
          }}>{label}</button>
        ))}
      </div>
      {svg}
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', margin: '0.3rem 0' }}>
        <span style={{ color: COL_DATI }}>→ passaggi dati</span>
        <span style={{ color: COL_RICEVUTI }}>← passaggi ricevuti</span>
        <span>tratteggiato = subentrato</span>
      </div>
      {(() => {
        // riepilogo del giocatore (segue la fascia): stessi conteggi delle colonne Riusciti / Non riusciti
        const io = rete?.nodi.find(n => n.numero === rete.giocatore)
        if (!io) return null
        const voci = [['Passaggi', io.passaggi], ['Riusciti', io.riusciti], ['Non riusciti', io.passaggi - io.riusciti],
          ['%', io.passaggi ? `${Math.round(100 * io.riusciti / io.passaggi)}%` : '–'], ['Ricevuti', io.ricevuti]]
        return (
          <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: '0.75rem', margin: '0.3rem 0 0.5rem',
            padding: '4px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
            {voci.map(([k, v]) => (
              <div key={k} style={{ textAlign: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.65rem' }}>{k}</div>
                <div style={{ fontWeight: 700, color: k === 'Ricevuti' ? COL_RICEVUTI : 'var(--text)' }}>{v}</div>
              </div>
            ))}
          </div>
        )
      })()}
      {compagni.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', color: 'var(--text)' }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
              <th style={{ textAlign: 'left', padding: '2px 6px' }}>Compagno</th>
              <th style={{ padding: '2px 6px', color: COL_DATI }}>Dati</th>
              <th style={{ padding: '2px 6px', color: COL_RICEVUTI }}>Ricevuti</th>
            </tr>
          </thead>
          <tbody>
            {compagni.map(n => (
              <tr key={n.numero} style={{ borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <td style={{ textAlign: 'left', padding: '2px 6px' }}>{n.numero} {n.nome || ''}</td>
                <td style={{ padding: '2px 6px' }}>{n.dati}</td>
                <td style={{ padding: '2px 6px' }}>{n.ricevuti_da}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ─── PLAYER COLUMN (usata sia in single che dual) ──────────────
function PlayerColumn({ player, getCols, compact, activeMapType, coordsCache, onMapTypeChange, showMapTab, tenant, matchFiltro }) {
  const rc = RUOLO_COLOR[player.ruolo]
  const { tagVisibili, tagLabel } = useTenant()
  const eventTypesWithCoords = tagVisibili(Object.keys(player.events || {}))

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
            }}>{tagLabel(et)}</button>
          ))}
        </div>
        <div style={{ background: 'var(--bg-table)', border: '1px solid var(--border)', borderRadius: 8, padding: '0.6rem' }}>
          {selectedEt === 'passaggi' && player.nome_norm && !player.nome_norm.match(/^\d+$/)
            ? <RetePassaggiGiocatore tenant={tenant} nomeNorm={player.nome_norm} matchFiltro={matchFiltro} />
            : coords === 'senza_nome'
            ? <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center', padding: '1rem 0' }}>Mappa disponibile dopo aver caricato la rosa della partita</div>
            : coords === undefined
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
  const { tagVisibili: tipiVisibili } = useTenant()
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
    const key = `${nomeNorm}__${eventType}`
    if (coordsCache[key] !== undefined) return
    // senza nome (solo numero di maglia: rosa non caricata) la mappa non si puo' cercare
    if (!nomeNorm || nomeNorm.match(/^\d+$/)) {
      setCoordsCache(prev => ({ ...prev, [key]: 'senza_nome' }))
      return
    }
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
      const et = mapTypes[p.nome_norm] || tipiVisibili(Object.keys(p.events || {}))[0]
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
                tenant={tenant} matchFiltro={matchFiltro}
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
                tenant={tenant} matchFiltro={matchFiltro}
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
