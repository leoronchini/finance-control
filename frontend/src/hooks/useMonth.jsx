import { createContext, useContext, useState } from 'react'

const MonthContext = createContext(null)

export function MonthProvider({ children }) {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [ano, setAno] = useState(String(now.getFullYear()))

  function prev() {
    setMes((m) => {
      const n = parseInt(m)
      if (n === 1) { setAno((a) => String(parseInt(a) - 1)); return '12' }
      return String(n - 1).padStart(2, '0')
    })
  }

  function next() {
    setMes((m) => {
      const n = parseInt(m)
      if (n === 12) { setAno((a) => String(parseInt(a) + 1)); return '01' }
      return String(n + 1).padStart(2, '0')
    })
  }

  return (
    <MonthContext.Provider value={{ mes, ano, prev, next }}>
      {children}
    </MonthContext.Provider>
  )
}

export const useMonth = () => useContext(MonthContext)
