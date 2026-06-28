import { currency } from '../utils/format'

export default function SummaryCards({ summary }) {
  if (!summary) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
      {[1,2,3,4,5].map(i => <div key={i} style={cardStyle}><div style={{ height: 60, background: 'var(--bg3)', borderRadius: 8 }} /></div>)}
    </div>
  )

  const reembolsos   = summary.total_reembolsos ?? 0
  const investidos   = summary.total_investidos ?? 0
  const saldo = summary.saldo ?? ((summary.total_entradas ?? 0) + reembolsos - (summary.total_saidas ?? 0) - investidos)

  const cards = [
    { label: 'Total de Entradas', value: summary.total_entradas ?? 0, color: 'var(--green)' },
    {
      label: 'Total de Saídas',
      value: summary.total_saidas ?? 0,
      color: 'var(--red)',
      sub: reembolsos > 0 ? `Custo efetivo: ${currency(summary.custo_real ?? (summary.total_saidas ?? 0) - reembolsos)}` : null,
    },
    { label: 'Reembolsos', value: reembolsos, color: '#3b82f6' },
    { label: 'Investimentos', value: investidos, color: '#a855f7' },
    { label: 'Saldo do Mês', value: saldo, color: saldo >= 0 ? 'var(--green)' : 'var(--red)' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
      {cards.map(({ label, value, color, sub }) => (
        <div key={label} style={cardStyle}>
          <div style={{ color: 'var(--muted)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 10 }}>
            {label}
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color }}>{currency(value)}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '20px 24px',
}
