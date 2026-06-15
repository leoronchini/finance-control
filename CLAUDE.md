# CLAUDE.md — Finance Control

Guia de contexto para o Claude Code trabalhar neste projeto.

## O que é este projeto

Bot de controle financeiro pessoal. O usuário envia mensagens pelo Telegram e os dados vão para o Google Sheets. Um painel web local (React + FastAPI) permite visualizar, editar e excluir transações.

```
Telegram → bot/ → Google Sheets ← api/ ← frontend/
```

- **bot/** é o único módulo que **escreve** na planilha
- **api/** é o único módulo que **lê** a planilha e serve o frontend
- **frontend/** nunca acessa o Google Sheets diretamente
- Tudo roda localmente na máquina do usuário

## Estado atual

| Fase | Status |
|---|---|
| 1 — Bootstrap | ✅ Concluída |
| 2 — Google Sheets | ✅ Concluída |
| 3 — Bot Telegram | ✅ Concluída |
| 4 — API FastAPI | ✅ Concluída |
| 5 — Frontend React | ⏳ Pendente |
| 6 — Script de inicialização e testes finais | ⏳ Pendente |

## Estrutura de arquivos

```
finance-control/
├── bot/
│   ├── main.py         # inicialização + filtro de autenticação
│   ├── handlers.py     # handle_message, handle_cancel
│   ├── parser.py       # parse_message() — extrai valor, tipo, descrição
│   └── sheets.py       # append_transaction, cancel_transaction, get_all_transactions
│
├── api/
│   ├── main.py         # FastAPI app + CORS
│   ├── sheets.py       # get_active_transactions, find_row_by_id
│   └── routes/
│       ├── transactions.py  # GET /transactions, PATCH, DELETE
│       ├── summary.py       # GET /summary
│       └── history.py       # GET /history
│
├── frontend/           # gerado na Fase 5 (Vite + React)
├── credentials/        # google-credentials.json (nunca versionado)
├── docs/               # toda a documentação do projeto
├── .env                # variáveis reais (nunca versionado)
├── .env.example        # modelo público
├── requirements.txt
├── start.sh
└── README.md
```

## Como rodar

```bash
# Bot Telegram
cd bot && python main.py

# API FastAPI
cd api && python -m uvicorn main:app --port 8000

# Frontend (Fase 5)
cd frontend && npm run dev
```

## Variáveis de ambiente obrigatórias

```
TELEGRAM_BOT_TOKEN      token do @BotFather
TELEGRAM_CHAT_ID        id do chat do dono do bot
GOOGLE_SHEETS_ID        id da planilha (URL do Sheets)
GOOGLE_CREDENTIALS_PATH ./credentials/google-credentials.json
API_PORT                8000
```

## Convenções do projeto

- **Datas** no formato `DD/MM/AAAA` — sempre string, nunca objeto date
- **Horas** no formato `HH:MM`
- **Tipos** de transação: exatamente `"entrada"` ou `"saída"` (com acento)
- **Status**: exatamente `"ativo"` ou `"cancelado"`
- **IDs** são sequenciais inteiros, nunca reutilizados após cancelamento
- O campo `categoria` existe mas fica vazio na V1.0
- Nunca deletar linha da planilha — apenas mudar `status` para `"cancelado"`

## Resolução de paths

Tanto `bot/` quanto `api/` usam este padrão para encontrar a raiz do projeto:

```python
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))
```

Isso garante que funcionem independente do diretório de trabalho.

## Filtro de mês/ano na API

O formato da data na planilha é `DD/MM/AAAA`. O filtro usa `split("/")`:
- `parts[0]` = dia
- `parts[1]` = mês
- `parts[2]` = ano

```python
t["data"].split("/")[1] == mes.zfill(2)
t["data"].split("/")[2] == ano
```

## Autenticação do bot

Feita via filtro do `python-telegram-bot` no registro do handler — não há validação manual nos handlers:

```python
auth = filters.ChatType.PRIVATE & filters.User(user_id=ALLOWED_CHAT_ID)
app.add_handler(MessageHandler(auth & ..., handler_fn))
```

## Documentação

Toda a documentação fica em `docs/`:

- `docs/PRD.md` — requisitos de produto
- `docs/PRD-tecnico.md` — especificação técnica detalhada
- `docs/fases.md` — visão geral das 6 fases
- `docs/fase-1-bootstrap.md` até `docs/fase-4-api-fastapi.md` — detalhamento de cada fase concluída
