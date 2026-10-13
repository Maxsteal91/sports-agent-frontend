'use client'
import { useState, useMemo, useEffect, useRef } from 'react'
import { fetchAPI } from '../lib/api'

// ── SVG canvas
const W = 1000
const H = 580
const PX = 36
const PY = 18

const fx = x => PX + (x / 100) * (W - 2 * PX)
const fy = y => PY + ((100 - y) / 100) * (H - 2 * PY)
const fw = dx => (dx / 100) * (W - 2 * PX)
const fh = dy => (dy / 100) * (H - 2 * PY)

const CYAN   = '#00E5FF'
const PURPLE = '#CC44FF'
const GRASS  = '#0d3d1e'
const GRASS2 = '#0f4522'

const EVENT_TYPES = [
  { id: 'shot',     label: 'TIRI',     apiType: 'shot',     statLabel: ['Tiri fatti', 'Tiri subiti'] },
  { id: 'gol',      label: 'GOL',      apiType: null,       statLabel: ['Gol segnati', 'Gol subiti'] },
  { id: 'cross',    label: 'CROSS',    apiType: 'cross',    statLabel: ['Cross fatti', 'Cross subiti'] },
  { id: 'freekick', label: 'PUNIZIONI', apiType: 'freekick', statLabel: ['Punizioni fatte', 'Punizioni subite'] },
  { id: 'gkout',    label: 'USCITE',   apiType: 'gkout',    statLabel: ['Uscite fatte', 'Uscite avversari'] },
]

