'use client'

const COLORI = {
  goal:    '#00E676',
  save:    '#00E5FF',
  wide:    '#FFD600',
  blocked: '#FF6B35',
}

const ETICHETTE = {
  goal:    'Gol',
  save:    'Parata',
  wide:    'Fuori',
  blocked: 'Bloccato',
}

const W = 500
const H = 340
const PAD = 20

function scalaX(x) { return PAD + (x / 80) * (W - PAD * 2) }
function scalaY(y) { return H - PAD - (y / 60) * (H - PAD * 2) }

function CampoSVG({ tiri, color, squadra }) {
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700,
        color, marginBottom: '0.75rem', letterSpacing: '0.05em'
      }}>
        {squadra} — {tiri.length} tiri
      </div>

      <div style={{ position: 'relative', width: '100%', maxWidth: '600px' }}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '8px', background: '#0d3d1e' }}
        >
          {/* Sfondo */}
          <rect x="0" y="0" width={W} height={H} fill="#0d3d1e"/>

          {/* Linea porta (in alto) */}
          <line x1={PAD} y1={PAD} x2={W - PAD} y2={PAD} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
          {/* Linee laterali */}
          <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
          <line x1={W - PAD} y1={PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>
          {/* Linea centrocampo (in basso) */}
          <line x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"/>

          {/* Porta sopra la linea */}
          <rect
            x={scalaX(35)} y={PAD - 10}
            width={scalaX(45) - scalaX(35)} height={12}
            fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.7)" strokeWidth="2"
          />

          {/* Area piccola */}
          <rect
            x={scalaX(30)} y={PAD}
            width={scalaX(50) - scalaX(30)} height={scalaY(6) - PAD}
            fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1"
          />

          {/* Area di rigore */}
          <rect
            x={scalaX(18)} y={PAD}
            width={scalaX(62) - scalaX(18)} height={scalaY(18) - PAD}
            fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5"
          />

          {/* Dischetto rigore */}
          <circle
            cx={scalaX(40)} cy={scalaY(11)}
            r={3} fill="rgba(255,255,255,0.5)"
          />

          {/* Semicerchio area — aperto verso il basso */}
          <path
            d={`M ${scalaX(22)} ${scalaY(18)} A ${(scalaX(58) - scalaX(22)) / 2} ${(scalaX(58) - scalaX(22)) / 2} 0 0 0 ${scalaX(58)} ${scalaY(18)}`}
            fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
          />

          {/* Semicerchio centrocampo — aperto verso l'alto */}
          <path
            d={`M ${scalaX(20)} ${H - PAD} A ${(scalaX(60) - scalaX(20)) / 2} ${(scalaX(60) - scalaX(20)) / 2} 0 0 1 ${scalaX(60)} ${H - PAD}`}
            fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1"
          />

          {/* Label PORTA */}
          <text
            x={scalaX(40)} y={PAD + 16}
            textAnchor="middle" dominantBaseline="central"
            fontSize="9" fill="rgba(255,255,255,0.35)"
            fontFamily="sans-serif" letterSpacing="2"
          >
            PORTA
          </text>

          {/* Tiri */}
          {tiri.map((tiro, i) => {
            const cx = scalaX(tiro.x)
            const cy = scalaY(tiro.y)
            const colore = COLORI[tiro.esito] || '#888'
            const isGoal = tiro.esito === 'goal'

            return (
              <g key={i}>
                {isGoal && (
                  <circle cx={cx} cy={cy} r={14} fill={colore} opacity={0.15}/>
                )}
                <circle
                  cx={cx} cy={cy}
                  r={isGoal ? 7 : 5}
                  fill={colore}
                  stroke="rgba(0,0,0,0.5)"
                  strokeWidth="1"
                  opacity={0.9}
                />
                {isGoal && (
                  <text
                    x={cx} y={cy + 1}
                    textAnchor="middle" dominantBaseline="central"
                    fontSize="7" fontWeight="bold" fill="#000"
                  >
                    G
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {Object.entries(COLORI).map(([esito, colore]) => {
          const count = tiri.filter(t => t.esito === esito).length
          if (count === 0) return null
          return (
            <div key={esito} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: colore, flexShrink: 0
              }}/>
              <span style={{ color: 'var(--text-muted)' }}>
                {ETICHETTE[esito]}: <strong style={{ color: 'var(--text)' }}>{count}</strong>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MappaTiri({ data, matchName }) {
  if (!data || data.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Nessun dato disponibile
    </div>
  )

  const tiriConCoord = data.filter(d => d.x != null && d.y != null)
  if (tiriConCoord.length === 0) return (
    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
      Coordinate non disponibili per questa partita
    </div>
  )

  const squadre = [...new Set(tiriConCoord.map(d => d.squadra).filter(Boolean))]

  // Se non ci sono squadre mostra tutti i tiri insieme
  if (squadre.length === 0) {
    return <CampoSVG tiri={tiriConCoord} color="#00E5FF" squadra="Tutti i tiri" />
  }

  const COLORI_SQUADRE = ['#00E5FF', '#CC44FF']

  return (
    <div>
      {squadre.map((squadra, i) => {
        const tiri = tiriConCoord.filter(d => d.squadra === squadra)
        return (
          <CampoSVG
            key={squadra}
            tiri={tiri}
            color={COLORI_SQUADRE[i] || '#888'}
            squadra={squadra}
          />
        )
      })}
    </div>
  )
}
