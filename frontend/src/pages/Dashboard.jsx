import { useState, useEffect, useMemo } from 'react'
import { getSummary, getTransactions } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { currency } from '../utils/format'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import SummaryCards from '../components/SummaryCards'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'
import { SkeletonCards, SkeletonRows } from '../components/Skeleton'

export default function Dashboard() {
  const { mes, ano } = useMonth()
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [rev, setRev] = useState(0)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getSummary(mes, ano).then(setSummary),
      getTransactions(mes, ano).then(setTransactions),
    ]).catch(console.error).finally(() => setLoading(false))
  }, [mes, ano, rev])

  const topExpenses = useMemo(() => {
    const byDesc = {}
    transactions.filter(t => t.tipo === 'saída').forEach(t => {
      byDesc[t.descricao] = (byDesc[t.descricao] || 0) + Number(t.valor)
    })
    const sorted = Object.entries(byDesc).sort(([,a],[,b]) => b - a).slice(0, 7)
    const max = sorted[0]?.[1] || 1
    return sorted.map(([name, value]) => ({ name, value, pct: value / max }))
  }, [transactions])

  const recent = useMemo(() =>
    [...transactions].sort((a, b) => {
      const da = a.data.split('/').reverse().join('') + a.hora
      const db = b.data.split('/').reverse().join('') + b.hora
      return db.localeCompare(da)
    }).slice(0, 10),
    [transactions]
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar>
        <MonthSelector />
      </TopBar>

      {loading ? <SkeletonCards /> : <SummaryCards summary={summary} />}

      <div style={{ display: 'grid', gridTemplateColumns: '60% 1fr', gap: 20 }}>
        {loading ? (
          <>
            <Panel><SkeletonRows rows={7} /></Panel>
            <Panel><SkeletonRows rows={7} /></Panel>
          </>
        ) : (
          <>
            <Panel title="Maiores Gastos do Mês">
              {topExpenses.length === 0
                ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma saída no período.</p>
                : (
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 220, paddingBottom: 4 }}>
                    {topExpenses.map(({ name, value, pct }) => (
                      <div key={name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                        <div style={{
                          width: '100%', background: 'var(--red)', borderRadius: '4px 4px 0 0',
                          height: Math.max(8, pct * 200),
                        }} />
                        <div style={{
                          fontSize: 10, color: 'var(--muted)', marginTop: 6, textAlign: 'center',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 56,
                        }} title={name}>{name}</div>
                      </div>
                    ))}
                  </div>
                )
              }
            </Panel>

            <Panel title="Transações Recentes">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recent.length === 0
                  ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma transação no período.</p>
                  : recent.map((t, i) => (
                    <div key={t.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 0', borderBottom: i < recent.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 500 }}>{t.descricao}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{t.data} · {t.hora}</div>
                      </div>
                      <div style={{ fontWeight: 600, color: t.tipo === 'entrada' ? 'var(--green)' : 'var(--red)' }}>
                        {t.tipo === 'entrada' ? '+' : '−'}{currency(t.valor)}
                      </div>
                    </div>
                  ))
                }
              </div>
            </Panel>
          </>
        )}
      </div>

      <PageFooter onRefresh={() => setRev(r => r + 1)} />
    </div>
  )
}
