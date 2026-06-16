export default function ImportButton({ onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)',
      padding: '7px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
      display: 'flex', alignItems: 'center', gap: 6,
    }}
    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--blue)'; e.currentTarget.style.color = 'var(--blue)' }}
    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
    >
      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
        <polyline points="17 8 12 3 7 8"/>
        <line x1="12" y1="3" x2="12" y2="15"/>
      </svg>
      Importar PDF
    </button>
  )
}
