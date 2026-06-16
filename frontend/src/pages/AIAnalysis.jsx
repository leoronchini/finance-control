import { useState } from 'react'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

export default function AIAnalysis() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Análise IA" />
      <MonthSelector />

      <Panel>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: 340, gap: 20, textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: 'var(--bg3)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28,
          }}>
            🤖
          </div>

          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Análise IA</h2>
            <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 360, lineHeight: 1.6 }}>
              Esta funcionalidade ainda não está disponível. O endpoint{' '}
              <code style={{ background: 'var(--bg3)', padding: '1px 6px', borderRadius: 4, fontSize: 12 }}>
                POST /ai/analysis
              </code>{' '}
              será implementado em uma fase futura, integrando com a API do Claude para gerar
              insights sobre seus gastos mensais.
            </p>
          </div>

          <div style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 10, padding: '16px 24px', maxWidth: 420, textAlign: 'left',
          }}>
            <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, marginBottom: 8 }}>
              O que será gerado:
            </div>
            {[
              'Padrão de Consumo — visão geral do mês',
              'Maior Gasto — item de maior impacto',
              'Comparativo com Mês Anterior — variação %',
              'Sugestão de Economia — oportunidades identificadas',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 13, color: 'var(--muted)' }}>
                <span style={{ color: 'var(--blue)', flexShrink: 0 }}>·</span>
                {item}
              </div>
            ))}
          </div>

          <button
            disabled
            style={{
              background: 'var(--bg3)', color: 'var(--muted)',
              border: '1px solid var(--border)', padding: '12px 28px',
              borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: 'not-allowed', opacity: 0.6,
            }}
          >
            Gerar Análise do Mês
          </button>
          <p style={{ fontSize: 12, color: 'var(--muted)' }}>
            Em desenvolvimento — disponível em breve.
          </p>
        </div>
      </Panel>

      <PageFooter />
    </div>
  )
}
