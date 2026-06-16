import { useState, useEffect } from 'react'

export default function PageFooter({ onRefresh }) {
  const [mins, setMins] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMins((m) => m + 1), 60000)
    return () => clearInterval(id)
  }, [])

  const label = mins === 0 ? 'agora mesmo' : mins === 1 ? 'há 1 minuto' : `há ${mins} minutos`

  return (
    <p style={{ color: 'var(--muted)', fontSize: 11, paddingTop: 8 }}>
      Dados atualizados {label} ·{' '}
      <span
        onClick={() => { setMins(0); onRefresh?.() }}
        style={{ color: 'var(--blue)', cursor: 'pointer' }}
      >
        Atualizar agora
      </span>
    </p>
  )
}
