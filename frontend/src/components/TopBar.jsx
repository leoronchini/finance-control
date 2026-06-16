import { useState } from 'react'
import ImportButton from './ImportButton'
import ImportModal from './ImportModal'

export default function TopBar({ title, children }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        {children ?? <span style={{ fontSize: 18, fontWeight: 700 }}>{title}</span>}
        <ImportButton onClick={() => setOpen(true)} />
      </div>
      {open && <ImportModal onClose={() => setOpen(false)} />}
    </>
  )
}
