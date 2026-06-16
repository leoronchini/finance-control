import { useState, useEffect, useMemo } from 'react'
import { getTransactions } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { currency } from '../utils/format'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

const filterBtn = (active) => ({
  background: active ? '#3b82f611' : 'var(--bg3)',
  border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
  color: active ? 'var(--blue)' : 'var(--muted)',
  padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
})

export default function ItemSummary() {
  const { mes, ano } = useMonth()
  const [transactions, setTransactions] = useState([])
  const [mode, setMode] = useState('chart')
  const [rev, setRev] = useState(0)

  useEffect(() => {
    getTransactions(mes, ano).then(setTransactions).catch(console.error)
  }, [mes, ano, rev])

  const items = useMemo(() => {
    const map = {}
    transactions.filter(t => t.tipo === 'saída').forEach(t => {
      if (!map[t.descricao]) map[t.descricao] = { total: 0, count: 0 }
      map[t.descricao].total += Number(t.valor)
      map[t.descricao].count += 1
    })
    const total = Object.values(map).reduce((s, v) => s + v.total, 0)
    return Object.entries(map)
      .sort(([,a],[,b]) => b.total - a.total)
      .map(([name, { total: v, count }]) => ({
        name, total: v, count, pct: total > 0 ? (v / total * 100).toFixed(1) : '0',
      }))
  }, [transactions])

  const maxVal = items[0]?.total || 1

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Resumo por Item" />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <MonthSelector />
        <div style={{ display: 'flex', gap: 4 }}>
          <button style={filterBtn(mode === 'chart')} onClick={() => setMode('chart')}>Gráfico</button>
          <button style={filterBtn(mode === 'table')} onClick={() => setMode('table')}>Tabela</button>
        </div>
      </div>

      <Panel title={`Gastos por Descrição — ${mes}/${ano}`}>
        {items.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma saída no período.</p>
          : mode === 'chart'
            ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 8 }}>
                {items.map(({ name, total, pct }) => (
                  <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 120, fontSize: 12, color: 'var(--muted)', textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      title={name}>{name}</div>
                    <div style={{ flex: 1, height: 18, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'var(--red)', borderRadius: 4, width: `${(total / maxVal) * 100}%` }} />
                    </div>
                    <div style={{ width: 100, fontSize: 12, fontWeight: 600, color: 'var(--red)', flexShrink: 0 }}>
                      {currency(total)}
                    </div>
                  </div>
                ))}
              </div>
            )
            : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)' }}>
                      {['Descrição','Total Gasto','Lançamentos','% Saídas'].map(h => (
                        <th key={h} style={{ color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.5px', padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(({ name, total, count, pct }, i) => (
                      <tr key={name} style={{ borderBottom: i < items.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <td style={{ padding: '11px 12px' }}>{name}</td>
                        <td style={{ padding: '11px 12px', color: 'var(--red)', fontWeight: 600 }}>{currency(total)}</td>
                        <td style={{ padding: '11px 12px', color: 'var(--muted)' }}>{count}</td>
                        <td style={{ padding: '11px 12px', color: 'var(--muted)' }}>{pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </Panel>

      <PageFooter onRefresh={() => setRev(r => r + 1)} />
    </div>
  )
}
