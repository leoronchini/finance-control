# Fase 7 — Resumo de Gastos por Item

---

## Objetivo

Criar uma nova aba na planilha do Google Sheets chamada `resumo_por_item` que agrupa e totaliza automaticamente os gastos do mês por descrição individual, usando fórmulas nativas do Sheets. Nenhum código Python ou JavaScript é alterado nesta fase.

---

## Pré-requisitos

- Fase 2 concluída (planilha `transacoes` já existe e está sendo alimentada pelo bot)
- Acesso à planilha no Google Sheets

---

## O que será criado

Uma aba auxiliar na planilha com:

- Filtro de mês e ano configurável manualmente (células de entrada)
- Tabela automática com: Descrição · Total gasto · Qtd. de ocorrências · % do total de saídas

A aba atualiza automaticamente conforme novas transações são adicionadas pelo bot.

---

## Passo a passo

### 1. Criar a aba

Na planilha do Google Sheets, clique no `+` no canto inferior esquerdo para adicionar uma nova aba. Renomeie-a para `resumo_por_item`.

### 2. Configurar células de filtro

Na aba `resumo_por_item`, preencha manualmente:

| Célula | Valor | Descrição |
|--------|-------|-----------|
| `B1`   | `06`  | Mês (MM, com zero à esquerda) |
| `B2`   | `2026`| Ano (AAAA) |

Adicione os rótulos em `A1` e `A2`:
- `A1` → `Mês`
- `A2` → `Ano`

### 3. Cabeçalho da tabela

Na linha 4, preencha os cabeçalhos:

| A4 | B4 | C4 | D4 |
|----|----|----|-----|
| Descrição | Total (R$) | Qtd. | % do total |

### 4. Fórmula principal — lista de descrições únicas

Em `A5`, insira a fórmula para extrair descrições únicas das saídas do mês filtrado:

```
=IFERROR(
  QUERY(
    transacoes!A:H,
    "SELECT F, SUM(E), COUNT(E)
     WHERE D = 'saída'
       AND H = 'ativo'
       AND B LIKE '%/"&TEXT(B1,"00")&"/"&B2&"'
     GROUP BY F
     ORDER BY SUM(E) DESC
     LABEL F 'desc', SUM(E) 'total', COUNT(E) 'qtd'",
    0
  ),
  "Sem dados para o período"
)
```

> Esta única fórmula preenche automaticamente as colunas A, B e C (descrição, total, quantidade) para todas as linhas necessárias.

### 5. Fórmula de percentual — coluna D

Em `D5`, insira:

```
=IFERROR(B5/SUM(B5:B1000)*100, "")
```

Formate a coluna D como número com 1 casa decimal e adicione o símbolo `%`.

Arraste `D5` para baixo até `D200` (ou use `ArrayFormula`):

```
=IFERROR(B5:B200/SUM(B5:B200)*100, "")
```

### 6. Card de total de saídas

Em `A3`, adicione o rótulo `Total de saídas do mês:` e em `B3`:

```
=IFERROR(SUM(B5:B1000), 0)
```

Formate `B3` como moeda (R$).

---

## Resultado esperado

Após configurar, a aba `resumo_por_item` exibirá automaticamente algo como:

| Descrição | Total (R$) | Qtd. | % do total |
|-----------|-----------|------|------------|
| aluguel   | 1.200,00  | 1    | 61,4%      |
| mercado   | 430,00    | 3    | 22,0%      |
| gasolina  | 310,00    | 2    | 15,9%      |
| almoço    | 15,00     | 1    | 0,8%       |

Para trocar o mês, basta alterar `B1` e `B2` — a tabela atualiza imediatamente.

---

## Critérios de validação

- [ ] Aba `resumo_por_item` criada na planilha
- [ ] Alterar `B1` (mês) reflete corretamente na tabela
- [ ] Apenas transações `saída` e `ativo` aparecem no resumo
- [ ] `% do total` soma 100% (tolerância de arredondamento)
- [ ] Novas transações registradas pelo bot aparecem automaticamente na próxima atualização do Sheets

---

## Novo endpoint da API — `GET /summary/items`

Além da aba no Sheets, esta fase também cria o endpoint na API FastAPI que o frontend consumirá na Fase 5.

### `api/routes/summary_items.py`

```python
from fastapi import APIRouter, Query
from datetime import datetime
from api.sheets import get_active_transactions

router = APIRouter()

@router.get("/summary/items")
def summary_items(mes: str = Query(None), ano: str = Query(None)):
    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    transactions = get_active_transactions()
    filtered = [
        t for t in transactions
        if len(t["data"].split("/")) == 3
        and t["data"].split("/")[1] == mes.zfill(2)
        and t["data"].split("/")[2] == ano
        and t.get("tipo") == "saída"
    ]

    totals = {}
    for t in filtered:
        key = t["descricao"].strip().lower()
        label = t["descricao"].strip()
        if key not in totals:
            totals[key] = {"descricao": label, "total": 0.0, "count": 0}
        totals[key]["total"] += float(t["valor"])
        totals[key]["count"] += 1

    total_saidas = sum(v["total"] for v in totals.values())
    items = sorted(totals.values(), key=lambda x: x["total"], reverse=True)
    for item in items:
        item["total"] = round(item["total"], 2)
        item["percentual"] = round(item["total"] / total_saidas * 100, 1) if total_saidas else 0

    return {"mes": mes, "ano": ano, "total_saidas": round(total_saidas, 2), "items": items}
```

### Registrar em `api/main.py`

```python
from api.routes.summary_items import router as summary_items_router
app.include_router(summary_items_router)
```

### Resposta esperada

```json
{
  "mes": "06",
  "ano": "2026",
  "total_saidas": 1955.00,
  "items": [
    { "descricao": "aluguel",  "total": 1200.00, "count": 1, "percentual": 61.4 },
    { "descricao": "mercado",  "total": 430.00,  "count": 3, "percentual": 22.0 },
    { "descricao": "gasolina", "total": 310.00,  "count": 2, "percentual": 15.9 },
    { "descricao": "almoço",   "total": 15.00,   "count": 1, "percentual": 0.8  }
  ]
}
```

---

## Critérios de validação da API

- [ ] `GET /summary/items?mes=06&ano=2026` retorna lista ordenada por valor decrescente
- [ ] Apenas transações `saída` e `ativo` entram no cálculo
- [ ] `percentual` some 100% (tolerância de arredondamento)
- [ ] Mês/ano sem dados retorna `items: []` e `total_saidas: 0`

---

## Observações

- O código Python desta fase é exclusivamente de leitura — nenhum dado é gravado na planilha
- O agrupamento na API é case-insensitive (`.lower()`); no Sheets a QUERY é case-sensitive — comportamentos distintos, ambos aceitáveis para V1
- A tela "Por Item" que consome este endpoint será desenvolvida na **Fase 5 — Frontend React**
