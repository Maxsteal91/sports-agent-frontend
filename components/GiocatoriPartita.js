'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '../lib/api'
import { useTenant } from '../lib/TenantContext'
import { GRUPPI_EVENTI, etichetta, percento } from '../lib/sintesi'
import { daIndirizzo, scriviVista } from '../lib/vista'
import CampoAnalisi from './CampoAnalisi'

// Giocatori di una partita Veo: tabella d'insieme (colonne = voci di Admin, raggruppate per evento) e,
// con un clic su un giocatore, la sua scheda (voci a gruppi con la quota sul totale della squadra).
//   squadre  [{label, colore, team}] (team = nome in minuscolo come negli eventi); nostra = indice della nostra
//   onConfronta([{numero, nome, lato, chiave}]) apre il Campo con 2-3 giocatori spuntati (confronto, come nella stagione)
const RUOLO = { POR: '#EAB308', DIF: '#3B82F6', CEN: '#22C55E', ATT: '#EF4444' }
const ORDINE_RUOLO = { POR: 0, DIF: 1, CEN: 2, ATT: 3 }
const TEMPI = [['Totale', 'Tutti'], ['Primo_Tempo', '1° tempo'], ['Secondo_Tempo', '2° tempo']]

// schedaIniziale: nome_norm della scheda da aprire (vista arrivata dalla stagione o da un'altra partita); onScheda(k) a ogni cambio
export default function GiocatoriPartita({ tenant, matchName, squadre, nostra = 0, colConfig, onConfronta, schedaIniziale, onScheda }) {
  const { tagVisibili, tagLabel } = useTenant()
  const [lato, setLato] = useState(nostra)
  const [tempo, setTempo] = useState('Totale')
  const [tutti, setTutti] = useState(null)        // partita intera (con numero e dati fisici); null = in caricamento
  const [perTempo, setPerTempo] = useState([])    // un tempo solo
  const [ordine, setOrdine] = useState(null)      // {et, nome} | null = per ruolo
  const [scheda, setScheda] = useState(schedaIniziale || null)      // nome_norm del giocatore aperto
  const [spuntati, setSpuntati] = useState([])                       // per il confronto: {numero, nome, lato, chiave}
  useEffect(() => { onScheda?.(scheda) }, [scheda])

  useEffect(() => {
    fetchAPI(`/v2/analytics/${tenant}/giocatori/${matchName}`).then(r => setTutti(r.data || [])).catch(() => setTutti([]))
  }, [tenant, matchName])
  useEffect(() => {
    if (tempo === 'Totale') return
    fetchAPI(`/v2/analytics/${tenant}/giocatori?match_name=${matchName}&period=${tempo}`).then(r => setPerTempo(r.data || [])).catch(() => setPerTempo([]))
  }, [tenant, matchName, tempo])

  const team = squadre[lato].team
  const base = (tutti || []).filter(p => (p.team || '').toLowerCase() === team)
  const info = Object.fromEntries(base.map(p => [p.nome_norm, p]))          // numero, ruolo, dati fisici
  const righe = (tempo === 'Totale' ? base : perTempo.filter(p => (p.team || '').toLowerCase() === team && info[p.nome_norm]))
  const val = (p, et, nome) => Number(p.events?.[et]?.[nome] ?? 0)

  // colonne: per ogni evento visibile (Admin) le sue voci visibili; solo eventi con dati
  const eventi = tagVisibili([...new Set(base.flatMap(p => Object.keys(p.events || {})))])
    .filter(et => (colConfig[et] || []).some(c => c.visibile))
  const colonne = et => (colConfig[et] || []).filter(c => c.visibile)
  const massimo = useMemo(() => {
    const m = {}
    for (const et of eventi) for (const c of colonne(et)) m[`${et}|${c.nome}`] = Math.max(0, ...righe.map(p => val(p, et, c.nome)))
    return m
  }, [righe, eventi, colConfig])

  const ordinate = [...righe].sort((a, b) => ordine
    ? val(b, ordine.et, ordine.nome) - val(a, ordine.et, ordine.nome)
    : (ORDINE_RUOLO[info[a.nome_norm]?.ruolo] ?? 9) - (ORDINE_RUOLO[info[b.nome_norm]?.ruolo] ?? 9)
      || (info[b.nome_norm]?.performance?.minuti ?? 0) - (info[a.nome_norm]?.performance?.minuti ?? 0))
  const conFisico = base.some(p => p.performance)

  if (scheda) {
    const p = righe.find(x => x.nome_norm === scheda) || base.find(x => x.nome_norm === scheda)
    if (p) return <Scheda p={p} info={info[p.nome_norm] || p} squadra={righe} colore={squadre[lato].colore} eventi={eventi}
      colonne={colonne} nomeTipo={tagLabel} tempo={TEMPI.find(t => t[0] === tempo)[1]}
      onIndietro={() => setScheda(null)} tenant={tenant} matchName={matchName} team={team}
      direzione={{ sinistra: squadre[1 - nostra], destra: squadre[nostra] }} />
    // scheda arrivata con la vista ma il giocatore in questa partita non c'e'
    if (tutti) return (
      <div style={{ padding: '24px 4px', fontSize: 14 }}>
        <span onClick={() => setScheda(null)} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer' }}>← tutti i giocatori</span>
        <div style={{ marginTop: 14, color: 'var(--text)' }}>
          <b style={{ textTransform: 'capitalize' }}>{scheda.toLowerCase()}</b> non ha giocato questa partita.
        </div>
        <div style={{ marginTop: 6, fontSize: 12.5, color: 'var(--text-muted)' }}>Con ‹ › in alto passi alla partita prima o dopo.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={segmento}>
          {squadre.map((s, i) => (
            <div key={s.label} onClick={() => { setLato(i); setOrdine(null) }} style={{ ...voceSeg, ...(lato === i ? segAttivo : {}) }}>
              <span style={{ width: 9, height: 9, borderRadius: '50%', background: s.colore, display: 'inline-block' }} />{s.label}
            </div>
          ))}
        </div>
        <div style={segmento}>
          {TEMPI.map(([k, l]) => <div key={k} onClick={() => setTempo(k)} style={{ ...voceSeg, ...(tempo === k ? segAttivo : {}) }}>{l}</div>)}
        </div>
        {spuntati.length >= 2 && (
          <button onClick={() => onConfronta?.(spuntati)} style={bottone}>Confronta {spuntati.length} giocatori →</button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>
          {ordine ? <span onClick={() => setOrdine(null)} style={{ cursor: 'pointer', color: 'var(--primary)' }}>ordina per ruolo ✕</span>
            : 'ordinata per ruolo · clic su un\'intestazione per ordinare'}
        </span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead>
            <tr>
              <th style={{ ...th, ...fisso }} />
              {conFisico && <th colSpan={1} style={{ ...thGruppo, ...sep }}>Minuti</th>}
              {eventi.map(et => <th key={et} colSpan={colonne(et).length} style={{ ...thGruppo, ...sep }}>{etichetta(tagLabel(et))}</th>)}
              {conFisico && <th colSpan={2} style={{ ...thGruppo, ...sep }}>Fisico</th>}
            </tr>
            <tr>
              <th style={{ ...th, ...fisso, textAlign: 'left' }}>Giocatore</th>
              {conFisico && <th style={{ ...th, ...sep }}>Min</th>}
              {eventi.flatMap(et => colonne(et).map((c, i) => (
                <th key={et + c.nome} onClick={() => setOrdine({ et, nome: c.nome })}
                  style={{ ...th, ...(i === 0 ? sep : {}), cursor: 'pointer',
                    color: ordine?.et === et && ordine?.nome === c.nome ? 'var(--primary)' : undefined }}>{c.label}</th>
              )))}
              {conFisico && <><th style={{ ...th, ...sep }}>Km</th><th style={th}>Sprint</th></>}
            </tr>
          </thead>
          <tbody>
            {ordinate.map(p => {
              const i = info[p.nome_norm] || {}, pf = i.performance
              const spunta = spuntati.some(g => g.chiave === p.nome_norm && g.lato === lato)
              return (
                <tr key={p.nome_norm} onClick={() => setScheda(p.nome_norm)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ ...td, ...fisso, textAlign: 'left', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" checked={spunta} title="Confronta" disabled={!i.numero} onClick={e => e.stopPropagation()}
                      onChange={() => setSpuntati(s => spunta ? s.filter(g => !(g.chiave === p.nome_norm && g.lato === lato))
                        : s.length < 3 ? [...s, { numero: String(i.numero), nome: p.player, lato, chiave: p.nome_norm }] : s)}
                      style={{ marginRight: 8, verticalAlign: 'middle', cursor: 'pointer' }} />
                    {i.ruolo && <span style={{ ...badge, background: `${RUOLO[i.ruolo]}22`, color: RUOLO[i.ruolo] }}>{i.ruolo}</span>}
                    <b>{i.numero}</b> {p.player}
                  </td>
                  {conFisico && <td style={{ ...td, ...sep }}>{pf?.minuti ?? '·'}</td>}
                  {eventi.flatMap(et => colonne(et).map((c, k) => {
                    const v = val(p, et, c.nome), top = v > 0 && v === massimo[`${et}|${c.nome}`]
                    return <td key={et + c.nome} style={{ ...td, ...(k === 0 ? sep : {}), color: top ? 'var(--primary)' : v ? 'var(--text)' : 'var(--text-muted)',
                      fontWeight: top ? 700 : 400 }}>{v || '·'}</td>
                  }))}
                  {conFisico && <><td style={{ ...td, ...sep }}>{pf?.distanza_km ?? '·'}</td><td style={td}>{pf?.sprint ?? '·'}</td></>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
        Colonne = voci scelte in Admin → Eventi e statistiche, raggruppate per evento. In azzurro il valore più alto della squadra.
        Clic su un giocatore → la sua scheda della partita; spunta 2 o 3 giocatori (anche delle due squadre) → confronto sul campo.{tempo !== 'Totale' ? ' Minuti e dati fisici sono della partita intera.' : ''}
      </div>
    </div>
  )
}

// scheda del giocatore nella partita, con la stessa struttura di quella della stagione (GiocatoriStagione):
// intestazione (ruolo, nome, numero e minuti), dati fisici, tab Sintesi / Campo. Sintesi: per evento Tot, per 90',
// quota della squadra, 1° e 2° tempo, "di cui" (voci di Admin); clic su una riga = il Campo di quell'evento.
// Campo: i suoi punti della partita (mappa della partita filtrata su di lui)
function Scheda({ p, info, squadra, colore, eventi, colonne, nomeTipo, tempo, onIndietro, tenant, matchName, team, direzione }) {
  const pf = info.performance, min = pf?.minuti || 0
  const [tab, setTab] = useState(() => daIndirizzo('st') === 'campo' ? 'campo' : 'sintesi')
  const [tipo, setTipo] = useState(null)
  const [tempi, setTempi] = useState([{}, {}])          // eventi del giocatore nel 1° e nel 2° tempo
  const totale = et => squadra.reduce((s, x) => s + Number(x.events?.[et]?.totale ?? 0), 0)
  const suoi = eventi.filter(et => p.events?.[et]?.totale)
  const gruppi = GRUPPI_EVENTI.map(([g, ets]) => [g, ets.filter(et => suoi.includes(et))])
  const altri = suoi.filter(et => !GRUPPI_EVENTI.some(([, ets]) => ets.includes(et)))
  if (altri.length) gruppi.push(['Altro', altri])
  useEffect(() => { const ev = daIndirizzo('ev'); setTipo(suoi.includes(ev) ? ev : suoi[0] || null) }, [p.nome_norm])
  useEffect(() => { scriviVista({ st: tab === 'sintesi' ? null : tab, ...(tipo ? { ev: tipo } : {}) }) }, [tab, tipo])
  useEffect(() => {
    Promise.all(['Primo_Tempo', 'Secondo_Tempo'].map(t => fetchAPI(`/v2/analytics/${tenant}/giocatori?match_name=${matchName}&period=${t}`)
      .then(r => (r.data || []).find(x => x.nome_norm === p.nome_norm)?.events || {}).catch(() => ({}))))
      .then(setTempi)
  }, [p.nome_norm, matchName])
  const dec = x => x == null ? null : Number(x).toFixed(1).replace('.', ',')
  const sottotitolo = [info.numero ? `n. ${info.numero}` : null, partitaDelGiocatore(info), tempo !== 'Tutti' ? `numeri del ${tempo}` : null].filter(Boolean).join(' · ')
  return (
    <div>
      <div onClick={onIndietro} style={{ fontSize: 13, color: 'var(--text-muted)', cursor: 'pointer', marginBottom: 8 }}>← tabella</div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
        {info.ruolo && <div style={{ fontFamily: 'var(--font-display)', fontSize: 38, fontWeight: 700, color: RUOLO[info.ruolo], lineHeight: 1 }}>{info.ruolo}</div>}
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text)' }}>{p.player}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{sottotitolo}</div>
        </div>
      </div>
      {pf && (
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', padding: '10px 4px', margin: '8px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[['Minuti', min ? `${min}'` : null], ['Km', dec(pf.distanza_km)], ["Km / 90'", pf.distanza_km != null && min ? dec(pf.distanza_km * 90 / min) : null],
            ['Vel. media', pf.velocita_media_kmh != null ? `${dec(pf.velocita_media_kmh)} km/h` : null],
            ['Vel. massima', pf.velocita_massima_kmh != null ? `${dec(pf.velocita_massima_kmh)} km/h` : null],
            ['Sprint', pf.sprint], ['Alta intensità', pf.corse_alta_intensita]].filter(([, v]) => v != null).map(([k, v]) => (
            <div key={k}><div style={kpiLab}>{k}</div><b style={{ fontSize: 15, color: 'var(--text)' }}>{v}</b></div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, margin: '12px 0' }}>
        {[['sintesi', 'Sintesi'], ['campo', 'Campo']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...tabStile, ...(tab === k ? tabAttivo : {}) }}>{l}</button>
        ))}
      </div>

      {tab === 'sintesi' && (
        <div>
          <div style={{ ...rigaSintesi, fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            <span /><span style={{ textAlign: 'right' }}>Tot</span><span style={{ textAlign: 'right' }}>per 90'</span><span>quota della squadra</span><span>1° e 2° tempo · di cui</span>
          </div>
          {gruppi.filter(([, ets]) => ets.length).map(([g, ets]) => (
            <div key={g}>
              <div style={gruppoStile}>{g}</div>
              {ets.map(et => {
                const v = Number(p.events[et].totale), t = totale(et)
                const dicui = colonne(et).filter(c => c.filtro && Number(p.events[et][c.nome] ?? 0) > 0)
                  .map(c => `${p.events[et][c.nome]} ${c.label.toLowerCase()}`)
                return (
                  <div key={et} onClick={() => { setTipo(et); setTab('campo') }} title="I suoi punti sul campo" style={{ ...rigaSintesi, cursor: 'pointer' }}>
                    <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{etichetta(nomeTipo(et))}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: colore, textAlign: 'right' }}>{v}</span>
                    <span style={{ fontSize: 12.5, textAlign: 'right' }}>{min ? dec(v * 90 / min) : '–'}</span>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div style={{ flex: 1, height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                        <div style={{ position: 'absolute', inset: 0, width: `${t ? Math.round(100 * v / t) : 0}%`, borderRadius: 5, background: colore }} />
                      </div>
                      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', minWidth: 34 }}>{percento(v, t)}</span>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', gap: 12, alignItems: 'center' }}>
                      <span style={{ whiteSpace: 'nowrap' }}>1° <b style={{ color: 'var(--text)' }}>{tempi[0][et]?.totale || 0}</b> · 2° <b style={{ color: 'var(--text)' }}>{tempi[1][et]?.totale || 0}</b></span>
                      <span>{dicui.join(' · ')}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
            Quota = suo totale sul totale della squadra nella partita. Clic su una riga → i suoi punti di quell'evento sul campo.
          </div>
        </div>
      )}
      {tab === 'campo' && tipo && (
        <CampoGiocatore p={p} numero={info.numero} team={team} colore={colore} tipo={tipo} setTipo={setTipo} tipi={suoi}
          tenant={tenant} matchName={matchName} colonne={colonne} nomeTipo={nomeTipo} direzione={direzione} />
      )}
    </div>
  )
}

// i punti del giocatore nella partita: la mappa della partita filtrata su di lui (squadra e numero)
function CampoGiocatore({ p, numero, team, colore, tipo, setTipo, tipi, tenant, matchName, colonne, nomeTipo, direzione }) {
  const [punti, setPunti] = useState([])
  const [carica, setCarica] = useState(false)
  useEffect(() => {
    let vivo = true
    setCarica(true)
    fetchAPI(`/v2/analytics/${tenant}/mappa/${matchName}?event_type=${encodeURIComponent(tipo)}`)
      .then(r => { if (vivo) { setPunti(r.data || []); setCarica(false) } }).catch(() => { if (vivo) setCarica(false) })
    return () => { vivo = false }
  }, [tipo, matchName])
  const suo = d => (d.team || '').toLowerCase() === team && String(d.player) === String(numero)
  const cognome = (p.player || '').split(' ')[0]
  return (
    <CampoAnalisi eventi={punti.filter(suo)} tipi={tipi} tipo={tipo} onTipo={setTipo} nomeTipo={nomeTipo} caricamento={carica}
      colonne={colonne(tipo)} lati={[{ label: cognome, corto: cognome, colore, appartiene: () => true }]} direzione={direzione} />
  )
}

// "Titolare · uscito al 26'" / "Entrato al 60'" + gol e cartellini della partita (distinta e tabellini)
function partitaDelGiocatore(p) {
  const d = p.distinta, parti = []
  if (d) parti.push(d.titolare ? (d.esce != null ? `Titolare, uscito al ${d.esce}'` : 'Titolare, tutta la partita')
    : `Entrato al ${d.entra}'${d.esce != null ? `, uscito al ${d.esce}'` : ''}`)
  const gol = Number(p.events?.shot?.gol || 0)
  if (gol) parti.push(gol === 1 ? '1 gol' : `${gol} gol`)
  const amm = Number(p.events?.disciplina?.ammonizione || 0), esp = Number(p.events?.disciplina?.espulsione || 0)
  if (amm) parti.push('ammonito')
  if (esp) parti.push('espulso')
  return parti.join(' · ')
}

const segmento = { display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }
const voceSeg = { padding: '6px 12px', fontSize: 13, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', cursor: 'pointer',
  borderRight: '1px solid var(--border)', textTransform: 'capitalize' }
const segAttivo = { background: 'rgba(255,255,255,0.06)', color: 'var(--text)' }
const th = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 500, padding: '5px 7px',
  textAlign: 'right', whiteSpace: 'nowrap' }
const thGruppo = { ...th, textAlign: 'center', color: '#94A3B8', borderBottom: '1px solid var(--border)', fontSize: 11, letterSpacing: '0.08em' }
const td = { padding: '6px 7px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)', fontVariantNumeric: 'tabular-nums' }
const sep = { borderLeft: '1px solid var(--border)' }
const fisso = { position: 'sticky', left: 0, background: 'var(--bg-card)', zIndex: 1 }
const badge = { display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, marginRight: 6 }
const bottone = { fontSize: 13, color: 'var(--primary)', border: '1px solid rgba(0,229,255,0.4)', borderRadius: 8,
  padding: '6px 12px', background: 'transparent', cursor: 'pointer' }
// come la scheda della stagione (GiocatoriStagione)
const kpiLab = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }
const tabStile = { padding: '0.45rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }
const tabAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const rigaSintesi = { display: 'grid', gridTemplateColumns: '160px 60px 60px 1fr 340px', alignItems: 'center', gap: 12, padding: '5px 4px', borderRadius: 8 }
const gruppoStile = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '14px 0 6px',
  paddingBottom: 5, borderBottom: '1px solid var(--border)' }
