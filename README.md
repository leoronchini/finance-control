# Finance Control

Controle de finanças pessoais via Telegram + Google Sheets + Painel Web local.

```
Celular (qualquer lugar)              Casa (computador)
        │                                    │
   Telegram ──► Bot Python ──► Google Sheets ◄── FastAPI ◄── React
```

---

## Status do projeto

| Fase | Descrição | Status |
|---|---|---|
| 1 | Bootstrap — estrutura de pastas e arquivos base | ✅ Concluída |
| 2 | Google Sheets — credenciais e módulo de leitura/escrita | ✅ Concluída |
| 3 | Bot Telegram — parser, handlers e gravação na planilha | ✅ Concluída |
| 4 | API FastAPI — endpoints REST para o frontend | ✅ Concluída |
| 5 | Frontend React — painel web com dashboard e gráficos | ⏳ Pendente |
| 6 | Script de inicialização e testes finais ponta a ponta | ✅ Concluída |

---

## Pré-requisitos

- Python 3.11+
- Node.js 18+ (Fase 5)
- Conta Google com Google Sheets API e Google Drive API ativadas
- Bot criado no Telegram via [@BotFather](https://t.me/BotFather)

---

## Configuração inicial

### 1. Clonar e instalar dependências

```bash
git clone <repo>
cd finance-control
pip install -r requirements.txt
```

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Preencher `.env`:

```
TELEGRAM_BOT_TOKEN=    # token do @BotFather
TELEGRAM_CHAT_ID=      # seu chat id (ver abaixo)
GOOGLE_SHEETS_ID=      # id da planilha (da URL do Sheets)
GOOGLE_CREDENTIALS_PATH=./credentials/google-credentials.json
API_PORT=8000
```

**Como obter o TELEGRAM_CHAT_ID:** inicie uma conversa com seu bot e acesse `https://api.telegram.org/bot<TOKEN>/getUpdates`. O campo `chat.id` é o valor que você precisa.

### 3. Configurar credenciais do Google

1. Crie um projeto no [Google Cloud Console](https://console.cloud.google.com)
2. Ative as APIs: **Google Sheets API** e **Google Drive API**
3. Crie uma conta de serviço e baixe o JSON de credenciais
4. Salve o arquivo em `credentials/google-credentials.json`
5. Compartilhe sua planilha com o `client_email` da conta de serviço (permissão **Editor**)

### 4. Criar a planilha

Crie uma planilha no Google Sheets com uma aba chamada `transacoes` e a seguinte linha de cabeçalho:

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | data | hora | tipo | valor | descricao | categoria | status |

---

## Execução

### Bot Telegram

```bash
cd bot
python main.py
```

### API FastAPI

```bash
cd api
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

A documentação interativa da API fica disponível em `http://localhost:8000/docs`.

### Frontend (Fase 5)

```bash
cd frontend
npm run dev
```

---

## Como usar o bot

Envie mensagens diretamente para o bot no Telegram:

| Mensagem | Efeito |
|---|---|
| `50 mercado` | Registra saída de R$ 50,00 — mercado |
| `50 reais mercado` | Idem |
| `entrada 1500 salário` | Registra entrada de R$ 1500,00 — salário |
| `saída 200 farmácia` | Registra saída de R$ 200,00 — farmácia |
| `cancelar` | Desfaz o último registro da sessão |

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/transactions` | Lista transações ativas (`?mes=06&ano=2026`) |
| GET | `/summary` | Totais do mês (`?mes=06&ano=2026`) |
| GET | `/history` | Histórico mensal agrupado |
| PATCH | `/transactions/{id}` | Edita uma transação |
| DELETE | `/transactions/{id}` | Exclui logicamente uma transação |

---

## Estrutura do projeto

```
finance-control/
├── bot/                  # módulo do bot Telegram
├── api/                  # módulo da API FastAPI
│   └── routes/           # endpoints separados por domínio
├── frontend/             # painel web React (Fase 5)
├── credentials/          # credenciais Google (não versionado)
├── docs/                 # documentação completa do projeto
├── .env                  # variáveis de ambiente (não versionado)
├── .env.example          # modelo de variáveis
├── requirements.txt      # dependências Python
└── start.sh              # script para subir tudo (Fase 6)
```

---

## Documentação

Toda a documentação técnica fica em [`docs/`](docs/):

- [`docs/PRD.md`](docs/PRD.md) — requisitos de produto
- [`docs/PRD-tecnico.md`](docs/PRD-tecnico.md) — especificação técnica detalhada
- [`docs/fases.md`](docs/fases.md) — visão geral das 6 fases
- [`docs/fase-1-bootstrap.md`](docs/fase-1-bootstrap.md) — detalhamento da Fase 1
- [`docs/fase-2-google-sheets.md`](docs/fase-2-google-sheets.md) — detalhamento da Fase 2
- [`docs/fase-3-bot-telegram.md`](docs/fase-3-bot-telegram.md) — detalhamento da Fase 3
- [`docs/fase-4-api-fastapi.md`](docs/fase-4-api-fastapi.md) — detalhamento da Fase 4
