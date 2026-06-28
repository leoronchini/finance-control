# Fase 13 — Tipo Reembolso

---

## Objetivo

Adicionar `"reembolso"` como terceiro tipo de transação, ao lado de `"entrada"` e `"saída"`. Um reembolso representa dinheiro que voltou para você após um gasto adiantado — parcial (divisão de conta) ou total. Ele não é uma entrada de renda real, então deve aparecer separado nos resumos.

**Regra central:** `saldo = entradas + reembolsos - saídas`. Reembolsos reduzem o custo efetivo do mês mas não são confundidos com renda.

---

## Pré-requisitos

- Fase 3 concluída (bot Telegram com parser).
- Fase 4 concluída (API FastAPI).
- Fase 5 concluída (frontend React).

---

## O que muda em cada camada

### Google Sheets

Nenhuma mudança de estrutura. A coluna `tipo` já aceita qualquer string — basta passar `"reembolso"`. Todos os filtros de `status = "ativo"` continuam funcionando.

### Bot (`bot/parser.py` e `bot/handlers.py`)

O parser precisa reconhecer mensagens de reembolso. Exemplos que devem funcionar:

```
recebi 50 de reembolso do jantar
reembolso 80 almoço da empresa
me pagaram 120 do mercado
```

O bot responde com confirmação no mesmo estilo das entradas/saídas:

```
✅ Reembolso registrado
💰 R$ 50,00 — jantar
📅 27/06/2026
```

### API (`api/routes/summary.py`)

O endpoint `GET /summary` hoje retorna `entradas` e `saidas`. Passa a retornar também `reembolsos` e `custo_real`:

```json
{
  "mes": "06",
  "ano": "2026",
  "entradas": 5000.00,
  "saidas": 3200.00,
  "reembolsos": 150.00,
  "custo_real": 3050.00,
  "saldo": 2100.00
}
```

- `custo_real = saidas - reembolsos` (o que realmente saiu do bolso)
- `saldo = entradas + reembolsos - saidas`

### API (`api/routes/summary_items.py`)

O endpoint `GET /summary/items` hoje agrupa só saídas. Passa a aceitar um parâmetro `tipo` opcional:

- `tipo=saída` (padrão) — comportamento atual
- `tipo=reembolso` — agrupa reembolsos por descrição

### Frontend

- **Dashboard**: card de reembolsos ao lado dos cards existentes, e `custo_real` exibido abaixo do total de saídas como *"Custo efetivo: R$ X"*
- **Tela Transactions**: filtro de tipo inclui "Reembolso" além de "Entrada" e "Saída"; linhas de reembolso em cor distinta (ex: azul/roxo, diferente do verde de entradas e vermelho de saídas)
- **Tela History**: gráfico mensal inclui barra ou linha de reembolsos

---

## Passo a passo — Bot

### 1. Atualizar `bot/parser.py`

Adicionar reconhecimento de reembolso antes das regras de entrada/saída. Palavras-gatilho: `reembolso`, `recebi de volta`, `me pagaram`, `me devolveram`, `ressarcimento`.

```python
import re

REEMBOLSO_KEYWORDS = r"reembolso|recebi de volta|me pagaram|me devolveram|ressarcimento"

def parse_message(text: str) -> dict | None:
    text = text.strip()

    # --- reembolso ---
    m = re.search(
        rf"(?:{REEMBOLSO_KEYWORDS})[^\d]*(\d+[\.,]?\d*)|(\d+[\.,]?\d*)[^\d]*(?:{REEMBOLSO_KEYWORDS})",
        text, re.IGNORECASE
    )
    if m:
        valor_str = (m.group(1) or m.group(2)).replace(",", ".")
        valor = float(valor_str)
        # descrição = texto sem o valor e sem a palavra-gatilho
        descricao = re.sub(rf"(?:{REEMBOLSO_KEYWORDS})", "", text, flags=re.IGNORECASE)
        descricao = re.sub(r"\d+[\.,]?\d*", "", descricao).strip(" -–:de")
        descricao = descricao.strip() or "reembolso"
        return {"tipo": "reembolso", "valor": valor, "descricao": descricao}

    # ... regras existentes de entrada e saída abaixo ...
```

### 2. Atualizar `bot/handlers.py`

Adicionar o emoji e label para reembolso na resposta de confirmação:

```python
TIPO_LABEL = {
    "entrada":   ("💚", "Entrada registrada"),
    "saída":     ("🔴", "Saída registrada"),
    "reembolso": ("🔵", "Reembolso registrado"),
}
```

