# Finance Control

Controle de finanças pessoais via Telegram + Supabase + Painel Web.

```
Celular (qualquer lugar)              Nuvem / Local
        │                                    │
   Telegram ──► Bot Python ──► Supabase ◄── FastAPI ◄── React
```

---

## Status do projeto

| Fase | Descrição | Status |
|---|---|---|
| 1 | Bootstrap — estrutura de pastas e arquivos base | ✅ |
| 2 | Google Sheets — integração inicial (substituída pela Fase 15) | ✅ |
| 3 | Bot Telegram — parser, handlers e gravação | ✅ |
| 4 | API FastAPI — endpoints REST para o frontend | ✅ |
| 5 | Frontend React — painel web com dashboard e gráficos | ✅ |
| 6 | Script de inicialização e testes finais ponta a ponta | ✅ |
| 7 | Resumo de gastos por item | ✅ |
| 8 | Análise de dados com IA (Gemini) | ✅ |
| 9 | Importação de fatura via PDF | ⏳ |
| 10 | Persistência com banco de dados (Supabase) | ✅ |
| 11 | Resumo de gastos por grupo (agrupamento com IA) | ⏳ |
| 12 | Hospedagem em nuvem (Render + Vercel) | ✅ |
| 13 | Tipo reembolso | ✅ |
| 14 | Tipo investimento + comando /ajuda | ✅ |
| 15 | Migração de Google Sheets para Supabase | ✅ |

---

## Pré-requisitos

- Python 3.11+
- Node.js 18+
- Projeto Supabase com `DATABASE_URL` configurada
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
TELEGRAM_CHAT_ID=      # seu chat id
GEMINI_API_KEY=        # chave da API do Google Gemini
DATABASE_URL=          # postgresql://postgres:<senha>@<host>.supabase.co:5432/postgres
API_PORT=8000
```

### 3. Criar as tabelas no banco

```bash
python -m scripts.migrate_db
```

---

## Execução

```powershell
# Tudo de uma vez (recomendado)
.\start.bat

# Individualmente
python -m bot.main                                          # bot polling local
python -m uvicorn api.main:app --host 0.0.0.0 --port 8000  # API
cd frontend && npm run dev                                  # frontend
```

---

## Como usar o bot

| Mensagem | Efeito |
|---|---|
| `50 mercado` | Saída de R$ 50,00 — mercado |
| `entrada 1500 salário` | Entrada de R$ 1500,00 — salário |
| `reembolso 80 jantar` | Reembolso de R$ 80,00 — jantar |
| `investimento 500 tesouro` | Investimento de R$ 500,00 — tesouro |
| `/cancelar` | Desfaz o último registro |
| `/ajuda` | Lista todos os formatos aceitos |

---

## Endpoints da API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/transactions` | Lista transações ativas (`?mes=06&ano=2026`) |
| GET | `/summary` | Totais do mês |
| GET | `/summary/items` | Saídas agrupadas por descrição |
| GET | `/history` | Histórico mensal agrupado |
| PATCH | `/transactions/{id}` | Edita uma transação |
| DELETE | `/transactions/{id}` | Exclui logicamente (status → cancelado) |
| POST | `/ai/analysis` | Análise por Gemini |
| POST | `/pdf/extract` | Extrai itens de fatura PDF |
| POST | `/pdf/confirm` | Confirma importação do PDF |

---

## Estrutura do projeto

```
finance-control/
├── bot/                  # módulo do bot Telegram
├── api/                  # módulo da API FastAPI
│   └── routes/           # endpoints separados por domínio
├── frontend/             # painel web React
├── scripts/              # scripts de migração e setup do banco
├── docs/                 # documentação completa do projeto
├── .env                  # variáveis de ambiente (não versionado)
├── .env.example          # modelo de variáveis
├── requirements.txt      # dependências Python
└── start.bat             # script para subir tudo
```

---

## Documentação

Toda a documentação técnica fica em [`docs/`](docs/):

- [`docs/PRD.md`](docs/PRD.md) — requisitos de produto
- [`docs/PRD-tecnico.md`](docs/PRD-tecnico.md) — especificação técnica detalhada
- [`docs/fases.md`](docs/fases.md) — visão geral e status de todas as fases
