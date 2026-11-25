'use client'
import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetchAPI } from '../../../lib/api'
import { getUser } from '../../../lib/auth'
import { useTenant } from '../../../lib/TenantContext'
import { titoloPunto } from '../../../lib/tempo'
import SintesiGruppi from '../../../components/SintesiGruppi'
import CampoAnalisi from '../../../components/CampoAnalisi'
import { valore } from '../../../lib/sintesi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'

const COLOR_HOME = '#00E5FF'
const COLOR_AWAY = '#CC44FF'

// ─────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem'
    }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600,
        letterSpacing: '0.08em', marginBottom: '1.25rem', color: 'var(--text)',
        textTransform: 'uppercase'
      }}>{title}</h2>
      {children}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
      padding: '0.75rem', textAlign: 'center'
    }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: color || 'var(--text)' }}>
        {value ?? 0}
      </div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  )
}

function GraficoSpeculare({ rows, teamA, teamB }) {
  const maxVal = Math.max(...rows.flatMap(r => [r.a, r.b]), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_HOME, textAlign: 'right', fontWeight: 700 }}>{teamA}</div>
        <div />
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_AWAY, textAlign: 'left', fontWeight: 700 }}>{teamB}</div>
      </div>
      {rows.map(({ label, a, b }) => (
        <div key={label} style={{ display: 'grid', gridTemplateColumns: '1fr 140px 1fr', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_HOME, fontWeight: 700, minWidth: '24px', textAlign: 'right' }}>{a}</span>
            <div style={{ height: '8px', borderRadius: '4px 0 0 4px', background: COLOR_HOME, width: `${(a / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }} />
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {label}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ height: '8px', borderRadius: '0 4px 4px 0', background: COLOR_AWAY, width: `${(b / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_AWAY, fontWeight: 700, minWidth: '24px' }}>{b}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────

// MAPPA TIRI
// ─────────────────────────────────────────
// MAPPA CAMPO GENERICA — qualsiasi event_type
// ─────────────────────────────────────────
// rete dei passaggi: frecce per le coppie con almeno RETE_MIN passaggi riusciti (tutta la partita /
// fascia di 15'); le coppie sotto la soglia restano come linea sottile
const RETE_MIN = { tutta: 3, fascia: 2 }
// fasce di 15' (minuti di gioco), come FASCE_15 nel backend; null = tutta la partita
const RETE_FASCE = [[null, 'Tutta'], [1, "0-15'"], [2, "15-30'"], [3, "30-45'+"], [4, "45-60'"], [5, "60-75'"], [6, "75-90'+"]]

// sotto-filtri della mappa campo: attributo dell'evento, ordine ed etichette dei valori
const SOTTOFILTRI = {
  palla_persa: { attr: 'motivo',
    ordine: ['passaggio sbagliato', 'lancio sbagliato', 'duello o dribbling perso', 'perso in conduzione o contrasto', 'fallo', 'altro'],
    etichette: { 'passaggio sbagliato': 'Pass. sbagliati', 'lancio sbagliato': 'Lanci sbagliati',
      'duello o dribbling perso': 'Duelli/dribbling', 'perso in conduzione o contrasto': 'In conduzione', fallo: 'Falli', altro: 'Altro' } },
  palla_recuperata: { attr: 'come', ordine: ['intercetto', 'contrasto o duello vinto', 'altro'],
    etichette: { intercetto: 'Intercetti', 'contrasto o duello vinto': 'Contrasti/duelli', altro: 'Altro' } },
  cross: { attr: 'origine', ordine: ['azione', 'sviluppo piazzato', 'seconda palla'],
    etichette: { azione: 'Da azione', 'sviluppo piazzato': 'Sviluppo piazzato', 'seconda palla': 'Seconda palla' } },
  calcio_piazzato: { attr: 'tipo', ordine: ['angolo', 'punizione', 'rimessa'],
    etichette: { angolo: 'Angoli', punizione: 'Punizioni', rimessa: 'Rimesse lunghe' } },
}

function MappaCampoV2({ data, eventType, teamA, teamB, sourceFormat, tenant, matchName }) {
  const [filtroTeam, setFiltroTeam] = useState('tutti')
  const [rete, setRete] = useState(null)
  const [fascia, setFascia] = useState(null)
  const norm = t => (t || '').toLowerCase().trim()
  const teamAn = norm(teamA)

  // Passaggi: al posto dei punti la rete (una squadra alla volta, posizione media col pallone)
  const isRete = eventType === 'passaggi'
  // senza scelta: la squadra del tenant (es. mazzola_pro -> mazzola), anche se gioca in trasferta
  const nostraInTrasferta = !!tenant && norm(teamB).includes(norm(tenant).split('_')[0])
  const reteLato = filtroTeam === 'tutti' ? (nostraInTrasferta ? 'away' : 'home') : filtroTeam
  const reteTeam = reteLato === 'away' ? teamB : teamA
  useEffect(() => {
    if (!isRete || !tenant || !matchName) return
    setRete(null)
    fetchAPI(`/v2/analytics/${tenant}/rete_passaggi/${matchName}?team=${encodeURIComponent(norm(reteTeam))}${fascia ? `&fascia=${fascia}` : ''}`)
      .then(setRete)
      .catch(() => setRete({ nodi: [], archi: [] }))
  }, [isRete, tenant, matchName, reteTeam, fascia])

  // sotto-filtri: valori di un attributo dell'evento (gli stessi delle colonne della tabella giocatori)
  // e "solo pericolose" per gli eventi che lo hanno
  const sotto = SOTTOFILTRI[eventType]
  const [valore, setValore] = useState(null)
  const [soloPericolose, setSoloPericolose] = useState(false)
  useEffect(() => { setValore(null); setSoloPericolose(false) }, [eventType])
  const conPericolo = data.some(d => d.attrs?.pericolosa)
  const valori = sotto ? [...new Set(data.map(d => d.attrs?.[sotto.attr]).filter(Boolean))]
    .sort((a, b) => (sotto.ordine.indexOf(a) + 1 || 99) - (sotto.ordine.indexOf(b) + 1 || 99)) : []

  const filtered = data.filter(d => {
    if (valore && d.attrs?.[sotto.attr] !== valore) return false
    if (soloPericolose && d.attrs?.pericolosa !== 'si') return false
    if (filtroTeam === 'home') return norm(d.team) === teamAn
    if (filtroTeam === 'away') return norm(d.team) !== teamAn
    return true
  })

  const nHome = data.filter(d => norm(d.team) === teamAn).length
  const nAway = data.filter(d => norm(d.team) !== teamAn).length

  // campo intero orizzontale (x = lunghezza, y = larghezza): Balloni e Veo; VidSwap = mezzo campo verticale
  const isBalloni = sourceFormat === 'balloni' || sourceFormat === 'veo'
  const W = 580, PAD = 16
  const fw = W - PAD * 2  // 548px
  // Balloni: campo intero orizzontale (105:68) → fh proporzionale
  // VidSwap: mezza campo verticale → H fisso 460
  const fh = isBalloni ? Math.round(fw * 68 / 105) : 428
  const H  = fh + PAD * 2

  const sx = x => PAD + (x / 100) * fw
  const sy = y => PAD + (y / 100) * fh

  const SHOT_COLORS = {
    goal: '#EF4444', gol: '#EF4444',
    save: '#FACC15', in_porta: '#FACC15',
    blocked: '#94A3B8', murato: '#94A3B8',
    wide: '#3B82F6', fuori: '#3B82F6', palo_traversa: '#F97316',
  }
  const CROSS_COLORS = {
    riuscito: '#10B981', completed: '#10B981',
    respinto: '#EF4444', blocked: '#EF4444',
  }

  const getColor = (d) => {
    const isHome = norm(d.team) === teamAn
    // Colore = squadra sempre (per tiri e cross il simbolo encoda l'esito)
    return isHome ? COLOR_HOME : COLOR_AWAY
  }

  const marker = (d, i) => {
    const col = getColor(d)
    const x = sx(d.x ?? 50), y = sy(d.y ?? 50)
    const outcome = (d.attrs?.outcome || d.attrs?.result || '').toLowerCase()

    if (eventType === 'shot') {
      // Simbolo encoda l'esito, colore encoda la squadra
      if (outcome === 'gol' || outcome === 'goal') return (
        <g key={i}>
          <circle cx={x} cy={y} r={9} fill={col} stroke="rgba(255,255,255,0.9)" strokeWidth={1.5} />
          <text x={x} y={y+4} textAnchor="middle" fontSize={11} fill="white" fontWeight="bold">★</text>
        </g>
      )
      if (outcome === 'in_porta' || outcome === 'save') return (
        <circle key={i} cx={x} cy={y} r={6} fill={col} opacity={0.85}
          stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      )
      if (outcome === 'fuori' || outcome === 'wide') {
        const r = 5
        return (
          <g key={i} opacity={0.8}>
            <line x1={x-r} y1={y-r} x2={x+r} y2={y+r} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
            <line x1={x+r} y1={y-r} x2={x-r} y2={y+r} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
          </g>
        )
      }
      if (outcome === 'murato' || outcome === 'blocked') return (
        <rect key={i} x={x-5} y={y-5} width={10} height={10}
          fill={col} opacity={0.85} rx={1} />
      )
      if (outcome === 'palo_traversa') return (
        <polygon key={i} points={`${x},${y-7} ${x+7},${y} ${x},${y+7} ${x-7},${y}`}
          fill={col} opacity={0.85} />
      )
      // esito sconosciuto
      return <circle key={i} cx={x} cy={y} r={4} fill={col} opacity={0.6} />
    }

    if (eventType === 'cross') {
      // Colore = squadra, simbolo = esito, freccia = traiettoria
      const isRiuscito = outcome === 'riuscito' || outcome === 'completed'
      const isRespinto = outcome === 'respinto' || outcome === 'blocked'
      return (
        <g key={i}>
          {d.x2 != null && d.y2 != null && (
            <line x1={x} y1={y} x2={sx(d.x2)} y2={sy(d.y2)}
              stroke={col} strokeWidth={1.5} opacity={0.5}
              strokeDasharray={isRespinto ? '3,2' : 'none'} />
          )}
          {isRespinto ? (
            <g opacity={0.85}>
              <line x1={x-5} y1={y-5} x2={x+5} y2={y+5} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
              <line x1={x+5} y1={y-5} x2={x-5} y2={y+5} stroke={col} strokeWidth={2.5} strokeLinecap="round" />
            </g>
          ) : isRiuscito ? (
            <circle cx={x} cy={y} r={6} fill={col} opacity={0.9}
              stroke="rgba(255,255,255,0.5)" strokeWidth={1} />
          ) : (
            <polygon points={`${x},${y-6} ${x+6},${y+6} ${x-6},${y+6}`}
              fill={col} opacity={0.65} />
          )}
        </g>
      )
    }

    // Altri eventi: cerchio + freccia se presente; con "pericolosa" (palle perse / recuperate):
    // pieno, grande e bordato se pericolosa, piccolo e trasparente se no
    const per = d.attrs?.pericolosa
    return (
      <g key={i}>
        {d.x2 != null && d.y2 != null && (
          <line x1={x} y1={y} x2={sx(d.x2)} y2={sy(d.y2)}
            stroke={col} strokeWidth={1} opacity={0.4} strokeDasharray="3,2" />
        )}
        {per === 'si'
          ? <circle cx={x} cy={y} r={8} fill={col} opacity={0.95} stroke="white" strokeWidth={2} />
          : <circle cx={x} cy={y} r={per === 'no' ? 4.5 : 6} fill={col} opacity={per === 'no' ? 0.45 : 0.75} />}
      </g>
    )
  }

  const ls = { stroke: 'rgba(255,255,255,0.7)', strokeWidth: 1.5, fill: 'none' }

  // ── Balloni: campo intero orizzontale 105×68m ──
  // pmF(xNorm 0-100, yNorm 0-100) → pixel SVG
  // Misure normalizzate sul campo 105×68:
  //   Area grande:  x 0–15.71 / 84.29–100,  y 20.35–79.65
  //   Area piccola: x 0–5.24  / 94.76–100,  y 36.53–63.47
  //   Penalty spot: x 10.48 / 89.52,         y 50
  //   Porta:        x <0 / >100,              y 44.62–55.38
  const pmF = (xn, yn) => ({ x: PAD + (xn / 100) * fw, y: PAD + (yn / 100) * fh })
  const rCentro = (9.15 / 105) * fw

  const balloniField = (
    <>
      {/* Strisce verticali (campo orizzontale) */}
      {Array.from({ length: 10 }, (_, i) => (
        <rect key={i} x={PAD + i * fw / 10} y={PAD} width={fw / 10} height={fh}
          fill={i % 2 === 0 ? '#3d7a2e' : '#437f32'} />
      ))}
      <rect x={PAD} y={PAD} width={fw} height={fh} {...ls} />
      {/* Linea centrocampo */}
      <line x1={pmF(50,0).x} y1={pmF(50,0).y} x2={pmF(50,100).x} y2={pmF(50,100).y}
        stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      {/* Cerchio centrocampo */}
      <circle cx={pmF(50,50).x} cy={pmF(50,50).y} r={rCentro}
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} />
      <circle cx={pmF(50,50).x} cy={pmF(50,50).y} r={2.5} fill="rgba(255,255,255,0.65)" />
      {/* clipPath per lunette */}
      <defs>
        <clipPath id="clipLL">
          <rect x={pmF(15.71,0).x} y={PAD} width={fw - (pmF(15.71,0).x - PAD)} height={fh} />
        </clipPath>
        <clipPath id="clipLR">
          <rect x={PAD} y={PAD} width={pmF(84.29,0).x - PAD} height={fh} />
        </clipPath>
      </defs>
      {/* Area grande sinistra */}
      <rect x={pmF(0,20.35).x} y={pmF(0,20.35).y}
        width={pmF(15.71,20.35).x - pmF(0,20.35).x}
        height={pmF(0,79.65).y - pmF(0,20.35).y} {...ls} fill="rgba(0,0,0,0.05)" />
      {/* Area piccola sinistra */}
      <rect x={pmF(0,36.53).x} y={pmF(0,36.53).y}
        width={pmF(5.24,36.53).x - pmF(0,36.53).x}
        height={pmF(0,63.47).y - pmF(0,36.53).y} {...ls} />
      {/* Penalty spot + lunetta sinistra */}
      <circle cx={pmF(10.48,50).x} cy={pmF(10.48,50).y} r={2.5} fill="rgba(255,255,255,0.65)" />
      <circle cx={pmF(10.48,50).x} cy={pmF(10.48,50).y} r={rCentro}
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} clipPath="url(#clipLL)" />
      {/* Area grande destra */}
      <rect x={pmF(84.29,20.35).x} y={pmF(84.29,20.35).y}
        width={pmF(100,20.35).x - pmF(84.29,20.35).x}
        height={pmF(84.29,79.65).y - pmF(84.29,20.35).y} {...ls} fill="rgba(0,0,0,0.05)" />
      {/* Area piccola destra */}
      <rect x={pmF(94.76,36.53).x} y={pmF(94.76,36.53).y}
        width={pmF(100,36.53).x - pmF(94.76,36.53).x}
        height={pmF(94.76,63.47).y - pmF(94.76,36.53).y} {...ls} />
      {/* Penalty spot + lunetta destra */}
      <circle cx={pmF(89.52,50).x} cy={pmF(89.52,50).y} r={2.5} fill="rgba(255,255,255,0.65)" />
      <circle cx={pmF(89.52,50).x} cy={pmF(89.52,50).y} r={rCentro}
        fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.5} clipPath="url(#clipLR)" />
      {/* Porta sinistra */}
      <rect x={pmF(0,44.62).x - (2.33/100)*fw} y={pmF(0,44.62).y}
        width={(2.33/100)*fw} height={pmF(0,55.38).y - pmF(0,44.62).y}
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
      {/* Porta destra */}
      <rect x={pmF(100,44.62).x} y={pmF(100,44.62).y}
        width={(2.33/100)*fw} height={pmF(100,55.38).y - pmF(100,44.62).y}
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
    </>
  )

  // ── VidSwap: mezza campo verticale (codice originale) ──
  const pm = (xm, ym) => ({ x: PAD + (xm / 68) * fw, y: PAD + (ym / 52.5) * fh })
  const vidswapField = (
    <>
      {Array.from({ length: 8 }, (_, i) => (
        <rect key={i} x={0} y={i * (H / 8)} width={W} height={H / 8}
          fill={i % 2 === 0 ? '#3d7a2e' : '#437f32'} />
      ))}
      <rect x={PAD} y={PAD} width={fw} height={fh} {...ls} />
      <line x1={PAD} y1={pm(0,0).y} x2={W-PAD} y2={pm(0,0).y} stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      <path d={`M ${pm(68*0.35,0).x} ${pm(0,0).y} A ${(9/68)*fw} ${(9/68)*fw} 0 0 0 ${pm(68*0.65,0).x} ${pm(0,0).y}`}
        fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1} />
      <rect x={pm(13.84,36).x} y={pm(13.84,36).y}
        width={pm(54.16,36).x - pm(13.84,36).x}
        height={pm(0,52.5).y - pm(0,36).y} {...ls} fill="rgba(0,0,0,0.05)" />
      <rect x={pm(24.84,46).x} y={pm(24.84,46).y}
        width={pm(43.16,46).x - pm(24.84,46).x}
        height={pm(0,52.5).y - pm(0,46).y} {...ls} />
      <rect x={pm(27.84,52.5).x} y={pm(27.84,52.5).y}
        width={pm(40.16,52.5).x - pm(27.84,52.5).x} height={9}
        fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5} />
      <circle cx={pm(34,41).x} cy={pm(34,41).y} r={2.5} fill="rgba(255,255,255,0.65)" />
    </>
  )

  // Per tiri e cross: legenda a due livelli (colore=squadra, simbolo=esito)
  const shotSymbolLegend = (eventType === 'shot' || eventType === 'cross') ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
      {/* Riga 1: colori squadre */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {[[COLOR_HOME, teamA], [COLOR_AWAY, teamB]].map(([col, label]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
            <svg width={12} height={12}><circle cx={6} cy={6} r={6} fill={col} /></svg>{label}
          </span>
        ))}
      </div>
      {/* Riga 2: simboli esiti */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
        {(eventType === 'cross' ? [
          { svg: <circle cx={6} cy={6} r={6} fill="#888" stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>, label: 'Riuscito' },
          { svg: <><line x1={2} y1={2} x2={10} y2={10} stroke="#888" strokeWidth={2.5} strokeLinecap="round"/><line x1={10} y1={2} x2={2} y2={10} stroke="#888" strokeWidth={2.5} strokeLinecap="round"/></>, label: 'Respinto' },
          { svg: <polygon points="6,0 12,12 0,12" fill="#888" opacity={0.6}/>, label: 'Altro' },
        ] : [
          { svg: <><circle cx={7} cy={7} r={7} fill="#888" stroke="rgba(255,255,255,0.7)" strokeWidth={1}/><text x={7} y={11} textAnchor="middle" fontSize={9} fill="white">★</text></>, label: isBalloni ? 'Gol' : 'Goal' },
          { svg: <circle cx={6} cy={6} r={6} fill="#888" stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>, label: isBalloni ? 'In porta' : 'Save' },
          { svg: <><line x1={2} y1={2} x2={10} y2={10} stroke="#888" strokeWidth={2.5} strokeLinecap="round"/><line x1={10} y1={2} x2={2} y2={10} stroke="#888" strokeWidth={2.5} strokeLinecap="round"/></>, label: isBalloni ? 'Fuori' : 'Wide' },
          { svg: <rect x={1} y={1} width={10} height={10} fill="#888" rx={1}/>, label: isBalloni ? 'Murato' : 'Blocked' },
          { svg: <polygon points="6,0 12,6 6,12 0,6" fill="#888"/>, label: 'Palo/traversa' },
        ]).map(({ svg, label }) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#64748B' }}>
            <svg width={12} height={12}>{svg}</svg>{label}
          </span>
        ))}
      </div>
    </div>
  ) : null

  const reteMin = fascia ? RETE_MIN.fascia : RETE_MIN.tutta
  const reteSvg = (() => {
    if (!isRete || !rete) return null
    const col = reteTeam === teamA ? COLOR_HOME : COLOR_AWAY
    const pos = Object.fromEntries(rete.nodi.map(n => [n.numero, { x: sx(n.x), y: sy(n.y) }]))
    // grandezza relativa alla vista: chi passa di piu' in questa fascia ha il pallino piu' grande
    const pass = rete.nodi.map(n => n.passaggi || 0)
    const minP = Math.min(...pass), maxP = Math.max(...pass)
    const raggio = n => 7 + 15 * Math.sqrt(maxP > minP ? ((n.passaggi || 0) - minP) / (maxP - minP) : 0.5)
    const nodo = Object.fromEntries(rete.nodi.map(n => [n.numero, n]))
    const tutti = rete.archi.filter(a => pos[a.da] && pos[a.a])
    const archi = tutti.filter(a => a.n >= reteMin)
    const deboli = tutti.filter(a => a.n < reteMin)
    const maxN = Math.max(1, ...archi.map(a => a.n))
    const alone = { paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.7)', strokeWidth: 3 }
    return (
      <g>
        <defs>
          <marker id="freccia-rete" viewBox="0 0 10 10" refX={9} refY={5} markerWidth={9} markerHeight={9}
            markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill={col} />
          </marker>
        </defs>
        {deboli.map((a, i) => {
          const p = pos[a.da], q = pos[a.a]
          return <line key={`d${i}`} x1={p.x} y1={p.y} x2={q.x} y2={q.y} stroke={col} strokeWidth={0.8} opacity={0.2} />
        })}
        {archi.map((a, i) => {
          const p = pos[a.da], q = pos[a.a]
          const dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1
          const ox = -dy / L * 3, oy = dx / L * 3          // A->B e B->A affiancate
          const r1 = raggio(nodo[a.da]), r2 = raggio(nodo[a.a]) + 3
          const x1 = p.x + dx / L * r1 + ox, y1 = p.y + dy / L * r1 + oy
          const x2 = q.x - dx / L * r2 + ox, y2 = q.y - dy / L * r2 + oy
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={col} strokeWidth={1 + 5 * a.n / maxN} opacity={0.35 + 0.5 * a.n / maxN}
                strokeLinecap="round" markerEnd="url(#freccia-rete)" />
              {fascia && L > 45 && (   /* numero sulla freccia solo nelle fasce di 15' */
                <text x={(x1 + x2) / 2 + ox * 2.5} y={(y1 + y2) / 2 + oy * 2.5 + 3} textAnchor="middle"
                  fontSize={9} fontWeight="bold" fill="white" style={alone}>{a.n}</text>
              )}
            </g>
          )
        })}
        {rete.nodi.map(n => {
          const { x, y } = pos[n.numero], r = raggio(n)
          const cognome = (n.cognome || (n.nome || '').split(' ')[0]).toUpperCase()   // anagrafica: "Cognome Nome"
          return (
            <g key={n.numero}>
              <title>{`${n.nome || '#' + n.numero}: ${n.passaggi} passaggi (${n.riusciti} riusciti), ${n.ricevuti} ricevuti`}</title>
              {n.subentrato
                ? <circle cx={x} cy={y} r={r} fill={col} fillOpacity={0.35} stroke="white" strokeWidth={1.5} strokeDasharray="3,2" />
                : <circle cx={x} cy={y} r={r} fill={col} opacity={0.9} stroke="white" strokeWidth={1.5} />}
              <text x={x} y={y + 4} textAnchor="middle" fontSize={11} fontWeight="bold" fill={n.subentrato ? 'white' : '#0B1220'}>{n.numero}</text>
              <text x={x + r * 0.75 + 2} y={y - r * 0.75} fontSize={10} fontWeight="bold" fill="#FDE68A" style={alone}>{n.passaggi}</text>
              {cognome && <text x={x} y={y + r + 11} textAnchor="middle" fontSize={9} fill="white"
                style={{ paintOrder: 'stroke', stroke: 'rgba(0,0,0,0.6)', strokeWidth: 2 }}>{cognome}</text>}
            </g>
          )
        })}
      </g>
    )
  })()

  const legendItems = (() => {
    if (eventType === 'shot') return []  // gestita da shotSymbolLegend
    if (eventType === 'cross') return []  // gestita inline sotto
    return [[COLOR_HOME, teamA], [COLOR_AWAY, teamB]]
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignSelf: 'flex-start', alignItems: 'center', width: '100%' }}>
        {[
          ...(isRete ? [] : [{ key: 'tutti', label: 'Entrambe', color: '#94A3B8', n: data.length }]),
          { key: 'home',  label: teamA,      color: COLOR_HOME, n: nHome },
          { key: 'away',  label: teamB,      color: COLOR_AWAY, n: nAway },
        ].map(opt => {
          const attivo = isRete ? opt.key === reteLato : filtroTeam === opt.key
          return (
          <button key={opt.key} onClick={() => setFiltroTeam(opt.key)} style={{
            padding: '6px 16px', borderRadius: 6,
            border: `1.5px solid ${attivo ? opt.color : 'rgba(255,255,255,0.12)'}`,
            background: attivo ? `${opt.color}18` : 'transparent',
            color: attivo ? opt.color : '#64748B',
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 13,
            fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s',
          }}>
            {opt.label} <span style={{ fontWeight: 400, fontSize: 11 }}>({opt.n})</span>
          </button>
          )
        })}
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#475569' }}>
          {isRete ? (rete ? `${rete.archi.filter(a => a.n >= reteMin).length} collegamenti` : 'Caricamento...') : `${filtered.length} eventi`}
        </span>
      </div>

      {isRete && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          {RETE_FASCE.map(([k, label]) => (
            <button key={label} onClick={() => setFascia(k)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${fascia === k ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
              background: fascia === k ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: fascia === k ? 'var(--primary)' : '#64748B',
            }}>{label}</button>
          ))}
        </div>
      )}

      {!isRete && (sotto && valori.length > 1 || conPericolo) && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignSelf: 'flex-start' }}>
          {sotto && valori.length > 1 && [null, ...valori].map(v => (
            <button key={v || 'tutti'} onClick={() => setValore(v)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${valore === v ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
              background: valore === v ? 'rgba(0,229,255,0.1)' : 'transparent',
              color: valore === v ? 'var(--primary)' : '#64748B',
            }}>{v ? (sotto.etichette[v] || v) : 'Tutti'}</button>
          ))}
          {conPericolo && (
            <button onClick={() => setSoloPericolose(x => !x)} style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer',
              border: `1px solid ${soloPericolose ? '#F97316' : 'rgba(255,255,255,0.12)'}`,
              background: soloPericolose ? 'rgba(249,115,22,0.12)' : 'transparent',
              color: soloPericolose ? '#F97316' : '#64748B',
            }}>Solo pericolose</button>
          )}
        </div>
      )}

      {sourceFormat === 'veo' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', width: W, fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--font-display)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {/* Veo: campo girato, la nostra squadra attacca sempre verso destra */}
          <span style={{ color: nostraInTrasferta ? COLOR_HOME : COLOR_AWAY }}>← {nostraInTrasferta ? teamA : teamB} attacca</span>
          <span style={{ color: nostraInTrasferta ? COLOR_AWAY : COLOR_HOME }}>{nostraInTrasferta ? teamB : teamA} attacca →</span>
        </div>
      )}

      <div style={{ borderRadius: 8, overflow: 'hidden', border: '1.5px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 24px rgba(0,0,0,0.5)' }}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
          {isBalloni ? balloniField : vidswapField}
          {isRete ? reteSvg : filtered.map((d, i) => <g key={i}><title>{titoloPunto(d)}</title>{marker(d, i)}</g>)}
        </svg>
      </div>

      {isRete ? (
        <div style={{ fontSize: 11, color: '#64748B', textAlign: 'center', maxWidth: W }}>
          Pallino = posizione media del giocatore {rete?.fonte === 'tracking' ? 'quando la squadra ha il pallone' : '(media dei punti da cui passa)'},
          più grande = più passaggi in questa vista (numero giallo); tratteggiato = entrato a partita in corso.
          Frecce = almeno {reteMin} passaggi riusciti{fascia ? ' (numero sulla freccia)' : ''}, linee sottili = meno.
          {sourceFormat === 'veo' && ' La nostra squadra attacca verso destra, l\'avversaria verso sinistra.'}
          {rete && rete.nodi.length > 0 && (
            <table style={{ margin: '12px auto 0', borderCollapse: 'collapse', fontSize: 12, color: '#CBD5E1' }}>
              <thead>
                <tr style={{ color: '#64748B', textAlign: 'right' }}>
                  <th style={{ textAlign: 'left', padding: '3px 10px' }}>Giocatore</th>
                  <th style={{ padding: '3px 10px' }}>Passaggi</th>
                  <th style={{ padding: '3px 10px' }}>Riusciti</th>
                  <th style={{ padding: '3px 10px' }}>Ricevuti</th>
                </tr>
              </thead>
              <tbody>
                {rete.nodi.map(n => (
                  <tr key={n.numero} style={{ borderTop: '1px solid rgba(255,255,255,0.06)', textAlign: 'right' }}>
                    <td style={{ textAlign: 'left', padding: '3px 10px' }}>
                      {n.numero} {n.nome || ''}{n.subentrato ? ' (sub.)' : ''}
                    </td>
                    <td style={{ padding: '3px 10px' }}>{n.passaggi}</td>
                    <td style={{ padding: '3px 10px' }}>{n.riusciti}</td>
                    <td style={{ padding: '3px 10px' }}>{n.ricevuti}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : shotSymbolLegend || (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 11, color: '#64748B', justifyContent: 'center' }}>
          {legendItems.map(([col, label]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={10} height={10}><circle cx={5} cy={5} r={5} fill={col} /></svg>{label}
            </span>
          ))}
          {conPericolo && <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={18} height={18}><circle cx={9} cy={9} r={7} fill="#888" stroke="white" strokeWidth={2} /></svg>pericolosa (tiro o area entro 15 s)
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={10} height={10}><circle cx={5} cy={5} r={4.5} fill="#888" opacity={0.45} /></svg>non pericolosa
            </span>
          </>}
        </div>
      )}
    </div>
  )
}


function MappaTiriV2({ data, teamA, teamB }) {
  const [filtroTeam, setFiltroTeam] = useState('home')
  const norm = t => (t || '').toLowerCase().trim()
  const teamAn = norm(teamA)
  const nHome = data.filter(d => norm(d.team) === teamAn).length
  const nAway = data.filter(d => norm(d.team) !== teamAn).length
  const filtered = data.filter(d =>
    filtroTeam === 'home' ? norm(d.team) === teamAn : norm(d.team) !== teamAn
  )

  const W=580, H=460, PAD=16
  const fw=W-PAD*2, fh=H-PAD*2

  // Coordinate DB v2: x=0-100, y=0-100
  // → x_pitch_half = x/100*80 (larghezza 0-80)
  // → y_pitch_half = y/100*60 (profondità 0-60, 60=porta)
  // SVG: x_ph mappato su larghezza, y_ph=60 → fondo SVG (porta in basso)
  const sx = x => PAD + ((x/100)*80 / 80) * fw
  const sy = y => PAD + ((y/100)*60 / 60) * fh

  const C = { goal:'#EF4444', save:'#FACC15', blocked:'#94A3B8', wide:'#3B82F6' }
  const marker = (d, i) => {
    const esito = (d.attrs?.result || d.result || d.esito || 'wide').toLowerCase()
    const x = sx(d.x ?? 50), y = sy(d.y ?? 75)
    const col = C[esito] || C.wide
    if (esito==='goal') return <circle key={i} cx={x} cy={y} r={7} fill={col} stroke="rgba(255,255,255,0.6)" strokeWidth={1.5}/>
    if (esito==='save') return <circle key={i} cx={x} cy={y} r={6} fill={col} stroke="rgba(255,255,255,0.3)" strokeWidth={1}/>
    if (esito==='blocked') return (
      <g key={i}>
        <circle cx={x} cy={y} r={5} fill={col} opacity={0.8}/>
        <line x1={x-3} y1={y-3} x2={x+3} y2={y+3} stroke="white" strokeWidth={1.2} opacity={0.7}/>
        <line x1={x+3} y1={y-3} x2={x-3} y2={y+3} stroke="white" strokeWidth={1.2} opacity={0.7}/>
      </g>
    )
    return <circle key={i} cx={x} cy={y} r={5} fill={col} opacity={0.6}/>
  }

  // Campo reale: 80x60m (mezza campo)
  // Porta: larghezza 7.32m, centrata in x=40 → x da 36.34 a 43.66, y=60
  // Area piccola: 18.32x5.5m → x da 30.84 a 49.16, y da 54.5 a 60
  // Area grande: 40.32x16.5m → x da 19.84 a 60.16, y da 43.5 a 60
  // Punto rigore: x=40, y=49 (11m dalla porta)
  // Centrocampo: y=0 (bordo superiore)
  const ls = {stroke:'rgba(255,255,255,0.7)', strokeWidth:1.5, fill:'none'}

  // Helper: converti coordinate pitch (xm 0-80, ym 0-60) in SVG
  const pm = (xm, ym) => ({
    x: PAD + (xm/80)*fw,
    y: PAD + (ym/60)*fh
  })

  const NH=8
  const stripes = Array.from({length:NH}, (_,i) => (
    <rect key={i} x={0} y={i*(H/NH)} width={W} height={H/NH} fill={i%2===0?'#3d7a2e':'#437f32'}/>
  ))

  return (
    <div style={{display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
      <div style={{display:'flex',gap:8,alignSelf:'flex-start',alignItems:'center',width:'100%'}}>
        {[
          {key:'home',label:teamA,color:'#00E5FF',n:nHome},
          {key:'away',label:teamB,color:'#CC44FF',n:nAway},
        ].map(opt => (
          <button key={opt.key} onClick={()=>setFiltroTeam(opt.key)} style={{
            padding:'6px 18px', borderRadius:6,
            border:`1.5px solid ${filtroTeam===opt.key?opt.color:'rgba(255,255,255,0.12)'}`,
            background:filtroTeam===opt.key?`${opt.color}18`:'transparent',
            color:filtroTeam===opt.key?opt.color:'#64748B',
            cursor:'pointer',fontFamily:'var(--font-display,"Barlow Condensed",sans-serif)',
            fontSize:13,fontWeight:700,letterSpacing:'0.06em',
            textTransform:'uppercase',transition:'all 0.15s',
          }}>
            {opt.label} <span style={{fontWeight:400,fontSize:11}}>({opt.n})</span>
          </button>
        ))}
        <span style={{marginLeft:'auto',fontSize:11,color:'#475569'}}>{filtered.length} tiri</span>
      </div>

      <div style={{borderRadius:8,overflow:'hidden',border:'1.5px solid rgba(255,255,255,0.15)',boxShadow:'0 4px 24px rgba(0,0,0,0.5)'}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{display:'block'}}>
          {stripes}
          {/* Bordo campo */}
          <rect x={PAD} y={PAD} width={fw} height={fh} {...ls}/>
          {/* Linea centrocampo — bordo superiore (y=0) */}
          <line x1={PAD} y1={pm(0,0).y} x2={W-PAD} y2={pm(0,0).y} stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
          {/* Semicerchio centrocampo */}
          <path d={`M ${pm(40-12,0).x} ${pm(0,0).y} A ${(12/80)*fw} ${(12/80)*fw} 0 0 0 ${pm(40+12,0).x} ${pm(0,0).y}`}
            fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={1}/>
          {/* Area grande: x 19.84-60.16, y 43.5-60 */}
          <rect x={pm(19.84,43.5).x} y={pm(19.84,43.5).y}
            width={pm(60.16,43.5).x-pm(19.84,43.5).x}
            height={pm(19.84,60).y-pm(19.84,43.5).y}
            {...ls} fill="rgba(0,0,0,0.05)"/>
          {/* Area piccola: x 30.84-49.16, y 54.5-60 */}
          <rect x={pm(30.84,54.5).x} y={pm(30.84,54.5).y}
            width={pm(49.16,54.5).x-pm(30.84,54.5).x}
            height={pm(30.84,60).y-pm(30.84,54.5).y}
            {...ls}/>
          {/* Porta: x 36.34-43.66, sotto y=60 */}
          <rect x={pm(36.34,60).x} y={pm(36.34,60).y}
            width={pm(43.66,60).x-pm(36.34,60).x} height={9}
            fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.7)" strokeWidth={1.5}/>
          {/* Punto rigore: x=40, y=49 */}
          <circle cx={pm(40,49).x} cy={pm(40,49).y} r={2.5} fill="rgba(255,255,255,0.65)"/>
          {/* Lunetta: centrata su x=40,y=43.5, r=6m, solo parte fuori area */}
          <defs><clipPath id="clipLun">
            <rect x={0} y={PAD} width={W} height={pm(40,43.5).y-PAD}/>
          </clipPath></defs>
          <path d={`M ${pm(40-6,43.5).x} ${pm(40,43.5).y} A ${(6/80)*fw} ${(6/80)*fw} 0 0 1 ${pm(40+6,43.5).x} ${pm(40,43.5).y}`}
            fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} clipPath="url(#clipLun)"/>
          {filtered.map((d,i) => marker(d,i))}
        </svg>
      </div>

      <div style={{display:'flex',gap:16,flexWrap:'wrap',fontSize:11,color:'#64748B',justifyContent:'center'}}>
        {[['#EF4444','Goal'],['#FACC15','Save'],['#94A3B8','Blocked'],['#3B82F6','Wide']].map(([col,label])=>(
          <span key={label} style={{display:'flex',alignItems:'center',gap:5}}>
            <svg width={10} height={10}><circle cx={5} cy={5} r={5} fill={col}/></svg>{label}
          </span>
        ))}
      </div>
    </div>
  )
}


// ─────────────────────────────────────────
// PAGINA
// ─────────────────────────────────────────
export default function PartitaPage() {
  const { match_name }  = useParams()
  const searchParams    = useSearchParams()
  const { tagVisibili, tagLabel } = useTenant()   // tipi di evento visibili e nomi (Admin -> Tipi di evento)

  // Tenant: priorità all'utente loggato, fallback alla URL
  const urlTenant = searchParams.get('tenant') || 'mazzola'
  const [user,      setUser]      = useState(null)
  const [userReady, setUserReady] = useState(false)
  useEffect(() => { setUser(getUser()); setUserReady(true) }, [])
  const tenant    = (user?.role !== 'admin' && user?.tenant) ? user.tenant : urlTenant

  const [partita,          setPartita]          = useState(null)
  const [aggregati,        setAggregati]        = useState([])
  const [hasGiocatori,     setHasGiocatori]     = useState(false)
  const [loading,          setLoading]          = useState(true)
  const [tab,              setTab]              = useState('sintesi')
  const [tipiCoordinate,   setTipiCoordinate]   = useState([])
  const [mappaEventType,   setMappaEventType]   = useState(null)
  const [mappaData,        setMappaData]        = useState([])
  const [mappaLoading,     setMappaLoading]     = useState(false)
  const [giocatoriData,    setGiocatoriData]    = useState([])
  const [giocatoriLoaded,  setGiocatoriLoaded]  = useState(false)
  const [colConfig,        setColConfig]        = useState({})

  // colonne di Admin -> Eventi e statistiche: il pannello del campo usa le stesse
  useEffect(() => {
    if (!tenant || !userReady) return
    fetchAPI(`/v2/analytics/${tenant}/column_config`).then(r => setColConfig(r.config || {})).catch(() => {})
  }, [tenant, userReady])

  useEffect(() => {
    if (!match_name || !userReady) return
    Promise.all([
      fetchAPI(`/v2/analytics/${tenant}/report/${match_name}`),
      fetchAPI(`/v2/analytics/${tenant}/mappa/${match_name}/tipi`).catch(() => ({ tipi: [] })),
    ]).then(([report, tipi]) => {
      setPartita(report.partita)
      setAggregati(report.aggregati || [])
      setHasGiocatori(report.has_giocatori || false)
      const ts = tipi.tipi || []
      setTipiCoordinate(ts)
      if (ts.length > 0) setMappaEventType(ts.includes('shot') ? 'shot' : ts[0])
      // Se /tipi non disponibile, mappaEventType verrà impostato sotto da tipiEffettivi
      setLoading(false)
    }).catch(err => { console.error(err); setLoading(false) })
  }, [match_name, tenant, userReady])

  // Inizializza mappaEventType dal fallback quando /tipi non è disponibile
  useEffect(() => {
    if (mappaEventType) return // già impostato da /tipi
    const fallback = aggregati.filter(a => a.totale > 0).map(a => a.event_type)
      .find(et => ['shot','cross','corner','gkout','freekick'].includes(et))
    if (fallback) setMappaEventType(fallback)
  }, [aggregati])

  // Carica dati mappa quando cambia event type
  useEffect(() => {
    if (!mappaEventType || !match_name || !userReady) return
    setMappaLoading(true)
    fetchAPI(`/v2/analytics/${tenant}/mappa/${match_name}?event_type=${mappaEventType}`)
      .then(res => { setMappaData(res.data || []); setMappaLoading(false) })
      .catch(() => setMappaLoading(false))
  }, [mappaEventType, match_name, tenant, userReady])

  // Fetch giocatori — lazy, solo quando si apre il tab
  useEffect(() => {
    if (tab !== 'giocatori' || giocatoriLoaded || !match_name || !userReady) return
    fetchAPI(`/v2/analytics/${tenant}/giocatori/${match_name}`)
      .then(res => { setGiocatoriData(res.data || []); setGiocatoriLoaded(true) })
      .catch(() => setGiocatoriLoaded(true))
  }, [tab, match_name, tenant, userReady, giocatoriLoaded])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>CARICAMENTO...</div>
    </div>
  )

  if (!partita) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Partita non trovata</div>
  )

  const teamA = partita.home_team || ''
  const teamB = partita.away_team || ''
  // Mostra solo le tab con dati effettivi negli aggregati
  const eventiPresenti = new Set(aggregati.filter(a => a.totale > 0).map(a => a.event_type))

  // Fallback mappa: se /tipi non è ancora disponibile, usa gli event type dagli aggregati
  const tipiEffettivi = tagVisibili(tipiCoordinate.length > 0
    ? tipiCoordinate
    : [...eventiPresenti].filter(et => ['shot','cross','corner','gkout','freekick'].includes(et)))
  const hasMappaData = tipiEffettivi.length > 0

  // partite Veo: tre tab (sintesi a gruppi, campo con pannello, giocatori); altri formati come prima
  const isVeo = partita?.source_format === 'veo'
  const norm = t => (t || '').toLowerCase().trim()
  const nostraInTrasferta = norm(teamB).includes(norm(tenant).split('_')[0])
  const TABS = isVeo ? ['sintesi', ...(hasMappaData ? ['campo'] : []), ...(hasGiocatori ? ['giocatori'] : [])] : [
    'sintesi',
    ...(eventiPresenti.has('shot')                                  ? ['tiri']          : []),
    ...(hasMappaData                                                 ? ['mappa campo']   : []),
    ...(eventiPresenti.has('passaggi')                              ? ['passaggi']      : []),
    ...(eventiPresenti.has('cross') || eventiPresenti.has('lanci')  ? ['cross']         : []),
    ...(eventiPresenti.has('calcio_piazzato')                       ? ['calci piazzati'] : []),
    ...(['duelli', 'duel', 'dribbling', 'palle recuperate', 'palla_recuperata'].some(e => eventiPresenti.has(e)) ? ['duelli'] : []),
    ...(hasGiocatori                                                 ? ['giocatori']     : []),
  ]

  // Palle recuperate / perse e duelli vinti: Veo (palla_recuperata, palla_persa, duel con esito) o
  // vecchi formati (palle recuperate / duelli senza squadra, con extra per squadra)
  const recuperate = team => agg('palla_recuperata', team).totale ?? aggNoTeam('palle recuperate').extra?.[`recuperate_${team}`] ?? 0
  const perse = team => agg('palla_persa', team).totale ?? 0
  const pericolose = (et, team) => agg(et, team).extra?.pericolose ?? 0
  const duelliVinti = team => aggNoTeam('duelli').extra?.[`vinti_${team}`] ?? agg('duel', team).completati ?? 0
  const haPerse = eventiPresenti.has('palla_persa')

  // Helper aggregati
  const agg = (eventType, team, period = 'Totale') =>
    aggregati.find(a => a.event_type === eventType && a.team === team && a.period === period) || {}

  const aggNoTeam = (eventType, period = 'Totale') =>
    aggregati.find(a => a.event_type === eventType && a.period === period) || {}

  // Goal da extra
  const goalA  = agg('shot', teamA).extra?.goal  ?? 0
  const goalB  = agg('shot', teamB).extra?.goal  ?? 0

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      <Link href={`/?tenant=${tenant}`} style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← Dashboard
      </Link>

      {/* Header partita */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {partita.date ? new Date(partita.date).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
            <span style={{ color: COLOR_HOME }}>{teamA}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 0.75rem' }}>vs</span>
            <span style={{ color: COLOR_AWAY }}>{teamB}</span>
          </div>
          {partita.category && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {partita.category}
            </div>
          )}
        </div>
        {/* Risultato */}
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_HOME, lineHeight: 1 }}>{goalA}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Goal {teamA}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_AWAY, lineHeight: 1 }}>{goalB}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Goal {teamB}</div>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.5rem 1rem', borderRadius: '8px',
            border: `1px solid ${tab === t ? 'var(--primary)' : 'var(--border)'}`,
            background: tab === t ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
            color: tab === t ? 'var(--primary)' : 'var(--text-muted)',
            cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem',
            fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', transition: 'all 0.2s'
          }}>{t}</button>
        ))}
      </div>

      {/* ── TAB: SINTESI (Veo: a gruppi, clic su una riga -> campo) ── */}
      {tab === 'sintesi' && isVeo && (
        <Section title="Sintesi Partita">
          <SintesiGruppi nomi={[teamA, teamB]} colori={[COLOR_HOME, COLOR_AWAY]}
            v={(lato, et, k) => valore(agg(et, lato === 0 ? teamA : teamB), k)}
            onApri={et => { if (tipiEffettivi.includes(et)) { setMappaEventType(et); setTab('campo') } }} />
        </Section>
      )}

      {/* ── TAB: CAMPO (Veo): menu degli eventi, squadre, fasce, pannello con le colonne di Admin ── */}
      {tab === 'campo' && (
        <Section title="Campo">
          <CampoAnalisi eventi={mappaData} tipi={tipiEffettivi} tipo={mappaEventType} onTipo={setMappaEventType}
            nomeTipo={tagLabel} caricamento={mappaLoading} latoNostro={nostraInTrasferta ? 1 : 0}
            colonne={colConfig[mappaEventType] || []}
            lati={[{ label: teamA, colore: COLOR_HOME, appartiene: d => norm(d.team) === norm(teamA) },
                   { label: teamB, colore: COLOR_AWAY, appartiene: d => norm(d.team) !== norm(teamA) }]}
            direzione={nostraInTrasferta
              ? { sinistra: { label: teamA, colore: COLOR_HOME }, destra: { label: teamB, colore: COLOR_AWAY } }
              : { sinistra: { label: teamB, colore: COLOR_AWAY }, destra: { label: teamA, colore: COLOR_HOME } }}
            sostituto={mappaEventType === 'passaggi'
              ? <MappaCampoV2 data={mappaData} eventType="passaggi" teamA={teamA} teamB={teamB} sourceFormat={partita?.source_format} tenant={tenant} matchName={match_name} />
              : null} />
        </Section>
      )}

      {/* ── TAB: SINTESI ── */}
      {tab === 'sintesi' && !isVeo && (
        <Section title="Sintesi Partita">
          <GraficoSpeculare
            teamA={teamA} teamB={teamB}
            rows={[
              { label: 'Tiri Totali',    a: agg('shot', teamA).totale  ?? 0, b: agg('shot', teamB).totale  ?? 0 },
              { label: 'Nello Specchio', a: agg('shot', teamA).extra?.nello_specchio ?? 0, b: agg('shot', teamB).extra?.nello_specchio ?? 0 },
              { label: 'Goal',           a: goalA, b: goalB },
              { label: 'Fuori',          a: agg('shot', teamA).extra?.fuori ?? 0, b: agg('shot', teamB).extra?.fuori ?? 0 },
              { label: 'Passaggi',       a: agg('passaggi', teamA).totale ?? 0, b: agg('passaggi', teamB).totale ?? 0 },
              { label: 'Pass. Completati', a: agg('passaggi', teamA).completati ?? 0, b: agg('passaggi', teamB).completati ?? 0 },
              { label: 'Cross',          a: agg('cross', teamA).totale ?? 0, b: agg('cross', teamB).totale ?? 0 },
              { label: 'Corner',         a: agg('corner', teamA).totale ?? 0, b: agg('corner', teamB).totale ?? 0 },
              { label: 'Dribbling',      a: agg('dribbling', teamA).totale ?? 0, b: agg('dribbling', teamB).totale ?? 0 },
              { label: 'Falli',          a: agg('disciplina', teamA).extra?.falli ?? 0, b: agg('disciplina', teamB).extra?.falli ?? 0 },
              { label: 'Ammonizioni',    a: agg('disciplina', teamA).extra?.ammonizioni ?? 0, b: agg('disciplina', teamB).extra?.ammonizioni ?? 0 },
              { label: 'Duelli Vinti',   a: duelliVinti(teamA), b: duelliVinti(teamB) },
              { label: 'Palle Recup.',   a: recuperate(teamA), b: recuperate(teamB) },
              ...(haPerse ? [{ label: 'Palle Perse', a: perse(teamA), b: perse(teamB) }] : []),
            ]}
          />
        </Section>
      )}

      {/* ── TAB: TIRI ── */}
      {tab === 'tiri' && (
        <Section title="Analisi Tiri">
          {[teamA, teamB].map((team, i) => {
            const a = agg('shot', team)
            const aPT = agg('shot', team, 'Primo_Tempo')
            const aST = agg('shot', team, 'Secondo_Tempo')
            const color = i === 0 ? COLOR_HOME : COLOR_AWAY
            return (
              <div key={team} style={{ marginBottom: '1.5rem' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>
                  {team}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem' }}>
                  <StatBox label="Tiri Totali"    value={a.totale}              color={color} />
                  <StatBox label="Nello Specchio" value={a.extra?.nello_specchio} color={color} />
                  <StatBox label="Goal"           value={a.extra?.goal}         color={color} />
                  <StatBox label="Fuori"          value={a.extra?.fuori}        color={color} />
                  <StatBox label="Specchio PT"    value={aPT.completati}        color={color} />
                  <StatBox label="Specchio ST"    value={aST.completati}        color={color} />
                  <StatBox label="% Specchio"     value={a.percentuale ? a.percentuale + '%' : '0%'} color={color} />
                </div>
              </div>
            )
          })}
        </Section>
      )}

      {/* ── TAB: MAPPA CAMPO ── */}
      {tab === 'mappa campo' && (
        <Section title="Mappa Campo">
          {tipiEffettivi.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nessuna coordinata disponibile per questa partita.</div>
          ) : (
            <>
              {/* Selettore event type */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {tipiEffettivi.map(et => (
                  <button key={et} onClick={() => setMappaEventType(et)} style={{
                    padding: '0.35rem 0.9rem', borderRadius: 6,
                    border: `1px solid ${mappaEventType === et ? 'var(--primary)' : 'var(--border)'}`,
                    background: mappaEventType === et ? 'rgba(0,229,255,0.1)' : 'transparent',
                    color: mappaEventType === et ? 'var(--primary)' : 'var(--text-muted)',
                    cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.8rem',
                    fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', transition: 'all 0.15s',
                  }}>{tagLabel(et)}</button>
                ))}
              </div>
              {mappaLoading ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Caricamento...</div>
              ) : (
                <MappaCampoV2 data={mappaData} eventType={mappaEventType} teamA={teamA} teamB={teamB} sourceFormat={partita?.source_format} tenant={tenant} matchName={match_name} />
              )}
            </>
          )}
        </Section>
      )}

      {/* ── TAB: PASSAGGI ── */}
      {tab === 'passaggi' && (
        <Section title="Passaggi">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            {[teamA, teamB].map((team, i) => {
              const a   = agg('passaggi', team)
              const aPT = agg('passaggi', team, 'Primo_Tempo')
              const aST = agg('passaggi', team, 'Secondo_Tempo')
              const color = i === 0 ? COLOR_HOME : COLOR_AWAY
              return (
                <div key={team}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <StatBox label="Totali"      value={a.totale}      color={color} />
                    <StatBox label="Completati"  value={a.completati}  color={color} />
                    <StatBox label="% Comp."     value={a.percentuale ? a.percentuale + '%' : '0%'} color={color} />
                    <StatBox label="Comp. PT"    value={aPT.completati} color={color} />
                    <StatBox label="Comp. ST"    value={aST.completati} color={color} />
                  </div>
                </div>
              )
            })}
          </div>
          {/* Grafico confronto */}
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={[
                { label: 'Totali', [teamA]: agg('passaggi', teamA).totale ?? 0, [teamB]: agg('passaggi', teamB).totale ?? 0 },
                { label: 'Completati', [teamA]: agg('passaggi', teamA).completati ?? 0, [teamB]: agg('passaggi', teamB).completati ?? 0 },
              ]}
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="label" tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px' }} />
              <Bar dataKey={teamA} fill={COLOR_HOME} radius={[4,4,0,0]} />
              <Bar dataKey={teamB} fill={COLOR_AWAY} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Section>
      )}

      {/* ── TAB: CROSS & LANCI ── */}
      {tab === 'cross' && (() => {
        // origine dei cross (Veo): extra "azione", "sviluppo_<piazzato>", "seconda_palla_<piazzato>"
        const origine = (team, pref) => Object.entries(agg('cross', team).extra || {})
          .filter(([k]) => k.startsWith(pref)).reduce((t, [, v]) => t + (v || 0), 0)
        const haOrigine = [teamA, teamB].some(t => origine(t, 'azione') + origine(t, 'sviluppo') + origine(t, 'seconda_palla') > 0)
        const haLanci = eventiPresenti.has('lanci')
        return (
          <Section title="Cross">
            <GraficoSpeculare
              teamA={teamA} teamB={teamB}
              rows={[
                { label: 'Cross Totali',     a: agg('cross', teamA).totale     ?? 0, b: agg('cross', teamB).totale     ?? 0 },
                { label: 'Cross Riusciti',   a: agg('cross', teamA).completati ?? 0, b: agg('cross', teamB).completati ?? 0 },
                ...(haOrigine ? [
                  { label: 'Da azione',                     a: origine(teamA, 'azione'),        b: origine(teamB, 'azione') },
                  { label: 'Sviluppo calcio piazzato',      a: origine(teamA, 'sviluppo'),      b: origine(teamB, 'sviluppo') },
                  { label: 'Seconda palla calcio piazzato', a: origine(teamA, 'seconda_palla'), b: origine(teamB, 'seconda_palla') },
                ] : []),
                ...(haLanci ? [
                  { label: 'Lanci Totali',     a: agg('lanci', teamA).totale     ?? 0, b: agg('lanci', teamB).totale     ?? 0 },
                  { label: 'Lanci Completati', a: agg('lanci', teamA).completati ?? 0, b: agg('lanci', teamB).completati ?? 0 },
                ] : []),
              ]}
            />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
              {[teamA, teamB].map((team, i) => {
                const color = i === 0 ? COLOR_HOME : COLOR_AWAY
                const cross = agg('cross', team)
                const lanci = agg('lanci', team)
                return (
                  <div key={team}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                      <StatBox label="Cross"          value={cross.totale}      color={color} />
                      <StatBox label="Cross Riusciti" value={cross.completati}  color={color} />
                      <StatBox label="Cross %"        value={cross.percentuale ? cross.percentuale + '%' : '0%'} color={color} />
                      {haOrigine && <StatBox label="Da azione" value={origine(team, 'azione')} color={color} />}
                      {haLanci && <StatBox label="Lanci"       value={lanci.totale}      color={color} />}
                      {haLanci && <StatBox label="Lanci Comp." value={lanci.completati}  color={color} />}
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )
      })()}

      {/* ── TAB: CALCI PIAZZATI (Veo: angoli, punizioni entro 60 m, rimesse lunghe in attacco) ── */}
      {tab === 'calci piazzati' && (() => {
        const ex = (team, k) => agg('calcio_piazzato', team).extra?.[k] ?? 0
        const righe = [
          ['Calci piazzati', t => agg('calcio_piazzato', t).totale ?? 0],
          ['Angoli', t => ex(t, 'angolo')],
          ['Punizioni', t => ex(t, 'punizione')],
          ['Rimesse lunghe', t => ex(t, 'rimessa')],
          ['Battuta diretta in area', t => ex(t, 'diretta')],
          ['Battuta corta', t => ex(t, 'corta')],
          ['Tiro diretto', t => ex(t, 'tiro_diretto')],
          ['Primo tocco di un compagno', t => agg('calcio_piazzato', t).completati ?? 0],
          ['Con tiro', t => ex(t, 'con_tiro')],
        ]
        return (
          <Section title="Calci piazzati in attacco">
            <GraficoSpeculare teamA={teamA} teamB={teamB}
              rows={righe.map(([label, f]) => ({ label, a: f(teamA), b: f(teamB) }))} />
            <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '1rem' }}>
              Angoli, punizioni entro 60 m dalla porta attaccata e rimesse laterali lunghe (dalla trequarti fino in area).
              "Con tiro" = tiro della stessa squadra nello stesso possesso entro 15 s. I cross nati da un calcio piazzato
              battuto corto o dalla seconda palla sono nel tab Cross.
            </p>
          </Section>
        )
      })()}

      {/* ── TAB: DUELLI ── */}
      {tab === 'duelli' && (
        <Section title="Duelli, Palle Recuperate e Perse">
          <GraficoSpeculare
            teamA={teamA} teamB={teamB}
            rows={[
              { label: 'Duelli Vinti',     a: duelliVinti(teamA), b: duelliVinti(teamB) },
              { label: 'Palle Recuperate', a: recuperate(teamA),  b: recuperate(teamB) },
              ...(haPerse ? [
                { label: 'Recup. pericolose', a: pericolose('palla_recuperata', teamA), b: pericolose('palla_recuperata', teamB) },
                { label: 'Palle Perse',       a: perse(teamA), b: perse(teamB) },
                { label: 'Perse pericolose',  a: pericolose('palla_persa', teamA), b: pericolose('palla_persa', teamB) },
              ] : []),
              { label: 'Dribbling',        a: agg('dribbling', teamA).totale ?? 0,                          b: agg('dribbling', teamB).totale ?? 0 },
              { label: 'Drib. Riusciti',   a: agg('dribbling', teamA).completati ?? 0,                      b: agg('dribbling', teamB).completati ?? 0 },
            ]}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
            {[teamA, teamB].map((team, i) => {
              const color = i === 0 ? COLOR_HOME : COLOR_AWAY
              const dribb = agg('dribbling', team)
              return (
                <div key={team}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 700, color, marginBottom: '0.75rem' }}>{team}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    <StatBox label="Duelli Vinti"   value={duelliVinti(team)}                          color={color} />
                    <StatBox label="Palle Recup."   value={recuperate(team)}                           color={color} />
                    {haPerse && <StatBox label="Palle Perse" value={perse(team)}                       color={color} />}
                    <StatBox label="Dribbling"      value={dribb.totale     ?? 0}                      color={color} />
                    <StatBox label="Drib. Riusciti" value={dribb.completati ?? 0}                      color={color} />
                    <StatBox label="Drib. %"        value={dribb.percentuale ? dribb.percentuale + '%' : '0%'} color={color} />
                  </div>
                </div>
              )
            })}
          </div>
        </Section>
      )}

      {tab === 'giocatori' && (
        <Section title="Statistiche Giocatori">
          {!giocatoriLoaded ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Caricamento...</div>
          ) : (
            <GiocatoriTab data={giocatoriData} homeTeam={teamA} awayTeam={teamB} tenant={tenant} />
          )}
        </Section>
      )}
    </div>
  )
}


