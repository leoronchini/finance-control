import { useState, useEffect, useMemo } from 'react'
import { getTransactions, updateTransaction, deleteTransaction } from '../services/api'
import { useMonth } from '../hooks/useMonth'
import { useToast } from '../hooks/useToast'
import TopBar from '../components/TopBar'
import MonthSelector from '../components/MonthSelector'
import Panel from '../components/Panel'
import TransactionTable from '../components/TransactionTable'
import EditModal from '../components/EditModal'
import PageFooter from '../components/PageFooter'
import { SkeletonRows } from '../components/Skeleton'

const filterBtn = (active) => ({
  background: active ? '#3b82f611' : 'var(--bg3)',
  border: `1px solid ${active ? 'var(--blue)' : 'var(--border)'}`,
  color: active ? 'var(--blue)' : 'var(--muted)',
  padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13,
})

export default function Transactions() {
  const { mes, ano } = useMonth()
  const showToast = useToast()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState(null)
  const [rev, setRev] = useState(0)

  const reload = () => setRev(r => r + 1)

  useEffect(() => {
    setLoading(true)
    getTransactions(mes, ano)
      .then(setTransactions)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [mes, ano, rev])

  const filtered = useMemo(() =>
    transactions
      .filter(t => filter === 'all' || t.tipo === filter)
      .filter(t => !search || t.descricao.toLowerCase().includes(search.toLowerCase())),
    [transactions, filter, search]
  )

  const handleSave = async (id, data) => {
    try {
      await updateTransaction(id, data)
      setEditing(null)
      reload()
      showToast('Edição salva com sucesso.')
    } catch (e) {
      showToast('Erro ao salvar. Verifique a API.')
    }
  }

  const handleDelete = async (id) => {
    try {
      await deleteTransaction(id)
      reload()
      showToast('Transação excluída.')
    } catch (e) {
      showToast('Erro ao excluir. Verifique a API.')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <TopBar title="Transações" />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <MonthSelector />
        <div style={{ display: 'flex', gap: 4 }}>
          {[['all','Todas'],['entrada','Entradas'],['saída','Saídas']].map(([v, l]) => (
            <button key={v} style={filterBtn(filter === v)} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por descrição…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--text)',
            padding: '6px 12px', borderRadius: 8, outline: 'none', width: 220,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--blue)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      <Panel noPad>
        {loading
          ? <SkeletonRows rows={8} />
          : <TransactionTable transactions={filtered} onEdit={setEditing} onDelete={handleDelete} />
        }
      </Panel>

      {editing && (
        <EditModal
          transaction={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      <PageFooter onRefresh={reload} />
    </div>
  )
}
