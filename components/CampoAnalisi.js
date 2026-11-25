'use client'
import { useState, useEffect, useMemo, useRef } from 'react'
import { titoloPunto } from '../lib/tempo'
import { GRUPPI_EVENTI, etichetta } from '../lib/sintesi'

// Campo con pannello, comune a partita e stagione (dati Veo: la nostra squadra attacca sempre a destra).
//   eventi   punti {team, x, y, x2, y2, attrs, minute, period, match_name, player, ...} (coordinate 0-100)
//   tipi     tipi di evento disponibili; tipo / onTipo = evento scelto; nomeTipo(et) = nome da Admin
//   lati     [{label, colore, appartiene: punto => bool}, ...] (le due squadre, o noi / avversari)
//   colonne  colonne di Admin -> Eventi e statistiche per il tipo scelto ({label, visibile, filtro})
//   direzione {sinistra, destra}: chi attacca da che parte; filtriExtra: controlli in piu' (es. partite)
//   sostituto: nodo da mostrare al posto del campo (es. la rete dei passaggi)
// Il pannello raggruppa le colonne per attributo (blocchi che sommano al totale); un clic filtra i punti.
const FASCE = [['Tutta', null], ['1° tempo', ['Primo_Tempo', 0, 999]], ['2° tempo', ['Secondo_Tempo', 0, 999]],
  ["0-15'", ['Primo_Tempo', 0, 15]], ["15-30'", ['Primo_Tempo', 15, 30]], ["30-45'+", ['Primo_Tempo', 30, 999]],
  ["45-60'", ['Secondo_Tempo', 45, 60]], ["60-75'", ['Secondo_Tempo', 60, 75]], ["75-90'+", ['Secondo_Tempo', 75, 999]]]
// titoli dei blocchi del pannello (attributo -> nome)
const NOMI_BLOCCHI = { outcome: 'Esito', result: 'Esito', esito: 'Esito', zona: 'Zona', piede: 'Parte del corpo',
  motivo: 'Motivo', come: 'Come', pericolosa: 'Di cui', origine: 'Origine', lato: 'Lato', tipo: 'Tipo',
  battuta: 'Battuta', tiro: 'Con tiro', tipologia: 'Tipo', situazione: 'Situazione', tipo_possesso: 'Tipo' }
const W = 620, PAD = 10, FW = W - 2 * PAD, FH = Math.round(FW * 68 / 105), H = FH + 2 * PAD
const sx = x => PAD + (x / 100) * FW, sy = y => PAD + (y / 100) * FH

