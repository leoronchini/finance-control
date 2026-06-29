import { useState, useMemo } from 'react'
import { currency } from '../utils/format'

const TIPO_ORDER = { entrada: 0, reembolso: 1, investimento: 2, 'saída': 3 }

function parseDate(data, hora) {
  const [d, m, y] = data.split('/')
  return `${y}${m}${d}${(hora || '').replace(':', '')}`
}

function sortRows(rows, key, dir) {
  return [...rows].sort((a, b) => {
    let va, vb
    if (key === 'data') {
      va = parseDate(a.data, a.hora)
      vb = parseDate(b.data, b.hora)
    } else if (key === 'valor') {
      va = Number(a.valor)
      vb = Number(b.valor)
    } else if (key === 'categoria') {
      va = (a.categoria || '').toLowerCase()
      vb = (b.categoria || '').toLowerCase()
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

export default function TransactionTable({ transactions, onEdit, onDelete }) {
  const [confirmId, setConfirmId] = useState(null)
  const [sortKey, setSortKey] = useState('data')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = useMemo(() => sortRows(transactions, sortKey, sortDir), [transactions, sortKey, sortDir])

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir(key === 'data' ? 'desc' : 'asc')
    }
  }

  if (!transactions?.length) {
    return <p style={{ color: 'var(--muted)', padding: 20 }}>Nenhuma transação encontrada.</p>
  }

  const sortable = { data: 'Data', valor: 'Valor', categoria: 'Categoria' }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Data', 'Hora', 'Tipo', 'Descrição', 'Categoria', 'Valor', 'Ações'].map(h => {
              const key = Object.entries(sortable).find(([, label]) => label === h)?.[0]
              const active = key && sortKey === key
              return (
                <th
                  key={h}
                  onClick={key ? () => handleSort(key) : undefined}
                  style={{
                    color: active ? 'var(--text)' : 'var(--muted)',
                    fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px',
                    padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                    cursor: key ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {h}
                  {key && (
                    <span style={{ marginLeft: 4, opacity: active ? 1 : .3, fontSize: 10 }}>
                      {active ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
                    </span>
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((t, i) => (
            <tr
              key={t.id}
              style={{ borderBottom: i < sorted.length - 1 ? '1px solid var(--border)' : 'none' }}
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
