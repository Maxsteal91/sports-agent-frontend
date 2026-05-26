'use client'
import { useEffect, useState } from 'react'
import { fetchAPI } from '../../lib/api'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const EVENTI_DISPONIBILI = [
  'Shot', 'Passaggi', 'Dribbling', 'Duelli', 'Occasioni Goal',
  'Corner', 'Cross', 'Palle Recuperate', 'Disciplina', 'Lanci'
]

export default function ConfrontoPage() {
  const [data, setData] = useState([])
  const [eventoSelezionato, setEventoSelezionato] = useState('Shot')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchAPI(`/stats/confronto/${encodeURIComponent(eventoSelezionato)}`)
      .then(res => {
        setData(res.data || [])
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [eventoSelezionato])

  const chartData = data.map(d => ({
    partita: d.homeTeam === 'Sangiovannese 1927' ? `vs ${d.awayTeam}` : `vs ${d.homeTeam}`,
    totale: d.totale
  }))

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>

      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', fontWeight: 700, letterSpacing: '0.05em', color: 'var(--primary)' }}>
          CONFRONTO PARTITE
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.25rem' }}>
          Confronta un tipo di evento tra tutte le partite
        </p>
      </div>

      {/* Selettore evento */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {EVENTI_DISPONIBILI.map(e => (
            <button
              key={e}
              onClick={() => setEventoSelezionato(e)}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: `1px solid ${eventoSelezionato === e ? 'var(--primary)' : 'var(--border)'}`,
                background: eventoSelezionato === e ? 'rgba(0,229,255,0.1)' : 'var(--bg-card)',
                color: eventoSelezionato === e ? 'var(--primary)' : 'var(--text-muted)',
                cursor: 'pointer',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                fontWeight: 600,
                letterSpacing: '0.03em',
                transition: 'all 0.2s'
              }}
            >
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Grafico */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
          {eventoSelezionato.toUpperCase()} — TUTTE LE PARTITE
        </h2>
        {loading ? (
          <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Caricamento...
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 50 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="partita" tick={{ fill: '#7A8BA8', fontSize: 11 }} angle={-35} textAnchor="end" interval={0} />
              <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#F0F4FF' }} cursor={{ fill: 'rgba(0,229,255,0.05)' }} />
              <Bar dataKey="totale" fill="#FF6B35" radius={[4, 4, 0, 0]} name={eventoSelezionato} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Tabella dati */}
      {data.length > 0 && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 600, letterSpacing: '0.05em', marginBottom: '1rem', color: 'var(--text)' }}>
            DETTAGLIO
          </h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' }}>Casa</th>
                <th style={{ textAlign: 'left', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' }}>Ospite</th>
                <th style={{ textAlign: 'right', padding: '0.5rem', color: 'var(--text-muted)', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', fontSize: '0.75rem' }}>{eventoSelezionato}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((d, i) => (
                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{d.homeTeam}</td>
                  <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text)' }}>{d.awayTeam}</td>
                  <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right', fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--accent)', fontWeight: 600 }}>{d.totale}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
