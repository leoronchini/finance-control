import { useState } from 'react'

export default function EditModal({ transaction, onSave, onClose }) {
  const [form, setForm] = useState({
    valor: transaction.valor,
    descricao: transaction.descricao,
    categoria: transaction.categoria || '',
    data: transaction.data,
  })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  const fields = [
    { label: 'Valor', field: 'valor', type: 'number', step: '0.01' },
    { label: 'Descrição', field: 'descricao', type: 'text' },
    { label: 'Categoria', field: 'categoria', type: 'text', placeholder: '(opcional)' },
    { label: 'Data (DD/MM/AAAA)', field: 'data', type: 'text' },
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
            onClick={() => onSave(transaction.id, { ...form, valor: parseFloat(form.valor) })}
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
