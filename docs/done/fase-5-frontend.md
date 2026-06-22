# Fase 5 — Frontend React: Especificação Técnica

## Visão Geral

Painel web local construído com **Vite + React**. Consome a API FastAPI em `http://localhost:8000` e nunca acessa o Google Sheets diretamente. Roda em `http://localhost:5173` durante o desenvolvimento.

```
FastAPI :8000  ←→  React :5173
```

---

## Stack e Dependências

| Pacote | Versão mínima | Função |
|---|---|---|
| `react` | 18 | UI declarativa |
| `react-dom` | 18 | Renderização no browser |
| `react-router-dom` | 6 | Roteamento client-side |
| `recharts` | 2 | Gráficos (barras, linha, pizza) |
| `vite` | 5 | Bundler e dev server |

Sem bibliotecas de UI externas (Tailwind, MUI, etc.) — todo o estilo é CSS puro via CSS variables.

---

## Estrutura de Arquivos

```
frontend/
├── index.html
├── vite.config.js
├── package.json
└── src/
    ├── main.jsx                  # Entry point — monta <App /> no DOM
    ├── App.jsx                   # Router + layout raiz (Sidebar + <Outlet>)
    ├── index.css                 # CSS variables globais e reset
    │
    ├── services/
    │   └── api.js                # Todas as chamadas HTTP à FastAPI
    │
    ├── hooks/
    │   └── useMonth.js           # Estado global do mês/ano selecionado
    │
    ├── components/
    │   ├── Sidebar.jsx           # Navegação lateral fixa
    │   ├── MonthSelector.jsx     # < Mês Ano >
    │   ├── SummaryCards.jsx      # 3 cards: Entradas / Saídas / Saldo
    │   ├── TransactionTable.jsx  # Tabela com ações editar/excluir
    │   ├── EditModal.jsx         # Modal de edição de transação
    │   ├── ImportModal.jsx       # Modal de upload de PDF
    │   ├── Toast.jsx             # Notificações temporárias
    │   └── charts/
    │       ├── ExpenseBarChart.jsx    # Barras verticais — maiores gastos
    │       ├── HistoryBarChart.jsx    # Barras agrupadas — histórico mensal
    │       ├── ItemBarChart.jsx       # Barras horizontais — resumo por item
    │       └── GroupDonutChart.jsx    # Donut — proporção por grupo
    │
    └── pages/
        ├── Dashboard.jsx
        ├── Transactions.jsx
        ├── History.jsx
        ├── ItemSummary.jsx
        ├── GroupSummary.jsx
        └── AIAnalysis.jsx
```

---

## Roteamento

Definido em `App.jsx` usando `react-router-dom` v6 com `createBrowserRouter` ou `<BrowserRouter>`.

| Path | Componente | Tela |
|---|---|---|
| `/` | `Dashboard` | Dashboard (tela inicial) |
| `/transactions` | `Transactions` | Listagem completa |
| `/history` | `History` | Histórico mês a mês |
| `/items` | `ItemSummary` | Resumo por item |
| `/groups` | `GroupSummary` | Resumo por grupo |
| `/ai` | `AIAnalysis` | Análise IA |

A `Sidebar` usa `<NavLink>` do React Router para aplicar a classe `.active` automaticamente na rota atual.

---

## Camada de Serviço — `services/api.js`

Centraliza todas as requisições. Nenhum componente faz `fetch` diretamente.

