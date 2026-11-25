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
//   sostituto: nodo da mostrare al posto del campo (es. la rete dei passaggi), oppure funzione
//   ({scelti, lato, fascia}) => nodo: giocatori scelti, squadra e fascia di 15' (1-6, null = tutta) della barra comune
// Il pannello raggruppa le colonne per attributo (blocchi che sommano al totale); un clic filtra i punti.
const FASCE = [['Tutta', null], ['1° tempo', ['Primo_Tempo', 0, 999]], ['2° tempo', ['Secondo_Tempo', 0, 999]],
  ["0-15'", ['Primo_Tempo', 0, 15]], ["15-30'", ['Primo_Tempo', 15, 30]], ["30-45'+", ['Primo_Tempo', 30, 999]],
  ["45-60'", ['Secondo_Tempo', 45, 60]], ["60-75'", ['Secondo_Tempo', 60, 75]], ["75-90'+", ['Secondo_Tempo', 75, 999]]]
// titoli dei blocchi del pannello (attributo -> nome)
const NOMI_BLOCCHI = { outcome: 'Esito', result: 'Esito', esito: 'Esito', zona: 'Zona', piede: 'Parte del corpo',
  motivo: 'Motivo', come: 'Come', pericolosa: 'Di cui', origine: 'Origine', lato: 'Lato', tipo: 'Tipo',
  battuta: 'Battuta', tiro: 'Con tiro', tipologia: 'Tipo', situazione: 'Situazione', tipo_possesso: 'Tipo' }
// fasce di FASCE che la rete dei passaggi conosce (backend: fascia 1-6, null = tutta la partita)
const FASCIA_RETE = { 0: null, 3: 1, 4: 2, 5: 3, 6: 4, 7: 5, 8: 6 }
const W = 620, PAD = 10, FW = W - 2 * PAD, FH = Math.round(FW * 68 / 105), H = FH + 2 * PAD
const sx = x => PAD + (x / 100) * FW, sy = y => PAD + (y / 100) * FH

