import { currency } from '../utils/format'

export default function SummaryCards({ summary }) {
  if (!summary) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {[1,2,3].map(i => <div key={i} style={cardStyle}><div style={{ height: 60, background: 'var(--bg3)', borderRadius: 8 }} /></div>)}
    </div>
  )

  const saldo = (summary.total_entradas ?? 0) - (summary.total_saidas ?? 0)
  const cards = [
    { label: 'Total de Entradas', value: summary.total_entradas ?? 0, color: 'var(--green)' },
    { label: 'Total de Saídas',   value: summary.total_saidas   ?? 0, color: 'var(--red)' },
    { label: 'Saldo do Mês',      value: summary.saldo ?? saldo,       color: (summary.saldo ?? saldo) >= 0 ? 'var(--green)' : 'var(--red)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={cardStyle}>
          <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color }}>{currency(value)}</div>
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '20px 24px',
}
