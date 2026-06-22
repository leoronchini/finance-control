# Fases de Implementação — Finance Control

---

## Fase 1 — Bootstrap do Projeto ✅

Criar estrutura de pastas, arquivos base, `.env`, `.gitignore`, `requirements.txt`. Projeto vazio mas organizado conforme a estrutura definida no PRD técnico.

**Detalhamento:** [`done/fase-1-bootstrap.md`](done/fase-1-bootstrap.md)

---

## Fase 2 — Integração com Google Sheets ✅

Configurar credenciais da API do Google, criar a planilha com as colunas definidas no PRD e implementar o módulo `bot/sheets.py` com leitura e escrita via `gspread`.

**Detalhamento:** [`done/fase-2-google-sheets.md`](done/fase-2-google-sheets.md)

---

## Fase 3 — Bot Telegram ✅

Criar o bot, implementar o parser de mensagens (`parser.py`), gravar transações no Sheets e responder com confirmação. Implementar o comando `cancelar`/`desfazer`.

**Detalhamento:** [`done/fase-3-bot-telegram.md`](done/fase-3-bot-telegram.md)

---

## Fase 4 — API FastAPI ✅

Criar os endpoints `GET /transactions`, `GET /summary`, `GET /history`, `PATCH` e `DELETE`. Validar que todos os dados retornam corretamente a partir da planilha.

**Detalhamento:** [`done/fase-4-api-fastapi.md`](done/fase-4-api-fastapi.md)

---

## Fase 5 — Frontend React ✅

Criar as três telas (Dashboard, Transactions, History) com os cards, tabela, gráficos e modal de edição. Conectar ao FastAPI local.

**Detalhamento:** [`done/fase-5-frontend-react.md`](done/fase-5-frontend-react.md)

---

## Fase 6 — Script de Inicialização e Testes Finais ✅

Criar os scripts `start.bat`, `start.ps1` e `start.sh` para subir todos os serviços com um único comando. Corrigir bugs encontrados durante os testes de integração. Validar o fluxo completo ponta a ponta.

**Detalhamento:** [`done/fase-6-inicializacao-e-testes.md`](done/fase-6-inicializacao-e-testes.md)

---

## Fase 7 — Resumo de Gastos por Item ✅

Adicionar ao painel uma tela de resumo que agrupa e totaliza os gastos do mês por descrição individual, listando cada item com seu valor total gasto no período. O usuário poderá filtrar por mês e alternar entre visualização em tabela e gráfico de barras. Inclui a aba `resumo_por_item` no Google Sheets (fórmulas nativas) e o endpoint `GET /summary/items` na API.

**Detalhamento:** [`done/fase-7-resumo-por-item.md`](done/fase-7-resumo-por-item.md)

---

## Fase 8 — Análise de Dados com IA ⏳

Adicionar ao painel um módulo de análise inteligente que lê os dados da planilha e usa a API do Gemini para gerar insights sobre os gastos do usuário. A IA receberá as transações do mês selecionado e retornará uma análise em linguagem natural com observações sobre padrões de consumo, categorias com maior gasto, comparativo com meses anteriores e sugestões de economia. O resultado será exibido no painel em uma nova seção ou tela dedicada, acionada por um botão. Nenhum dado novo é gravado na planilha nesta fase — é uma funcionalidade exclusivamente de leitura e análise.

**Detalhamento:** [`fase-8-analise-ia.md`](fase-8-analise-ia.md)

---

## Fase 09 — Importação de Fatura via PDF ⏳

Adicionar ao painel um botão de "Importar PDF" que permite ao usuário fazer upload da fatura do cartão de crédito em formato PDF. O sistema irá extrair os lançamentos do documento, usar a API do Google para interpretar cada item — gerando uma descrição padronizada e identificando o valor de cada transação — e inserir automaticamente todos os registros na planilha como transações do tipo saída. O usuário poderá revisar os itens extraídos antes de confirmar a importação.

**Detalhamento:** [`fase-09-importacao-pdf.md`](fase-09-importacao-pdf.md)

---

## Fase 10 — Resumo de Gastos por Grupo ⏳

Adicionar ao painel uma segunda camada de resumo que agrupa os itens em categorias maiores definidas pelo usuário, como gastos fixos, locomoção, alimentação, lazer, entre outros. Cada grupo exibe o total consolidado do mês e o percentual que representa sobre o total de saídas. O usuário poderá configurar quais descrições pertencem a cada grupo. Depende da Fase 9.

---

## Fase 11 — Hospedagem em Nuvem ✅

Migrar o bot do modo polling para webhook e publicar todos os serviços em plataformas gratuitas de nuvem, garantindo que o bot processe mensagens do Telegram 24h por dia independente do computador do usuário estar ligado. Bot e API FastAPI unificados no Render (free tier); frontend publicado na Vercel. Deploy automatizado via GitHub.

**Detalhamento:** [`fase-11-hospedagem-nuvem.md`](fase-11-hospedagem-nuvem.md)
