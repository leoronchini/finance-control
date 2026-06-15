# PRD Técnico — Controle Financeiro Pessoal

**Versão 1.0 — Base para Desenvolvimento**

---

## 1. Visão Geral Técnica

Sistema composto por três partes independentes que se comunicam:

```
[Telegram] → [Bot Python] → [Google Sheets] ← [FastAPI] ← [React Frontend]
```

- O **bot** é o único que escreve na planilha
- O **FastAPI** é o único que lê a planilha e serve dados ao frontend
- O **frontend** nunca acessa o Google Sheets diretamente
- Tudo roda localmente na máquina do usuário

---

## 2. Estrutura de Pastas do Projeto

```
finance-bot/
├── bot/
│   ├── main.py              # Inicialização do bot
│   ├── handlers.py          # Lógica de interpretação das mensagens
│   ├── sheets.py            # Integração com Google Sheets
│   └── parser.py            # Parser das mensagens do usuário
│
├── api/
│   ├── main.py              # Inicialização do FastAPI
│   └── routes/
│       ├── transactions.py  # Endpoints de transações
│       ├── summary.py       # Endpoint de resumo mensal
│       └── history.py       # Endpoint de histórico mês a mês
│
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Transactions.jsx
│       │   └── History.jsx
│       ├── components/
│       │   ├── SummaryCards.jsx
│       │   ├── TransactionTable.jsx
│       │   └── Charts.jsx
│       └── services/
│           └── api.js
│
├── credentials/
│   └── .gitkeep
│
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
├── start.sh
└── README.md
```

---

## 3. Variáveis de Ambiente (.env)

```
TELEGRAM_BOT_TOKEN=...
TELEGRAM_CHAT_ID=...
GOOGLE_SHEETS_ID=...
GOOGLE_CREDENTIALS_PATH=./credentials/google-credentials.json
API_PORT=8000
```

`TELEGRAM_CHAT_ID` garante que o bot só processa mensagens do próprio usuário, ignorando qualquer outra pessoa que tente interagir com o bot.

---

## 4. Módulo Bot (Python)

### 4.1 Responsabilidades

- Escutar mensagens recebidas no Telegram
- Parsear a mensagem e extrair valor, tipo e descrição
- Gravar a transação no Google Sheets
- Responder com confirmação ou erro
- Processar o comando `cancelar` / `desfazer`

### 4.2 Lógica do Parser (`parser.py`)

Recebe o texto cru da mensagem e retorna um objeto estruturado.

**Regras de interpretação:**

| Padrão da mensagem | Tipo | Exemplo |
|---|---|---|
| `[valor] [descrição]` | saída | `50 mercado` |
| `[valor] reais [descrição]` | saída | `50 reais mercado` |
| `entrada [valor] [descrição]` | entrada | `entrada 1500 salário` |
| `saída [valor] [descrição]` | saída | `saída 200 farmácia` |

**Objeto retornado pelo parser:**
```python
{
  "valor": 50.00,
  "tipo": "saída",
  "descricao": "mercado",
  "data": "10/06/2025",
  "hora": "14:32",
  "status": "ativo"
}
```

**Casos de erro que o parser deve tratar:**

| Situação | Resposta do bot |
|---|---|
| Mensagem sem valor numérico | `❌ Não entendi o valor. Exemplo: 50 mercado` |
| Mensagem sem descrição | `❌ Adicione uma descrição. Exemplo: 50 mercado` |
| Valor zerado ou negativo | `❌ O valor precisa ser maior que zero` |

### 4.3 Comando Cancelar

- Salva o `id` do último registro feito na sessão atual em memória
- Ao receber `cancelar` ou `desfazer`, atualiza o campo `status` daquela linha para `cancelado` no Sheets
- Responde: `↩️ Último registro desfeito.`
- Se não houver registro recente: `⚠️ Nenhum registro recente para desfazer.`

### 4.4 Integração Google Sheets (`sheets.py` do bot)

- Abre a planilha pelo ID definido no `.env`
- Busca a última linha preenchida para definir o próximo `id`
- Adiciona nova linha com todos os campos
- Para cancelar: localiza a linha pelo `id` e atualiza o campo `status`

---

## 5. Google Sheets — Estrutura de Dados

### 5.1 Aba Principal: `transacoes`

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | inteiro sequencial | Identificador único |
| `data` | string `DD/MM/AAAA` | Data da transação |
| `hora` | string `HH:MM` | Hora da transação |
| `tipo` | string `entrada` ou `saída` | Tipo da transação |
| `valor` | número decimal | Valor em reais |
| `descricao` | string | Texto livre enviado pelo usuário |
| `categoria` | string | Vazio na V1.0 — uso futuro |
| `status` | string `ativo` ou `cancelado` | Controle de exclusão lógica |

### 5.2 Regras da Planilha

- A linha 1 é sempre o cabeçalho — nunca sobrescrita
- O bot sempre adiciona na próxima linha disponível
- Registros com `status = cancelado` são ignorados pelo FastAPI em todas as consultas
- Nunca deletar linhas fisicamente — apenas mudar o status

---

## 6. Módulo API (FastAPI)

### 6.1 Responsabilidades

- Ler os dados do Google Sheets
- Calcular totais, saldos e agrupamentos
- Servir os dados ao frontend via endpoints REST
- Nunca escrever na planilha (somente leitura), exceto nos endpoints de edição e exclusão

### 6.2 Endpoints

#### `GET /transactions`
Retorna todas as transações ativas.

Parâmetros opcionais:
- `?mes=06&ano=2025` — filtra por mês/ano
- `?tipo=saída` — filtra por tipo

