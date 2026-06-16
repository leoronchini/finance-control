import { useState, useRef } from 'react'

export default function ImportModal({ onClose }) {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)
  const inputRef = useRef()

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f?.type === 'application/pdf') setFile(f)
  }

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
        borderRadius: 14, padding: '28px 32px', width: 460,
        display: 'flex', flexDirection: 'column', gap: 20,
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Importar PDF</h3>

        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? 'var(--blue)' : 'var(--border)'}`,
            borderRadius: 10, padding: '40px 20px', textAlign: 'center',
            cursor: 'pointer', transition: 'border-color .15s',
            background: dragging ? '#3b82f611' : 'transparent',
          }}
        >
          <input ref={inputRef} type="file" accept="application/pdf" style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])} />
          {file ? (
            <p style={{ color: 'var(--green)' }}>📄 {file.name}</p>
          ) : (
            <>
              <p style={{ color: 'var(--muted)', marginBottom: 6 }}>Arraste o arquivo aqui ou</p>
              <p style={{ color: 'var(--blue)' }}>clique para selecionar</p>
            </>
          )}
        </div>

        <p style={{ color: 'var(--muted)', fontSize: 12, textAlign: 'center' }}>
          ⚠️ Funcionalidade em desenvolvimento — disponível em breve.
        </p>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
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
            disabled
            style={{
              background: 'var(--blue)', color: '#fff', border: 'none',
              padding: '9px 20px', borderRadius: 8, fontWeight: 600,
              cursor: 'not-allowed', opacity: 0.5,
            }}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
