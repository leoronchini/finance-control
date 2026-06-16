import { createContext, useContext, useState, useCallback } from 'react'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toast, setToast] = useState({ msg: '', visible: false })

  const showToast = useCallback((msg) => {
    setToast({ msg, visible: true })
    setTimeout(() => setToast({ msg: '', visible: false }), 3000)
  }, [])

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {toast.visible && (
        <div style={{
          position: 'fixed', bottom: 24, right: 24,
          background: 'var(--bg3)', border: '1px solid var(--green)',
          color: 'var(--green)', padding: '12px 18px', borderRadius: 10,
          fontSize: 13, fontWeight: 500, boxShadow: '0 4px 20px #00000066',
          zIndex: 300,
        }}>
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
