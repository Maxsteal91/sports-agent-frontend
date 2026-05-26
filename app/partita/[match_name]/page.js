'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { fetchAPI } from '../../lib/api'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

export default function PartitaPage() {
  const { match_name } = useParams()
  const [riepilogo, setRiepilogo] = useState(null)
  const [radar, setRadar] = useState([])
  const [tiri, setTiri] = useState(null)
  const [possesso, setPossesso] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!match_name) return
    Promise.all([
      fetchAPI(`/stats/riepilogo/${match_name}`),
      fetchAPI(`/dashboard/radar/${match_name}`),
      fetchAPI(`/stats/evento/shot/${match_name}`),
      fetchAPI(`/dashboard/possesso/${match_name}`),
    ]).then(([r, rad, t, p]) => {
      setRiepilogo(r)
      setRadar(rad.data || [])
      setTiri(t)
      setPossesso(p.data || [])
      setLoading(false)
    }).catch(err => {
      console.error(err)
      setLoading(false)
    })
  }, [match_name])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', color: 'var(--primary)' }}>CARICAMENTO...</div>
    </div>
  )

  if (!riepilogo) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>Partita non trovata</div>
  )

  // Raggruppa radar per squadra
  const squadre = [...new Set(radar.map(r => r.squadra).filter(Boolean))]
  const radarData = [...new Set(radar.map(r => r.categoria))].map(cat => {
    const row = { categoria: cat }
    squadre.forEach(s => {
      const found = radar.find(r => r.categoria === cat && r.squadra === s)
      row[s] = found ? found.valore : 0
    })
    return row
  })

  const COLORS = ['#00E5FF', '#FF6B35', '#00E676', '#FFD600']

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      {/* Back */}
      <Link href="/" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '1.5rem' }}>
        ← Dashboard
      </Link>

      {/* Header partita */}
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1.5rem',
        marginBottom: '2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {riepilogo.date ? new Date(riepilogo.date).toLocaleDateString('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }) : '—'}
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', fontWeight: 700, letterSpacing: '0.03em' }}>
            {riepilogo.homeTeam} <span style={{ color: 'var(--text-muted)' }}>vs</span> {riepilogo.awayTeam}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, color: 'var(--primary)' }}>
            {riepilogo.totale_eventi}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>eventi totali</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Riepilogo eventi */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            EVENTI
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {riepilogo.dettaglio?.map(e => (
              <div key={e.evento} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{e.evento}</span>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, color: 'var(--primary)' }}>{e.totale}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tiri */}
        {tiri && (
          <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
              TIRI ({tiri.totale})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '300px', overflowY: 'auto' }}>
              {tiri.data?.map((t, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', padding: '0.4rem 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: '0.8rem' }}>
                  <span style={{ color: 'var(--primary)', minWidth: '80px' }}>{t.minuto?.substring(0, 8)}</span>
                  {t.attr_Squadra && <span style={{ color: 'var(--text)' }}>{t.attr_Squadra}</span>}
                  {t.attr_Result && <span style={{
                    padding: '1px 8px', borderRadius: '4px', fontSize: '0.75rem',
                    background: t.attr_Result === 'goal' ? 'rgba(0,230,118,0.15)' : 'rgba(255,107,53,0.15)',
                    color: t.attr_Result === 'goal' ? 'var(--success)' : 'var(--accent)'
                  }}>{t.attr_Result}</span>}
                  {t.attr_Provenienza && <span style={{ color: 'var(--text-muted)' }}>{t.attr_Provenienza}</span>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Radar chart */}
      {radarData.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '0.5rem', color: 'var(--text)' }}>
            PROFILO SQUADRE
          </h2>
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {squadre.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
                <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: COLORS[i] }}></div>
                <span style={{ color: 'var(--text-muted)' }}>{s}</span>
              </div>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.1)" />
              <PolarAngleAxis dataKey="categoria" tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              {squadre.map((s, i) => (
                <Radar key={s} name={s} dataKey={s} stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.15} />
              ))}
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#F0F4FF' }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Possesso */}
      {possesso.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            POSSESSO PALLA
          </h2>
          {possesso.map((p, i) => {
            const tot = possesso.reduce((a, b) => a + b.totale, 0)
            const pct = Math.round((p.totale / tot) * 100)
            return (
              <div key={i} style={{ marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.85rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{p.squadra}</span>
                  <span style={{ color: COLORS[i], fontFamily: 'var(--font-display)', fontWeight: 600 }}>{pct}%</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: COLORS[i], borderRadius: '4px', transition: 'width 0.6s ease' }}></div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
