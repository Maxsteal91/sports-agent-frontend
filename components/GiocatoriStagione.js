'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { fetchAPI } from '../lib/api'
import { useTenant } from '../lib/TenantContext'
import CampoAnalisi from './CampoAnalisi'
import { GRUPPI_EVENTI, etichetta, percento } from '../lib/sintesi'
import { daIndirizzo, scriviVista } from '../lib/vista'

// Sezione Giocatori per i tenant con partite Veo, la nostra squadra sulla stagione:
//   tabella   voci di Admin raggruppate per evento, presenze / titolare / minuti, Totali o Per 90',
//             filtri ruolo e partite (tutte / casa / trasferta / ultime 5); spunta 2-3 giocatori -> confronto
//   scheda    del giocatore: Sintesi (tot, per 90', quota della squadra, di cui, partita per partita),
//             Campo (tutti i suoi eventi della stagione), Andamento (partita per partita)
//   confronto un campo per giocatore (stesso evento, stessa scala) e la tabella delle voci
// I numeri: /giocatori (eventi), /conteggi?giocatore= (per partita), /mappa_stagione?player= (punti).
const NOI = '#00E5FF', COLORI = ['#FFFFFF', '#FDE047', '#4ADE80']   // colori per riconoscere i giocatori nel confronto (i punti restano azzurri)
const RUOLO = { POR: '#EAB308', DIF: '#3B82F6', CEN: '#22C55E', ATT: '#EF4444' }
const ORDINE_RUOLO = { POR: 0, DIF: 1, CEN: 2, ATT: 3 }
const FILTRI = [['tutte', 'Tutte'], ['casa', 'Casa'], ['trasferta', 'Trasferta'], ['ultime5', 'Ultime 5']]
const MIN_90 = 180            // per 90': il migliore si calcola solo su chi ha giocato almeno questi minuti
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const cognome = nome => { const w = (nome || '').split(' '); return w.length > 1 ? w.slice(0, -1).join(' ') : w[0] }
const dec = (x, k = 1) => x == null ? null : Number(x).toFixed(k).replace('.', ',')
const data = d => d ? `${d.slice(8, 10)}/${MESI[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}` : ''

