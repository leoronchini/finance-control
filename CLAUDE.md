# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## O que é este projeto

Bot de controle financeiro pessoal. O usuário envia mensagens pelo Telegram e os dados são gravados no Supabase (PostgreSQL). Um painel web (React + FastAPI) permite visualizar, editar e excluir transações.

```
Telegram → bot/ → Supabase ← api/ ← frontend/
```

- **bot/** grava transações via `api/transactions_store.py`
- **api/** lê e escreve no Supabase e serve o frontend
- **frontend/** nunca acessa o banco diretamente

## Estado atual

| Fase | Status |
|---|---|
| 1 — Bootstrap | ✅ Concluída |
| 2 — Google Sheets | ✅ Concluída |
| 3 — Bot Telegram | ✅ Concluída |
| 4 — API FastAPI | ✅ Concluída |
| 5 — Frontend React | ✅ Concluída |
| 6 — Script de inicialização e testes finais | ✅ Concluída |
| 7 — Resumo de Gastos por Item | ✅ Concluída |
| 8 — Análise de Dados com IA | ✅ Concluída |
| 9 — Importação de Fatura via PDF | ⏳ Pendente |
| 10 — Persistência com Banco de Dados (Supabase) | ✅ Concluída |
| 11 — Resumo de Gastos por Grupo (Agrupamento com IA) | ⏳ Pendente |
| 12 — Hospedagem em Nuvem | ✅ Concluída |
| 13 — Tipo Reembolso | ✅ Concluída |
| 14 — Tipo Investimento + Comando /ajuda | ✅ Concluída |
| 15 — Migração de Google Sheets para Supabase | ✅ Concluída |

## Como rodar

```powershell
# Tudo de uma vez (recomendado)
.\start.bat

# Individualmente (desenvolvimento)
python -m bot.main                                          # bot polling local
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000  # API
cd frontend && npm run dev                                  # frontend
```

**Sempre rodar da raiz do projeto** — os módulos usam imports absolutos (`bot.main`, `api.main`).

## Arquitetura

### bot/

| Arquivo | Responsabilidade |
|---|---|
| `main.py` | `ApplicationBuilder`, registro dos handlers com filtro de auth |
| `handlers.py` | `handle_message`, `handle_cancel`, `handle_ajuda` — lógica de resposta ao Telegram |
| `parser.py` | `parse_message()` — extrai valor, tipo, descrição do texto livre |

### api/

| Arquivo | Responsabilidade |
|---|---|
| `main.py` | FastAPI app, CORS, lifespan, registro de todos os routers |
| `transactions_store.py` | Interface única de acesso ao Supabase: `append_transaction`, `cancel_transaction`, `get_active_transactions`, `find_by_id`, `update_transaction` |
| `db.py` | Conexão psycopg2 ao Supabase com auto-reconnect |
| `groups_store.py` | CRUD de grupos e regras de agrupamento (Fase 11) |
| `webhook.py` | `init_telegram`, `handle_webhook` — recebe updates do Telegram via POST `/webhook` |
| `routes/transactions.py` | `GET /transactions`, `PATCH /transactions/{id}`, `DELETE /transactions/{id}` |
| `routes/summary.py` | `GET /summary` |
| `routes/summary_items.py` | `GET /summary/items` — saídas agrupadas por descrição |
| `routes/history.py` | `GET /history` |
| `routes/ai_analysis.py` | `POST /ai/analysis` — análise por Gemini |
| `routes/pdf_import.py` | `POST /pdf/import` — importação de fatura PDF |

### Dois modos de operação do bot

O bot pode funcionar em dois modos:

- **Polling local** (`bot/main.py`): usado em desenvolvimento local via `start.bat`. Processo separado que faz polling no Telegram.
- **Webhook** (`api/webhook.py`): usado em produção (nuvem). O Telegram envia updates via POST para `/webhook`. Inicializado no lifespan da API FastAPI com `updater(None)` (obrigatório — sem ele o PTB tenta criar um Updater para polling).

Em produção, **somente a API sobe** — o bot roda embutido nela via webhook.

### scripts/

- `scripts/migrate_db.py` — cria as tabelas `grupos` e `regras_grupo` no Supabase e insere grupos padrão.
- `scripts/migrate_sheets_to_db.py` — migração one-shot do Google Sheets para Supabase (já executado).

## Variáveis de ambiente

```
TELEGRAM_BOT_TOKEN      token do @BotFather
TELEGRAM_CHAT_ID        id do chat do dono do bot
API_PORT                8000
GEMINI_API_KEY          chave da API do Google Gemini
DATABASE_URL            postgresql://postgres:<senha>@<host>.supabase.co:5432/postgres
```

## Convenções críticas

- **Datas** no formato `DD/MM/AAAA` — sempre string. Filtro por mês: `split("/")[1]`, por ano: `split("/")[2]`
- **Tipos**: `"entrada"`, `"saída"` (com acento), `"reembolso"`, `"investimento"`
- **Status**: exatamente `"ativo"` ou `"cancelado"`
- **Nunca deletar linhas** do banco — apenas mudar `status` para `"cancelado"`
- **IDs** são sequenciais inteiros (SERIAL PostgreSQL), nunca reutilizados

## Imports e paths

Todos os módulos resolvem o `.env` a partir da raiz do projeto:

```python
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))
```

Imports dentro de `api/routes/` usam prefixo completo: `from api.transactions_store import ...` (não `from transactions_store import ...`), pois a API é iniciada da raiz com `python -m uvicorn api.main:app`.

## Autenticação do bot

Feita via filtro no registro do handler — não há validação manual dentro dos handlers:

```python
auth = filters.ChatType.PRIVATE & filters.User(user_id=ALLOWED_CHAT_ID)
app.add_handler(MessageHandler(auth & ..., handler_fn))
```

## Regra: atualização de status de fases

Sempre que uma fase for concluída:

1. **Mover** `docs/fase-N-nome.md` → `docs/done/fase-N-nome.md`
2. **Atualizar** `docs/fases.md`: status `✅` e link para `done/fase-N-nome.md`
3. **Atualizar** a tabela "Estado atual" neste CLAUDE.md

## Documentação

- `docs/PRD.md` — requisitos de produto
- `docs/PRD-tecnico.md` — especificação técnica
- `docs/fases.md` — visão geral e status de todas as fases
- `docs/done/` — detalhamento das fases concluídas
- `docs/fase-*.md` — detalhamento das fases pendentes
