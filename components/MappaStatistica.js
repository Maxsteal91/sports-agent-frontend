'use client'
import { useState, useMemo } from 'react'

// ── SVG canvas
const W = 1000
const H = 580
const PX = 36   // horizontal margin (space for goals outside field lines)
const PY = 18   // vertical margin

// Map field coords (x: 0-100, y: 0-100, y=0=bottom) → SVG pixels
const fx = x => PX + (x / 100) * (W - 2 * PX)
const fy = y => PY + ((100 - y) / 100) * (H - 2 * PY)
const fw = dx => (dx / 100) * (W - 2 * PX)
const fh = dy => (dy / 100) * (H - 2 * PY)

const CYAN   = '#00E5FF'
const PURPLE = '#CC44FF'
const GRASS  = '#0d3d1e'
const GRASS2 = '#0f4522'

// Normalize so Mazzola attacks LEFT (x→0), opponents attack RIGHT (x→100)
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
    // Mazzola → attack left (x<50): mirror if median>50
    // Opponents → attack right (x>50): mirror if median<50
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

function FieldSVG({ ourShots, theirShots, ourLabel, theirLabel }) {
  // Penalty D arc intercept at x=17: y = 50 ± 6.9
  // rx = fw(8.7), ry = fh(13.5) to approximate circle on non-square SVG
  const rx = fw(8.7)
  const ry = fh(13.5)

  return (
    <svg
      viewBox={`${-PX * 0.85} ${-PY} ${W + PX * 1.7} ${H + PY * 2}`}
      style={{ width: '100%', borderRadius: '10px', background: GRASS, display: 'block' }}
    >
      {/* Grass stripes */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i}
          x={fx(i * 10)} y={fy(100)}
          width={fw(10)} height={fh(100)}
          fill={i % 2 === 0 ? GRASS : GRASS2}
        />
      ))}

      {/* Heat map zones */}
      <GridOverlay shots={ourShots}   isLeft={true}  color={CYAN}   />
      <GridOverlay shots={theirShots} isLeft={false} color={PURPLE} />

      {/* ── Field markings ── */}
      {/* Outer boundary */}
      <rect x={fx(0)} y={fy(100)} width={fw(100)} height={fh(100)}
        fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />

      {/* Center line */}
      <line x1={fx(50)} y1={fy(100)} x2={fx(50)} y2={fy(0)}
        stroke="rgba(255,255,255,0.75)" strokeWidth="2" />

      {/* Center circle */}
      <ellipse cx={fx(50)} cy={fy(50)} rx={rx * 1.0} ry={ry * 0.68}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <circle cx={fx(50)} cy={fy(50)} r="4" fill="rgba(255,255,255,0.6)" />

      {/* LEFT penalty area */}
      <rect x={fx(0)} y={fy(79)} width={fw(17)} height={fh(58)}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      {/* LEFT 6-yard box */}
      <rect x={fx(0)} y={fy(63)} width={fw(6)} height={fh(26)}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      {/* LEFT goal */}
      <rect x={fx(-3.8)} y={fy(56)} width={fw(3.8)} height={fh(12)}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
      {/* LEFT penalty spot */}
      <circle cx={fx(11)} cy={fy(50)} r="3" fill="rgba(255,255,255,0.5)" />
      {/* LEFT penalty D */}
      <path
        d={`M ${fx(17)} ${fy(43)} A ${rx} ${ry * 0.68} 0 0 0 ${fx(17)} ${fy(57)}`}
        fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"
      />

      {/* RIGHT penalty area */}
      <rect x={fx(83)} y={fy(79)} width={fw(17)} height={fh(58)}
        fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth="1.5" />
      {/* RIGHT 6-yard box */}
      <rect x={fx(94)} y={fy(63)} width={fw(6)} height={fh(26)}
        fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
      {/* RIGHT goal */}
      <rect x={fx(100)} y={fy(56)} width={fw(3.8)} height={fh(12)}
        fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" />
      {/* RIGHT penalty spot */}
      <circle cx={fx(89)} cy={fy(50)} r="3" fill="rgba(255,255,255,0.5)" />
      {/* RIGHT penalty D */}
      <path
        d={`M ${fx(83)} ${fy(43)} A ${rx} ${ry * 0.68} 0 0 1 ${fx(83)} ${fy(57)}`}
        fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.5"
      />

      {/* ── Shot dots ── */}
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

      {/* Team labels */}
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

