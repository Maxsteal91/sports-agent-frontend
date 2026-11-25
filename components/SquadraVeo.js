'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { fetchAPI } from '../lib/api'
import { useTenant } from '../lib/TenantContext'
import SintesiGruppi from './SintesiGruppi'
import CampoAnalisi from './CampoAnalisi'
import { valore, sommaRighe, etichetta } from '../lib/sintesi'

// Sezione Squadra per i tenant con partite Veo: risultati, poi tre tab come la partita
//   Sintesi stagione  la sintesi a gruppi, noi contro avversari, totale e media a partita
//   Campo             lo stesso campo della partita, con i punti della stagione
//   Andamento         l'evento scelto partita per partita
// Un solo filtro delle partite (tutte / casa / trasferta / ultime 5) vale per tutti e tre.
const NOI = '#00E5FF', LORO = '#CC44FF'
const FILTRI = [['tutte', 'Tutte'], ['casa', 'Casa'], ['trasferta', 'Trasferta'], ['ultime5', 'Ultime 5']]
const ESITO = { V: '#22C55E', N: '#94A3B8', P: '#EF4444' }

export default function SquadraVeo({ tenant, categoria, partite, noi }) {
  const { tagVisibili, tagLabel } = useTenant()
  const [tab, setTab] = useState('sintesi')
  const [righe, setRighe] = useState([])
  const [colConfig, setColConfig] = useState({})
  const [filtro, setFiltro] = useState('tutte')
  const [tipo, setTipo] = useState('shot')
  const [punti, setPunti] = useState([])
  const [carica, setCarica] = useState(false)
  const n = (noi || '').toLowerCase()
  const catParam = categoria ? `&category=${categoria}` : ''

  useEffect(() => {
    fetchAPI(`/v2/analytics/${tenant}/aggregati?tutti=true&period=Totale${catParam}`).then(r => setRighe(r.data || [])).catch(() => {})
    fetchAPI(`/v2/analytics/${tenant}/column_config`).then(r => setColConfig(r.config || {})).catch(() => {})
  }, [tenant, categoria])
  useEffect(() => {
    if (tab !== 'campo' || !tipo) return
    setCarica(true)
    fetchAPI(`/v2/analytics/${tenant}/mappa_stagione?event_type=${encodeURIComponent(tipo)}${catParam}`)
      .then(r => { setPunti(r.data || []); setCarica(false) }).catch(() => setCarica(false))
  }, [tenant, categoria, tab, tipo])

  // partite in ordine di data, con risultato (gol dai tiri, come la sintesi della partita)
  const elenco = useMemo(() => [...partite].sort((a, b) => (a.date || '').localeCompare(b.date || '')).map(p => {
    const casa = (p.home_team || '').toLowerCase() === n
    const r = righe.filter(x => x.match_name === p.match_name && x.event_type === 'shot')
    const gf = r.filter(x => x.team === n).reduce((s, x) => s + Number(x.extra?.goal || 0), 0)
    const gs = r.filter(x => x.team !== n).reduce((s, x) => s + Number(x.extra?.goal || 0), 0)
    return { ...p, casa, avversario: casa ? p.away_team : p.home_team, gf, gs, esito: gf > gs ? 'V' : gf === gs ? 'N' : 'P' }
  }), [partite, righe, n])
  const scelte = elenco.filter(p => filtro === 'casa' ? p.casa : filtro === 'trasferta' ? !p.casa : true)
    .slice(filtro === 'ultime5' ? -5 : 0)
  const nomiScelte = new Set(scelte.map(p => p.match_name))

  const v = (lato, et, k) => valore(sommaRighe(righe.filter(r => nomiScelte.has(r.match_name) && r.event_type === et
    && (r.team === n) === (lato === 0))), k)
  const tipi = tagVisibili([...new Set(righe.filter(r => r.totale > 0).map(r => r.event_type))]).filter(et => et !== 'passaggi')
  const vnp = k => scelte.filter(p => p.esito === k).length

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.9rem', letterSpacing: '0.04em', textTransform: 'uppercase', margin: '0 0 1rem', color: 'var(--text)' }}>
        {noi} · Stagione
      </h1>
      {/* risultati */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {[[scelte.length, 'Partite'], [`${vnp('V')} · ${vnp('N')} · ${vnp('P')}`, 'Vinte · Pari · Perse'],
          [`${scelte.reduce((s, p) => s + p.gf, 0)} · ${scelte.reduce((s, p) => s + p.gs, 0)}`, 'Gol fatti · subiti'],
          [3 * vnp('V') + vnp('N'), 'Punti']].map(([val, lab]) => (
          <div key={lab} style={kpi}><b style={kpiNum}>{val}</b><span style={kpiLab}>{lab}</span></div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
        {elenco.map(p => (
          <Link key={p.match_name} href={`/partita/${p.match_name}?tenant=${tenant}`} style={{ ...partita,
            borderColor: `${ESITO[p.esito]}55`, opacity: nomiScelte.has(p.match_name) ? 1 : 0.35 }}>
            <b style={{ display: 'block', fontFamily: 'var(--font-display)', fontSize: 17, color: ESITO[p.esito] }}>{p.gf}-{p.gs}</b>
            {p.casa ? '' : '@ '}{etichetta(p.avversario)}
            <small style={{ display: 'block', color: 'var(--text-muted)', fontSize: 10.5, marginTop: 1 }}>{data(p.date)}</small>
          </Link>
        ))}
      </div>

      {/* tab e filtro delle partite */}
      <div style={{ display: 'flex', gap: 8, margin: '1.25rem 0', alignItems: 'center', flexWrap: 'wrap' }}>
        {[['sintesi', 'Sintesi stagione'], ['campo', 'Campo'], ['andamento', 'Andamento']].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{ ...tabStile, ...(tab === k ? tabAttivo : {}) }}>{l}</button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          {FILTRI.map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ ...chip, ...(filtro === k ? chipAttivo : {}) }}>{l}</button>
          ))}
        </div>
      </div>

      <div style={card}>
        {tab === 'sintesi' && (
          <SintesiGruppi nomi={[noi, 'Avversari']} colori={[NOI, LORO]} v={v} perPartita={scelte.length || 1} stagione
            onApri={et => { if (tipi.includes(et)) { setTipo(et); setTab('campo') } }} />
        )}
        {tab === 'campo' && (
          <CampoAnalisi eventi={punti.filter(d => nomiScelte.has(d.match_name))} tipi={tipi} tipo={tipo} onTipo={setTipo}
            nomeTipo={tagLabel} caricamento={carica} colonne={colConfig[tipo] || []}
            lati={[{ label: noi, colore: NOI, appartiene: d => (d.team || '').toLowerCase() === n },
                   { label: 'Avversari', colore: LORO, appartiene: d => (d.team || '').toLowerCase() !== n }]}
            direzione={{ sinistra: { label: 'Avversari', colore: LORO }, destra: { label: noi, colore: NOI } }} />
        )}
        {tab === 'andamento' && (
          <Andamento tipi={tipi} tipo={tipo} setTipo={setTipo} nomeTipo={tagLabel} partite={scelte}
            noi={noi} n={n} tenant={tenant} catParam={catParam} colonne={colConfig[tipo] || []} />
        )}
      </div>
    </div>
  )
}

