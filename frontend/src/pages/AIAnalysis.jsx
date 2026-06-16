import { useState } from 'react'
import { getAiAnalysis } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { currency } from '../utils/format'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

function AnalysisText({ text }) {
  const lines = text.split('\n')
  return (
    <div style={{ lineHeight: 1.75, fontSize: 14, color: 'var(--text)' }}>
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} style={{ height: 8 }} />
        const isBullet = /^[\-\*•]/.test(line.trim())
        const isHeading = /^#+\s/.test(line.trim()) || /^\*\*.*\*\*$/.test(line.trim())
        const clean = line
          .replace(/^\s*#+\s*/, '')
          .replace(/\*\*(.*?)\*\*/g, '$1')
          .replace(/^[\-\*•]\s*/, '')
          .trim()

        if (isHeading) {
          return (
            <div key={i} style={{ fontWeight: 700, fontSize: 15, marginTop: 16, marginBottom: 4, color: 'var(--blue)' }}>
              {clean}
            </div>
          )
        }
        if (isBullet) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
              <span style={{ color: 'var(--blue)', flexShrink: 0, marginTop: 1 }}>·</span>
              <span>{clean}</span>
            </div>
          )
        }
        return <p key={i} style={{ margin: '0 0 4px' }}>{clean}</p>
      })}
    </div>
  )
}

function SummaryChips({ resumo }) {
  const chips = [
    { label: 'Entradas', value: currency(resumo.entradas), color: 'var(--green)' },
    { label: 'Saídas',   value: currency(resumo.saidas),   color: 'var(--red)'   },
    { label: 'Saldo',    value: currency(resumo.saldo),    color: resumo.saldo >= 0 ? 'var(--green)' : 'var(--red)' },
  ]
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
      {chips.map(({ label, value, color }) => (
        <div key={label} style={{
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, padding: '10px 18px', minWidth: 120,
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
          <div style={{ fontWeight: 700, fontSize: 16, color }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

export default function AIAnalysis() {
  const { mes, ano } = useMonth()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const handleAnalyze = async () => {
    setLoading(true)
    setResult(null)
    setError(null)
    try {
      const data = await getAiAnalysis(mes, ano)
      setResult(data)
    } catch (e) {
      setError(e.message || 'Erro ao gerar análise. Verifique se a API está rodando e se GEMINI_API_KEY está configurada.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Análise com IA">
        <MonthSelector />
      </TopBar>

      {!result && !loading && (
        <Panel>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 300, gap: 20, textAlign: 'center',
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'var(--bg3)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 28,
            }}>
              ✦
            </div>

            <div>
              <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Análise Inteligente</h2>
              <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 380, lineHeight: 1.6 }}>
                Envie os dados do mês selecionado para o Gemini e receba uma análise em linguagem natural
                com insights sobre seus gastos.
              </p>
            </div>

            <div style={{
              background: 'var(--bg3)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '16px 24px', maxWidth: 400, textAlign: 'left',
            }}>
              <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginBottom: 8 }}>
                O que será gerado:
              </div>
              {[
                'Resumo do mês atual',
                'Comparativo com os dois meses anteriores',
                'Itens com maior gasto',
                'Sugestões práticas de economia',
              ].map(item => (
                <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                  <span style={{ color: 'var(--blue)', flexShrink: 0 }}>·</span>
                  {item}
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                background: '#ef444411', border: '1px solid var(--red)',
                borderRadius: 10, padding: '12px 20px', maxWidth: 440,
                fontSize: 13, color: 'var(--red)', textAlign: 'left',
              }}>
                {error}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              style={{
                background: 'var(--blue)', color: '#fff',
                border: 'none', padding: '12px 32px',
                borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'pointer',
              }}
            >
              Gerar Análise do Mês
            </button>
          </div>
        </Panel>
      )}

      {loading && (
        <Panel>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', minHeight: 300, gap: 16,
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              border: '3px solid var(--border)', borderTopColor: 'var(--blue)',
              animation: 'spin 0.8s linear infinite',
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            <p style={{ color: 'var(--muted)', fontSize: 14 }}>Analisando seus dados com IA...</p>
          </div>
        </Panel>
      )}

      {result && (
        <>
          <Panel title={`Análise — ${result.mes}/${result.ano}`}>
            <SummaryChips resumo={result.resumo} />
            <AnalysisText text={result.analise} />
          </Panel>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              onClick={handleAnalyze}
              style={{
                background: 'var(--bg3)', color: 'var(--text)',
                border: '1px solid var(--border)', padding: '9px 20px',
                borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              Gerar novamente
            </button>
            <button
              onClick={() => setResult(null)}
              style={{
                background: 'transparent', color: 'var(--muted)',
                border: '1px solid var(--border)', padding: '9px 20px',
                borderRadius: 8, fontSize: 13, cursor: 'pointer',
              }}
            >
              Limpar
            </button>
          </div>
        </>
      )}

      <PageFooter />
    </div>
  )
}
