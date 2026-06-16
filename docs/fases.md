# Fases de Implementação — Finance Control

---

## Fase 1 — Bootstrap do Projeto ✅

Criar estrutura de pastas, arquivos base, `.env`, `.gitignore`, `requirements.txt`. Projeto vazio mas organizado conforme a estrutura definida no PRD técnico.

**Detalhamento:** [`fase-1-bootstrap.md`](fase-1-bootstrap.md)

---

## Fase 2 — Integração com Google Sheets ✅

Configurar credenciais da API do Google, criar a planilha com as colunas definidas no PRD e implementar o módulo `bot/sheets.py` com leitura e escrita via `gspread`.

**Detalhamento:** [`fase-2-google-sheets.md`](fase-2-google-sheets.md)

---

## Fase 3 — Bot Telegram ✅

Criar o bot, implementar o parser de mensagens (`parser.py`), gravar transações no Sheets e responder com confirmação. Implementar o comando `cancelar`/`desfazer`.

**Detalhamento:** [`fase-3-bot-telegram.md`](fase-3-bot-telegram.md)

---

## Fase 4 — API FastAPI ✅

Criar os endpoints `GET /transactions`, `GET /summary`, `GET /history`, `PATCH` e `DELETE`. Validar que todos os dados retornam corretamente a partir da planilha.

**Detalhamento:** [`fase-4-api-fastapi.md`](fase-4-api-fastapi.md)

---

## Fase 5 — Frontend React ⏳

Criar as três telas (Dashboard, Transactions, History) com os cards, tabela, gráficos e modal de edição. Conectar ao FastAPI local.

**Detalhamento:** [`fase-5-frontend-react.md`](fase-5-frontend-react.md)

---

## Fase 6 — Script de Inicialização e Testes Finais ✅

Criar os scripts `start.bat`, `start.ps1` e `start.sh` para subir todos os serviços com um único comando. Corrigir bugs encontrados durante os testes de integração. Validar o fluxo completo ponta a ponta.

**Detalhamento:** [`fase-6-inicializacao-e-testes.md`](fase-6-inicializacao-e-testes.md)