function GoalsSection({ ourGoals, theirGoals, ourLabel }) {
  const cols = ['partita', 'periodo', 'minuto', 'giocatore']
  const row = (g, i) => (
    <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <td style={{ padding: '0.45rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
        {g.match_name}
      </td>
      <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)' }}>
        {g.period === 'Primo_Tempo' ? '1° T' : g.period === 'Secondo_Tempo' ? '2° T' : g.period}
      </td>
      <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)', textAlign: 'right' }}>
        {g.minute != null ? `${g.minute}'` : '—'}
      </td>
      <td style={{ padding: '0.45rem 0.5rem', fontSize: '0.78rem', color: 'var(--text)' }}>
        {g.player || '—'}
      </td>
    </tr>
  )

  const thead = (
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
  )

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
      {/* Gol segnati */}
      <div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
          letterSpacing: '0.06em', color: CYAN, marginBottom: '0.75rem',
        }}>
          GOL SEGNATI ({ourGoals.length})
        </h3>
        {ourGoals.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessun gol registrato</p>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {thead}
              <tbody>{ourGoals.map(row)}</tbody>
            </table>
        }
      </div>
      {/* Gol subiti */}
      <div>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700,
          letterSpacing: '0.06em', color: PURPLE, marginBottom: '0.75rem',
        }}>
          GOL SUBITI ({theirGoals.length})
        </h3>
        {theirGoals.length === 0
          ? <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessun gol registrato</p>
          : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              {thead}
              <tbody>{theirGoals.map(row)}</tbody>
            </table>
        }
      </div>
    </div>
  )
}

const PERIOD_OPTS = [
  { label: 'Tutto',      value: 'Tutto'         },
  { label: '1° Tempo',   value: 'Primo_Tempo'   },
  { label: '2° Tempo',   value: 'Secondo_Tempo' },
]

export default function MappaStatistica({ data, tenantTeam, loading }) {
  const [period, setPeriod] = useState('Tutto')

  const { ourShots, theirShots, ourGoals, theirGoals } = useMemo(() => {
    if (!data || data.length === 0 || !tenantTeam) {
      return { ourShots: [], theirShots: [], ourGoals: [], theirGoals: [] }
    }

    const filtered = period === 'Tutto'
      ? data
      : data.filter(s => s.period === period)

    const normalized = normalizeShotsForDisplay(filtered, tenantTeam)
    const ours  = normalized.filter(s => s.team === tenantTeam)
    const theirs = normalized.filter(s => s.team !== tenantTeam)

    return {
      ourShots:   ours,
      theirShots: theirs,
      ourGoals:   ours.filter(s => isGoal(s.outcome)),
      theirGoals: theirs.filter(s => isGoal(s.outcome)),
    }
  }, [data, tenantTeam, period])

  if (loading) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
      Caricamento mappa...
    </div>
  )

  if (!data || data.length === 0) return (
    <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Nessun dato disponibile
    </div>
  )

  const ourLabel = tenantTeam ? cap(tenantTeam.replace(/_\d{4}$/, '')) : 'Noi'

  return (
    <div>
      {/* Period filter */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {PERIOD_OPTS.map(opt => (
          <button key={opt.value} onClick={() => setPeriod(opt.value)} style={{
            padding: '0.35rem 0.85rem', borderRadius: '8px',
            border: `1px solid ${period === opt.value ? 'var(--primary)' : 'var(--border)'}`,
            background: period === opt.value ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
            color: period === opt.value ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.82rem',
            fontWeight: 600, letterSpacing: '0.03em',
          }}>
            {opt.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '0.78rem', alignSelf: 'center' }}>
          <span style={{ color: '#00E5FF' }}>■</span> {ourLabel} ({ourShots.length})&nbsp;&nbsp;
          <span style={{ color: '#CC44FF' }}>■</span> Avversari ({theirShots.length})
        </span>
      </div>

      {/* Field SVG */}
      <FieldSVG
        ourShots={ourShots}
        theirShots={theirShots}
        ourLabel={ourLabel}
        theirLabel="Avversari"
      />

      {/* Goals section */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '10px', padding: '1.25rem', marginTop: '1.25rem',
      }}>
        <h3 style={{
          fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700,
          letterSpacing: '0.06em', color: 'var(--text)', marginBottom: '0.25rem',
        }}>
          GOL
        </h3>
        <GoalsSection ourGoals={ourGoals} theirGoals={theirGoals} ourLabel={ourLabel} />
      </div>
    </div>
  )
}
