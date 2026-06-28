import { useState } from 'react'
import { currency } from '../utils/format'

export default function TransactionTable({ transactions, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)

  if (!transactions?.length) {
    return <p style={{ color: 'var(--muted)', padding: 20 }}>Nenhuma transação encontrada.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Data','Hora','Tipo','Descrição','Categoria','Valor','Ações'].map(h => (
              <th key={h} style={{
                color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase',
                letterSpacing: '.5px', padding: '8px 12px', textAlign: 'left', fontWeight: 600,
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t, i) => (
            <tr key={t.id}
              style={{ borderBottom: i < transactions.length - 1 ? '1px solid var(--border)' : 'none' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={tdStyle}>{t.data}</td>
              <td style={tdStyle}>{t.hora}</td>
              <td style={tdStyle}>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: t.tipo === 'entrada' ? 'var(--green-dim)' : t.tipo === 'reembolso' ? '#3b82f611' : t.tipo === 'investimento' ? '#a855f711' : 'var(--red-dim)',
                  color: t.tipo === 'entrada' ? 'var(--green)' : t.tipo === 'reembolso' ? '#3b82f6' : t.tipo === 'investimento' ? '#a855f7' : 'var(--red)',
                }}>
                  {t.tipo}
                </span>
              </td>
              <td style={tdStyle}>{t.descricao}</td>
              <td style={{ ...tdStyle, color: 'var(--muted)' }}>{t.categoria || '—'}</td>
              <td style={{ ...tdStyle, fontWeight: 600, color: t.tipo === 'entrada' ? 'var(--green)' : t.tipo === 'reembolso' ? '#3b82f6' : t.tipo === 'investimento' ? '#a855f7' : 'var(--red)' }}>
                {t.tipo === 'entrada' || t.tipo === 'reembolso' ? '+' : '−'}{currency(t.valor)}
              </td>
              <td style={tdStyle}>
                <div style={{ display: 'flex', gap: 8 }}>
                  <IconBtn title="Editar" onClick={() => onEdit(t)}>✏</IconBtn>
                  {confirmId === t.id ? (
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Confirmar?</span>
                      <IconBtn title="Sim" onClick={() => { onDelete(t.id); setConfirmId(null) }} color="var(--red)">✓</IconBtn>
                      <IconBtn title="Não" onClick={() => setConfirmId(null)}>✕</IconBtn>
                    </div>
                  ) : (
                    <IconBtn title="Excluir" onClick={() => setConfirmId(t.id)}>🗑</IconBtn>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const tdStyle = { padding: '11px 12px', color: 'var(--text)' }

function IconBtn({ children, onClick, title, color }) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        color: color || 'var(--muted)', width: 28, height: 28, borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 13,
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--text)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = color || 'var(--muted)' }}
    >
      {children}
    </button>
  )
}
