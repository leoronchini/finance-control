import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSummary, getTransactions } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { currency } from '../utils/format'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import SummaryCards from '../components/SummaryCards'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'
import { SkeletonCards, SkeletonRows } from '../components/Skeleton'

// ── helpers ────────────────────────────────────────────────────────────────

function daysInMonth(mes, ano) {
  return new Date(Number(ano), Number(mes), 0).getDate()
}

function daysPassed(mes, ano) {
  const today = new Date()
  if (today.getFullYear() === Number(ano) && today.getMonth() + 1 === Number(mes)) {
    return today.getDate()
  }
  return daysInMonth(mes, ano)
}

// ── sub-components ─────────────────────────────────────────────────────────

function BarChart({ items, colorVar }) {
  if (!items.length) return <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum dado no período.</p>
  const max = items[0].value
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map(({ name, value }) => (
        <div key={name}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: 'var(--fg)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }} title={name}>{name}</span>
            <span style={{ color: 'var(--muted)', flexShrink: 0, marginLeft: 8 }}>{currency(value)}</span>
          </div>
          <div style={{ height: 6, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: colorVar, borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

function DonutRing({ pct, color, size = 80, stroke = 10 }) {
  const r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg3)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray .5s' }}
      />
    </svg>
  )
}

function MiniStat({ label, value, sub, color, pct, icon }) {
  return (
    <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
      {pct !== undefined ? (
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <DonutRing pct={Math.min(pct, 100)} color={color} />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color }}>
            {Math.round(pct)}%
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 28, flexShrink: 0 }}>{icon}</div>
      )}
      <div>
        <div style={{ fontSize: 11, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
        <div style={{ fontSize: 20, fontWeight: 700, color }}>{value}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
      </div>
    </div>
  )
}

function SpendingTimeline({ transactions, mes, ano }) {
  const totalDays = daysInMonth(mes, ano)
  const passed = daysPassed(mes, ano)

  const byDay = useMemo(() => {
    const acc = {}
    transactions.filter(t => t.tipo === 'saída').forEach(t => {
      const d = parseInt(t.data.split('/')[0], 10)
      acc[d] = (acc[d] || 0) + Number(t.valor)
    })
    return acc
  }, [transactions])

  const points = []
  let cumulative = 0
  for (let d = 1; d <= totalDays; d++) {
    cumulative += byDay[d] || 0
    points.push({ d, cum: cumulative, hasTx: d <= passed })
  }

  const maxVal = points[passed - 1]?.cum || 0
  const chartMax = maxVal * 1.15 || 100

  const W = 560, H = 100, PAD = 8
  const xScale = d => PAD + ((d - 1) / (totalDays - 1)) * (W - PAD * 2)
  const yScale = v => H - PAD - (v / chartMax) * (H - PAD * 2)

  const activePts = points.filter(p => p.hasTx)
  if (activePts.length < 2) return (
    <p style={{ color: 'var(--muted)', fontSize: 13 }}>Dados insuficientes para o gráfico.</p>
  )

  const linePath = activePts.map((p, i) => `${i === 0 ? 'M' : 'L'}${xScale(p.d)},${yScale(p.cum)}`).join(' ')
  const areaPath = `${linePath} L${xScale(activePts[activePts.length-1].d)},${H - PAD} L${xScale(activePts[0].d)},${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 100 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--red)" stopOpacity=".25" />
          <stop offset="100%" stopColor="var(--red)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {activePts[activePts.length - 1] && (
        <circle
          cx={xScale(activePts[activePts.length-1].d)}
          cy={yScale(activePts[activePts.length-1].cum)}
          r="4" fill="var(--red)"
        />
      )}
    </svg>
  )
}

// ── main ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { mes, ano } = useMonth()
  const navigate = useNavigate()
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
    return Object.entries(byDesc).sort(([,a],[,b]) => b - a).slice(0, 6).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const topEntradas = useMemo(() => {
    const byDesc = {}
    transactions.filter(t => t.tipo === 'entrada').forEach(t => {
      byDesc[t.descricao] = (byDesc[t.descricao] || 0) + Number(t.valor)
    })
    return Object.entries(byDesc).sort(([,a],[,b]) => b - a).slice(0, 5).map(([name, value]) => ({ name, value }))
  }, [transactions])

  const stats = useMemo(() => {
    if (!summary) return {}
    const entradas = summary.total_entradas ?? 0
    const saidas = summary.total_saidas ?? 0
    const reembolsos = summary.total_reembolsos ?? 0
    const investidos = summary.total_investidos ?? 0
    const custoReal = saidas - reembolsos

    const passed = daysPassed(mes, ano)
    const totalDays = daysInMonth(mes, ano)
    const remaining = totalDays - passed

    const gastoDiario = passed > 0 ? custoReal / passed : 0
    const projecao = gastoDiario * totalDays
    const taxaEconomia = entradas > 0 ? ((entradas - custoReal - investidos) / entradas) * 100 : 0
    const pctGasto = entradas > 0 ? (custoReal / entradas) * 100 : 0

    return { gastoDiario, projecao, taxaEconomia, pctGasto, remaining, totalDays, passed, custoReal, entradas, saidas, investidos }
  }, [summary, mes, ano])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <TopBar><MonthSelector /></TopBar>

      {loading ? <SkeletonCards /> : <SummaryCards summary={summary} />}

      {/* ── linha 2: gráfico de linha + top gastos ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {loading ? (
          <><Panel><SkeletonRows rows={4} /></Panel><Panel><SkeletonRows rows={4} /></Panel></>
        ) : (
          <>
            <Panel title="Gastos Acumulados no Mês">
              <SpendingTimeline transactions={transactions} mes={mes} ano={ano} />
              {stats.gastoDiario > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 12, color: 'var(--muted)' }}>
                  <span>Média diária: <strong style={{ color: 'var(--red)' }}>{currency(stats.gastoDiario)}</strong></span>
                  <span>Projeção: <strong style={{ color: stats.projecao > stats.entradas ? 'var(--red)' : 'var(--fg)' }}>{currency(stats.projecao)}</strong></span>
                </div>
              )}
            </Panel>

            <Panel title="Maiores Gastos">
              <BarChart items={topExpenses} colorVar="var(--red)" />
              {topExpenses.length > 0 && (
                <button
                  onClick={() => navigate('/items')}
                  style={{ marginTop: 14, fontSize: 11, color: 'var(--muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                >
                  Ver resumo completo por item →
                </button>
              )}
            </Panel>
          </>
        )}
      </div>

      {/* ── linha 3: mini-stats ── */}
      {!loading && stats.entradas !== undefined && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
          <MiniStat
            label="Taxa de Economia"
            value={`${Math.max(0, Math.round(stats.taxaEconomia))}%`}
            sub={stats.taxaEconomia >= 20 ? '🎯 Ótimo ritmo!' : stats.taxaEconomia < 0 ? '⚠️ Gastos acima da renda' : 'Tente chegar a 20%'}
            color={stats.taxaEconomia >= 20 ? 'var(--green)' : stats.taxaEconomia < 0 ? 'var(--red)' : '#f59e0b'}
            pct={Math.max(0, stats.taxaEconomia)}
          />
          <MiniStat
            label="Gasto Médio/Dia"
            value={currency(stats.gastoDiario)}
            sub={`${stats.passed} dias registrados`}
            color="var(--red)"
            icon="📅"
          />
          <MiniStat
            label="Projeção do Mês"
            value={currency(stats.projecao)}
            sub={stats.projecao > stats.entradas ? '⚠️ Acima da renda' : `Margem: ${currency(stats.entradas - stats.projecao)}`}
            color={stats.projecao > stats.entradas ? 'var(--red)' : 'var(--green)'}
            icon="📈"
          />
          <MiniStat
            label="Dias Restantes"
            value={`${stats.remaining} dias`}
            sub={stats.remaining > 0 && stats.gastoDiario > 0 ? `~${currency(stats.remaining * stats.gastoDiario)} a gastar` : 'Mês encerrado'}
            color="var(--muted)"
            icon="🗓️"
          />
        </div>
      )}

      {/* ── linha 4: maiores entradas + distribuição saídas×entradas ── */}
      {!loading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Panel title="Principais Fontes de Renda">
            {topEntradas.length === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma entrada no período.</p>
              : <BarChart items={topEntradas} colorVar="var(--green)" />
            }
          </Panel>

          <Panel title="Distribuição do Dinheiro">
            {stats.entradas === 0
              ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhuma entrada no período.</p>
              : (() => {
                  const { entradas, custoReal, investidos } = stats
                  const saldo = Math.max(0, entradas - custoReal - investidos)
                  const items = [
                    { label: 'Gastos (custo real)', value: custoReal, color: 'var(--red)' },
                    { label: 'Investimentos', value: investidos, color: '#a855f7' },
                    { label: 'Saldo livre', value: saldo, color: 'var(--green)' },
                  ].filter(i => i.value > 0)

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {/* stacked bar */}
                      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
                        {items.map(({ label, value, color }) => (
                          <div key={label} style={{ flex: value, background: color, transition: 'flex .4s', minWidth: value > 0 ? 4 : 0 }} title={`${label}: ${currency(value)}`} />
                        ))}
                      </div>
                      {/* legend */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 6 }}>
                        {items.map(({ label, value, color }) => (
                          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{ width: 10, height: 10, borderRadius: 2, background: color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--muted)' }}>{label}</span>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                              <span style={{ fontWeight: 600, color }}>{currency(value)}</span>
                              <span style={{ color: 'var(--muted)', width: 36, textAlign: 'right' }}>{Math.round((value / entradas) * 100)}%</span>
                            </div>
                          </div>
                        ))}
                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: 'var(--muted)' }}>Total de Entradas</span>
                          <span style={{ fontWeight: 700 }}>{currency(entradas)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })()
            }
          </Panel>
        </div>
      )}

      <PageFooter onRefresh={() => setRev(r => r + 1)} />
    </div>
  )
}