// scelteEsterne: partite gia' filtrate dalla pagina Stagione (tab Giocatori): niente filtro proprio
export default function GiocatoriStagione({ tenant, categoria, partite, noi, scelteEsterne }) {
  const { tagVisibili, tagLabel } = useTenant()
  const n = (noi || '').toLowerCase()
  const [colConfig, setColConfig] = useState({})
  const [filtro, setFiltro] = useState('tutte')
  const [ruolo, setRuolo] = useState(null)
  const [per90, setPer90] = useState(false)
  const [righe, setRighe] = useState([])
  const [ordine, setOrdine] = useState(null)
  // scheda aperta (s) e giocatori del confronto (gg) ripresi dall'indirizzo e scritti a ogni cambio (lib/vista.js)
  const ggIniziali = (daIndirizzo('gg') || '').split(',').filter(Boolean).slice(0, 3)
  const [spuntati, setSpuntati] = useState(ggIniziali)  // nome_norm per il confronto
  const [vista, setVista] = useState(() => daIndirizzo('s') ? { tipo: 'scheda', g: daIndirizzo('s') }
    : ggIniziali.length >= 2 ? { tipo: 'confronto' } : { tipo: 'tabella' })   // tabella | scheda {g} | confronto
  useEffect(() => {
    scriviVista({ s: vista.tipo === 'scheda' ? vista.g : null, gg: vista.tipo === 'confronto' ? spuntati.join(',') : null,
      ...(vista.tipo === 'scheda' ? {} : { st: null }) })
  }, [vista.tipo, vista.g, spuntati.join(',')])

  const elenco = useMemo(() => [...partite].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    .map(p => ({ ...p, casa: (p.home_team || '').toLowerCase() === n, avversario: (p.home_team || '').toLowerCase() === n ? p.away_team : p.home_team })), [partite, n])
  const scelte = scelteEsterne || elenco.filter(p => filtro === 'casa' ? p.casa : filtro === 'trasferta' ? !p.casa : true).slice(filtro === 'ultime5' ? -5 : 0)
  const listaPartite = scelte.map(p => p.match_name).join(',')
  const catParam = categoria ? `&category=${categoria}` : ''

  useEffect(() => { fetchAPI(`/v2/analytics/${tenant}/column_config`).then(r => setColConfig(r.config || {})).catch(() => {}) }, [tenant])
  useEffect(() => {
    if (!listaPartite) return
    fetchAPI(`/v2/analytics/${tenant}/giocatori?team=${encodeURIComponent(n)}&partite=${encodeURIComponent(listaPartite)}${catParam}`)
      .then(r => setRighe((r.data || []).filter(p => (p.team || '').toLowerCase() === n))).catch(() => setRighe([]))
  }, [tenant, listaPartite, n, categoria])

  const minuti = p => p.performance?.minuti || 0
  const val = (p, et, nome) => Number(p.events?.[et]?.[nome] ?? 0)
  const mostra = (p, v) => per90 ? (minuti(p) ? (v * 90 / minuti(p)) : 0) : v
  const eventi = tagVisibili([...new Set(righe.flatMap(p => Object.keys(p.events || {})))]).filter(et => (colConfig[et] || []).some(c => c.visibile))
  const colonne = et => (colConfig[et] || []).filter(c => c.visibile)
  const visibili = righe.filter(p => !ruolo || p.ruolo === ruolo).filter(p => p.presenze || minuti(p))
  const eleggibile = p => !per90 || minuti(p) >= MIN_90
  const massimo = {}
  for (const et of eventi) for (const c of colonne(et))
    massimo[`${et}|${c.nome}`] = Math.max(0, ...visibili.filter(eleggibile).map(p => mostra(p, val(p, et, c.nome))))
  const ordinate = [...visibili].sort((a, b) => ordine
    ? mostra(b, val(b, ordine.et, ordine.nome)) - mostra(a, val(a, ordine.et, ordine.nome))
    : (ORDINE_RUOLO[a.ruolo] ?? 9) - (ORDINE_RUOLO[b.ruolo] ?? 9) || minuti(b) - minuti(a))
  const fmt = v => per90 ? (v ? v.toFixed(1).replace('.', ',') : '·') : (v || '·')

  const comuni = { tenant, catParam, scelte, colonne, colConfig, eventi, righe, tagLabel, n, noi, listaPartite, minuti, val }
  const barra = (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
      {vista.tipo !== 'tabella' && <span onClick={() => setVista({ tipo: 'tabella' })} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>← tabella</span>}
      {!scelteEsterne && <>
        <div style={segmento}>
          {FILTRI.map(([k, l]) => <div key={k} onClick={() => setFiltro(k)} style={{ ...voceSeg, ...(filtro === k ? segAttivo : {}) }}>{l}</div>)}
        </div>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{scelte.length} partite</span>
      </>}
    </div>
  )

  if (vista.tipo === 'scheda') {
    const g = righe.find(p => p.nome_norm === vista.g)
    if (g) return <div>{barra}<Scheda g={g} {...comuni} /></div>
  }
  if (vista.tipo === 'confronto') {
    const gg = spuntati.map(k => righe.find(p => p.nome_norm === k)).filter(Boolean)
    if (gg.length >= 2) return <div>{barra}<Confronto gg={gg} {...comuni} /></div>
  }

  return (
    <div>
      {barra}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={segmento}>
          {[[false, 'Totali'], [true, "Per 90'"]].map(([k, l]) => <div key={l} onClick={() => setPer90(k)} style={{ ...voceSeg, ...(per90 === k ? segAttivo : {}) }}>{l}</div>)}
        </div>
        <div style={segmento}>
          {[null, 'POR', 'DIF', 'CEN', 'ATT'].map(r => <div key={r || 'tutti'} onClick={() => setRuolo(r)} style={{ ...voceSeg, ...(ruolo === r ? segAttivo : {}) }}>{r || 'Tutti'}</div>)}
        </div>
        {spuntati.length >= 2 && (
          <button onClick={() => setVista({ tipo: 'confronto' })} style={bottone}>Confronta {spuntati.length} giocatori →</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {ordine ? <span onClick={() => setOrdine(null)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>ordina per ruolo ✕</span>
            : `ordinata per ruolo · clic su un'intestazione per ordinare${per90 ? ` · migliore con almeno ${MIN_90}'` : ''}`}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, ...fisso }} />
              <th colSpan={3} style={{ ...thGruppo, ...sep }}>Presenze</th>
              {eventi.map(et => <th key={et} colSpan={colonne(et).length} style={{ ...thGruppo, ...sep }}>{etichetta(tagLabel(et))}</th>)}
              <th colSpan={2} style={{ ...thGruppo, ...sep }}>Fisico</th>
            </tr>
            <tr>
              <th style={{ ...th, ...fisso, textAlign: 'left' }}>Giocatore</th>
              <th style={{ ...th, ...sep }}>Pres.</th><th style={th}>Tit.</th><th style={th}>Min</th>
              {eventi.flatMap(et => colonne(et).map((c, i) => (
                <th key={et + c.nome} onClick={() => setOrdine({ et, nome: c.nome })} style={{ ...th, ...(i === 0 ? sep : {}), cursor: 'pointer',
                  color: ordine?.et === et && ordine?.nome === c.nome ? 'var(--primary)' : undefined }}>{c.label}</th>
              )))}
              <th style={{ ...th, ...sep }}>{per90 ? "Km/90'" : 'Km'}</th><th style={th}>V.max</th>
            </tr>
          </thead>
          <tbody>
            {ordinate.map(p => {
              const pf = p.performance || {}, spunta = spuntati.includes(p.nome_norm)
              return (
                <tr key={p.nome_norm} style={{ background: spunta ? 'rgba(0,229,255,0.06)' : undefined }}>
                  <td style={{ ...td, ...fisso, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={spunta} title="Confronta"
                      onChange={() => setSpuntati(s => spunta ? s.filter(x => x !== p.nome_norm) : s.length < 3 ? [...s, p.nome_norm] : s)}
                      style={{ marginRight: 8, verticalAlign: 'middle', cursor: 'pointer' }} />
                    <span onClick={() => setVista({ tipo: 'scheda', g: p.nome_norm })} style={{ cursor: 'pointer' }}>
                      {p.ruolo && <span style={{ ...badge, background: `${RUOLO[p.ruolo]}22`, color: RUOLO[p.ruolo] }}>{p.ruolo}</span>}
                      {p.player}
                    </span>
                  </td>
                  <td style={{ ...td, ...sep }}>{p.presenze ?? '·'}</td><td style={td}>{p.titolare ?? '·'}</td><td style={td}>{minuti(p) || '·'}</td>
                  {eventi.flatMap(et => colonne(et).map((c, k) => {
                    const v = mostra(p, val(p, et, c.nome)), top = v > 0 && eleggibile(p) && Math.abs(v - massimo[`${et}|${c.nome}`]) < 1e-9
                    return <td key={et + c.nome} style={{ ...td, ...(k === 0 ? sep : {}), color: top ? 'var(--primary)' : v ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: top ? 700 : 400 }}>{fmt(v)}</td>
                  }))}
                  <td style={{ ...td, ...sep }}>{pf.distanza_km != null ? (per90 ? fmt(mostra(p, pf.distanza_km)) : dec(pf.distanza_km)) : '·'}</td>
                  <td style={td}>{dec(pf.velocita_massima_kmh) ?? '·'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
        Colonne = voci scelte in Admin → Eventi e statistiche. {per90 ? "Per 90': ogni numero diviso per i minuti giocati × 90. " : ''}
        In azzurro il migliore. Clic su un nome → la scheda della stagione; spunta 2 o 3 giocatori → confronto.
      </div>
    </div>
  )
}

// ── scheda del giocatore sulla stagione ──────────────────────────────────
function Scheda({ g, tenant, catParam, scelte, colonne, eventi, righe, tagLabel, n, noi, listaPartite, minuti }) {
  const [tab, setTab] = useState(() => ['campo', 'andamento'].includes(daIndirizzo('st')) ? daIndirizzo('st') : 'sintesi')
  const [tipo, setTipo] = useState(null)
  const [perPartita, setPerPartita] = useState({})     // et -> {match_name: totale} (sintesi)
  useEffect(() => { scriviVista({ st: tab === 'sintesi' ? null : tab, ...(tipo ? { ev: tipo } : {}) }) }, [tab, tipo])
  const min = minuti(g), pf = g.performance || {}
  const suoi = eventi.filter(et => g.events?.[et]?.totale)
  const totale = et => righe.reduce((s, x) => s + Number(x.events?.[et]?.totale ?? 0), 0)
  useEffect(() => { const ev = daIndirizzo('ev'); setTipo(suoi.includes(ev) ? ev : suoi[0] || null) }, [g.nome_norm])
  useEffect(() => {    // partita per partita di ogni suo evento (mini-barre della sintesi)
    let vivo = true
    Promise.all(suoi.map(et => fetchAPI(`/v2/analytics/${tenant}/conteggi?event_type=${encodeURIComponent(et)}&giocatore=${encodeURIComponent(g.nome_norm)}${catParam}`)
      .then(r => [et, Object.fromEntries((r.data || []).map(x => [x.match_name, x.totale]))]).catch(() => [et, {}])))
      .then(ris => { if (vivo) setPerPartita(Object.fromEntries(ris)) })
    return () => { vivo = false }
  }, [g.nome_norm, suoi.join(',')])
  const gruppi = GRUPPI_EVENTI.map(([gr, ets]) => [gr, ets.filter(et => suoi.includes(et))])
  const altri = suoi.filter(et => !GRUPPI_EVENTI.some(([, ets]) => ets.includes(et)))
  if (altri.length) gruppi.push(['Altro', altri])
  const amm = Number(g.events?.disciplina?.ammonizione || 0), esp = Number(g.events?.disciplina?.espulsione || 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {g.ruolo && <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color: RUOLO[g.ruolo], lineHeight: 1 }}>{g.ruolo}</div>}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text)' }}>{g.player}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {g.presenze} presenze ({g.titolare} da titolare) · {min}' giocati{amm ? ` · ${amm} ${amm === 1 ? "ammonizione" : "ammonizioni"}` : ''}{esp ? ` · ${esp} ${esp === 1 ? "espulsione" : "espulsioni"}` : ''}
            {g.events?.shot?.gol ? ` · ${g.events.shot.gol} gol` : ''}
          </div>
        </div>
      </div>
      {pf.minuti && (
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', padding: '10px 4px', margin: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[['Minuti', min ? `${min}'` : null], ['Km', dec(pf.distanza_km)], ["Km / 90'", pf.distanza_km != null && min ? (pf.distanza_km * 90 / min).toFixed(1).replace('.', ',') : null],
            ['Vel. media', pf.velocita_media_kmh != null ? `${dec(pf.velocita_media_kmh)} km/h` : null], ['Vel. massima', pf.velocita_massima_kmh != null ? `${dec(pf.velocita_massima_kmh)} km/h` : null],
            ['Sprint', pf.sprint], ['Alta intensità', pf.corse_alta_intensita]].filter(([, v]) => v != null).map(([k, v]) => (
            <div key={k}><div style={kpiLab}>{k}</div><b style={{ fontSize: 15, color: 'var(--text)' }}>{v}</b></div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {[['sintesi', 'Sintesi'], ['campo', 'Campo'], ['andamento', 'Andamento']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...tabStile, ...(tab === k ? tabAttivo : {}) }}>{l}</button>
        ))}
      </div>

      {tab === 'sintesi' && (
        <div>
          <div style={{ ...rigaSintesi, fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span /><span style={{ textAlign: 'right' }}>Tot</span><span style={{ textAlign: 'right' }}>per 90'</span><span>quota della squadra</span><span>partita per partita · di cui</span>
          </div>
          {gruppi.filter(([, ets]) => ets.length).map(([gr, ets]) => (
            <div key={gr}>
              <div style={gruppoStile}>{gr}</div>
              {ets.map(et => {
                const v = Number(g.events[et].totale), t = totale(et), pp = perPartita[et] || {}
                const dicui = colonne(et).filter(c => c.filtro && Number(g.events[et][c.nome] ?? 0) > 0).map(c => `${g.events[et][c.nome]} ${c.label.toLowerCase()}`)
                const valori = scelte.map(p => pp[p.match_name] || 0), mx = Math.max(1, ...valori)
                return (
                  <div key={et} onClick={() => { setTipo(et); setTab('andamento') }} title="Partita per partita" style={{ ...rigaSintesi, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13.5 }}>{etichetta(tagLabel(et))}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: NOI, textAlign: 'right' }}>{v}</span>
                    <span style={{ fontSize: 12.5, textAlign: 'right' }}>{min ? (v * 90 / min).toFixed(1).replace('.', ',') : '–'}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${t ? Math.round(100 * v / t) : 0}%`, borderRadius: 5, background: NOI }} />
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 34 }}>{percento(v, t)}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 10, alignItems: 'center' }}>
                      <svg width={scelte.length * 9} height={22} style={{ flex: 'none' }}>
                        {valori.map((x, i) => <rect key={i} x={i * 9} y={22 - 20 * x / mx} width={6} height={Math.max(1, 20 * x / mx)} fill={NOI} opacity={x ? 0.8 : 0.2} />)}
                      </svg>
                      <span>{dicui.join(' · ')}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
            Quota = suo totale sul totale della squadra nelle partite scelte; mini-barre = partita per partita. Clic su una riga → l'andamento di quell'evento.
          </div>
        </div>
      )}
      {tab === 'campo' && tipo && (
        <CampoGiocatori gg={[g]} tipo={tipo} setTipo={setTipo} tipi={suoi} {...{ tenant, catParam, scelte, colonne, tagLabel, n, noi }} />
      )}
      {tab === 'andamento' && tipo && (
        <Andamento g={g} tipo={tipo} setTipo={setTipo} tipi={suoi} {...{ tenant, catParam, scelte, colonne, tagLabel }} />
      )}
    </div>
  )
}

// campo della stagione di uno o piu' giocatori (punti da mappa_stagione?player=, riconosciuti per nome)
function CampoGiocatori({ gg, tipo, setTipo, tipi, tenant, catParam, scelte, colonne, tagLabel, noi }) {
  const [punti, setPunti] = useState([])
  const [carica, setCarica] = useState(false)
  const nomiPartite = new Set(scelte.map(p => p.match_name))
  useEffect(() => {
    let vivo = true
    setCarica(true)
    Promise.all(gg.map((g, i) => fetchAPI(`/v2/analytics/${tenant}/mappa_stagione?event_type=${encodeURIComponent(tipo)}&player=${encodeURIComponent(g.nome_norm)}${catParam}`)
      .then(r => (r.data || []).map(d => ({ ...d, _g: i }))).catch(() => [])))
      .then(ris => { if (vivo) { setPunti(ris.flat()); setCarica(false) } })
    return () => { vivo = false }
  }, [tipo, gg.map(g => g.nome_norm).join(',')])
  return (
    <CampoAnalisi eventi={punti.filter(d => nomiPartite.has(d.match_name))} tipi={tipi} tipo={tipo} onTipo={setTipo}
      nomeTipo={tagLabel} caricamento={carica} colonne={colonne(tipo).length ? colonne(tipo) : []}
      affiancati={gg.length >= 2}
      lati={gg.map((g, i) => ({ label: cognome(g.player), corto: cognome(g.player), colore: NOI, tinta: gg.length === 1 ? NOI : COLORI[i], appartiene: d => d._g === i }))}
      direzione={{ sinistra: { label: 'Avversari', colore: '#CC44FF' }, destra: { label: noi, colore: NOI } }} />
  )
}

// andamento del giocatore: l'evento partita per partita (voci di Admin, totali o per 90')
function Andamento({ g, tipo, setTipo, tipi, tenant, catParam, scelte, colonne, tagLabel }) {
  const [dati, setDati] = useState({ data: [], partite_giocatore: {} })
  const [voce, setVoce] = useState(null)
  const [per90, setPer90] = useState(false)
  useEffect(() => {
    setVoce(null)
    fetchAPI(`/v2/analytics/${tenant}/conteggi?event_type=${encodeURIComponent(tipo)}&giocatore=${encodeURIComponent(g.nome_norm)}${catParam}`)
      .then(r => setDati({ data: r.data || [], partite_giocatore: r.partite_giocatore || {} })).catch(() => {})
  }, [tipo, g.nome_norm])
  const voci = [{ label: 'Tot', filtro: null }, ...colonne(tipo).filter(c => c.filtro)]
    .filter(c => !c.filtro || dati.data.some(r => c.filtro.valori.some(v => r.conteggi[`${c.filtro.nome}=${v}`])))
  const scelta = voci.find(c => c.label === voce) || voci[0]
  const conta = (mn, c) => dati.data.filter(r => r.match_name === mn)
    .reduce((s, r) => s + (c.filtro ? c.filtro.valori.reduce((t, v) => t + (r.conteggi[`${c.filtro.nome}=${v}`] || 0), 0) : r.totale), 0)
  const info = mn => dati.partite_giocatore[mn] || {}
  const giocata = mn => info(mn).minuti || info(mn).entra != null
  const mostra = (mn, x) => per90 ? (info(mn).minuti ? +(x * 90 / info(mn).minuti).toFixed(1) : 0) : x
  const nome = p => `${p.casa ? '' : '@ '}${etichetta(p.avversario)} ${data(p.date)}`
  const grafico = scelte.map(p => ({ partita: nome(p), valore: giocata(p.match_name) ? mostra(p.match_name, conta(p.match_name, scelta)) : null }))
  const minutiPartita = mn => { const i = info(mn); return i.titolare === false ? `entrato ${i.entra}'` : i.esce != null ? `uscito ${i.esce}'` : '' }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
        {tipi.map(et => <button key={et} onClick={() => setTipo(et)} style={{ ...chip, ...(tipo === et ? chipAttivo : {}) }}>{etichetta(tagLabel(et))}</button>)}
        <div style={{ ...segmento, marginLeft: 'auto' }}>
          {[[false, 'Totali'], [true, "Per 90'"]].map(([k, l]) => <div key={l} onClick={() => setPer90(k)} style={{ ...voceSeg, ...(per90 === k ? segAttivo : {}) }}>{l}</div>)}
        </div>
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
        {etichetta(tagLabel(tipo))}{scelta?.filtro ? ` · ${scelta.label}` : ''}{per90 ? " (per 90')" : ''} — partita per partita
      </div>
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={grafico} margin={{ top: 5, right: 10, left: 0, bottom: 55 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="partita" tick={{ fill: '#7A8BA8', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
          <Tooltip contentStyle={{ background: '#0F1729', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Bar dataKey="valore" name={g.player} fill={NOI} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, textAlign: 'left' }}>Data</th><th style={{ ...th, textAlign: 'left' }}>Partita</th><th style={th}>Min</th>
              {voci.map(c => (
                <th key={c.label} onClick={() => setVoce(c.label)} style={{ ...th, cursor: 'pointer', color: scelta?.label === c.label ? 'var(--primary)' : undefined,
                  borderBottom: scelta?.label === c.label ? '2px solid var(--primary)' : '2px solid transparent' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {scelte.map(p => {
              const ok = giocata(p.match_name)
              return (
                <tr key={p.match_name} style={{ opacity: ok ? 1 : 0.4 }}>
                  <td style={{ ...td, textAlign: 'left', color: 'var(--text-muted)' }}>{data(p.date)}</td>
                  <td style={{ ...td, textAlign: 'left' }}><Link href={`/partita/${p.match_name}?tenant=${tenant}`} style={{ color: 'var(--text)' }}>{p.casa ? '' : '@ '}{etichetta(p.avversario)}</Link></td>
                  <td style={td}>{ok ? <>{info(p.match_name).minuti ?? '·'}<small style={{ color: 'var(--text-muted)', marginLeft: 4 }}>{minutiPartita(p.match_name)}</small></> : 'non giocata'}</td>
                  {voci.map(c => {
                    const x = mostra(p.match_name, conta(p.match_name, c))
                    return <td key={c.label} style={{ ...td, fontWeight: scelta?.label === c.label ? 700 : 400, color: scelta?.label === c.label ? NOI : 'var(--text)' }}>{ok ? (per90 ? String(x).replace('.', ',') : x) : '·'}</td>
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>Clic su una colonna = quella voce nel grafico; clic su una partita = la sua pagina.</div>
    </div>
  )
}

// ── confronto di 2-3 giocatori sulla stagione: strip con tutti gli eventi, campi affiancati ──
function Confronto({ gg, tenant, catParam, scelte, colonne, eventi, tagLabel, n, noi, minuti }) {
  const tipi = eventi.filter(et => gg.some(g => g.events?.[et]?.totale))
  const [tipo, setTipo] = useState(() => tipi.includes(daIndirizzo('ev')) ? daIndirizzo('ev') : tipi[0])
  useEffect(() => { if (tipo) scriviVista({ ev: tipo }) }, [tipo])
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 }}>
        {gg.map((g, i) => <span key={g.nome_norm} style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12.5, border: `1px solid ${COLORI[i]}`, color: COLORI[i] }}>
          {g.player} · {minuti(g)}'</span>)}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 10 }}>
        {tipi.map(et => (
          <span key={et} onClick={() => setTipo(et)} style={{ ...chip, display: 'inline-flex', gap: 6, ...(tipo === et ? chipAttivo : {}) }}>
            {etichetta(tagLabel(et))}
            {gg.map((g, i) => <b key={i} style={{ color: COLORI[i] }}>{g.events?.[et]?.totale || 0}</b>)
              .reduce((acc, el, i) => i ? [...acc, <span key={`s${i}`} style={{ color: 'var(--text-muted)' }}>·</span>, el] : [el], [])}
          </span>
        ))}
      </div>
      {tipo && <CampoGiocatori gg={gg} tipo={tipo} setTipo={setTipo} tipi={tipi} {...{ tenant, catParam, scelte, colonne, tagLabel, n, noi }} />}
    </div>
  )
}

const segmento = { display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
const voceSeg = { padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer', borderRight: '1px solid var(--border)' }
const segAttivo = { background: 'rgba(255,255,255,0.06)', color: 'var(--text)' }
const th = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, padding: '5px 7px', textAlign: 'right', whiteSpace: 'nowrap' }
const thGruppo = { ...th, textAlign: 'center', color: '#94A3B8', borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }
const td = { padding: '6px 7px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)', fontVariantNumeric: 'tabular-nums' }
const sep = { borderLeft: '1px solid var(--border)' }
const fisso = { position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }
const badge = { display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, marginRight: 6 }
const bottone = { fontSize: 13, color: 'var(--primary)', border: '1px solid rgba(0,229,255,0.4)', borderRadius: 8, padding: '6px 12px', background: 'transparent', cursor: 'pointer' }
const kpiLab = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tabStile = { padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }
const tabAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const chip = { padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748B' }
const chipAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const gruppoStile = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '14px 0 6px', paddingBottom: 5, borderBottom: '1px solid var(--border)' }
const rigaSintesi = { display: 'grid', gridTemplateColumns: '160px 60px 60px 1fr 340px', alignItems: 'center', gap: 12, padding: '5px 4px', borderRadius: 8 }