const SUB_COLS_FALLBACK = {
  shot:     [['tot','totale'],['gol','gol'],['sp.','in_porta'],['mut.','murato'],['f.','fuori'],['area','in_area'],['f.area','fuori_area'],['dx','destro'],['sx','sinistro'],['↑','testa']],
  cross:    [['tot','totale'],['rius.','riuscito'],['resp.','respinto'],['area','in_area'],['f.area','fuori_area'],['dx','destro'],['sx','sinistro']],
  freekick: [['tot','totale']],
  corner:   [['tot','totale']],
  gkout:    [['tot','totale']],
}

const RUOLO_COLOR_TAB = { POR: '#F59E0B', DIF: '#3B82F6', CEN: '#10B981', ATT: '#EF4444' }

function GiocatoriTab({ data, homeTeam, awayTeam, tenant }) {
  const norm = t => (t || '').toLowerCase().trim()
  const { tagVisibili, tagLabel } = useTenant()   // tipi di evento: visibilità, nome e ordine (Admin)
  const [colConfig, setColConfig] = useState({})
  const [activeView, setActiveView] = useState('events')

  useEffect(() => {
    if (!tenant) return
    fetchAPI(`/v2/analytics/${tenant}/column_config`)
      .then(d => setColConfig(d.config || {}))
      .catch(() => setColConfig({}))
  }, [tenant])

  const hasPerformance = data.some(p => p.performance != null)

  // Tipi evento presenti nei dati
  // (senza colonne visibili in Admin → Colonne Giocatori il tipo non compare)
  const eventTypes = tagVisibili([...new Set(data.flatMap(p => Object.keys(p.events || {})))].sort())
    .filter(et => getCols(et).length > 0)

  function getCols(et) {
    const cfg = colConfig[et]
    if (cfg && cfg.length > 0) return cfg.filter(c => c.visibile).map(c => [c.label, c.nome])
    return SUB_COLS_FALLBACK[et] || [['tot', 'totale']]
  }

  const renderTable = (players, color) => {
    if (players.length === 0) return <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Nessun dato</div>
    return (
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th rowSpan={2} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color, fontFamily: 'var(--font-display)', letterSpacing: '0.06em', fontSize: '0.75rem' }}>#</th>
              {eventTypes.map(et => (
                <th key={et} colSpan={getCols(et).length}
                  style={{ padding: '0.3rem 0.4rem', textAlign: 'center', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem', borderLeft: '1px solid var(--border)' }}>
                  {tagLabel(et)}
                </th>
              ))}
            </tr>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              {eventTypes.flatMap(et => getCols(et).map(([label], ci) => (
                <th key={et+label} style={{ padding: '0.25rem 0.4rem', textAlign: 'right', color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.65rem', borderLeft: ci === 0 ? '1px solid var(--border)' : 'none' }}>
                  {label}
                </th>
              )))}
            </tr>
          </thead>
          <tbody>
            {players.map(p => (
              <tr key={p.player} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {p.ruolo && (
                      <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${RUOLO_COLOR_TAB[p.ruolo]}22`, color: RUOLO_COLOR_TAB[p.ruolo], border: `1px solid ${RUOLO_COLOR_TAB[p.ruolo]}55`, fontFamily: 'var(--font-display)' }}>{p.ruolo}</span>
                    )}
                    <span style={{ color, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.player}</span>
                  </div>
                </td>
                {eventTypes.flatMap(et => getCols(et).map(([label, field], ci) => {
                  const val = p.events[et]?.[field] ?? 0
                  const isGoal = field === 'gol' && val > 0
                  return (
                    <td key={et+label} style={{
                      padding: '0.4rem 0.5rem', textAlign: 'right',
                      color: isGoal ? '#EF4444' : val > 0 ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: isGoal ? 700 : val > 0 ? 500 : 400,
                      borderLeft: ci === 0 ? '1px solid var(--border)' : 'none',
                    }}>
                      {val > 0 ? val : <span style={{ opacity: 0.3 }}>—</span>}
                    </td>
                  )
                }))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  const RUOLO_ORDER = { POR: 0, DIF: 1, CEN: 2, ATT: 3 }
  const sortByRuolo = (a, b) => {
    const ra = RUOLO_ORDER[a.ruolo] ?? 9
    const rb = RUOLO_ORDER[b.ruolo] ?? 9
    if (ra !== rb) return ra - rb
    return (parseInt(a.player) || 99) - (parseInt(b.player) || 99)
  }
  const homePlayers = data.filter(p => norm(p.team) === norm(homeTeam)).sort(sortByRuolo)
  const awayPlayers = data.filter(p => norm(p.team) !== norm(homeTeam))
    .sort((a, b) => (parseInt(a.player) || 99) - (parseInt(b.player) || 99))
  const perfPlayers = data.filter(p => p.performance != null).sort(sortByRuolo)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Tab switcher */}
      {hasPerformance && (
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {[['events', 'Statistiche'], ['performance', 'Performance']].map(([id, label]) => (
            <button key={id} onClick={() => setActiveView(id)} style={{
              padding: '0.4rem 1rem', borderRadius: '8px', border: `1px solid ${activeView === id ? (id === 'performance' ? '#10B981' : 'var(--primary)') : 'var(--border)'}`,
              background: activeView === id ? (id === 'performance' ? 'rgba(16,185,129,0.1)' : 'rgba(0,229,255,0.1)') : 'transparent',
              color: activeView === id ? (id === 'performance' ? '#10B981' : 'var(--primary)') : 'var(--text-muted)',
              cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.06em',
            }}>{label}</button>
          ))}
        </div>
      )}

      {activeView === 'events' ? (
        <>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: COLOR_HOME, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {homeTeam}
            </div>
            {renderTable(homePlayers, COLOR_HOME)}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 700, color: COLOR_AWAY, marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {awayTeam}
            </div>
            {renderTable(awayPlayers, COLOR_AWAY)}
          </div>
        </>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Giocatore', 'Min', 'Km', 'Vel. media', 'Vel. max', 'Sprint', 'Corse A.I.'].map(h => (
                  <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: h === 'Giocatore' ? 'left' : 'right', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.65rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfPlayers.map((p, i) => {
                const pf = p.performance
                return (
                  <tr key={`${p.team}-${p.player}`} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                    <td style={{ padding: '0.4rem 0.6rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        {p.ruolo && (
                          <span style={{ fontSize: '0.6rem', fontWeight: 700, padding: '1px 5px', borderRadius: 3, background: `${RUOLO_COLOR_TAB[p.ruolo]}22`, color: RUOLO_COLOR_TAB[p.ruolo], border: `1px solid ${RUOLO_COLOR_TAB[p.ruolo]}55`, fontFamily: 'var(--font-display)' }}>{p.ruolo}</span>
                        )}
                        <span style={{ color: COLOR_HOME, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.player}</span>
                      </div>
                    </td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text)', fontWeight: 600 }}>{pf?.minuti ?? '—'}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text)' }}>{pf?.distanza_km != null ? `${pf.distanza_km}` : '—'}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>{pf?.velocita_media_kmh != null ? `${pf.velocita_media_kmh} km/h` : '—'}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>{pf?.velocita_massima_kmh != null ? `${pf.velocita_massima_kmh} km/h` : '—'}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>{pf?.sprint ?? '—'}</td>
                    <td style={{ padding: '0.4rem 0.6rem', textAlign: 'right', color: 'var(--text-muted)' }}>{pf?.corse_alta_intensita ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
