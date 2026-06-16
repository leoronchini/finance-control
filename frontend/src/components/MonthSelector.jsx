import { useMonth } from '../hooks/useMonth'
import { monthLabel } from '../utils/format'

const btnStyle = {
  background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)',
  width: 32, height: 32, borderRadius: 8, cursor: 'pointer', fontSize: 16,
  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

export default function MonthSelector() {
  const { mes, ano, prev, next } = useMonth()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <button style={btnStyle} onClick={prev}>‹</button>
      <span style={{ fontSize: 16, fontWeight: 600, minWidth: 140, textAlign: 'center' }}>
        {monthLabel(mes, ano)}
      </span>
      <button style={btnStyle} onClick={next}>›</button>
    </div>
  )
}
