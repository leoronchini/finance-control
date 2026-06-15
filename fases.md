# Fases de Implementação — Finance Bot

---

## Fase 1 — Bootstrap do Projeto

Criar estrutura de pastas, arquivos base, `.env`, `.gitignore`, `requirements.txt` e `package.json`. Projeto vazio mas organizado conforme a estrutura definida no PRD técnico.

**Detalhamento completo:** `fase-1-bootstrap.md`

---

## Fase 2 — Integração com Google Sheets

Configurar credenciais da API do Google, criar a planilha com as colunas definidas no PRD e validar leitura e escrita via `gspread`.

---

## Fase 3 — Bot Telegram

Criar o bot, implementar o parser de mensagens, gravar transações no Sheets e responder com confirmação. Implementar o comando `cancelar`.

---

## Fase 4 — API FastAPI

Criar os endpoints `/transactions`, `/summary`, `/history`, `PATCH` e `DELETE`. Validar que todos os dados retornam corretamente a partir da planilha.

---

## Fase 5 — Frontend React

Criar as três telas (Dashboard, Transactions, History) com os cards, tabela, gráficos e modal de edição. Conectar ao FastAPI.

---

## Fase 6 — Script de Inicialização e Testes Finais

Criar o `start.sh`, testar o fluxo completo de ponta a ponta (mensagem no Telegram → Sheets → painel), ajustar erros encontrados.