//   giocatori [{numero, nome, lato}] per il filtro giocatori (partita); giocatoriIniziali = scelti all'apertura
//   (es. dalla scheda del giocatore). Con giocatori scelti (al massimo 3) le colonne del pannello e i colori
//   della mappa sono i giocatori al posto delle squadre: uno = i suoi eventi, due o tre = confronto
const COLORI_GIOCATORI = ['#00E5FF', '#F59E0B', '#22C55E']
export default function CampoAnalisi({ eventi, tipi, tipo, onTipo, nomeTipo, lati: latiSquadre, colonne = [], direzione,
                                      filtriExtra, sostituto, caricamento, latoNostro = 0, giocatori, giocatoriIniziali,
                                      affiancati = false }) {
  // affiancati: i lati sono gia' dei giocatori (es. confronto della stagione) -> un campo per ciascuno
  const [scelti, setScelti] = useState(giocatoriIniziali || [])
  useEffect(() => { setScelti(giocatoriIniziali || []); setLato(null) }, [JSON.stringify(giocatoriIniziali || [])])
  const lati = scelti.length ? scelti.map((g, i) => ({
    label: `${g.numero} ${(g.nome || '').split(' ')[0]}`, corto: `${g.numero} ${(g.nome || '').split(' ')[0].slice(0, 5)}`,
    colore: scelti.length === 1 ? latiSquadre[g.lato].colore : COLORI_GIOCATORI[i],
    appartiene: d => String(d.player) === String(g.numero) && latiSquadre[g.lato].appartiene(d),
  })) : latiSquadre
  const [lato, setLato] = useState(null)          // null = entrambi (tutti i giocatori scelti)
  const [latoRete, setLatoRete] = useState(null)  // sostituto (rete dei passaggi): squadra scelta
  const latoReteEff = scelti.length ? scelti[0].lato : (latoRete ?? latoNostro)
  const [scelta, setScelta] = useState(null)      // {nome, valori, label}
  const [soloPericolose, setSoloPericolose] = useState(false)
  const [fascia, setFascia] = useState(0)
  const [vista, setVista] = useState('punti')     // punti | heatmap
  const [griglia, setGriglia] = useState(0)       // indice in GRIGLIE (heatmap)
  // heatmap: una squadra alla volta (due squadre nello stesso tassello non si leggono): la nostra
  const cambiaVista = k => { setVista(k); if (k === 'heatmap' && lato == null) setLato(scelti.length ? 0 : latoNostro) }
  const aggiungi = v => {
    const g = (giocatori || []).find(x => `${x.lato}|${x.numero}` === v)
    if (g && scelti.length < 3 && !scelti.some(s => s.numero === g.numero && s.lato === g.lato)) { setScelti([...scelti, g]); setLato(null) }
  }
  const togli = i => { setScelti(scelti.filter((_, k) => k !== i)); setLato(null) }
  const [menu, setMenu] = useState(false)
  const menuRef = useRef(null)
  useEffect(() => { setScelta(null); setSoloPericolose(false) }, [tipo])
  // rete dei passaggi: 1° / 2° tempo non ci sono (solo tutta la partita e le fasce di 15')
  useEffect(() => { if (sostituto && FASCIA_RETE[fascia] === undefined) setFascia(0) }, [tipo])
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
  const base = (eventi || []).filter(d => d.x != null && nelTempo(d) && (!scelti.length || latoDi(d) >= 0))
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
  const filtroPunti = d => (!scelta || passa(d, scelta)) && (!soloPericolose || d.attrs?.pericolosa === 'si')
  const conta = (i, f) => base.filter(d => latoDi(d) === i && (!f || passa(d, f))
    && (!soloPericolose || d.attrs?.pericolosa === 'si')).length

  // striscia dei giocatori scelti: i loro totali per evento (dalla tabella giocatori), solo eventi con dati
  const totScelti = scelti.map(g => (giocatori || []).find(x => x.lato === g.lato && String(x.numero) === String(g.numero))?.totali || {})
  const vociStriscia = [...GRUPPI_EVENTI.flatMap(([, ets]) => ets), ...tipi].filter((et, i, a) => a.indexOf(et) === i)
    .filter(et => tipi.includes(et) && totScelti.some(t => t[et]))
  // giocatori scelti e l'evento attuale non ha numeri per nessuno di loro: il primo evento con dati
  useEffect(() => {
    if (scelti.length && vociStriscia.length && !vociStriscia.includes(tipo)) onTipo(vociStriscia[0])
  }, [JSON.stringify(scelti), vociStriscia.join(','), tipo])

  // menu degli eventi a gruppi
  const gruppi = GRUPPI_EVENTI.map(([g, ets]) => [g, ets.filter(et => tipi.includes(et))])
  const altri = tipi.filter(et => !GRUPPI_EVENTI.some(([, ets]) => ets.includes(et)))
  if (altri.length) gruppi.push(['Altro', altri])

  return (
    <div>
      {/* barra: evento, squadre, filtri in piu' */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        {/* con giocatori scelti si cambia evento dalla striscia di riepilogo: il menu non serve */}
        {!scelti.length && !affiancati && <div ref={menuRef} style={{ position: 'relative' }}>
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
        </div>}
        {sostituto && (
          <div style={segmento}>
            {latiSquadre.map((l, i) => (
              <div key={l.label} onClick={() => { setLatoRete(i); setScelti(scelti.filter(g => g.lato === i)) }}
                style={{ ...voceSeg, ...(latoReteEff === i ? segAttivo : {}) }}>
                <span style={{ width: 9, height: 9, borderRadius: '50%', background: l.colore, display: 'inline-block' }} />{l.label}
              </div>
            ))}
          </div>
        )}
        {!sostituto && scelti.length < 2 && !affiancati && lati.length > 1 && (
          <div style={segmento}>
            {(vista === 'heatmap' ? lati.map((_, i) => i) : [null, ...lati.map((_, i) => i)]).map(i => (
              <div key={String(i)} onClick={() => setLato(i)} style={{ ...voceSeg, ...(lato === i ? segAttivo : {}) }}>
                {i != null && <span style={{ width: 9, height: 9, borderRadius: '50%', background: lati[i].colore, display: 'inline-block' }} />}
                {i == null ? (scelti.length ? 'Tutti' : 'Entrambe') : lati[i].label}
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
      {giocatori?.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Giocatori:</span>
          {scelti.map((g, i) => (
            <span key={`${g.lato}|${g.numero}`} onClick={() => togli(i)} title="Togli" style={{ ...chipG, borderColor: lati[i].colore, color: lati[i].colore }}>
              {g.numero} {g.nome} ✕
            </span>
          ))}
          {scelti.length < 3 && (
            <select value="" onChange={e => aggiungi(e.target.value)} style={selectG}>
              <option value="">{scelti.length ? '+ confronta con…' : '+ scegli un giocatore'}</option>
              {[latoNostro, 1 - latoNostro].filter(li => latiSquadre[li]).map(li => (   /* prima la nostra squadra */
                <optgroup key={latiSquadre[li].label} label={latiSquadre[li].label}>
                  {giocatori.filter(g => g.lato === li).map(g => <option key={g.numero} value={`${li}|${g.numero}`}>{g.numero} {g.nome}</option>)}
                </optgroup>
              ))}
            </select>
          )}
          {scelti.length > 0 && <span onClick={() => { setScelti([]); setLato(null) }} style={{ fontSize: 12, color: 'var(--text-muted)', cursor: 'pointer' }}>togli tutti</span>}
        </div>
      )}
      {/* striscia di riepilogo dei giocatori scelti: tutti i loro eventi della partita; clic = quell'evento */}
      {scelti.length > 0 && (() => {
        return vociStriscia.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10, padding: '6px 8px',
            border: '1px solid var(--border)', borderRadius: 8, background: 'rgba(255,255,255,0.02)' }}>
            {vociStriscia.map(et => (
              <span key={et} onClick={() => onTipo(et)} title="Vedi sul campo"
                style={{ ...chip, display: 'inline-flex', gap: 6, alignItems: 'center', ...(et === tipo ? chipAttivo : {}) }}>
                {etichetta(nomeTipo(et))}
                {totScelti.map((t, i) => <b key={i} style={{ color: lati[i]?.colore }}>{t[et] || 0}</b>)
                  .reduce((acc, el, i) => i ? [...acc, <span key={`s${i}`} style={{ color: 'var(--text-muted)' }}>·</span>, el] : [el], [])}
              </span>
            ))}
          </div>
        )
      })()}
      {(
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
          {FASCE.map(([l], i) => (sostituto && FASCIA_RETE[i] === undefined) ? null : (
            <button key={l} onClick={() => setFascia(i)} style={{ ...chip, ...(fascia === i ? chipAttivo : {}) }}>{l}</button>
          ))}
        </div>
      )}

      {(typeof sostituto === 'function' ? sostituto({ scelti, lato: latoReteEff, fascia: FASCIA_RETE[fascia] ?? null }) : sostituto) || (scelti.length >= 2 || affiancati ? (
        // confronto: un campo per giocatore (stesso evento, stessa scala) e sotto la tabella delle voci di Admin
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${lati.length}, 1fr)`, gap: 16 }}>
            {lati.map((l, i) => {
              const pts = base.filter(d => latoDi(d) === i && filtroPunti(d))
              return (
                <div key={l.label}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, textTransform: 'uppercase', color: l.colore }}>{l.label}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{pts.length} {etichetta(nomeTipo(tipo)).toLowerCase()}</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', borderRadius: 8 }}>
                      <Campo />
                      {vista === 'heatmap'
                        ? <Heatmap punti={pts} colore={l.colore} colonne={GRIGLIE[griglia][0]} righe={GRIGLIE[griglia][1]} />
                        : [...pts.filter(d => d.attrs?.pericolosa !== 'si'), ...pts.filter(d => d.attrs?.pericolosa === 'si')]
                            .map((d, k) => <Punto key={k} d={d} colore={l.colore} tipo={tipo} />)}
                    </svg>
                    {direzione && <div style={{ ...freccia, right: 8, fontSize: 11, color: direzione.destra.colore }}>{direzione.destra.label} attacca →</div>}
                    {caricamento && <div style={velo}>Caricamento...</div>}
                  </div>
                </div>
              )
            })}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5, marginTop: 14 }}>
            <thead>
              <tr>
                <th style={{ ...thConfronto, textAlign: 'left' }}>{etichetta(nomeTipo(tipo))}</th>
                {lati.map(l => <th key={l.label} style={{ ...thConfronto, color: l.colore }}>{l.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {[{ label: 'Totale', filtro: null, blocco: null },
                ...blocchi.flatMap(b => b.righe.map((c, k) => ({ label: c.label, filtro: c.filtro, blocco: k === 0 && blocchi.length > 0 ? (NOMI_BLOCCHI[b.nome] || etichetta(b.nome)) : null })))]
                .flatMap(r => {
                  const v = lati.map((_, i) => conta(i, r.filtro)), max = Math.max(1, ...v)
                  const on = r.filtro ? scelta && scelta.label === r.label && scelta.nome === r.filtro.nome : !scelta
                  return [
                    r.blocco && <tr key={`b${r.label}`}><td colSpan={lati.length + 1} style={{ ...titoloBlocco, paddingTop: 12 }}>{r.blocco}</td></tr>,
                    <tr key={r.label} onClick={() => setScelta(r.filtro && !on ? { ...r.filtro, label: r.label } : null)}
                      style={{ cursor: 'pointer', ...(on ? { background: 'rgba(0,229,255,0.06)' } : {}) }}>
                      <td style={{ ...tdConfronto, textAlign: 'left' }}>{r.label}</td>
                      {v.map((x, i) => (
                        <td key={i} style={{ ...tdConfronto, color: lati[i].colore, fontWeight: x === Math.max(...v) && x ? 700 : 400 }}>
                          {x}<span style={{ display: 'inline-block', height: 7, borderRadius: 4, verticalAlign: 'middle', marginLeft: 8,
                            width: Math.round(90 * x / max), background: lati[i].colore }} />
                        </td>
                      ))}
                    </tr>,
                  ]
                })}
            </tbody>
          </table>
          {conPericolo && (
            <div onClick={() => setSoloPericolose(x => !x)} style={{ display: 'inline-flex', gap: 10, alignItems: 'center', marginTop: 10, fontSize: 13, cursor: 'pointer' }}>
              <span>Solo pericolose</span>
              <span style={{ width: 34, height: 19, borderRadius: 10, background: soloPericolose ? '#F97316' : '#334155', position: 'relative' }}>
                <span style={{ position: 'absolute', top: 2, left: soloPericolose ? 17 : 2, width: 15, height: 15, borderRadius: '50%', background: 'white' }} />
              </span>
            </div>
          )}
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>
            Un campo per giocatore, stesso evento e stessa scala. Clic su una voce della tabella = solo quei punti in tutti i campi; il valore più alto in grassetto.
          </div>
        </div>
      ) : (
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
              <span />{lati.map(l => <span key={l.label} style={{ textAlign: 'right' }}>{l.corto || `${l.label.slice(0, 4)}.`}</span>)}
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
      ))}
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

const thConfronto = { fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500,
  padding: '6px 10px', textAlign: 'right' }
const tdConfronto = { padding: '7px 10px', textAlign: 'right', borderTop: '1px solid rgba(255,255,255,0.05)' }
const chipG = { display: 'inline-flex', gap: 6, alignItems: 'center', padding: '4px 10px', borderRadius: 999, fontSize: 12.5,
  border: '1px solid', background: 'rgba(255,255,255,0.04)', cursor: 'pointer' }
const selectG = { padding: '4px 8px', borderRadius: 999, fontSize: 12.5, border: '1px dashed rgba(255,255,255,0.25)', background: 'transparent',
  color: 'var(--text-muted)', cursor: 'pointer' }
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