export default function CampoAnalisi({ eventi, tipi, tipo, onTipo, nomeTipo, lati, colonne = [], direzione,
                                      filtriExtra, sostituto, caricamento, latoNostro = 0 }) {
  const [lato, setLato] = useState(null)          // null = entrambi
  const [scelta, setScelta] = useState(null)      // {nome, valori, label}
  const [soloPericolose, setSoloPericolose] = useState(false)
  const [fascia, setFascia] = useState(0)
  const [vista, setVista] = useState('punti')     // punti | heatmap
  const [griglia, setGriglia] = useState(0)       // indice in GRIGLIE (heatmap)
  // heatmap: una squadra alla volta (due squadre nello stesso tassello non si leggono): la nostra
  const cambiaVista = k => { setVista(k); if (k === 'heatmap' && lato == null) setLato(latoNostro) }
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => { setScelta(null); setSoloPericolose(false) }, [tipo])
  useEffect(() => {
    const chiudi = e => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenu(false) }
    document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [])

  const latoDi = d => lati.findIndex(l => l.appartiene(d))
  const nelTempo = d => {
    const f = FASCE[fascia][1]
    return !f || (d.period === f[0] && d.minute >= f[1] && d.minute < f[2])
  }
  const base = useMemo(() => (eventi || []).filter(d => d.x != null && nelTempo(d)), [eventi, fascia])
  const conPericolo = base.some(d => d.attrs?.pericolosa)
  const passa = (d, f) => f.valori.includes(String(d.attrs?.[f.nome] ?? ''))
  const visibili = base.filter(d => (lato == null || latoDi(d) === lato)
    && (!scelta || passa(d, scelta)) && (!soloPericolose || d.attrs?.pericolosa === 'si'))

  // blocchi del pannello: colonne visibili con un filtro, raggruppate per attributo, solo se hanno dati
  const blocchi = []
  for (const c of colonne.filter(c => c.visibile && c.filtro)) {
    if (!base.some(d => passa(d, c.filtro))) continue
    let b = blocchi.find(b => b.nome === c.filtro.nome)
    if (!b) blocchi.push(b = { nome: c.filtro.nome, righe: [] })
    b.righe.push(c)
  }
  const conta = (i, f) => base.filter(d => latoDi(d) === i && (!f || passa(d, f))
    && (!soloPericolose || d.attrs?.pericolosa === 'si')).length

  // menu degli eventi a gruppi
  const gruppi = GRUPPI_EVENTI.map(([g, ets]) => [g, ets.filter(et => tipi.includes(et))])
  const altri = tipi.filter(et => !GRUPPI_EVENTI.some(([, ets]) => ets.includes(et)))
  if (altri.length) gruppi.push(['Altro', altri])

  return (
    <div>
      {/* barra: evento, squadre, filtri in piu' */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div ref={menuRef} style={{ position: 'relative' }}>
          <button onClick={() => setMenu(m => !m)} style={{ ...selettore }}>
            {etichetta(nomeTipo(tipo))} <span style={{ color: 'var(--text-muted)' }}>▾</span>
          </button>
          {menu && (
            <div style={tendina}>
              {gruppi.filter(([, ets]) => ets.length).map(([g, ets]) => (
                <div key={g}>
                  <div style={gruppoMenu}>{g}</div>
                  {ets.map(et => (
                    <div key={et} onClick={() => { onTipo(et); setMenu(false) }}
                      style={{ ...voceMenu, ...(et === tipo ? voceAttiva : {}) }}>{etichetta(nomeTipo(et))}</div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
        {!sostituto && (
          <div style={segmento}>
            {(vista === 'heatmap' ? [0, 1] : [null, 0, 1]).map(i => (
              <div key={String(i)} onClick={() => setLato(i)} style={{ ...voceSeg, ...(lato === i ? segAttivo : {}) }}>
                {i != null && <span style={{ width: 9, height: 9, borderRadius: '50%', background: lati[i].colore, display: 'inline-block' }} />}
                {i == null ? 'Entrambe' : lati[i].label}
                <small style={{ color: 'var(--text-muted)' }}>{i == null ? base.length : base.filter(d => latoDi(d) === i).length}</small>
              </div>
            ))}
          </div>
        )}
        {!sostituto && (
          <div style={segmento}>
            {[['punti', 'Punti'], ['heatmap', 'Heatmap']].map(([k, l]) => (
              <div key={k} onClick={() => cambiaVista(k)} style={{ ...voceSeg, ...(vista === k ? segAttivo : {}) }}>{l}</div>
            ))}
          </div>
        )}
        {!sostituto && vista === 'heatmap' && (
          <div style={segmento}>
            {GRIGLIE.map(([, , l], i) => (
              <div key={l} onClick={() => setGriglia(i)} style={{ ...voceSeg, ...(griglia === i ? segAttivo : {}) }}>{l}</div>
            ))}
          </div>
        )}
        {filtriExtra}
      </div>
      {!sostituto && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {FASCE.map(([l], i) => (
            <button key={l} onClick={() => setFascia(i)} style={{ ...chip, ...(fascia === i ? chipAttivo : {}) }}>{l}</button>
          ))}
        </div>
      )}

      {sostituto || (
        <div style={{ display: 'grid', gridTemplateColumns: `${W}px minmax(240px, 1fr)`, gap: 20, alignItems: 'start' }}>
          <div>
            <div style={{ position: 'relative' }}>
              <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', borderRadius: 8 }}>
                <Campo />
                {vista === 'heatmap'
                  ? <Heatmap punti={visibili} colore={lati[lato ?? latoNostro].colore} colonne={GRIGLIE[griglia][0]} righe={GRIGLIE[griglia][1]} />
                  : <>
                      {visibili.filter(d => d.attrs?.pericolosa !== 'si').map((d, i) => <Punto key={`n${i}`} d={d} colore={lati[latoDi(d)]?.colore || '#888'} tipo={tipo} />)}
                      {visibili.filter(d => d.attrs?.pericolosa === 'si').map((d, i) => <Punto key={`p${i}`} d={d} colore={lati[latoDi(d)]?.colore || '#888'} tipo={tipo} />)}
                    </>}
              </svg>
              {direzione && <>
                <div style={{ ...freccia, left: 12, color: direzione.sinistra.colore }}>← {direzione.sinistra.label} attacca</div>
                <div style={{ ...freccia, right: 12, color: direzione.destra.colore }}>{direzione.destra.label} attacca →</div>
              </>}
              {caricamento && <div style={velo}>Caricamento...</div>}
            </div>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)', marginTop: 8, flexWrap: 'wrap' }}>
              {tipo === 'shot' && <span>★ gol</span>}
              {conPericolo && <>
                <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><svg width={16} height={16}><circle cx={8} cy={8} r={6} fill="#888" stroke="white" strokeWidth={2} /></svg>pericolosa (tiro o area entro 15 s)</span>
                <span style={{ display: 'flex', gap: 5, alignItems: 'center' }}><svg width={10} height={10}><circle cx={5} cy={5} r={4} fill="#888" opacity={0.45} /></svg>non pericolosa</span>
              </>}
              <span>{visibili.length} eventi</span>
            </div>
          </div>

          {/* pannello: totali, suddivisioni (colonne di Admin), solo pericolose */}
          <div style={pannello}>
            <div style={rigaPannello(false, true)}>
              <span />{lati.map(l => <span key={l.label} style={{ textAlign: 'right' }}>{l.label.slice(0, 4)}.</span>)}
            </div>
            <div onClick={() => setScelta(null)} style={rigaPannello(!scelta)}>
              <span>Tutti</span>
              {lati.map((l, i) => <span key={i} style={{ textAlign: 'right', color: l.colore, fontWeight: 600 }}>{conta(i, null)}</span>)}
            </div>
            {blocchi.map(b => (
              <div key={b.nome} style={{ marginTop: 6 }}>
                {blocchi.length > 1 && <div style={titoloBlocco}>{NOMI_BLOCCHI[b.nome] || etichetta(b.nome)}</div>}
                {b.righe.map(c => {
                  const on = scelta && scelta.label === c.label && scelta.nome === c.filtro.nome
                  return (
                    <div key={c.label} onClick={() => setScelta(on ? null : { ...c.filtro, label: c.label })} style={rigaPannello(on)}>
                      <span>{c.label}</span>
                      {lati.map((l, i) => <span key={i} style={{ textAlign: 'right', color: l.colore, fontWeight: 600 }}>{conta(i, c.filtro)}</span>)}
                    </div>
                  )
                })}
              </div>
            ))}
            {conPericolo && (
              <div onClick={() => setSoloPericolose(x => !x)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--border)', fontSize: 13, cursor: 'pointer' }}>
                <span>Solo pericolose</span>
                <span style={{ width: 34, height: 19, borderRadius: 10, background: soloPericolose ? '#F97316' : '#334155', position: 'relative' }}>
                  <span style={{ position: 'absolute', top: 2, left: soloPericolose ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: 'white', transition: 'left 0.15s' }} />
                </span>
              </div>
            )}
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.45 }}>
              Clic su una voce per vedere solo quei punti. Le voci si scelgono in Admin → Eventi e statistiche.
              Conta solo gli eventi con una posizione sul campo: i totali della sintesi possono essere di poco più alti.
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// heatmap a tasselli di una squadra: piu' punti, colore piu' pieno, con il numero dentro.
// Griglie: 40 zone (8 x 5, circa 13 x 12 m) e le classiche 18 zone (6 x 3: sinistra / centro / destra)
const GRIGLIE = [[8, 5, '40 zone'], [6, 3, '18 zone']]
function Heatmap({ punti, colore, colonne, righe }) {
  const celle = Array.from({ length: righe }, () => Array(colonne).fill(0))
  for (const d of punti) {
    const c = Math.min(colonne - 1, Math.max(0, Math.floor(d.x / 100 * colonne)))
    const r = Math.min(righe - 1, Math.max(0, Math.floor(d.y / 100 * righe)))
    celle[r][c]++
  }
  const cw = FW / colonne, ch = FH / righe, max = Math.max(1, ...celle.flat())
  return (
    <g>
      <rect x={PAD} y={PAD} width={FW} height={FH} fill="rgba(8,12,24,0.72)" />{/* campo scurito: i colori si leggono */}
      {celle.map((riga, r) => riga.map((n, c) => n ? (
        <g key={`${r}-${c}`}>
          <rect x={PAD + c * cw + 1} y={PAD + r * ch + 1} width={cw - 2} height={ch - 2} rx={4} fill={colore} opacity={0.08 + 0.72 * n / max} />
          <text x={PAD + c * cw + cw / 2} y={PAD + r * ch + ch / 2 + 5} textAnchor="middle" fontSize={15} fontWeight={700} fill="white">{n}</text>
        </g>
      ) : null))}
    </g>
  )
}

function Punto({ d, colore, tipo }) {
  const x = sx(d.x), y = sy(d.y)
  const per = d.attrs?.pericolosa
  const gol = tipo === 'shot' && d.attrs?.outcome === 'gol'
  const linea = d.x2 != null && d.y2 != null && ['cross', 'calcio_piazzato'].includes(tipo)
  return (
    <g>
      <title>{titoloPunto(d)}</title>
      {linea && <line x1={x} y1={y} x2={sx(d.x2)} y2={sy(d.y2)} stroke={colore} strokeWidth={1.2} opacity={0.45} />}
      {gol ? <text x={x} y={y + 6} textAnchor="middle" fontSize={18} fill={colore} stroke="white" strokeWidth={0.8}>★</text>
        : per === 'si' ? <circle cx={x} cy={y} r={7.5} fill={colore} stroke="white" strokeWidth={2} />
        : <circle cx={x} cy={y} r={per === 'no' ? 4.5 : 5.5} fill={colore} opacity={per === 'no' ? 0.45 : 0.8} />}
    </g>
  )
}

function Campo() {
  const L = { stroke: 'rgba(255,255,255,0.75)', strokeWidth: 1.5, fill: 'none' }
  const area = (x0, prof, larg) => <rect x={sx(x0)} y={sy(50 - larg / 2)} width={FW * prof / 100} height={sy(50 + larg / 2) - sy(50 - larg / 2)} {...L} />
  return (
    <g>
      <rect x={0} y={0} width={W} height={H} fill="#1F5E2E" />
      {[...Array(10)].map((_, i) => i % 2 ? <rect key={i} x={PAD + i * FW / 10} y={PAD} width={FW / 10} height={FH} fill="#22663A" /> : null)}
      <rect x={PAD} y={PAD} width={FW} height={FH} {...L} />
      <line x1={W / 2} y1={PAD} x2={W / 2} y2={H - PAD} {...L} />
      <circle cx={W / 2} cy={H / 2} r={FW * 9.15 / 105} {...L} />
      {area(0, 15.7, 59.3)}{area(100 - 15.7, 15.7, 59.3)}
      {area(0, 5.2, 26.9)}{area(100 - 5.2, 5.2, 26.9)}
    </g>
  )
}

const selettore = { display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'space-between', minWidth: 210, padding: '7px 12px',
  borderRadius: 8, border: '1px solid rgba(255,255,255,0.18)', background: 'var(--bg-table, #0B1324)', color: 'var(--text)',
  fontWeight: 600, fontSize: 14, cursor: 'pointer' }
const tendina = { position: 'absolute', top: 42, left: 0, width: 250, zIndex: 20, background: '#0B1324', border: '1px solid rgba(255,255,255,0.18)',
  borderRadius: 10, padding: 8, boxShadow: '0 12px 30px rgba(0,0,0,0.5)' }
const gruppoMenu = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '8px 8px 4px' }
const voceMenu = { padding: '6px 10px', borderRadius: 6, fontSize: 13.5, cursor: 'pointer', color: 'var(--text)' }
const voceAttiva = { background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const segmento = { display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
const voceSeg = { padding: '7px 12px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer',
  borderRight: '1px solid var(--border)', textTransform: 'capitalize' }
const segAttivo = { background: 'rgba(255,255,255,0.06)', color: 'var(--text)' }
const chip = { padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)',
  background: 'transparent', color: '#64748B' }
const chipAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const freccia = { position: 'absolute', top: 6, fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, letterSpacing: '0.05em',
  textTransform: 'uppercase', padding: '2px 8px', borderRadius: 5, background: 'rgba(10,15,28,0.75)' }
const velo = { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,15,28,0.5)',
  color: 'var(--primary)', fontFamily: 'var(--font-display)', borderRadius: 8 }
const pannello = { border: '1px solid var(--border)', borderRadius: 10, padding: 12, fontSize: 13 }
const titoloBlocco = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px 2px' }
const rigaPannello = (on, testa) => ({ display: 'grid', gridTemplateColumns: '1fr 52px 52px', alignItems: 'center', padding: testa ? '0 8px 4px' : '6px 8px',
  borderRadius: 7, cursor: testa ? 'default' : 'pointer', fontSize: testa ? 10.5 : 13, color: testa ? 'var(--text-muted)' : 'var(--text)',
  textTransform: testa ? 'uppercase' : 'none', letterSpacing: testa ? '0.05em' : 0,
  ...(on ? { background: 'rgba(0,229,255,0.08)', outline: '1px solid rgba(0,229,255,0.35)' } : {}) })