function normalizeShotsForDisplay(shots, tenantTeam) {
  const groups = new Map()
  shots.forEach(s => {
    const key = `${s.team}||${s.match_name}||${s.period}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(s)
  })
  const out = []
  groups.forEach(gs => {
    const isOurTeam = gs[0].team === tenantTeam
    const sorted = [...gs].map(s => s.x).sort((a, b) => a - b)
    const medianX = sorted[Math.floor(sorted.length / 2)]
    const mirror = isOurTeam ? medianX > 50 : medianX < 50
    gs.forEach(s => out.push({
      ...s,
      x: mirror ? 100 - s.x : s.x,
      y: mirror ? 100 - s.y : s.y,
    }))
  })
  return out
}

function buildGrid(shots, isLeft, cols = 5, rows = 6) {
  const xMin = isLeft ? 0 : 50
  const xStep = 50 / cols
  const yStep = 100 / rows
  const grid = Array.from({ length: rows }, () => Array(cols).fill(0))
  shots.forEach(s => {
    if (s.x < xMin || s.x > xMin + 50) return
    const col = Math.min(Math.floor((s.x - xMin) / xStep), cols - 1)
    const row = Math.min(Math.floor(s.y / yStep), rows - 1)
    grid[row][col]++
  })
  const maxCount = Math.max(...grid.flat(), 1)
  return { grid, xMin, xStep, yStep, maxCount, cols, rows }
}

function GridOverlay({ shots, isLeft, color }) {
  const { grid, xMin, xStep, yStep, maxCount, rows, cols } = buildGrid(shots, isLeft)
  return (
    <>
      {grid.map((row, ri) =>
        row.map((count, ci) => {
          const opacity = (count / maxCount) * 0.55
          if (opacity < 0.04) return null
          const x = xMin + ci * xStep
          const y = (rows - 1 - ri) * yStep
          return (
            <rect
              key={`${ri}-${ci}`}
              x={fx(x)} y={fy(y + yStep)}
              width={fw(xStep)} height={fh(yStep)}
              fill={color} opacity={opacity} rx="4"
            />
          )
        })
      )}
    </>
  )
}

function FieldSVG({ ourShots, theirShots, ourLabel }) {
  const rx = fw(8.7)
  const ry = fh(13.5)

  return (
    <svg
      viewBox={`${-PX * 0.85} ${-PY} ${W + PX * 1.7} ${H + PY * 2}`}
      style={{ width: '100%', borderRadius: '10px', background: GRASS, display: 'block' }}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i}
          x={fx(i * 10)} y={fy(100)}
          width={fw(10)} height={fh(100)}
          fill={i % 2 === 0 ? GRASS : GRASS2}
        />
      ))}

      <GridOverlay shots={ourShots}   isLeft={true}  color={CYAN}   />
      <GridOverlay shots={theirShots} isLeft={false} color={PURPLE} />

      <rect x={fx(0)} y={fy(100)} width={fw(100)} height={fh(100)}
        fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <line x1={fx(50)} y1={fy(100)} x2={fx(50)} y2={fy(0)}
        stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
      <ellipse cx={fx(50)} cy={fy(50)} rx={rx * 1.0} ry={ry * 0.68}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={fx(50)} cy={fy(50)} r="4" fill="rgba(255,255,255,0.6)" />

      <rect x={fx(0)} y={fy(79)} width={fw(17)} height={fh(58)}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      <rect x={fx(0)} y={fy(63)} width={fw(6)} height={fh(26)}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <rect x={fx(-3.8)} y={fy(56)} width={fw(3.8)} height={fh(12)}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
      <circle cx={fx(11)} cy={fy(50)} r="3" fill="rgba(255,255,255,0.5)" />
      <path
        d={`M ${fx(17)} ${fy(43)} A ${rx} ${ry * 0.68} 0 0 0 ${fx(17)} ${fy(57)}`}
        fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"
      />

      <rect x={fx(83)} y={fy(79)} width={fw(17)} height={fh(58)}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      <rect x={fx(94)} y={fy(63)} width={fw(6)} height={fh(26)}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      <rect x={fx(100)} y={fy(56)} width={fw(3.8)} height={fh(12)}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
      <circle cx={fx(89)} cy={fy(50)} r="3" fill="rgba(255,255,255,0.5)" />
      <path
        d={`M ${fx(83)} ${fy(43)} A ${rx} ${ry * 0.68} 0 0 1 ${fx(83)} ${fy(57)}`}
        fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"
      />

      {ourShots.map((s, i) => (
        <circle key={`our-${i}`}
          cx={fx(s.x)} cy={fy(s.y)} r="5"
          fill={CYAN} opacity="0.7"
          stroke="rgba(0,0,0,0.35)" strokeWidth="0.8"
        />
      ))}
      {theirShots.map((s, i) => (
        <circle key={`their-${i}`}
          cx={fx(s.x)} cy={fy(s.y)} r="5"
          fill={PURPLE} opacity="0.7"
          stroke="rgba(0,0,0,0.35)" strokeWidth="0.8"
        />
      ))}

      <text x={fx(15)} y={fy(95)} textAnchor="middle" fontSize="18" fontWeight="700"
        fill="rgba(0,229,255,0.45)" fontFamily="var(--font-display,sans-serif)" letterSpacing="2">
        {(ourLabel || 'NOI').toUpperCase()}
      </text>
      <text x={fx(85)} y={fy(95)} textAnchor="middle" fontSize="18" fontWeight="700"
        fill="rgba(204,68,255,0.45)" fontFamily="var(--font-display,sans-serif)" letterSpacing="2">
        AVVERSARI
      </text>
    </svg>
  )
}

function isGoal(outcome) {
  return outcome && (outcome.toLowerCase() === 'goal' || outcome.toLowerCase() === 'gol')
}

function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s }

function GoalsDetail({ events, color, label }) {
  const cols = ['partita', 'periodo', 'minuto', 'giocatore']
  return (
    <div>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
        letterSpacing: '0.06em', color, marginBottom: '0.75rem',
      }}>
        {label} ({events.length})
      </h3>
      {events.length === 0
        ? <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessun dato</p>
        : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {cols.map(h => (
                  <th key={h} style={{
                    padding: '0.4rem 0.5rem', textAlign: h === 'minuto' ? 'right' : 'left',
                    color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase',
                    letterSpacing: '0.06em', fontSize: '0.68rem',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {events.map((g, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>{g.match_name}</td>
                  <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)' }}>
                    {g.period === 'Primo_Tempo' ? '1° T' : g.period === 'Secondo_Tempo' ? '2° T' : g.period}
                  </td>
                  <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)', textAlign: 'right' }}>
                    {g.minute != null ? `${g.minute}'` : '—'}
                  </td>
                  <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)' }}>{g.player || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      }
    </div>
  )
}

