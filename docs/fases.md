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

## Fase 7 — Resumo de Gastos por Item ⏳

**Detalhamento:** [`fase-7-resumo-por-item.md`](fase-7-resumo-por-item.md)

Adicionar ao painel uma tela de resumo que agrupa e totaliza os gastos do mês por descrição individual, listando cada item com seu valor total gasto no período. Exemplos de saída: mercado R$ 430,00 · gasolina R$ 310,00 · almoço R$ 215,00 · aluguel R$ 1.200,00. O usuário poderá filtrar por mês e alternar entre visualização em tabela e gráfico de barras. Esta fase depende da coluna categoria estar minimamente preenchida na planilha para os itens que o usuário quiser agrupar. Funcionalidade exclusivamente de leitura — nenhum dado é gravado.

## Fase 8 — Análise de Dados com IA

Adicionar ao painel um módulo de análise inteligente que lê os dados da planilha e usa a API do Gemini para gerar insights sobre os gastos do usuário. A IA receberá as transações do mês selecionado e retornará uma análise em linguagem natural com observações sobre padrões de consumo, categorias com maior gasto, comparativo com meses anteriores e sugestões de economia. O resultado será exibido no painel em uma nova seção ou tela dedicada, acionada por um botão. Nenhum dado novo é gravado na planilha nesta fase — é uma funcionalidade exclusivamente de leitura e análise.

## Fase 9 — Resumo de Gastos por Grupo

Adicionar ao painel uma segunda camada de resumo que agrupa os itens em categorias maiores definidas pelo usuário, como gastos fixos (aluguel + condomínio + internet + energia), locomoção (gasolina + estacionamento + transporte), alimentação (mercado + delivery + restaurante), lazer (festas + streaming + saídas), entre outros. Cada grupo exibe o total consolidado do mês e o percentual que representa sobre o total de saídas. O usuário poderá configurar quais descrições pertencem a cada grupo. Depende da Fase 9 pois parte da mesma estrutura de agrupamento e da coluna categoria já em uso.

## Fase 10 — Importação de Fatura via PDF

Adicionar ao painel um botão de "Importar PDF" que permite ao usuário fazer upload da fatura do cartão de crédito em formato PDF. O sistema irá extrair os lançamentos do documento, usar a API da Anthropic (Claude) para interpretar cada item — gerando uma descrição padronizada e identificando o valor de cada transação — e inserir automaticamente todos os registros na planilha como transações do tipo saída. O usuário poderá revisar os itens extraídos antes de confirmar a importação. Esta fase depende da Fase 7 pois reutiliza a integração com a API da Anthropic já configurada.
