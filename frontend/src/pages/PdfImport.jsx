import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { uploadPdf, confirmImport } from '../services/api'
import { currency } from '../utils/format'
import TopBar from '../components/TopBar'
import Panel from '../components/Panel'
import PageFooter from '../components/PageFooter'

const STEP = { UPLOAD: 'upload', REVIEW: 'review', DONE: 'done' }

// ── Upload step ──────────────────────────────────────────────────────────────
function UploadStep({ onExtracted }) {
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef()

  const handleFile = (f) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      setError('Apenas arquivos .pdf são aceitos.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('Arquivo muito grande. Limite: 10 MB.')
      return
    }
    setError(null)
    setFile(f)
  }

  const handleExtract = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const data = await uploadPdf(file)
      onExtracted(data)
    } catch (e) {
      setError(e.message || 'Erro ao processar o PDF. Verifique se a API está rodando.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, minHeight: 320, justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 28 }}>📄</div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Importar Fatura PDF</h2>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 380, lineHeight: 1.6 }}>
            Faça upload da fatura do seu cartão de crédito. O Gemini irá extrair e padronizar os lançamentos automaticamente.
          </p>
        </div>

        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          style={{
            width: '100%', maxWidth: 420, border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: 12, padding: '32px 24px', cursor: 'pointer',
            background: dragging ? 'var(--bg3)' : 'transparent', transition: 'all .15s',
          }}
        >
          {file
            ? <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>📎 {file.name} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>({(file.size / 1024).toFixed(0)} KB)</span></div>
            : <div style={{ fontSize: 13, color: 'var(--muted)' }}>Arraste o PDF aqui ou <span style={{ color: 'var(--blue)' }}>clique para selecionar</span></div>
          }
        </div>
        <input ref={inputRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />

        {error && (
          <div style={{ background: '#ef444411', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--red)', maxWidth: 420 }}>
            {error}
          </div>
        )}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--muted)', fontSize: 14 }}>
            <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--border)', borderTopColor: 'var(--blue)', animation: 'spin .8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
            Extraindo lançamentos com IA…
          </div>
        )}

        {!loading && (
          <button
            onClick={handleExtract}
            disabled={!file}
            style={{
              background: file ? 'var(--blue)' : 'var(--bg3)',
              color: file ? '#fff' : 'var(--muted)',
              border: 'none', padding: '12px 32px', borderRadius: 10,
              fontSize: 15, fontWeight: 600,
              cursor: file ? 'pointer' : 'not-allowed', opacity: file ? 1 : 0.6,
            }}
          >
            Extrair Lançamentos
          </button>
        )}
      </div>
    </Panel>
  )
}

