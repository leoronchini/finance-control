# Fase 14 — Tipo Investimento + Comando /ajuda

---

## Objetivo

Adicionar `"investimento"` como quarto tipo de transação, ao lado de `"entrada"`, `"saída"` e `"reembolso"`. Um investimento representa dinheiro que saiu do caixa mas não foi consumido — foi alocado em algum ativo (ações, CDB, poupança, cripto etc). Ele não deve ser somado ao custo real de vida, pois o patrimônio aumentou.

Adicionar também o comando `/ajuda` no bot do Telegram, que lista todos os formatos de mensagem aceitos e os comandos disponíveis.

**Regra central:**
- `custo_real = saidas - reembolsos` (sem investimentos — eles não são gastos)
- `saldo = entradas + reembolsos - saidas - investimentos` (o que sobrou em caixa)
- `patrimônio_alocado` = soma dos investimentos (exibido em card separado)

---

## Pré-requisitos

- Fase 13 concluída (tipo reembolso já implementado).
- Fase 3 concluída (bot Telegram com parser).

---

## O que muda em cada camada

### Google Sheets

Nenhuma mudança de estrutura. A coluna `tipo` já aceita qualquer string — basta passar `"investimento"`. Todos os filtros existentes continuam funcionando.

### Bot (`bot/parser.py` e `bot/handlers.py`)

O parser precisa reconhecer mensagens de investimento. Exemplos que devem funcionar:

```
investimento 500 tesouro direto
investi 1000 em ações
aplicação 200 poupança
aporte 300 fundo
investimento de 500
investi 1000
```

O bot responde com emoji 🟣 e label "Investimento registrado":

```
✅ Investimento registrado
🟣 R$ 500,00 — tesouro direto
📅 27/06/2026
```

### Novo comando `/ajuda` no bot

Ao enviar `/ajuda` (ou `/help`), o bot responde com uma mensagem formatada listando todos os formatos aceitos:

```
📋 Comandos e mensagens do Finance Control

💸 Registrar saída:
  50 mercado
  saída 50 mercado
  gasto 50 almoço

💰 Registrar entrada:
  entrada 3000 salário
  recebido 500 freelance

🔵 Registrar reembolso:
  reembolso 80 jantar
  me devolveram 50 uber
  recebi de volta 100

🟣 Registrar investimento:
  investimento 500 tesouro
  investi 1000 ações
  aporte 200 fundo
  aplicação 300

⚙️ Outros comandos:
  /cancelar ou /desfazer — cancela o último lançamento
  /ajuda — exibe esta mensagem
```

### API (`api/routes/summary.py`)

Passa a retornar também `investimentos` e o campo `patrimonio_alocado`:

```json
{
  "mes": "06",
  "ano": "2026",
  "entradas": 5000.00,
  "saidas": 3200.00,
  "reembolsos": 150.00,
  "investimentos": 800.00,
  "custo_real": 3050.00,
  "patrimonio_alocado": 800.00,
  "saldo": 1300.00
}
```

- `custo_real = saidas - reembolsos`
- `saldo = entradas + reembolsos - saidas - investimentos`
- `patrimonio_alocado = investimentos` (alias semântico, para clareza no frontend)

### API (`api/routes/history.py`)

O endpoint `GET /history` passa a incluir `investimentos` por mês:

```json
{
  "mes": "06/2026",
  "entradas": 5000.00,
  "saidas": 3200.00,
  "reembolsos": 150.00,
  "investimentos": 800.00,
  "custo_real": 3050.00,
  "saldo": 1300.00
}
```

### Frontend

- **SummaryCards**: adicionar card "Investimentos" em roxo (`#a855f7`); atualizar fórmula do saldo.
- **TransactionTable**: badge roxo para `tipo === "investimento"`; valor com prefixo `−` em roxo (saiu do caixa, mas não é gasto).
- **Transactions**: filtro "Investimentos" na barra de filtros.
- **History**: adicionar barra roxa no gráfico e coluna na tabela.

---

## Passo a passo — Bot

### 1. Atualizar `bot/parser.py`

Adicionar reconhecimento de investimento **depois do reembolso e antes da entrada/saída**.
Palavras-gatilho: `investimento`, `investi`, `aplicação`, `apliquei`, `aporte`, `aportar`.

```python
_INVEST_RE = re.compile(
    r"investimento|investi|aplica[çc][aã]o|apliquei|aporte|aportar",
    re.IGNORECASE,
)

# No parse_message, após o bloco de reembolso:
m = _INVEST_RE.search(text)
if m:
    valor_str = re.search(r"\d+[\.,]?\d*", re.sub(_INVEST_RE, "", text))
    if valor_str:
        valor = float(valor_str.group().replace(",", "."))
        descricao = re.sub(_INVEST_RE, "", text)
        descricao = re.sub(r"\d+[\.,]?\d*", "", descricao)
        descricao = re.sub(r"\bde\b|\bem\b|\bdo\b|\bda\b", "", descricao, flags=re.IGNORECASE)
        descricao = descricao.strip(" -–:") or "investimento"
        return {"tipo": "investimento", "valor": valor, "descricao": descricao}
```

