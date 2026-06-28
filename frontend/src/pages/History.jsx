import { useState, useEffect } from 'react'
import { getHistory } from '../services/api'
import { currency, monthShort } from '../utils/format'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

export default function History() {
  const [data, setData] = useState([])
  const [rev, setRev] = useState(0)

  useEffect(() => {
    getHistory().then(rows => {
      setData(rows.map(r => ({
        ...r,
        label: monthShort(r.mes?.split('/')?.[0] ?? '') + (r.mes?.split('/')?.[1] ? ` ${r.mes.split('/')[1]}` : ''),
      })))
    }).catch(console.error)
  }, [rev])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Histórico" />

      <Panel title="Entradas × Saídas por Mês">
        {data.length === 0
          ? <p style={{ color: 'var(--muted)', fontSize: 13 }}>Nenhum dado histórico disponível.</p>
          : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <ComposedChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted)" tick={{ fontSize: 11 }} />
                  <YAxis stroke="var(--muted)" tick={{ fontSize: 11 }} tickFormatter={v => `R$${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8 }}
                    labelStyle={{ color: 'var(--text)' }}
                    formatter={v => currency(v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, color: 'var(--muted)' }} />
                  <Bar dataKey="entradas" name="Entradas" fill="var(--green)" radius={[4,4,0,0]} />
                  <Bar dataKey="saidas" name="Saídas" fill="var(--red)" radius={[4,4,0,0]} />
                  <Bar dataKey="reembolsos" name="Reembolsos" fill="#3b82f6" radius={[4,4,0,0]} />
                  <Bar dataKey="investimentos" name="Investimentos" fill="#a855f7" radius={[4,4,0,0]} />
                  <Line dataKey="saldo" name="Saldo" stroke="var(--blue)" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                <Legend_ color="var(--green)" label="Entradas" />
                <Legend_ color="var(--red)" label="Saídas" />
                <Legend_ color="#3b82f6" label="Reembolsos" />
                <Legend_ color="#a855f7" label="Investimentos" />
                <Legend_ color="var(--blue)" label="Saldo" line />
              </div>
            </>
          )
        }
      </Panel>

      <Panel noPad>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Mês','Entradas','Saídas','Reembolsos','Investimentos','Saldo'].map(h => (
                  <th key={h} style={{
                    color: 'var(--muted)', fontSize: 11, textTransform: 'uppercase',
                    letterSpacing: '.5px', padding: '8px 12px', textAlign: 'left', fontWeight: 600,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, i) => (
                <tr key={row.mes}
                  style={{ borderBottom: i < data.length - 1 ? '1px solid var(--border)' : 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '11px 12px' }}>{row.label}</td>
                  <td style={{ padding: '11px 12px', color: 'var(--green)' }}>{currency(row.entradas)}</td>
                  <td style={{ padding: '11px 12px', color: 'var(--red)' }}>{currency(row.saidas)}</td>
                  <td style={{ padding: '11px 12px', color: '#3b82f6' }}>{currency(row.reembolsos ?? 0)}</td>
                  <td style={{ padding: '11px 12px', color: '#a855f7' }}>{currency(row.investimentos ?? 0)}</td>
                  <td style={{ padding: '11px 12px', fontWeight: 600, color: row.saldo >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    {currency(row.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <PageFooter onRefresh={() => setRev(r => r + 1)} />
    </div>
  )
}

function Legend_({ color, label, line }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
      <div style={{
        width: 10, height: 10,
        background: line ? 'transparent' : color,
        border: line ? `2px solid ${color}` : 'none',
        borderRadius: line ? 0 : 2,
      }} />
      {label}
    </div>
  )
}
