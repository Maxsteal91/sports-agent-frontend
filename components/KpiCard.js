export default function KpiCard({ label, value, icon, color }) {
  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border)',
      borderRadius: '12px',
      padding: '1.25rem',
      borderTop: `3px solid ${color}`,
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '2rem',
        fontWeight: 700,
        color: color,
        letterSpacing: '0.02em',
        lineHeight: 1
      }}>
        {value?.toLocaleString('it-IT') ?? '—'}
      </div>
      <div style={{
        color: 'var(--text-muted)',
        fontSize: '0.8rem',
        marginTop: '0.25rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em'
      }}>
        {label}
      </div>
    </div>
  )
}