Resposta:
```json
[
  {
    "id": 1,
    "data": "10/06/2025",
    "hora": "14:32",
    "tipo": "saída",
    "valor": 50.00,
    "descricao": "mercado",
    "categoria": "",
    "status": "ativo"
  }
]
```

#### `GET /summary`
Retorna o resumo do mês.

Parâmetros: `?mes=06&ano=2025`

Resposta:
```json
{
  "total_entradas": 1500.00,
  "total_saidas": 850.00,
  "saldo": 650.00,
  "mes": "06",
  "ano": "2025"
}
```

#### `GET /history`
Retorna resumo mês a mês para o gráfico de histórico.

Resposta:
```json
[
  { "mes": "04/2025", "entradas": 1500.00, "saidas": 900.00, "saldo": 600.00 },
  { "mes": "05/2025", "entradas": 1500.00, "saidas": 780.00, "saldo": 720.00 },
  { "mes": "06/2025", "entradas": 1500.00, "saidas": 850.00, "saldo": 650.00 }
]
```

#### `PATCH /transactions/{id}`
Edita uma transação existente diretamente na planilha.

Body:
```json
{
  "valor": 60.00,
  "descricao": "mercado extra",
  "categoria": "alimentação",
  "data": "10/06/2025"
}
```

#### `DELETE /transactions/{id}`
Marca a transação como `cancelado` na planilha (exclusão lógica).

### 6.3 CORS

Configurado para aceitar requisições apenas de `http://localhost:5173` (porta padrão do React via Vite em dev).

---

## 7. Módulo Frontend (React)

### 7.1 Responsabilidades

- Exibir os dados recebidos do FastAPI
- Permitir navegação entre meses
- Permitir edição e exclusão de transações
- Exibir gráficos de gastos e histórico

### 7.2 Páginas e Componentes

**Dashboard (tela inicial)**
- Seletor de mês/ano
- `SummaryCards` → 3 cards: Entradas / Saídas / Saldo
- `ExpenseChart` → gráfico de pizza com gastos por descrição (Recharts)
- `RecentTransactions` → lista das últimas 10 transações do mês

**Transactions (tela completa)**
- Tabela com todas as transações do mês selecionado
- Filtro por tipo (entrada/saída)
- Campo de busca por descrição
- Botão editar → abre modal com formulário
- Botão excluir → confirmação simples antes de deletar

**History (tela de histórico)**
- Gráfico de barras com entradas x saídas por mês (Recharts)
- Linha de saldo sobreposta no gráfico

### 7.3 Comunicação com a API

Todas as chamadas centralizadas em `services/api.js`:

```javascript
const API_BASE = 'http://localhost:8000'

export const getSummary = (mes, ano) =>
  fetch(`${API_BASE}/summary?mes=${mes}&ano=${ano}`)

export const getTransactions = (mes, ano) =>
  fetch(`${API_BASE}/transactions?mes=${mes}&ano=${ano}`)

export const getHistory = () =>
  fetch(`${API_BASE}/history`)

export const updateTransaction = (id, data) =>
  fetch(`${API_BASE}/transactions/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })

export const deleteTransaction = (id) =>
  fetch(`${API_BASE}/transactions/${id}`, { method: 'DELETE' })
```

---

## 8. Script de Inicialização (`start.sh`)

```bash
#!/bin/bash

echo "Iniciando bot Telegram..."
cd bot && python main.py &
BOT_PID=$!

echo "Iniciando API FastAPI..."
cd ../api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "Iniciando frontend React..."
cd ../frontend && npm run dev

kill $BOT_PID
kill $API_PID
```

---

## 9. Dependências

**Python (`requirements.txt`)**
```
python-telegram-bot==20.7
gspread==6.0.0
google-auth==2.27.0
fastapi==0.109.0
uvicorn==0.27.0
python-dotenv==1.0.0
```

**Node (`package.json` — principais)**
```
react
react-router-dom
recharts
axios
```

---

## 10. Segurança

| Ponto | Solução |
|---|---|
| Bot responde só ao dono | Validação do `TELEGRAM_CHAT_ID` em todo handler |
| Credenciais Google fora do código | `credentials/google-credentials.json` no `.gitignore` |
| `.env` fora do repositório | `.env` no `.gitignore` |
| API sem autenticação | Aceitável na V1.0 — acesso apenas local |

---

## 11. Conexão com o PRD do Projeto

| Requisito do PRD | Implementação técnica |
|---|---|
| Registro via Telegram em linguagem simples | `parser.py` com regras de extração de valor, tipo e descrição |
| Confirmação imediata pelo bot | Handler responde após gravar com sucesso no Sheets |
| Comando cancelar/desfazer | Atualiza `status` para `cancelado` via `gspread` |
| Google Sheets como fonte de verdade | Bot escreve via `gspread`; API lê via `gspread`; frontend nunca acessa diretamente |
| Cards de resumo no painel | Endpoint `/summary` calculado no FastAPI |
| Gráficos de gastos | Recharts no frontend consumindo `/transactions` e `/history` |
| Editar e excluir pelo painel | Endpoints `PATCH` e `DELETE` no FastAPI + modal no React |
| Histórico mês a mês | Endpoint `/history` agrupando por mês |
| Servidor local | `start.sh` sobe tudo localmente |
| Bot disponível de qualquer lugar | Bot usa polling do Telegram — funciona com qualquer conexão de internet |
| Categoria vazia para uso futuro | Campo presente na planilha e nos endpoints, sem lógica por enquanto |

---

## 12. O que Este PRD Não Cobre (Fase 2)

- Análise com IA sobre os gastos
- Categorização automática por descrição
- Metas e alertas de orçamento
- Controle de parcelas
- Autenticação no painel
- Migração do Google Sheets para banco de dados relacional