function StatsSection({ eventTypeId, ourEvents, theirEvents, statLabel }) {
  if (eventTypeId === 'gol') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        <GoalsDetail events={ourEvents}   color={CYAN}   label={statLabel[0]} />
        <GoalsDetail events={theirEvents} color={PURPLE} label={statLabel[1]} />
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      {[
        { count: ourEvents.length,   label: statLabel[0], color: CYAN   },
        { count: theirEvents.length, label: statLabel[1], color: PURPLE },
      ].map(({ count, label, color }) => (
        <div key={label} style={{
          background: 'rgba(255,255,255,0.03)', borderRadius: '8px',
          padding: '1rem 1.25rem', border: `1px solid ${color}22`,
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <span style={{
            fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700,
            color, lineHeight: 1,
          }}>{count}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  )
}

const PERIOD_OPTS = [
  { label: 'Tutto',    value: 'Tutto'         },
  { label: '1° Tempo', value: 'Primo_Tempo'   },
  { label: '2° Tempo', value: 'Secondo_Tempo' },
]

const pillStyle = (active) => ({
  padding: '0.35rem 0.85rem', borderRadius: '8px',
  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
  background: active ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
  color: active ? 'var(--primary)' : 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem',
  fontWeight: 600, letterSpacing: '0.03em',
})

export default function MappaStatistica({ tenant, categoria, tenantTeam, eventTypeId = 'shot' }) {
  const [period, setPeriod] = useState('Tutto')
  const [loading,     setLoading]     = useState(false)
  const [data,        setData]        = useState([])
  const cacheRef = useRef({})

  const catParam = categoria ? `&category=${encodeURIComponent(categoria)}` : ''

  // Clear cache when tenant/categoria changes
  useEffect(() => {
    cacheRef.current = {}
    setData([])
  }, [tenant, categoria])

  // Fetch data for current event type
  useEffect(() => {
    if (!tenant) return
    const et = EVENT_TYPES.find(e => e.id === eventTypeId)
    const fetchType = et.apiType ?? 'shot'  // gol fetches shot data

    if (cacheRef.current[fetchType] !== undefined) {
      const raw = cacheRef.current[fetchType]
      setData(eventTypeId === 'gol' ? raw.filter(s => isGoal(s.outcome)) : raw)
      return
    }

    setLoading(true)
    fetchAPI(`/v2/analytics/${tenant}/mappa_stagione?event_type=${fetchType}${catParam}`)
      .then(res => {
        const raw = res.data || []
        cacheRef.current[fetchType] = raw
        setData(eventTypeId === 'gol' ? raw.filter(s => isGoal(s.outcome)) : raw)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [eventTypeId, tenant, categoria])

  const { ourEvents, theirEvents } = useMemo(() => {
    if (!data.length || !tenantTeam) return { ourEvents: [], theirEvents: [] }
    const filtered = period === 'Tutto' ? data : data.filter(s => s.period === period)
    const normalized = normalizeShotsForDisplay(filtered, tenantTeam)
    return {
      ourEvents:   normalized.filter(s => s.team === tenantTeam),
      theirEvents: normalized.filter(s => s.team !== tenantTeam),
    }
  }, [data, tenantTeam, period])

  const ourLabel  = tenantTeam ? cap(tenantTeam.replace(/_\d{4}$/, '')) : 'Noi'
  const currentET = EVENT_TYPES.find(e => e.id === eventTypeId)

  return (
    <div>
      {/* Period filter + legend */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {PERIOD_OPTS.map(opt => (
          <button key={opt.value} onClick={() => setPeriod(opt.value)} style={pillStyle(period === opt.value)}>
            {opt.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.78rem', alignSelf: 'center' }}>
          <span style={{ color: CYAN }}>■</span> {ourLabel} ({ourEvents.length})&nbsp;&nbsp;
          <span style={{ color: PURPLE }}>■</span> Avversari ({theirEvents.length})
        </span>
      </div>

      {/* Field SVG */}
      {loading
        ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>Caricamento...</div>
        : !data.length
          ? <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nessun dato disponibile</div>
          : <FieldSVG ourShots={ourEvents} theirShots={theirEvents} ourLabel={ourLabel} />
      }

      {/* Stats section */}
      {!loading && data.length > 0 && (
        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: '10px', padding: '1.25rem', marginTop: '1.25rem',
        }}>
          <h3 style={{
            fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700,
            letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '1rem',
          }}>
            {currentET.label}
          </h3>
          <StatsSection
            eventTypeId={eventTypeId}
            ourEvents={ourEvents}
            theirEvents={theirEvents}
            statLabel={currentET.statLabel}
          />
        </div>
      )}
    </div>
  )
}