### 2. Atualizar `bot/handlers.py`

Adicionar `"investimento"` no `_TIPO_META`:

```python
_TIPO_META = {
    "entrada":      ("💰", "Entrada registrada"),
    "saída":        ("💸", "Saída registrada"),
    "reembolso":    ("🔵", "Reembolso registrado"),
    "investimento": ("🟣", "Investimento registrado"),
}
```

### 3. Adicionar handler `/ajuda` em `bot/handlers.py`

```python
AJUDA_TEXT = """📋 *Comandos e mensagens aceitos*

💸 *Saída:*
`50 mercado`
`saída 50 mercado`
`gasto 50 almoço`

💰 *Entrada:*
`entrada 3000 salário`
`recebido 500 freelance`

🔵 *Reembolso:*
`reembolso 80 jantar`
`me devolveram 50`
`recebi de volta 100`

🟣 *Investimento:*
`investimento 500 tesouro`
`investi 1000 ações`
`aporte 200 fundo`
`aplicação 300`

⚙️ *Outros:*
/cancelar — cancela o último lançamento
/ajuda — esta mensagem"""

async def handle_ajuda(update, context):
    await update.message.reply_text(AJUDA_TEXT, parse_mode="Markdown")
```

Registrar em `bot/main.py`:

```python
app.add_handler(CommandHandler("ajuda", handle_ajuda))
app.add_handler(CommandHandler("help",  handle_ajuda))
```

---

## Passo a passo — API

### 4. Atualizar `api/routes/summary.py`

```python
investimentos = sum(t["valor"] for t in filtered if t["tipo"] == "investimento")

return {
    ...
    "investimentos":      round(investimentos, 2),
    "patrimonio_alocado": round(investimentos, 2),
    "saldo":              round(entradas + reembolsos - saidas - investimentos, 2),
}
```

### 5. Atualizar `api/routes/history.py`

Adicionar acumulação e retorno de `investimentos` por mês (mesmo padrão de reembolsos).

---

## Passo a passo — Frontend

### 6. `frontend/src/components/SummaryCards.jsx`

Adicionar card de Investimentos (roxo `#a855f7`) após o card de Reembolsos. Atualizar cálculo do saldo (`entradas + reembolsos - saidas - investimentos`).

### 7. `frontend/src/components/TransactionTable.jsx`

```jsx
// badge
background: t.tipo === 'investimento' ? '#a855f711' : ...
color:      t.tipo === 'investimento' ? '#a855f7'   : ...

// valor — investimento sai do caixa mas não é custo
color: t.tipo === 'investimento' ? '#a855f7' : ...
prefixo: '−'  // mesmo de saída
```

### 8. `frontend/src/pages/Transactions.jsx`

Adicionar filtro `['investimento', 'Investimentos']`.

### 9. `frontend/src/pages/History.jsx`

Adicionar `<Bar dataKey="investimentos" name="Investimentos" fill="#a855f7" .../>` e coluna na tabela.

---

## Critérios de validação — Bot

- [ ] `"investimento 500 tesouro direto"` → tipo `investimento`, valor `500.0`, descrição `"tesouro direto"`
- [ ] `"investi 1000 em ações"` → tipo `investimento`, valor `1000.0`
- [ ] `"aporte 200 fundo"` → tipo `investimento`, valor `200.0`
- [ ] `"aplicação 300"` → tipo `investimento`, valor `300.0`, descrição `"investimento"`
- [ ] `/ajuda` → retorna mensagem formatada com todos os exemplos
- [ ] `/help` → mesmo comportamento que `/ajuda`
- [ ] Reembolsos, entradas e saídas continuam funcionando sem regressão

## Critérios de validação — API

- [ ] `GET /summary` retorna `investimentos`, `patrimonio_alocado` e `saldo` corretos
- [ ] `saldo = entradas + reembolsos - saidas - investimentos`
- [ ] `custo_real = saidas - reembolsos` (investimentos NÃO entram aqui)
- [ ] `GET /history` retorna `investimentos` por mês

## Critérios de validação — Frontend

- [ ] Card "Investimentos" em roxo aparece no Dashboard
- [ ] Filtro "Investimentos" na tela Transactions funciona
- [ ] Linhas de investimento têm badge roxo e valor `−` em roxo
- [ ] Gráfico History inclui barra roxa de investimentos

---

## Observações

- **Sem mudança de schema** no Sheets — `"investimento"` é aceito na coluna `tipo` sem nenhuma migração.
- **`custo_real` não inclui investimentos**: investir R$500 não é custo de vida — o dinheiro continua existindo em outra forma. A separação evita distorcer a análise de gastos.
- **Compatibilidade com Fase 11 (grupos)**: o agente de agrupamento deve reconhecer `"investimento"` como tipo distinto e agrupá-lo em "Investimentos" por padrão — o grupo já existe no seed do Supabase? Se não, adicionar ao `scripts/migrate_db.py`.
- **Cancelamento**: o comando `/cancelar` funciona para investimentos sem mudança — já opera por ID.
