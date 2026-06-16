import { useState, useEffect, useMemo } from 'react'
import { getTransactions } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { currency } from '../utils/format'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

// Mapeamento estático descrição → grupo (V1.0 — categoria está vazia na planilha)
const GROUP_MAP = {
  'aluguel': 'Gastos Fixos', 'academia': 'Gastos Fixos', 'condomínio': 'Gastos Fixos',
  'internet': 'Gastos Fixos', 'plano': 'Gastos Fixos',
  'mercado': 'Alimentação', 'restaurante': 'Alimentação', 'ifood': 'Alimentação',
  'lanche': 'Alimentação', 'supermercado': 'Alimentação',
  'gasolina': 'Transporte', 'uber': 'Transporte', 'combustível': 'Transporte',
  'estacionamento': 'Transporte', 'ônibus': 'Transporte',
  'streaming': 'Lazer & Assinaturas', 'netflix': 'Lazer & Assinaturas',
  'spotify': 'Lazer & Assinaturas', 'cinema': 'Lazer & Assinaturas',
  'farmácia': 'Saúde', 'médico': 'Saúde', 'remédio': 'Saúde',
}
const GROUP_COLORS = {
  'Gastos Fixos': '#ef4444',
  'Alimentação': '#f97316',
  'Transporte': '#a855f7',
  'Lazer & Assinaturas': '#3b82f6',
  'Saúde': '#22c55e',
  'Outros': '#7c85a2',
}

function getGroup(descricao) {
  const key = descricao.toLowerCase()
  for (const [k, g] of Object.entries(GROUP_MAP)) {
    if (key.includes(k)) return g
  }
  return 'Outros'
}

export default function GroupSummary() {
  const { mes, ano } = useMonth()
  const [transactions, setTransactions] = useState([])
  const [rev, setRev] = useState(0)

  useEffect(() => {
    getTransactions(mes, ano).then(setTransactions).catch(console.error)
  }, [mes, ano, rev])

  const groups = useMemo(() => {
    const map = {}
    const saidas = transactions.filter(t => t.tipo === 'saída')
    const totalSaidas = saidas.reduce((s, t) => s + Number(t.valor), 0)

    saidas.forEach(t => {
      const g = getGroup(t.descricao)
      if (!map[g]) map[g] = { items: {}, total: 0 }
      map[g].total += Number(t.valor)
      map[g].items[t.descricao] = (map[g].items[t.descricao] || 0) + Number(t.valor)
    })

    return Object.entries(map)
      .sort(([,a],[,b]) => b.total - a.total)
      .map(([name, { total, items }]) => ({
        name, total,
        pct: totalSaidas > 0 ? (total / totalSaidas * 100).toFixed(1) : '0',
        color: GROUP_COLORS[name] || '#7c85a2',
        items: Object.entries(items).sort(([,a],[,b]) => b - a),
      }))
  }, [transactions])

  const pieData = groups.map(g => ({ name: g.name, value: g.total, color: g.color }))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Resumo por Grupo" />
      <MonthSelector />

      {groups.length === 0
        ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma saída no período.</p>
        : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {groups.map(({ name, total, pct, color, items }) => (
                <div key={name} style={{
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 12, padding: 18,
                }}>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>{name}</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color, marginBottom: 2 }}>{currency(total)}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 12 }}>{pct}% das saídas</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {items.map(([desc, val]) => (
                      <div key={desc} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span style={{ color: 'var(--muted)' }}>{desc}</span>
                        <span>{currency(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Panel title="Proporção por Grupo">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '20px 0' }}>
                <ResponsiveContainer width={180} height={180}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius={52} outerRadius={80} paddingAngle={2}>
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}
                      formatter={v => currency(v)}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {groups.map(({ name, pct, color }) => (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
                      <span style={{ color: 'var(--muted)' }}>{name}</span>
                      <strong style={{ marginLeft: 8 }}>{pct}%</strong>
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </>
        )
      }

      <PageFooter onRefresh={() => setRev(r => r + 1)} />
    </div>
  )
}
