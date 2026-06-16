# Fase 5 — Frontend React

---

## Objetivo

Criar o painel web com três telas (Dashboard, Transactions, History), conectado à API FastAPI local. Ao final desta fase o sistema estará completo do ponto de vista funcional: mensagem no Telegram → planilha → painel web.

---

## Pré-requisitos

- Fase 4 concluída (API rodando em `http://localhost:8000`)
- Node.js 18+ instalado
- API com dados reais na planilha para validar visualmente

---

## Criação do projeto Vite

Dentro da raiz do projeto:

```bash
npm create vite@latest frontend -- --template react
cd frontend
npm install
npm install react-router-dom recharts
```

---

## Estrutura de arquivos

```
frontend/
├── src/
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── Transactions.jsx
│   │   └── History.jsx
│   ├── components/
│   │   ├── SummaryCards.jsx
│   │   ├── TransactionTable.jsx
│   │   ├── EditModal.jsx
│   │   ├── ExpenseChart.jsx
│   │   └── HistoryChart.jsx
│   ├── services/
│   │   └── api.js
│   ├── App.jsx
│   └── main.jsx
├── index.html
└── package.json
```

---

## Implementação

### `src/services/api.js`

Todas as chamadas HTTP centralizadas aqui. Nenhum componente faz `fetch` diretamente.

```javascript
const API_BASE = 'http://localhost:8000'

const json = (res) => {
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export const getSummary = (mes, ano) =>
  fetch(`${API_BASE}/summary?mes=${mes}&ano=${ano}`).then(json)

export const getTransactions = (mes, ano) =>
  fetch(`${API_BASE}/transactions?mes=${mes}&ano=${ano}`).then(json)

export const getHistory = () =>
  fetch(`${API_BASE}/history`).then(json)

export const updateTransaction = (id, data) =>
  fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  }).then(json)

export const deleteTransaction = (id) =>
  fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' }).then(json)
```

---

### `src/App.jsx`

Roteamento entre as três telas com navegação lateral.

```jsx
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import History from './pages/History'

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <nav style={{ width: 200, padding: 24, background: '#1e1e2e' }}>
          <h2 style={{ color: '#cdd6f4', marginBottom: 32 }}>Finance</h2>
          {[
            { to: '/', label: 'Dashboard' },
            { to: '/transactions', label: 'Transações' },
            { to: '/history', label: 'Histórico' },
          ].map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              style={({ isActive }) => ({
                display: 'block',
                marginBottom: 12,
                color: isActive ? '#cba6f7' : '#a6adc8',
                textDecoration: 'none',
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, padding: 32, background: '#181825' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
```

---

### `src/components/SummaryCards.jsx`

```jsx
export default function SummaryCards({ summary }) {
  if (!summary) return null

  const cards = [
    { label: 'Entradas', value: summary.total_entradas, color: '#a6e3a1' },
    { label: 'Saídas',   value: summary.total_saidas,   color: '#f38ba8' },
    { label: 'Saldo',    value: summary.saldo,           color: summary.saldo >= 0 ? '#89dceb' : '#f38ba8' },
  ]

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
      {cards.map(({ label, value, color }) => (
        <div key={label} style={{
          flex: 1, padding: 24, borderRadius: 12,
          background: '#1e1e2e', border: `1px solid ${color}22`,
        }}>
          <p style={{ color: '#a6adc8', margin: 0 }}>{label}</p>
          <p style={{ color, fontSize: 28, fontWeight: 700, margin: '8px 0 0' }}>
            R$ {value.toFixed(2).replace('.', ',')}
          </p>
        </div>
      ))}
    </div>
  )
}
```

---

### `src/components/ExpenseChart.jsx`

Gráfico de pizza com os gastos do mês agrupados por descrição.

