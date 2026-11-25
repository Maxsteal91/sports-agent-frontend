'use client'
import { useEffect, useMemo, useState } from 'react'
import { fetchAPI } from '../lib/api'
import { useTenant } from '../lib/TenantContext'
import { GRUPPI_EVENTI, etichetta, percento } from '../lib/sintesi'

// Giocatori di una partita Veo: tabella d'insieme (colonne = voci di Admin, raggruppate per evento) e,
// con un clic su un giocatore, la sua scheda (voci a gruppi con la quota sul totale della squadra).
//   squadre  [{label, colore, team}] (team = nome in minuscolo come negli eventi); nostra = indice della nostra
//   onApriCampo(et, giocatore) apre il Campo filtrato sul giocatore (et null = l'evento gia' scelto)
const RUOLO = { POR: '#EAB308', DIF: '#3B82F6', CEN: '#22C55E', ATT: '#EF4444' }
const ORDINE_RUOLO = { POR: 0, DIF: 1, CEN: 2, ATT: 3 }
const TEMPI = [['Totale', 'Tutti'], ['Primo_Tempo', '1° tempo'], ['Secondo_Tempo', '2° tempo']]

export default function GiocatoriPartita({ tenant, matchName, squadre, nostra = 0, colConfig, onApriCampo }) {
  const { tagVisibili, tagLabel } = useTenant()
  const [lato, setLato] = useState(nostra)
  const [tempo, setTempo] = useState('Totale')
  const [tutti, setTutti] = useState([])          // partita intera (con numero e dati fisici)
  const [perTempo, setPerTempo] = useState([])    // un tempo solo
  const [ordine, setOrdine] = useState(null)      // {et, nome} | null = per ruolo
  const [scheda, setScheda] = useState(null)      // nome_norm del giocatore aperto

  useEffect(() => {
    fetchAPI(`/v2/analytics/${tenant}/giocatori/${matchName}`).then(r => setTutti(r.data || [])).catch(() => setTutti([]))
  }, [tenant, matchName])
  useEffect(() => {
    if (tempo === 'Totale') return
    fetchAPI(`/v2/analytics/${tenant}/giocatori?match_name=${matchName}&period=${tempo}`).then(r => setPerTempo(r.data || [])).catch(() => setPerTempo([]))
  }, [tenant, matchName, tempo])

  const team = squadre[lato].team
  const base = tutti.filter(p => (p.team || '').toLowerCase() === team)
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
      onIndietro={() => setScheda(null)}
      onCampo={et => onApriCampo?.(et, { numero: info[p.nome_norm]?.numero, lato, nome: p.player })} />
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
              return (
                <tr key={p.nome_norm} onClick={() => setScheda(p.nome_norm)} style={{ cursor: 'pointer' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                  <td style={{ ...td, ...fisso, textAlign: 'left', whiteSpace: 'nowrap' }}>
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
        Clic su un giocatore → la sua scheda della partita.{tempo !== 'Totale' ? ' Minuti e dati fisici sono della partita intera.' : ''}
      </div>
    </div>
  )
}

// scheda del giocatore: voci a gruppi (Attacco / Possesso / Difesa), numero, quota sul totale della squadra
// e le altre voci di Admin come "di cui"; clic su una riga = il campo filtrato su di lui per quell'evento
function Scheda({ p, info, squadra, colore, eventi, colonne, nomeTipo, tempo, onIndietro, onCampo }) {
  const pf = info.performance
  const totale = et => squadra.reduce((s, x) => s + Number(x.events?.[et]?.totale ?? 0), 0)
  const gruppi = GRUPPI_EVENTI.map(([g, ets]) => [g, ets.filter(et => eventi.includes(et) && p.events?.[et]?.totale)])
  const altri = eventi.filter(et => !GRUPPI_EVENTI.some(([, ets]) => ets.includes(et)) && p.events?.[et]?.totale)
  if (altri.length) gruppi.push(['Altro', altri])
  return (
    <div>
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 42, fontWeight: 700, color: colore, lineHeight: 1 }}>{info.numero}</div>
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', color: 'var(--text)' }}>{p.player}</div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
            {info.ruolo && <span style={{ ...badge, background: `${RUOLO[info.ruolo]}22`, color: RUOLO[info.ruolo] }}>{info.ruolo}</span>}
            {partitaDelGiocatore(info)}{tempo !== 'Tutti' ? ` · numeri del ${tempo}` : ''}
          </div>
        </div>
        <button onClick={() => onCampo(null)} style={bottone}>vedi sul campo →</button>
      </div>
      {pf && (
        <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', padding: '10px 4px', margin: '6px 0', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
          {[['Minuti', pf.minuti], ['Km', pf.distanza_km], ['Vel. media', pf.velocita_media_kmh != null ? `${pf.velocita_media_kmh} km/h` : null],
            ['Vel. massima', pf.velocita_massima_kmh != null ? `${pf.velocita_massima_kmh} km/h` : null], ['Sprint', pf.sprint],
            ['Alta intensità', pf.corse_alta_intensita]].filter(([, v]) => v != null).map(([k, v]) => (
            <div key={k}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k}</div>
              <b style={{ fontSize: 15, color: 'var(--text)' }}>{v}</b></div>
          ))}
        </div>
      )}
      <div onClick={onIndietro} style={{ fontSize: 12.5, color: 'var(--text-muted)', cursor: 'pointer', margin: '4px 0 6px' }}>← torna alla tabella</div>
      {gruppi.filter(([, ets]) => ets.length).map(([g, ets]) => (
        <div key={g}>
          <div style={gruppoStile}>{g}</div>
          {ets.map(et => {
            const v = Number(p.events[et].totale), t = totale(et)
            const dicui = colonne(et).filter(c => c.filtro && Number(p.events[et][c.nome] ?? 0) > 0)
              .map(c => `${p.events[et][c.nome]} ${c.label.toLowerCase()}`)
            return (
              <div key={et} onClick={() => onCampo(et)} title="Vedi sul campo"
                style={{ display: 'grid', gridTemplateColumns: '170px 56px 1fr 300px', alignItems: 'center', gap: 12, padding: '6px 4px', borderRadius: 8, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,229,255,0.05)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}>
                <span style={{ fontSize: 13.5, color: 'var(--text)' }}>{etichetta(nomeTipo(et))}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: colore, textAlign: 'right' }}>{v}</span>
                <div style={{ height: 9, borderRadius: 5, background: 'rgba(255,255,255,0.06)', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: 0, width: `${t ? Math.round(100 * v / t) : 0}%`, borderRadius: 5, background: colore }} />
                </div>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{percento(v, t)} della squadra{dicui.length ? ` · ${dicui.join(' · ')}` : ''}</span>
              </div>
            )
          })}
        </div>
      ))}
      <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10 }}>
        Barra = quota del giocatore sul totale della squadra nella partita. Clic su una riga → il campo filtrato su di lui per quell'evento.
      </div>
    </div>
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
const bottone = { marginLeft: 'auto', fontSize: 13, color: 'var(--primary)', border: '1px solid rgba(0,229,255,0.4)', borderRadius: 8,
  padding: '7px 12px', background: 'transparent', cursor: 'pointer' }
const gruppoStile = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.12em', margin: '14px 0 6px',
  paddingBottom: 5, borderBottom: '1px solid var(--border)' }