// l'evento scelto partita per partita. Voci = colonne di Admin dell'evento (come il pannello del campo e la
// tabella giocatori), contate dal backend sugli eventi (/conteggi). Grafico: la voce scelta, noi e avversari;
// tabella: tutte le voci per noi o per gli avversari; clic su una colonna = quella voce nel grafico
function Andamento({ tipi, tipo, setTipo, nomeTipo, partite, noi, n, tenant, catParam, colonne }) {
  const [conteggi, setConteggi] = useState([])
  const [lato, setLato] = useState('noi')
  const [voce, setVoce] = useState(null)          // null = totale
  useEffect(() => {
    setVoce(null)
    fetchAPI(`/v2/analytics/${tenant}/conteggi?event_type=${encodeURIComponent(tipo)}${catParam}`)
      .then(r => setConteggi(r.data || [])).catch(() => setConteggi([]))
  }, [tenant, tipo, catParam])

  const voci = [{ label: 'Tot', filtro: null }, ...colonne.filter(c => c.visibile && c.filtro)]
    .filter(c => !c.filtro || conteggi.some(r => c.filtro.valori.some(v => r.conteggi[`${c.filtro.nome}=${v}`])))
  const conta = (mn, noiLato, c) => conteggi.filter(r => r.match_name === mn && (r.team === n) === noiLato)
    .reduce((s, r) => s + (c.filtro ? c.filtro.valori.reduce((t, v) => t + (r.conteggi[`${c.filtro.nome}=${v}`] || 0), 0) : r.totale), 0)
  const scelta = voci.find(c => c.label === voce) || voci[0]
  const nomePartita = p => `${p.casa ? '' : '@ '}${etichetta(p.avversario)}`
  const dati = partite.map(p => ({ partita: `${nomePartita(p)} ${data(p.date)}`, noi: conta(p.match_name, true, scelta), avversari: conta(p.match_name, false, scelta) }))
  const somma = c => partite.reduce((s, p) => s + conta(p.match_name, lato === 'noi', c), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        {tipi.map(et => (
          <button key={et} onClick={() => setTipo(et)} style={{ ...chip, ...(tipo === et ? chipAttivo : {}) }}>{etichetta(nomeTipo(et))}</button>
        ))}
      </div>
      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 4 }}>
        {etichetta(nomeTipo(tipo))}{scelta?.filtro ? ` · ${scelta.label}` : ''} — partita per partita
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={dati} margin={{ top: 5, right: 10, left: 0, bottom: 50 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
          <XAxis dataKey="partita" tick={{ fill: '#7A8BA8', fontSize: 11 }} angle={-30} textAnchor="end" interval={0} />
          <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} allowDecimals={false} />
          <Tooltip contentStyle={{ background: '#0F1729', border: '1px solid rgba(255,255,255,0.1)' }} />
          <Legend wrapperStyle={{ fontSize: 12 }} verticalAlign="top" />
          <Bar dataKey="noi" name={noi} fill={NOI} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          <Bar dataKey="avversari" name="Avversari" fill={LORO} radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '8px 0' }}>
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
          {[['noi', noi], ['avv', 'Avversari']].map(([k, l]) => (
            <div key={k} onClick={() => setLato(k)} style={{ padding: '5px 12px', fontSize: 12.5, cursor: 'pointer', textTransform: 'capitalize',
              color: lato === k ? (k === 'noi' ? NOI : LORO) : 'var(--text-muted)', background: lato === k ? 'rgba(255,255,255,0.06)' : 'transparent' }}>{l}</div>
          ))}
        </div>
        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>clic su una colonna per vederla nel grafico</span>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ color: 'var(--text-muted)', textAlign: 'right', fontSize: 11, textTransform: 'uppercase' }}>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Data</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>Partita</th>
              <th style={{ padding: '6px 8px' }}>Ris.</th>
              {voci.map(c => (
                <th key={c.label} onClick={() => setVoce(c.label)} style={{ padding: '6px 8px', cursor: 'pointer', whiteSpace: 'nowrap',
                  color: scelta?.label === c.label ? 'var(--primary)' : undefined,
                  borderBottom: scelta?.label === c.label ? '2px solid var(--primary)' : '2px solid transparent' }}>{c.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {partite.map(p => (
              <tr key={p.match_name} style={{ borderTop: '1px solid var(--border)', textAlign: 'right' }}>
                <td style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-muted)' }}>{data(p.date)}</td>
                <td style={{ textAlign: 'left', padding: '6px 8px' }}>
                  <Link href={`/partita/${p.match_name}?tenant=${tenant}`} style={{ color: 'var(--text)' }}>{nomePartita(p)}</Link>
                </td>
                <td style={{ padding: '6px 8px', color: 'var(--text-muted)' }}>{p.gf}-{p.gs}</td>
                {voci.map(c => (
                  <td key={c.label} style={{ padding: '6px 8px', fontWeight: scelta?.label === c.label ? 700 : 400,
                    color: scelta?.label === c.label ? (lato === 'noi' ? NOI : LORO) : 'var(--text)' }}>{conta(p.match_name, lato === 'noi', c)}</td>
                ))}
              </tr>
            ))}
            <tr style={{ borderTop: '2px solid var(--border)', textAlign: 'right', fontWeight: 700 }}>
              <td style={{ textAlign: 'left', padding: '6px 8px' }}>Totale</td><td /><td />
              {voci.map(c => <td key={c.label} style={{ padding: '6px 8px' }}>{somma(c)}</td>)}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

// "2026-11-01T00:00:00" -> "01/nov/26"
const MESI = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']
const data = d => d ? `${d.slice(8, 10)}/${MESI[Number(d.slice(5, 7)) - 1]}/${d.slice(2, 4)}` : ''
const kpi = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 16px' }
const kpiNum = { fontFamily: 'var(--font-display)', fontSize: 28, color: 'var(--text)', display: 'block', lineHeight: 1.1 }
const kpiLab = { fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }
const partita = { background: 'var(--bg-card)', border: '1px solid', borderRadius: 8, padding: '6px 9px', fontSize: 11.5, minWidth: 84,
  textAlign: 'center', color: 'var(--text)', textDecoration: 'none' }
const tabStile = { padding: '0.5rem 1rem', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-muted)',
  cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: '0.9rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }
const tabAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const chip = { padding: '4px 10px', borderRadius: 6, fontSize: 12, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', background: 'transparent', color: '#64748B' }
const chipAttivo = { border: '1px solid var(--primary)', background: 'rgba(0,229,255,0.1)', color: 'var(--primary)' }
const card = { background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 14, padding: '1.25rem 1.5rem' }