```jsx
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

const COLORS = ['#cba6f7', '#f38ba8', '#fab387', '#f9e2af', '#a6e3a1', '#89dceb', '#89b4fa']

export default function ExpenseChart({ transactions }) {
  const grouped = transactions
    .filter((t) => t.tipo === 'saída')
    .reduce((acc, t) => {
      acc[t.descricao] = (acc[t.descricao] || 0) + t.valor
      return acc
    }, {})

  const data = Object.entries(grouped)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7)

  if (data.length === 0) return <p style={{ color: '#a6adc8' }}>Nenhuma saída no período.</p>

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100}>
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip formatter={(v) => `R$ ${v.toFixed(2)}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  )
}
```

---

### `src/components/TransactionTable.jsx`

Tabela com botões de editar e excluir por linha.

```jsx
export default function TransactionTable({ transactions, onEdit, onDelete }) {
  if (transactions.length === 0)
    return <p style={{ color: '#a6adc8' }}>Nenhuma transação encontrada.</p>

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ color: '#a6adc8', textAlign: 'left', borderBottom: '1px solid #313244' }}>
          {['Data', 'Hora', 'Tipo', 'Valor', 'Descrição', 'Categoria', ''].map((h) => (
            <th key={h} style={{ padding: '8px 12px', fontWeight: 500 }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id} style={{ borderBottom: '1px solid #1e1e2e', color: '#cdd6f4' }}>
            <td style={{ padding: '10px 12px' }}>{t.data}</td>
            <td style={{ padding: '10px 12px' }}>{t.hora}</td>
            <td style={{ padding: '10px 12px', color: t.tipo === 'entrada' ? '#a6e3a1' : '#f38ba8' }}>
              {t.tipo}
            </td>
            <td style={{ padding: '10px 12px' }}>R$ {Number(t.valor).toFixed(2).replace('.', ',')}</td>
            <td style={{ padding: '10px 12px' }}>{t.descricao}</td>
            <td style={{ padding: '10px 12px', color: '#6c7086' }}>{t.categoria || '—'}</td>
            <td style={{ padding: '10px 12px', display: 'flex', gap: 8 }}>
              <button onClick={() => onEdit(t)} style={btnStyle('#89b4fa')}>Editar</button>
              <button onClick={() => onDelete(t)} style={btnStyle('#f38ba8')}>Excluir</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

const btnStyle = (color) => ({
  background: 'transparent', border: `1px solid ${color}`,
  color, borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12,
})
```

---

### `src/components/EditModal.jsx`

Modal de edição de transação.

```jsx
import { useState } from 'react'

export default function EditModal({ transaction, onSave, onClose }) {
  const [form, setForm] = useState({
    valor: transaction.valor,
    descricao: transaction.descricao,
    categoria: transaction.categoria || '',
    data: transaction.data,
  })

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }))

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#00000088',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100,
    }}>
      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 32, minWidth: 360 }}>
        <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>Editar transação #{transaction.id}</h3>
        {[
          { label: 'Valor', field: 'valor', type: 'number' },
          { label: 'Descrição', field: 'descricao', type: 'text' },
          { label: 'Categoria', field: 'categoria', type: 'text' },
          { label: 'Data (DD/MM/AAAA)', field: 'data', type: 'text' },
        ].map(({ label, field, type }) => (
          <div key={field} style={{ marginBottom: 16 }}>
            <label style={{ color: '#a6adc8', display: 'block', marginBottom: 4 }}>{label}</label>
            <input
              type={type}
              value={form[field]}
              onChange={set(field)}
              style={{
                width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #313244',
                background: '#181825', color: '#cdd6f4', boxSizing: 'border-box',
              }}
            />
          </div>
        ))}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('#6c7086')}>Cancelar</button>
          <button onClick={() => onSave(transaction.id, form)} style={btnStyle('#cba6f7')}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

const btnStyle = (color) => ({
  background: 'transparent', border: `1px solid ${color}`,
  color, borderRadius: 6, padding: '8px 20px', cursor: 'pointer',
})
```

---

### `src/components/HistoryChart.jsx`

Gráfico de barras com entradas x saídas e linha de saldo.

```jsx
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip,
  Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'

