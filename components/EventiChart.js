'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function EventiChart({ data }) {
  const formatted = data.map(d => ({
    ...d,
    label: d.awayTeam === 'Sangiovannese 1927' || d.homeTeam === 'Sangiovannese 1927'
      ? (d.homeTeam === 'Sangiovannese 1927' ? `vs ${d.awayTeam}` : `vs ${d.homeTeam}`)
      : d.match_name
  }))

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: 0, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="label"
          tick={{ fill: '#7A8BA8', fontSize: 11 }}
          angle={-35}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fill: '#7A8BA8', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#111827', border: '1px solid rgba(0,229,255,0.3)', borderRadius: '8px', color: '#F0F4FF' }}
          cursor={{ fill: 'rgba(0,229,255,0.05)' }}
        />
        <Bar dataKey="totale" fill="#00E5FF" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