// ── Review step ──────────────────────────────────────────────────────────────
function ReviewStep({ data, onConfirm, onBack }) {
  const [items, setItems] = useState(data.items)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const pendingCount = items.filter(i => i.pendente).length

  const updateDesc = (tmp_id, value) => {
    setItems(prev => prev.map(it =>
      it.tmp_id === tmp_id
        ? { ...it, descricao: value, pendente: value.trim().toLowerCase() === 'pendente' || value.trim() === '' }
        : it
    ))
  }

  const removeItem = (tmp_id) => setItems(prev => prev.filter(it => it.tmp_id !== tmp_id))

  const handleConfirm = async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await confirmImport(items.map(({ descricao, valor, data }) => ({ descricao, valor, data })))
      onConfirm(result)
    } catch (e) {
      setError(e.message || 'Erro ao gravar. Verifique se a API está rodando.')
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Panel>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
          <div>
            <span style={{ fontWeight: 600 }}>{items.length} lançamentos extraídos</span>
            {pendingCount > 0 && (
              <span style={{ marginLeft: 10, background: '#f59e0b22', color: '#f59e0b', fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 6 }}>
                {pendingCount} pendente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            Edite as descrições pendentes antes de confirmar
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Descrição', 'Valor', 'Data', 'Original', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '8px 10px', color: 'var(--muted)', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.tmp_id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    background: item.pendente ? '#f59e0b08' : 'transparent',
                  }}
                >
                  <td style={{ padding: '8px 10px', minWidth: 160 }}>
                    <input
                      value={item.descricao}
                      onChange={e => updateDesc(item.tmp_id, e.target.value)}
                      style={{
                        width: '100%', background: item.pendente ? '#f59e0b18' : 'var(--bg3)',
                        border: `1px solid ${item.pendente ? '#f59e0b' : 'var(--border)'}`,
                        borderRadius: 6, padding: '4px 8px', color: 'var(--text)', fontSize: 13,
                        outline: 'none',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                      onBlur={e => e.target.style.borderColor = item.pendente ? '#f59e0b' : 'var(--border)'}
                    />
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--red)', fontWeight: 600 }}>
                    {currency(item.valor)}
                  </td>
                  <td style={{ padding: '8px 10px', whiteSpace: 'nowrap', color: 'var(--muted)' }}>
                    {item.data}
                  </td>
                  <td style={{ padding: '8px 10px', color: 'var(--muted)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.original}>
                    {item.original}
                  </td>
                  <td style={{ padding: '8px 6px', textAlign: 'right' }}>
                    <button
                      onClick={() => removeItem(item.tmp_id)}
                      style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, padding: '2px 6px', borderRadius: 4 }}
                      title="Remover"
                    >×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {error && (
          <div style={{ marginTop: 16, background: '#ef444411', border: '1px solid var(--red)', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: 'var(--red)' }}>
            {error}
          </div>
        )}
      </Panel>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button
          onClick={handleConfirm}
          disabled={loading || pendingCount > 0 || items.length === 0}
          style={{
            background: (loading || pendingCount > 0 || items.length === 0) ? 'var(--bg3)' : 'var(--green)',
            color: (loading || pendingCount > 0 || items.length === 0) ? 'var(--muted)' : '#fff',
            border: 'none', padding: '11px 28px', borderRadius: 10,
            fontSize: 14, fontWeight: 600,
            cursor: (loading || pendingCount > 0 || items.length === 0) ? 'not-allowed' : 'pointer',
            opacity: (loading || pendingCount > 0 || items.length === 0) ? 0.6 : 1,
          }}
        >
          {loading ? 'Gravando…' : `Confirmar Importação (${items.length})`}
        </button>
        <button
          onClick={onBack}
          disabled={loading}
          style={{ background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', padding: '11px 20px', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
        >
          Cancelar
        </button>
        {pendingCount > 0 && (
          <span style={{ fontSize: 12, color: '#f59e0b' }}>
            Preencha {pendingCount} descrição{pendingCount > 1 ? 'ões' : ''} pendente{pendingCount > 1 ? 's' : ''} para continuar
          </span>
        )}
      </div>
    </div>
  )
}

// ── Done step ────────────────────────────────────────────────────────────────
function DoneStep({ result, onReset }) {
  const navigate = useNavigate()
  return (
    <Panel>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, minHeight: 280, justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Importação concluída</h2>
          <p style={{ color: 'var(--muted)', fontSize: 14 }}>
            <strong style={{ color: 'var(--green)' }}>{result.salvos}</strong> lançamento{result.salvos !== 1 ? 's' : ''} gravado{result.salvos !== 1 ? 's' : ''} na planilha com sucesso.
          </p>
        </div>

        {result.erros?.length > 0 && (
          <div style={{ background: '#ef444411', border: '1px solid var(--red)', borderRadius: 8, padding: '12px 16px', maxWidth: 440, textAlign: 'left' }}>
            <div style={{ fontSize: 12, color: 'var(--red)', fontWeight: 600, marginBottom: 6 }}>{result.erros.length} erro{result.erros.length > 1 ? 's' : ''} ao gravar:</div>
            {result.erros.map((e, i) => (
              <div key={i} style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>· {e.item}: {e.erro}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onReset}
            style={{ background: 'var(--bg3)', color: 'var(--text)', border: '1px solid var(--border)', padding: '10px 22px', borderRadius: 10, fontSize: 14, cursor: 'pointer' }}
          >
            Importar outro PDF
          </button>
          <button
            onClick={() => navigate('/transactions')}
            style={{ background: 'var(--blue)', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Ver Transações
          </button>
        </div>
      </div>
    </Panel>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
export default function PdfImport() {
  const [step, setStep] = useState(STEP.UPLOAD)
  const [extracted, setExtracted] = useState(null)
  const [result, setResult] = useState(null)

  const handleExtracted = (data) => { setExtracted(data); setStep(STEP.REVIEW) }
  const handleConfirm = (res) => { setResult(res); setStep(STEP.DONE) }
  const handleReset = () => { setExtracted(null); setResult(null); setStep(STEP.UPLOAD) }

  const stepLabels = ['Upload', 'Revisão', 'Concluído']
  const stepIndex = { [STEP.UPLOAD]: 0, [STEP.REVIEW]: 1, [STEP.DONE]: 2 }[step]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Importar PDF" />

      {/* breadcrumb */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {stepLabels.map((label, i) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 24, height: 24, borderRadius: '50%', fontSize: 12, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: i <= stepIndex ? 'var(--blue)' : 'var(--bg3)',
              color: i <= stepIndex ? '#fff' : 'var(--muted)',
              border: `1px solid ${i <= stepIndex ? 'var(--blue)' : 'var(--border)'}`,
            }}>{i + 1}</div>
            <span style={{ fontSize: 13, color: i <= stepIndex ? 'var(--text)' : 'var(--muted)' }}>{label}</span>
            {i < stepLabels.length - 1 && <span style={{ color: 'var(--border)', marginRight: 4 }}>›</span>}
          </div>
        ))}
      </div>

      {step === STEP.UPLOAD && <UploadStep onExtracted={handleExtracted} />}
      {step === STEP.REVIEW && <ReviewStep data={extracted} onConfirm={handleConfirm} onBack={handleReset} />}
      {step === STEP.DONE   && <DoneStep result={result} onReset={handleReset} />}

      <PageFooter />
    </div>
  )
}
