'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchAPI } from '../../../lib/api'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts'
import MappaTiri from '../../../components/MappaTiri'

const MAZZOLA = 'San giovannese 1927'
const COLOR_MAZZOLA = '#00E5FF'
const COLOR_OPP = '#CC44FF'

function val(data, metrica, squadra) {
  const r = data?.find(d => d.metrica === metrica && d.squadra === squadra)
  return r?.valore ?? 0
}

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

function GraficoSpeculare({ data, squadraA, squadraB, metriche }) {
  const rows = metriche.map(m => ({
    metrica: m,
    a: val(data, m, squadraA),
    b: val(data, m, squadraB),
  }))
  const maxVal = Math.max(...rows.flatMap(r => [r.a, r.b]), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_MAZZOLA, textAlign: 'right', fontWeight: 700 }}>
          {squadraA}
        </div>
        <div></div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.85rem', color: COLOR_OPP, textAlign: 'left', fontWeight: 700 }}>
          {squadraB}
        </div>
      </div>
      {rows.map(({ metrica, a, b }) => (
        <div key={metrica} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 1fr', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_MAZZOLA, fontWeight: 700, minWidth: '24px', textAlign: 'right' }}>{a}</span>
            <div style={{ height: '8px', borderRadius: '4px 0 0 4px', background: COLOR_MAZZOLA, width: `${(a / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }}></div>
          </div>
          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-display)', letterSpacing: '0.03em' }}>
            {metrica.replace(/_/g, ' ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ height: '8px', borderRadius: '0 4px 4px 0', background: COLOR_OPP, width: `${(b / maxVal) * 100}%`, maxWidth: '120px', transition: 'width 0.4s' }}></div>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', color: COLOR_OPP, fontWeight: 700, minWidth: '24px' }}>{b}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

function BarraPossesso({ squadra, perc, color }) {
  return (
    <div style={{ marginBottom: '0.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
        <span style={{ color: 'var(--text-muted)' }}>{squadra}</span>
        <span style={{ color, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{perc}%</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '8px' }}>
        <div style={{ width: `${perc}%`, height: '100%', background: color, borderRadius: '4px', transition: 'width 0.6s' }}></div>
      </div>
    </div>
  )
}

export default function PartitaPage() {
  const { match_name } = useParams()
  const [info, setInfo] = useState(null)
  const [sintesi, setSintesi] = useState([])
  const [possesso, setPossesso] = useState([])
  const [tiri, setTiri] = useState([])
  const [mappaTiri, setMappaTiri] = useState([])
  const [passaggi, setPassaggi] = useState([])
  const [crossLanci, setCrossLanci] = useState([])
  const [duelli, setDuelli] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('sintesi')

  useEffect(() => {
    if (!match_name) return
    Promise.all([
      fetchAPI(`/stats/riepilogo/${match_name}`),
      fetchAPI(`/analytics/sintesi/${match_name}`),
      fetchAPI(`/analytics/possesso/${match_name}`),
      fetchAPI(`/analytics/tiri/${match_name}`),
      fetchAPI(`/analytics/mappa-tiri/${match_name}`),
      fetchAPI(`/analytics/passaggi/${match_name}`),
      fetchAPI(`/analytics/cross-lanci/${match_name}`),
      fetchAPI(`/analytics/duelli/${match_name}`),
    ]).then(([i, s, p, t, mt, pa, cl, d]) => {
      setInfo(i)
      setSintesi(s.data || [])
      setPossesso(p.data || [])
      setTiri(t.data || [])
      setMappaTiri(mt.data || [])
      setPassaggi(pa.data || [])
      setCrossLanci(cl.data || [])
      setDuelli(d.data || [])
      setLoading(false)
    }).catch(err => { console.error(err); setLoading(false) })
  }, [match_name])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>CARICAMENTO...</div>
    </div>
  )

  if (!info) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Partita non trovata</div>
  )

  const avversario = info.homeTeam === MAZZOLA ? info.awayTeam : info.homeTeam
  const TABS = ['sintesi', 'tiri', 'mappa tiri', 'passaggi', 'cross & lanci', 'duelli']

  const passaggiChart = ['Chiave', 'Cambio Gioco'].map(tip => {
    const filMaz = passaggi.filter(p => p.tipologia === tip && p.squadra === MAZZOLA)
    const filOpp = passaggi.filter(p => p.tipologia === tip && p.squadra === avversario)
    return {
      tipologia: tip,
      maz_tot: filMaz.reduce((a, b) => a + b.totali, 0),
      maz_comp: filMaz.reduce((a, b) => a + b.completati, 0),
      opp_tot: filOpp.reduce((a, b) => a + b.totali, 0),
      opp_comp: filOpp.reduce((a, b) => a + b.completati, 0),
    }
  })

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px', margin: '0 auto' }}>

      <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← Dashboard
      </Link>

      {/* Header */}
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {info.date ? new Date(info.date).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700 }}>
            <span style={{ color: COLOR_MAZZOLA }}>{info.homeTeam}</span>
            <span style={{ color: 'var(--text-muted)', margin: '0 0.75rem' }}>vs</span>
            <span style={{ color: COLOR_OPP }}>{info.awayTeam}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_MAZZOLA, lineHeight: 1 }}>
              {val(sintesi, 'Reti', MAZZOLA)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reti Mazzola</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 700, color: COLOR_OPP, lineHeight: 1 }}>
              {val(sintesi, 'Reti', avversario)}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Reti {avversario}</div>
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

      {/* ── TAB: SINTESI ── */}
      {tab === 'sintesi' && (
        <>
          <Section title="Sintesi Partita">
            <GraficoSpeculare
              data={sintesi}
              squadraA={MAZZOLA}
              squadraB={avversario}
              metriche={['Reti','Tiri_Totali','Tiri_Specchio','Tiri_dentro_Area','Occasioni_Goal','Azioni_Promettenti','Corner','Falli_Totali','Ammonizioni','Espulsioni','Fuorigioco','Parate']}
            />
          </Section>

          {possesso.length > 0 && (
            <Section title="Possesso Palla">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                {['perc_totale', 'perc_pt', 'perc_st'].map((campo, i) => (
                  <div key={campo}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
                      {['Totale', 'Primo Tempo', 'Secondo Tempo'][i]}
                    </div>
                    {possesso.map((p, j) => (
                      <BarraPossesso key={p.squadra} squadra={p.squadra} perc={p[campo]} color={j === 0 ? COLOR_MAZZOLA : COLOR_OPP} />
                    ))}
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                {possesso.map((p, i) => (
                  <div key={p.squadra} style={{ fontSize: '0.85rem' }}>
                    <span style={{ color: i === 0 ? COLOR_MAZZOLA : COLOR_OPP, fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.squadra}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '8px' }}>⏱ {p.minuti_possesso}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </>
      )}

      {/* ── TAB: TIRI ── */}
      {tab === 'tiri' && (
        <Section title="Analisi Tiri">
          {tiri.map((t, i) => (
            <div key={`${t.squadra}-${i}`} style={{ marginBottom: '1.5rem' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', fontWeight: 700, color: i === 0 ? COLOR_MAZZOLA : COLOR_OPP, marginBottom: '0.75rem' }}>
                {t.squadra}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem' }}>
                {[
                  { label: 'Tiri Totali', val: t.tiri_totali },
                  { label: 'Specchio', val: t.tiri_specchio },
                  { label: 'Reti', val: t.reti },
                  { label: 'Fuori', val: t.fuori },
                  { label: 'Parate', val: t.parate },
                  { label: 'Specchio PT', val: t.specchio_pt },
                  { label: 'Specchio ST', val: t.specchio_st },
                  { label: 'Destro', val: t.specchio_dx },
                  { label: 'Sinistro', val: t.specchio_sx },
                  { label: 'Testa', val: t.specchio_testa },
                ].map(({ label, val: v }) => (
                  <div key={label} style={{
                    background: 'rgba(255,255,255,0.04)', borderRadius: '8px',
                    padding: '0.75rem', textAlign: 'center'
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: i === 0 ? COLOR_MAZZOLA : COLOR_OPP }}>{v ?? 0}</div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: '2px' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Section>
      )}

      {/* ── TAB: MAPPA TIRI ── */}
      {tab === 'mappa tiri' && (
        <Section title="Mappa Tiri">
          <MappaTiri data={mappaTiri} matchName={match_name} />
        </Section>
      )}

      {/* ── TAB: PASSAGGI ── */}
      {tab === 'passaggi' && (
        <Section title="Passaggi Chiave e Cambi Gioco">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={passaggiChart} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="tipologia" tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#F0F4FF' }} />
              <Bar dataKey="maz_tot" name={`${MAZZOLA} Totali`} fill={COLOR_MAZZOLA} opacity={0.4} radius={[4,4,0,0]} />
              <Bar dataKey="maz_comp" name={`${MAZZOLA} Completati`} fill={COLOR_MAZZOLA} radius={[4,4,0,0]} />
              <Bar dataKey="opp_tot" name={`${avversario} Totali`} fill={COLOR_OPP} opacity={0.4} radius={[4,4,0,0]} />
              <Bar dataKey="opp_comp" name={`${avversario} Completati`} fill={COLOR_OPP} radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: '1.5rem', overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Squadra','Tipologia','Posizione','Tempo','Totali','Completati'].map(h => (
                    <th key={h} style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {passaggi.map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.5rem', color: p.squadra === MAZZOLA ? COLOR_MAZZOLA : COLOR_OPP }}>{p.squadra}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text)' }}>{p.tipologia}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{p.posizione}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{p.tempo?.replace('_', ' ')}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{p.totali}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{p.completati}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── TAB: CROSS & LANCI ── */}
      {tab === 'cross & lanci' && (
        <Section title="Cross e Lanci">
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Categoria','Squadra','Tipo','Provenienza','Tempo','Totali','Completati'].map(h => (
                    <th key={h} style={{ padding: '0.5rem', color: 'var(--text-muted)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.7rem' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {crossLanci.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{c.categoria}</td>
                    <td style={{ padding: '0.5rem', color: c.squadra === MAZZOLA ? COLOR_MAZZOLA : COLOR_OPP }}>{c.squadra}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text)' }}>{c.tipologia}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{c.provenienza}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text-muted)' }}>{c.tempo?.replace('_', ' ')}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--text)', fontFamily: 'var(--font-display)' }}>{c.totali}</td>
                    <td style={{ padding: '0.5rem', color: 'var(--primary)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{c.completati}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* ── TAB: DUELLI ── */}
      {tab === 'duelli' && (
        <Section title="Duelli e Palle Recuperate">
          <GraficoSpeculare
            data={duelli.filter(d => d.categoria === 'Duelli').map(d => ({
              metrica: `${d.tipologia}_${d.posizione}`,
              squadra: d.squadra,
              valore: d.valore
            }))}
            squadraA={MAZZOLA}
            squadraB={avversario}
            metriche={[...new Set(duelli.filter(d => d.categoria === 'Duelli').map(d => `${d.tipologia}_${d.posizione}`))]}
          />
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.25rem' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', color: 'var(--text-muted)', letterSpacing: '0.06em', marginBottom: '0.75rem', textTransform: 'uppercase' }}>
              Palle Recuperate
            </div>
            <GraficoSpeculare
              data={duelli.filter(d => d.categoria === 'Palle Recuperate').map(d => ({
                metrica: `Recuperate_${d.posizione}`,
                squadra: d.squadra,
                valore: d.valore
              }))}
              squadraA={MAZZOLA}
              squadraB={avversario}
              metriche={[...new Set(duelli.filter(d => d.categoria === 'Palle Recuperate').map(d => `Recuperate_${d.posizione}`))]}
            />
          </div>
        </Section>
      )}
    </div>
  )
}
