'use client'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function EventiChart({ data }) {
  const formatted = data.map(d => ({
    ...d,
    // Supporta sia v1 (homeTeam/awayTeam) che v2 (home_team/away_team)
    label: d.match_name
      ? d.match_name.charAt(0).toUpperCase() + d.match_name.slice(1)
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
