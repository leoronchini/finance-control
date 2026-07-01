import { useState } from 'react'

export default function EditModal({ transaction, onSave, onClose }) {
  // Converte DD/MM/AAAA → AAAA-MM-DD para o input type="date"
  const toInputDate = (d) => { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}` }
  // Converte AAAA-MM-DD → DD/MM/AAAA para salvar no padrão interno
  const fromInputDate = (d) => { const [yyyy, mm, dd] = d.split('-'); return `${dd}/${mm}/${yyyy}` }

  const [form, setForm] = useState({
    valor: transaction.valor,
    descricao: transaction.descricao,
    categoria: transaction.categoria || '',
    data: toInputDate(transaction.data),
    tipo: transaction.tipo,
  })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const fields = [
    { label: 'Valor', field: 'valor', type: 'number', step: '0.01' },
    { label: 'Descrição', field: 'descricao', type: 'text' },
    { label: 'Categoria', field: 'categoria', type: 'text', placeholder: '(opcional)' },
    { label: 'Data', field: 'data', type: 'date' },
  ]

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: '#00000088',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
      }}
    >
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '28px 32px', width: 420, display: 'flex',
        flexDirection: 'column', gap: 16,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Editar Transação</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)' }}>Tipo</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[['entrada','💰 Entrada'],['saída','💸 Saída'],['reembolso','🔵 Reembolso'],['investimento','🟣 Investimento']].map(([v, l]) => {
              const colors = { entrada: 'var(--green)', 'saída': 'var(--red)', reembolso: '#3b82f6', investimento: '#a855f7' }
              const active = form.tipo === v
              return (
                <button
                  key={v}
                  onClick={() => setForm(f => ({ ...f, tipo: v }))}
                  style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${active ? colors[v] : 'var(--border)'}`,
                    background: active ? `${colors[v]}18` : 'var(--bg3)',
                    color: active ? colors[v] : 'var(--muted)',
                  }}
                >{l}</button>
              )
            })}
          </div>
        </div>

        {fields.map(({ label, field, type, step, placeholder }) => (
          <div key={field} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)' }}>{label}</label>
            <input
              type={type}
              step={step}
              value={form[field]}
              placeholder={placeholder || ''}
              onChange={set(field)}
              style={{
                background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)',
                padding: '9px 12px', borderRadius: 8, outline: 'none', width: '100%',
              }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--border)'}
            />
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
              padding: '9px 16px', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave(transaction.id, { ...form, valor: parseFloat(form.valor), data: fromInputDate(form.data) })}
            style={{
              background: 'var(--blue)', color: '#fff', border: 'none',
              padding: '9px 20px', borderRadius: 8, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Salvar
          </button>
        </div>
      </div>
    </div>
  )
}