---

## Passo a passo — API

### 3. Atualizar `api/routes/summary.py`

```python
entradas   = sum(t["valor"] for t in ativos if t.get("tipo") == "entrada")
saidas     = sum(t["valor"] for t in ativos if t.get("tipo") == "saída")
reembolsos = sum(t["valor"] for t in ativos if t.get("tipo") == "reembolso")

return {
    "mes": mes,
    "ano": ano,
    "entradas":   round(entradas, 2),
    "saidas":     round(saidas, 2),
    "reembolsos": round(reembolsos, 2),
    "custo_real": round(saidas - reembolsos, 2),
    "saldo":      round(entradas + reembolsos - saidas, 2),
}
```

### 4. Atualizar `api/routes/summary_items.py`

Adicionar parâmetro `tipo`:

```python
@router.get("/summary/items")
def summary_items(
    mes: str = Query(None),
    ano: str = Query(None),
    tipo: str = Query("saída"),   # "saída" ou "reembolso"
):
    ...
    filtered = [t for t in ativos if t.get("tipo") == tipo]
    ...
```

---

## Passo a passo — Frontend

### 5. Atualizar `frontend/src/pages/Dashboard.jsx`

Adicionar card de reembolsos e linha de custo efetivo abaixo do card de saídas:

```jsx
// card existente de saídas, adicionar abaixo:
<div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
  Custo efetivo: {currency(summary.custo_real)}
</div>

// novo card:
<SummaryCard
  label="Reembolsos"
  value={summary.reembolsos}
  color="#3b82f6"
/>
```

### 6. Atualizar `frontend/src/pages/Transactions.jsx`

- Filtro de tipo: adicionar opção "Reembolso"
- Cor da linha: azul para `tipo === "reembolso"`

```jsx
const corTipo = {
  entrada:   'var(--green)',
  saída:     'var(--red)',
  reembolso: '#3b82f6',
}
```

### 7. Atualizar `frontend/src/pages/History.jsx`

Incluir `reembolsos` no gráfico mensal. Adicionar barra/linha azul para reembolsos no mesmo gráfico de entradas vs saídas.

### 8. Atualizar `frontend/src/services/api.js`

O `getSummary` já retorna o payload novo automaticamente (sem mudança de chamada). Garantir que o frontend consuma `reembolsos` e `custo_real` do retorno.

---

## Critérios de validação — Bot

- [ ] *"reembolso 50 jantar"* → tipo `reembolso`, valor `50.0`, descrição `"jantar"`
- [ ] *"recebi 80 de volta do almoço"* → tipo `reembolso`, valor `80.0`
- [ ] *"me devolveram 120"* → tipo `reembolso`, valor `120.0`, descrição `"reembolso"`
- [ ] Confirmação no chat usa emoji 🔵 e label "Reembolso registrado"
- [ ] Mensagens de entrada/saída normais continuam funcionando sem regressão

## Critérios de validação — API

- [ ] `GET /summary` retorna `reembolsos`, `custo_real` e `saldo` corretos
- [ ] `custo_real = saidas - reembolsos`
- [ ] `saldo = entradas + reembolsos - saidas`
- [ ] `GET /summary/items?tipo=reembolso` retorna reembolsos agrupados por descrição
- [ ] `GET /summary/items` (sem parâmetro) continua retornando só saídas (padrão)

## Critérios de validação — Frontend

- [ ] Dashboard exibe card de reembolsos e custo efetivo abaixo das saídas
- [ ] Tela Transactions filtra por "Reembolso" e exibe linhas em azul
- [ ] Saldo no Dashboard usa a fórmula correta (entradas + reembolsos - saídas)
- [ ] History inclui reembolsos no gráfico mensal

---

## Observações

- **Sem mudança de schema** no Sheets — `"reembolso"` é aceito na coluna `tipo` sem nenhuma migração.
- **Compatibilidade retroativa total**: transações existentes com tipo `"entrada"` ou `"saída"` não são afetadas.
- **Agrupamento (Fase 11)**: reembolsos devem ser considerados no agrupamento por grupo — eles representam dinheiro recuperado e devem aparecer no grupo correspondente à saída original (ex: reembolso de jantar → grupo Alimentação). A Fase 11 já recebe todos os tipos de transação e pode tratar reembolso como tipo distinto dentro de um grupo.
- **Cancelamento**: o comando `cancelar` do bot funciona para reembolsos sem mudança — já opera por ID independente do tipo.
