import { useNavigate } from 'react-router-dom'
import { currency } from '../utils/format'

export default function SummaryCards({ summary }) {
  const navigate = useNavigate()

  if (!summary) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
      {[1,2,3,4,5].map(i => <div key={i} style={cardStyle}><div style={{ height: 60, background: 'var(--bg3)', borderRadius: 8 }} /></div>)}
    </div>
  )

  const reembolsos = summary.total_reembolsos ?? 0
  const investidos = summary.total_investidos ?? 0
  const saldo = summary.saldo ?? ((summary.total_entradas ?? 0) + reembolsos - (summary.total_saidas ?? 0) - investidos)

  const cards = [
    {
      label: 'Total de Entradas',
      value: summary.total_entradas ?? 0,
      color: 'var(--green)',
      icon: '💰',
      route: '/transactions',
    },
    {
      label: 'Total de Saídas',
      value: summary.total_saidas ?? 0,
      color: 'var(--red)',
      icon: '💸',
      sub: reembolsos > 0 ? `Custo efetivo: ${currency(summary.custo_real ?? (summary.total_saidas ?? 0) - reembolsos)}` : null,
      route: '/transactions',
    },
    {
      label: 'Reembolsos',
      value: reembolsos,
      color: '#3b82f6',
      icon: '🔵',
      route: '/transactions',
    },
    {
      label: 'Investimentos',
      value: investidos,
      color: '#a855f7',
      icon: '🟣',
      route: '/transactions',
    },
    {
      label: 'Saldo do Mês',
      value: saldo,
      color: saldo >= 0 ? 'var(--green)' : 'var(--red)',
      icon: saldo >= 0 ? '✅' : '⚠️',
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 16 }}>
      {cards.map(({ label, value, color, sub, icon, route }) => (
        <div
          key={label}
          style={{
            ...cardStyle,
            cursor: route ? 'pointer' : 'default',
            transition: 'border-color .15s, transform .1s',
          }}
          onClick={() => route && navigate(route)}
          onMouseEnter={e => { if (route) { e.currentTarget.style.borderColor = color; e.currentTarget.style.transform = 'translateY(-2px)' }}}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'none' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
            <div style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.6px' }}>
              {label}
            </div>
            <span style={{ fontSize: 16 }}>{icon}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color }}>{currency(value)}</div>
          {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{sub}</div>}
          {route && (
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, opacity: .6 }}>
              Ver detalhes →
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

const cardStyle = {
  background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 12, padding: '18px 20px',
}
