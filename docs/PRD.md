# PRD — Controle Financeiro Pessoal via Telegram + Google Sheets

**Versão 1.1**

---

## 1. Visão Geral

Sistema pessoal de controle financeiro onde o usuário registra transações enviando mensagens pelo **Telegram** a qualquer hora e de qualquer lugar pelo celular. Os dados são salvos automaticamente no **Google Sheets**. A visualização e análise acontece num **painel web** acessado pelo computador, rodando num servidor local.

---

## 2. Fluxo Principal do Sistema

```
Celular (qualquer lugar)          Casa (computador)
        │                                │
Telegram → Bot → Google Sheets → Painel Web Local
```

O bot fica rodando num servidor local no computador. O Telegram se comunica com ele via internet normalmente — o bot recebe as mensagens mesmo quando o computador está ligado em casa, pois o Telegram faz a ponte. Se o computador estiver desligado as mensagens devem ser recebidas quando ligar.

---

## 3. Canal de Entrada — Bot Telegram

### 3.1 Formato de Registro

```
50 reais mercado
100 reais almoço
300 reais gasolina
entrada 1500 salário
```

**Campos extraídos:**

| Campo | Exemplo | Obrigatório |
|---|---|---|
| Valor | `50`, `300` | Sim |
| Descrição | `mercado`, `almoço` | Sim |
| Tipo | saída por padrão; `entrada` se informado | Não (assume saída) |
| Data/Hora | momento do envio da mensagem | Automático |

**Variações aceitas:**
```
50 mercado
50,00 mercado
entrada 1500 salário
saída 200 farmácia
```

### 3.2 Confirmação pelo Bot

Registro imediato, sem etapa de confirmação pelo usuário:

```
Registrado!
Saída: R$ 50,00
mercado
10/06/2025 14:32
```

### 3.3 Comandos do Bot

| Comando | Ação |
|---|---|
| `cancelar` / `desfazer` | Remove o último registro feito |

Nenhum outro comando é necessário. Consultas e análises são feitas exclusivamente pelo painel web.

---

## 4. Armazenamento — Google Sheets

### 4.1 Estrutura da Planilha

| id | data | hora | tipo | valor | descrição | categoria | status |
|---|---|---|---|---|---|---|---|
| 1 | 10/06/2025 | 14:32 | saída | 50.00 | mercado | — | ativo |
| 2 | 10/06/2025 | 19:15 | saída | 100.00 | almoço | — | ativo |
| 3 | 11/06/2025 | 08:00 | entrada | 1500.00 | salário | — | ativo |

### 4.2 Comportamento

- Cada transação **adiciona uma linha** na planilha
- A planilha é a **fonte de verdade** do sistema
- Registros cancelados recebem status `cancelado` — nunca são deletados fisicamente
- A coluna **categoria** fica vazia na Versão 1.0 e será preenchida futuramente
- O painel web **nunca acessa o Google Sheets diretamente** — lê os dados via API FastAPI local, que é o único módulo que faz a leitura da planilha

---

## 5. Painel Web — Frontend Interativo

Acessado pelo navegador no computador, via servidor local (ex: `http://localhost:5173`).

### 5.1 Tela Principal — Visão do Mês

- Navegação por mês (anterior / próximo)
- **Cards de resumo:**
  - Total de entradas
  - Total de saídas
  - Saldo do mês
- **Gráfico** de distribuição de gastos por descrição
- **Lista cronológica** de todas as transações do mês

### 5.2 Tela de Transações

- Tabela completa de transações
- Filtros por mês e por tipo (entrada/saída)
- Busca por texto na descrição
- Ação de **editar** (valor, descrição, categoria, data)
- Ação de **excluir** (marca como cancelado na planilha)

### 5.3 Tela de Histórico

- Gráfico de entradas x saídas por mês
- Evolução do saldo mês a mês

### 5.4 Requisitos do Painel

- Acesso apenas pelo computador em rede local
- Sem login na Versão 1.0
- Botão de atualizar dados ou atualização automática periódica

---

## 6. Infraestrutura Local

O servidor local precisa manter dois processos rodando:

| Processo | Função |
|---|---|
| **Bot Telegram** (`bot/`)| Fica escutando mensagens e grava no Google Sheets |
| **API FastAPI** (`api/`) | Lê o Google Sheets e serve os dados ao frontend via REST |
| **Frontend React** (`frontend/`) | Interface web, consome exclusivamente a API FastAPI |

**Implicação importante:** o computador precisa estar **ligado e conectado à internet** para que o bot receba e processe as mensagens. Se o computador estiver desligado, as mensagens enviadas no Telegram ficam pendentes e são processadas quando o servidor voltar.

---

## 7. Fora do Escopo — Versão 1.0

| Item | Fase prevista |
|---|---|
| Análise por IA / insights automáticos | Fase 2 |
| Categorização automática | Fase 2 |
| Alertas e metas de gastos | Fase 2 |
| Controle de parcelas | Fase 2 |
| Controle de cartão de crédito por fatura | Fase 2 |
| Resumo automático enviado pelo bot | Fase 2 |
| Autenticação no painel | Fase 2 |

---

## 8. Critérios de Sucesso da Versão 1.0

- [x] Enviar uma mensagem no formato definido e o dado aparecer salvo na planilha em menos de 5 segundos
- [ ] Acessar o painel e ver o saldo e os gastos do mês atual
- [ ] Conseguir navegar entre meses e ver o histórico
- [ ] Editar ou excluir um registro pelo painel
- [x] O sistema funcionar de forma estável no dia a dia sem intervenção técnica

> **Progresso:** Fases 1–4 e 6 concluídas. Bot, API e script de inicialização funcionando. Frontend pendente (Fase 5).