```js
const BASE = 'http://localhost:8000'

// Resumo do mês (cards do Dashboard)
export const getSummary = (mes, ano) =>
  fetch(`${BASE}/summary?mes=${mes}&ano=${ano}`).then(r => r.json())

// Transações do mês (tabela, lista recente, gráficos)
export const getTransactions = (mes, ano) =>
  fetch(`${BASE}/transactions?mes=${mes}&ano=${ano}`).then(r => r.json())

// Histórico mês a mês
export const getHistory = () =>
  fetch(`${BASE}/history`).then(r => r.json())

// Resumo por item — derivado de getTransactions, calculado no frontend
// (agrupa por descrição, soma valores, calcula %)

// Editar transação
export const updateTransaction = (id, body) =>
  fetch(`${BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(r => r.json())

// Excluir transação (exclusão lógica — muda status para "cancelado")
export const deleteTransaction = (id) =>
  fetch(`${BASE}/transactions/${id}`, { method: 'DELETE' }).then(r => r.json())
```

---

## Estado Global — `hooks/useMonth.js`

Hook customizado que mantém o mês e ano selecionados sincronizados entre todas as telas.

```js
// Implementação sugerida com Context API
import { createContext, useContext, useState } from 'react'

const MonthContext = createContext()

export function MonthProvider({ children }) {
  const now = new Date()
  const [mes, setMes] = useState(String(now.getMonth() + 1).padStart(2, '0'))
  const [ano, setAno] = useState(String(now.getFullYear()))

  function prev() { /* decrementa mês, ajusta ano */ }
  function next() { /* incrementa mês, ajusta ano */ }

  return (
    <MonthContext.Provider value={{ mes, ano, prev, next }}>
      {children}
    </MonthContext.Provider>
  )
}

export const useMonth = () => useContext(MonthContext)
```

`MonthProvider` envolve toda a aplicação em `main.jsx`. Cada página consome `useMonth()` para saber qual mês filtrar e para renderizar o `MonthSelector`.

---

## Componentes

### `Sidebar`

```
Props: nenhuma
Estado: nenhum (usa NavLink do router)
```

- Renderiza o logo `finance.` e 6 `<NavLink>` com ícone SVG inline
- `NavLink` recebe `className={({ isActive }) => isActive ? 'active' : ''}` para aplicar o estilo da rota ativa
- Sem lógica de dados

---

### `MonthSelector`

```
Props: nenhuma (consome useMonth())
```

- Lê `{ mes, ano, prev, next }` do contexto
- Formata o label: `"Junho 2025"` a partir de `mes` e `ano`
- Chama `prev()` e `next()` nos botões `<` e `>`

---

### `SummaryCards`

```
Props: { totalEntradas, totalSaidas, saldo }
```

- Renderiza 3 `<div class="card">`
- `saldo`: cor verde se `>= 0`, vermelha se `< 0`
- Formata valores com `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

---

### `TransactionTable`

```
Props: {
  transactions: Transaction[],
  onEdit: (transaction) => void,
  onDelete: (id) => void,
}
```

- Renderiza `<table>` com colunas: Data · Hora · Tipo · Descrição · Categoria · Valor · Ações
- `Tipo` renderizado como `<span class="badge entrada|saida">`
- Valor: verde para `entrada`, vermelho para `saída`
- Ações: dois `<button>` ícone — editar (chama `onEdit`) e excluir (chama `onDelete` após confirmação inline)
- Sem paginação na V1.0

---

### `EditModal`

```
Props: {
  transaction: Transaction | null,  // null = fechado
  onSave: (id, updatedFields) => void,
  onClose: () => void,
}
```

- Renderiza `null` quando `transaction` é `null`
- Formulário controlado com `useState` inicializado com os valores da transação recebida
- Overlay clicável chama `onClose()`
- Ao submeter: chama `onSave(transaction.id, { valor, descricao, categoria, data })`
- Campos: `valor` (number), `descricao` (text), `categoria` (text), `data` (text `DD/MM/AAAA`)

---

### `ImportModal`

```
Props: {
  open: boolean,
  onClose: () => void,
  onImport: (transactions) => void,
}
```

- Estado interno: `stage: 'upload' | 'review'`
- Stage `upload`: área de drag-and-drop + botão de seleção de arquivo
- Stage `review`: tabela com as transações extraídas do PDF para conferência antes de confirmar
- Ao confirmar: chama `onImport(transactions)` e volta para `stage: 'upload'`

---

### `Toast`

```
Props: { message: string, visible: boolean }
```

- Renderiza fixo no canto inferior direito
- Desaparece automaticamente após 3 000 ms via `useEffect` com `setTimeout`
- Estilo: borda e texto em `--green` para sucesso

Gerenciamento no componente pai (ex: `App.jsx`) com estado `{ toastMsg, showToast }`. Cada ação que gera feedback (salvar, excluir, importar) chama `showToast('mensagem')`.

---

## Páginas

### `Dashboard`

**Dados:** `getSummary(mes, ano)` + `getTransactions(mes, ano)`

**Fluxo de dados:**
1. `useEffect` dispara ao montar e sempre que `mes`/`ano` mudam
2. Chama `getSummary` → alimenta `<SummaryCards>`
3. Chama `getTransactions` → alimenta `<ExpenseBarChart>` (top gastos por descrição, agrupado no frontend) e lista de recentes (primeiros 10, ordenados por data desc)

**Layout:**
```
<MonthSelector />          [Importar PDF]
<SummaryCards />
<div class="section-grid">
  <ExpenseBarChart />      (60%)
  <RecentList />           (40%)
</div>
<footer />
```

**Agrupamento para o gráfico** (calculado no frontend):
```js
const byDesc = transactions
  .filter(t => t.tipo === 'saída')
  .reduce((acc, t) => {
    acc[t.descricao] = (acc[t.descricao] || 0) + t.valor
    return acc
  }, {})

const topItems = Object.entries(byDesc)
  .sort(([, a], [, b]) => b - a)
  .slice(0, 7)
  .map(([name, value]) => ({ name, value }))
```

---

### `Transactions`

**Dados:** `getTransactions(mes, ano)`

**Estado local:**
- `filter: 'all' | 'entrada' | 'saída'`
- `search: string`
- `editingTx: Transaction | null`

**Derivações (useMemo):**
```js
const filtered = transactions
  .filter(t => filter === 'all' || t.tipo === filter)
  .filter(t => t.descricao.toLowerCase().includes(search.toLowerCase()))
```

**Fluxo de edição:**
1. Usuário clica ✏️ → `setEditingTx(tx)`
2. `<EditModal transaction={editingTx} />` abre
3. Modal chama `onSave(id, fields)` → `updateTransaction(id, fields)` → refetch → toast
4. Modal chama `onClose()` → `setEditingTx(null)`

**Fluxo de exclusão:**
1. Usuário clica 🗑️ → confirmação inline (ex: botão vira "Confirmar?")
2. Confirma → `deleteTransaction(id)` → refetch → toast `"Transação excluída."`

---

### `History`

**Dados:** `getHistory()`

**Layout:**
```
<HistoryBarChart data={history} />    (barras agrupadas Verde/Vermelho por mês)
<table>                               (resumo: Mês · Entradas · Saídas · Saldo)
```

**Estrutura do dado esperado da API:**
```json
[
  { "mes": "01/2025", "entradas": 7000, "saidas": 4800, "saldo": 2200 },
  { "mes": "02/2025", "entradas": 7000, "saidas": 5600, "saldo": 1400 }
]
```

Cor do saldo na tabela: `--green` se `>= 0`, `--red` se `< 0`.

---

### `ItemSummary`

**Dados:** `getTransactions(mes, ano)` (agrupado no frontend)

**Estado local:** `mode: 'chart' | 'table'`

**Agrupamento:**
```js
const items = transactions
  .filter(t => t.tipo === 'saída')
  .reduce((acc, t) => {
    const found = acc.find(i => i.name === t.descricao)
    if (found) { found.total += t.valor; found.count++ }
    else acc.push({ name: t.descricao, total: t.valor, count: 1 })
    return acc
  }, [])
  .sort((a, b) => b.total - a.total)

const totalSaidas = items.reduce((s, i) => s + i.total, 0)
const withPct = items.map(i => ({ ...i, pct: (i.total / totalSaidas * 100).toFixed(1) }))
```

**Modo Gráfico:** `<ItemBarChart items={withPct} />` — barras horizontais, largura proporcional ao maior item.

**Modo Tabela:** `<table>` com colunas `Descrição · Total · Lançamentos · % Saídas`.

---

### `GroupSummary`

**Dados:** `getTransactions(mes, ano)`

> **Nota V1.0:** o campo `categoria` fica vazio na planilha. Enquanto isso, a atribuição de grupos é feita por mapeamento estático de descrição → grupo no frontend, configurável em `src/config/groups.js`.

```js
// src/config/groups.js
export const GROUP_MAP = {
  'aluguel': 'Gastos Fixos',
  'academia': 'Gastos Fixos',
  'mercado': 'Alimentação',
  'restaurante': 'Alimentação',
  'gasolina': 'Transporte',
  'streaming': 'Lazer & Assinaturas',
  // ...
}
export const GROUP_COLORS = {
  'Gastos Fixos': '#ef4444',
  'Alimentação': '#f97316',
  'Transporte': '#a855f7',
  'Lazer & Assinaturas': '#3b82f6',
}
```

**Layout:**
```
<MonthSelector />
<div class="group-cards">   (grid 2 colunas)
  <GroupCard /> × N
</div>
<GroupDonutChart />
```

**`GroupCard` props:** `{ name, total, pct, items: [{ name, value }] }`

---

### `AIAnalysis`

**Dados:** `getTransactions(mes, ano)` + `getSummary(mes, ano)` (montados em prompt para a IA)

**Estado local:** `stage: 'idle' | 'loading' | 'done'`, `result: string | null`

**Integração com Claude API:**
- A chamada à IA é feita via `POST /ai/analysis` na FastAPI (endpoint a ser criado na Fase 5)
- A FastAPI monta o prompt com os dados do mês e chama a API do Claude
- O frontend recebe o texto e renderiza os blocos temáticos

**Fluxo:**
```
[Gerar Análise]
    ↓
POST /ai/analysis?mes=06&ano=2025
    ↓ FastAPI busca transações, monta prompt, chama Claude
    ↓
{ "analysis": "...", "blocks": [...] }
    ↓
Renderiza blocos por tema
```

**Blocos esperados na resposta:**
```json
{
  "blocks": [
    { "title": "Padrão de Consumo", "content": "..." },
    { "title": "Maior Gasto", "content": "..." },
    { "title": "Comparativo com Mês Anterior", "content": "..." },
    { "title": "Sugestão de Economia", "content": "..." }
  ]
}
```

Durante o loading: botão desabilitado com texto `"Gerando..."` ou spinner inline.

---

## Gráficos (`src/components/charts/`)

### `ExpenseBarChart` — Dashboard

Barras verticais dos maiores gastos por descrição.

```
Props: { items: [{ name: string, value: number }] }
```

- Implementado com CSS puro (sem Recharts) conforme o protótipo: `div` flex com altura proporcional
- Altura máxima: `220px`; cada barra = `(value / maxValue) * 220`
- Cor: `--red`; borda superior arredondada; label truncado abaixo

> Alternativa com Recharts: `<BarChart>` com `<Bar dataKey="value" fill="var(--red)" />`

---

### `HistoryBarChart` — Histórico

Barras agrupadas (entrada + saída) por mês.

```
Props: { data: [{ mes, entradas, saidas, saldo }] }
```

- Recomendado: Recharts `<BarChart>` com dois `<Bar>` (verde e vermelho) + `<Line>` para saldo acumulado
- Labels do eixo X: abreviação do mês (`"Jan"`, `"Fev"`, etc.)

---

### `ItemBarChart` — Resumo por Item

Barras horizontais ordenadas por valor.

```
Props: { items: [{ name, total, pct }] }
```

- Implementado com CSS puro: layout flex row por item
- Track `height: 18px`, fill proporcional ao maior item (`width: (total / max) * 100 + '%'`)

---

### `GroupDonutChart` — Resumo por Grupo

Gráfico de rosca com proporção por grupo.

```
Props: { groups: [{ name, total, color }] }
```

- Recomendado: Recharts `<PieChart>` com `<Pie innerRadius={50} outerRadius={75} />`
- Legenda ao lado: lista com dot colorido + nome + percentual

---

## Formatação de Dados

Centralizar em `src/utils/format.js`:

```js
// Moeda
export const currency = (v) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

// "01/2025" → "Janeiro 2025"
export const monthLabel = (mesAno) => {
  const [m, y] = mesAno.split('/')
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return `${names[parseInt(m) - 1]} ${y}`
}

// "06" → "Junho"
export const monthName = (mes) => {
  const names = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
                  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
  return names[parseInt(mes) - 1]
}
```

---

## Gestão de Estado e Refetch

Não há biblioteca de cache (React Query, SWR) na V1.0. Cada página gerencia seu próprio `useState` + `useEffect`:

```js
const [data, setData] = useState([])
const [loading, setLoading] = useState(false)

useEffect(() => {
  setLoading(true)
  getTransactions(mes, ano)
    .then(setData)
    .finally(() => setLoading(false))
}, [mes, ano])
```

Após mutações (editar/excluir), refetch manual:
```js
const reload = () => getTransactions(mes, ano).then(setData)
```

---

## Tratamento de Erros

- `fetch` falhou (API offline): exibir mensagem inline `"Não foi possível conectar à API."` no lugar do conteúdo
- API retornou erro 4xx/5xx: exibir toast com a mensagem de erro retornada
- Sem retry automático na V1.0

---

## CSS Variables Globais — `src/index.css`

```css
:root {
  --bg:     #0f1117;
  --bg2:    #1a1d27;
  --bg3:    #242838;
  --border: #2e3347;
  --text:   #e2e8f0;
  --muted:  #7c85a2;
  --green:  #22c55e;
  --green-dim: #16a34a22;
  --red:    #ef4444;
  --red-dim:   #dc262622;
  --blue:   #3b82f6;
  --sidebar-w: 220px;
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: var(--bg); color: var(--text); font-family: 'Segoe UI', system-ui, sans-serif; font-size: 14px; }
```

Cada componente tem seu próprio arquivo `.css` ou usa classes globais definidas em `index.css`.

---

## Integração com a API — Endpoint Adicional Necessário

A tela **Análise IA** requer um endpoint novo na FastAPI que ainda não existe:

### `POST /ai/analysis`

```
Query params: mes, ano
Body: (vazio — a API busca as transações internamente)
```

**Responsabilidade da FastAPI:**
1. Buscar transações do mês no Google Sheets
2. Buscar resumo do mês anterior para comparativo
3. Montar prompt estruturado
4. Chamar a API do Claude (`claude-sonnet-4-6` ou mais recente)
5. Retornar blocos de análise como JSON

**Resposta esperada:**
```json
{
  "blocks": [
    { "title": "Padrão de Consumo", "content": "..." },
    { "title": "Maior Gasto", "content": "..." },
    { "title": "Comparativo com Mês Anterior", "content": "..." },
    { "title": "Sugestão de Economia", "content": "..." }
  ]
}
```

---

## Inicialização

```bash
cd frontend
npm install
npm run dev       # http://localhost:5173
```

A FastAPI deve estar rodando em `:8000` antes de abrir o frontend. O `start.sh` na raiz do projeto sobe os três serviços em sequência.

---

## Checklist de Implementação

### Setup
- [ ] `npm create vite@latest frontend -- --template react`
- [ ] Instalar dependências: `recharts react-router-dom`
- [ ] Configurar CSS variables em `index.css`
- [ ] Criar `services/api.js`
- [ ] Criar `hooks/useMonth.js` com Context
- [ ] Configurar rotas em `App.jsx`

### Componentes base
- [ ] `Sidebar` com NavLink
- [ ] `MonthSelector` consumindo contexto
- [ ] `SummaryCards`
- [ ] `TransactionTable`
- [ ] `EditModal`
- [ ] `Toast`

### Páginas
- [ ] `Dashboard` — summary cards + gráfico de gastos + lista recente
- [ ] `Transactions` — tabela + filtros + modal edição + exclusão
- [ ] `History` — gráfico agrupado + tabela resumida
- [ ] `ItemSummary` — barras horizontais + modo tabela
- [ ] `GroupSummary` — cards de grupo + donut
- [ ] `AIAnalysis` — estado idle + loading + resultado

### Integrações
- [ ] `ImportModal` — drag-and-drop + tela de revisão
- [ ] Endpoint `POST /ai/analysis` na FastAPI
- [ ] Tratamento de erro de conexão em todas as páginas

### Qualidade
- [ ] Formatação de moeda via `Intl.NumberFormat` em todo o app
- [ ] Responsividade mínima (não quebrar abaixo de 1280px de largura)
- [ ] Estados de loading em todas as chamadas assíncronas