export default function HistoryChart({ data }) {
  if (!data || data.length === 0)
    return <p style={{ color: '#a6adc8' }}>Sem dados históricos.</p>

  return (
    <ResponsiveContainer width="100%" height={320}>
      <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#313244" />
        <XAxis dataKey="mes" stroke="#a6adc8" />
        <YAxis stroke="#a6adc8" tickFormatter={(v) => `R$${v}`} />
        <Tooltip formatter={(v) => `R$ ${v.toFixed(2)}`} />
        <Legend />
        <Bar dataKey="entradas" name="Entradas" fill="#a6e3a1" radius={[4, 4, 0, 0]} />
        <Bar dataKey="saidas" name="Saídas" fill="#f38ba8" radius={[4, 4, 0, 0]} />
        <Line dataKey="saldo" name="Saldo" stroke="#89b4fa" strokeWidth={2} dot={{ r: 4 }} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
```

---

### `src/pages/Dashboard.jsx`

```jsx
import { useState, useEffect } from 'react'
import { getSummary, getTransactions } from '../services/api'
import SummaryCards from '../components/SummaryCards'
import ExpenseChart from '../components/ExpenseChart'

const now = new Date()

export default function Dashboard() {
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [ano, setAno] = useState(String(now.getFullYear()))
  const [summary, setSummary] = useState(null)
  const [transactions, setTransactions] = useState([])

  useEffect(() => {
    getSummary(mes, ano).then(setSummary).catch(console.error)
    getTransactions(mes, ano).then(setTransactions).catch(console.error)
  }, [mes, ano])

  const anos = ['2025', '2026', '2027']
  const meses = [
    ['01', 'Jan'], ['02', 'Fev'], ['03', 'Mar'], ['04', 'Abr'],
    ['05', 'Mai'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Ago'],
    ['09', 'Set'], ['10', 'Out'], ['11', 'Nov'], ['12', 'Dez'],
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32 }}>
        <h1 style={{ color: '#cdd6f4', margin: 0 }}>Dashboard</h1>
        <select value={mes} onChange={(e) => setMes(e.target.value)} style={selectStyle}>
          {meses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={ano} onChange={(e) => setAno(e.target.value)} style={selectStyle}>
          {anos.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <SummaryCards summary={summary} />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div style={cardStyle}>
          <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>Gastos por descrição</h3>
          <ExpenseChart transactions={transactions} />
        </div>
        <div style={cardStyle}>
          <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>Últimas transações</h3>
          {transactions.slice(-10).reverse().map((t) => (
            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ color: '#a6adc8' }}>{t.descricao}</span>
              <span style={{ color: t.tipo === 'entrada' ? '#a6e3a1' : '#f38ba8', fontWeight: 600 }}>
                {t.tipo === 'entrada' ? '+' : '-'} R$ {Number(t.valor).toFixed(2).replace('.', ',')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const selectStyle = {
  background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
  borderRadius: 6, padding: '6px 12px',
}
const cardStyle = { background: '#1e1e2e', borderRadius: 12, padding: 24 }
```

---

### `src/pages/Transactions.jsx`

```jsx
import { useState, useEffect } from 'react'
import { getTransactions, updateTransaction, deleteTransaction } from '../services/api'
import TransactionTable from '../components/TransactionTable'
import EditModal from '../components/EditModal'

const now = new Date()

export default function Transactions() {
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [ano, setAno] = useState(String(now.getFullYear()))
  const [tipo, setTipo] = useState('')
  const [busca, setBusca] = useState('')
  const [transactions, setTransactions] = useState([])
  const [editing, setEditing] = useState(null)

  const load = () =>
    getTransactions(mes, ano).then(setTransactions).catch(console.error)

  useEffect(() => { load() }, [mes, ano])

  const filtered = transactions.filter((t) => {
    if (tipo && t.tipo !== tipo) return false
    if (busca && !t.descricao.toLowerCase().includes(busca.toLowerCase())) return false
    return true
  })

  const handleSave = async (id, data) => {
    await updateTransaction(id, { ...data, valor: parseFloat(data.valor) })
    setEditing(null)
    load()
  }

  const handleDelete = async (t) => {
    if (!window.confirm(`Excluir "${t.descricao}" de R$ ${t.valor}?`)) return
    await deleteTransaction(t.id)
    load()
  }

  const meses = [
    ['01', 'Jan'], ['02', 'Fev'], ['03', 'Mar'], ['04', 'Abr'],
    ['05', 'Mai'], ['06', 'Jun'], ['07', 'Jul'], ['08', 'Ago'],
    ['09', 'Set'], ['10', 'Out'], ['11', 'Nov'], ['12', 'Dez'],
  ]

  return (
    <div>
      <h1 style={{ color: '#cdd6f4', marginBottom: 24 }}>Transações</h1>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <select value={mes} onChange={(e) => setMes(e.target.value)} style={selectStyle}>
          {meses.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <select value={ano} onChange={(e) => setAno(e.target.value)} style={selectStyle}>
          {['2025', '2026', '2027'].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={selectStyle}>
          <option value="">Todos os tipos</option>
          <option value="entrada">Entrada</option>
          <option value="saída">Saída</option>
        </select>
        <input
          placeholder="Buscar descrição..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={{ ...selectStyle, minWidth: 200 }}
        />
      </div>

      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 24 }}>
        <TransactionTable
          transactions={filtered}
          onEdit={setEditing}
          onDelete={handleDelete}
        />
      </div>

      {editing && (
        <EditModal
          transaction={editing}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

const selectStyle = {
  background: '#313244', color: '#cdd6f4', border: '1px solid #45475a',
  borderRadius: 6, padding: '6px 12px',
}
```

---

### `src/pages/History.jsx`

```jsx
import { useState, useEffect } from 'react'
import { getHistory } from '../services/api'
import HistoryChart from '../components/HistoryChart'

export default function History() {
  const [data, setData] = useState([])

  useEffect(() => {
    getHistory().then(setData).catch(console.error)
  }, [])

  return (
    <div>
      <h1 style={{ color: '#cdd6f4', marginBottom: 24 }}>Histórico</h1>
      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 24, marginBottom: 24 }}>
        <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>Entradas x Saídas por mês</h3>
        <HistoryChart data={data} />
      </div>
      <div style={{ background: '#1e1e2e', borderRadius: 12, padding: 24 }}>
        <h3 style={{ color: '#cdd6f4', marginTop: 0 }}>Resumo mensal</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ color: '#a6adc8', borderBottom: '1px solid #313244' }}>
              {['Mês', 'Entradas', 'Saídas', 'Saldo'].map((h) => (
                <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 500 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.mes} style={{ borderBottom: '1px solid #1e1e2e', color: '#cdd6f4' }}>
                <td style={{ padding: '10px 12px' }}>{row.mes}</td>
                <td style={{ padding: '10px 12px', color: '#a6e3a1' }}>R$ {row.entradas.toFixed(2).replace('.', ',')}</td>
                <td style={{ padding: '10px 12px', color: '#f38ba8' }}>R$ {row.saidas.toFixed(2).replace('.', ',')}</td>
                <td style={{ padding: '10px 12px', color: row.saldo >= 0 ? '#89dceb' : '#f38ba8', fontWeight: 600 }}>
                  R$ {row.saldo.toFixed(2).replace('.', ',')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

---

## Ajuste no `vite.config.js`

Adicionar proxy para evitar CORS em desenvolvimento — qualquer chamada a `/api` é redirecionada para o FastAPI:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
```

> Com o proxy configurado, `services/api.js` pode usar `/api` como base em vez de `http://localhost:8000` para evitar problemas de CORS em qualquer configuração. Mas como o CORS já está liberado na API para `localhost:5173`, ambas as abordagens funcionam.

---

## Validação da Fase 5

### Checklist por tela

**Dashboard**
- [ ] Cards de Entradas, Saídas e Saldo exibem valores corretos para o mês selecionado
- [ ] Trocar mês/ano atualiza os cards e os gráficos
- [ ] Gráfico de pizza exibe os gastos agrupados por descrição
- [ ] Lista de últimas transações exibe as 10 mais recentes em ordem decrescente

**Transactions**
- [ ] Tabela exibe todas as transações do mês selecionado
- [ ] Filtro por tipo (entrada/saída) funciona
- [ ] Busca por descrição filtra em tempo real
- [ ] Botão Editar abre o modal com os dados preenchidos
- [ ] Salvar no modal atualiza a transação na planilha e recarrega a tabela
- [ ] Botão Excluir exibe confirmação e remove a transação da listagem após confirmar

**History**
- [ ] Gráfico de barras exibe entradas e saídas por mês
- [ ] Linha de saldo sobreposta no gráfico
- [ ] Tabela de resumo mensal exibe os mesmos dados do gráfico

### Checklist técnico

- [ ] `npm create vite@latest frontend -- --template react` executado
- [ ] `react-router-dom` e `recharts` instalados
- [ ] `src/services/api.js` implementado
- [ ] Todos os componentes e páginas criados
- [ ] Frontend rodando em `http://localhost:5173` sem erros no console
- [ ] API rodando em `http://localhost:8000` em paralelo
- [ ] Nenhuma chamada ao Google Sheets feita diretamente pelo frontend

---

## Executando o frontend

```bash
cd frontend
npm run dev
```

Acesse `http://localhost:5173` no navegador.

---

## O que esta fase não faz

- Não implementa autenticação
- Não cria o script de inicialização unificado (`start.sh`)
- Não testa o fluxo ponta a ponta (Telegram → planilha → painel)

Isso é feito na Fase 6.
