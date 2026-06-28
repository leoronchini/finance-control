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

## Fase 9 — Importação de Fatura via PDF ⏳

Adicionar ao painel um botão de "Importar PDF" que permite ao usuário fazer upload da fatura do cartão de crédito em formato PDF. O sistema irá extrair os lançamentos do documento, usar a API do Gemini para interpretar cada item — gerando uma descrição padronizada e identificando o valor de cada transação — e inserir automaticamente todos os registros na planilha como transações do tipo saída. O usuário poderá revisar os itens extraídos antes de confirmar a importação.

**Detalhamento:** [`fase-09-importacao-pdf.md`](fase-09-importacao-pdf.md)

---

## Fase 10 — Persistência com Banco de Dados (Supabase) ⏳

Introduzir um banco de dados PostgreSQL externo (Supabase free tier) como camada de persistência complementar ao Google Sheets. O Sheets continua sendo a fonte de verdade das transações financeiras; o banco é usado para dados estruturados que não cabem bem numa planilha — a memória do agente de agrupamento (Fase 11) é o primeiro caso de uso. Inclui a criação do projeto Supabase, a configuração da conexão na API, o módulo `api/db.py` e a criação das primeiras tabelas (`grupos` e `regras_grupo`). **Pré-requisito para a Fase 11.**

**Detalhamento:** [`fase-10-persistencia-banco.md`](fase-10-persistencia-banco.md)

---

## Fase 11 — Resumo de Gastos por Grupo (Agrupamento com IA) ⏳

Adicionar ao painel uma camada de resumo que agrupa **todos os lançamentos do mês** (entradas e saídas) em grupos maiores. O agrupamento é feito por um **agente de IA** com **memória**: ele tenta categorizar sozinho cada lançamento, mas nunca chuta — quando tem dúvida, devolve o item para o usuário decidir na tela, e a decisão vira regra permanente no banco. A IA também pode sugerir grupos novos (sujeitos a aprovação). Cada grupo exibe total consolidado e percentual. **Depende da Fase 10 (banco de dados).**

**Detalhamento:** [`fase-11-resumo-por-grupo.md`](fase-11-resumo-por-grupo.md)

---

## Fase 12 — Hospedagem em Nuvem ✅

Migrar o bot do modo polling para webhook e publicar todos os serviços em plataformas gratuitas de nuvem, garantindo que o bot processe mensagens do Telegram 24h por dia independente do computador do usuário estar ligado. Bot e API FastAPI unificados no Render (free tier); frontend publicado na Vercel. Deploy automatizado via GitHub.

**Detalhamento:** [`done/fase-12-hospedagem-nuvem.md`](done/fase-12-hospedagem-nuvem.md)

---

## Fase 13 — Tipo Reembolso ✅

Adicionar `"reembolso"` como terceiro tipo de transação. Um reembolso representa dinheiro que voltou após um gasto adiantado — parcial ou total — e não deve ser confundido com renda real. O bot passa a reconhecer mensagens como *"reembolso 50 jantar"* ou *"me devolveram 80 do almoço"*. O resumo passa a exibir reembolsos separados e o custo efetivo real (`saídas − reembolsos`). Sem mudança de schema no Sheets.

**Detalhamento:** [`fase-13-reembolso.md`](fase-13-reembolso.md)
