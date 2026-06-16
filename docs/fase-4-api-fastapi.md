# Fase 4 — API FastAPI

---

## Objetivo

Implementar a API REST que lê os dados do Google Sheets e os serve ao frontend. Ao final desta fase, todos os endpoints estarão funcionando e poderão ser testados via browser ou cliente HTTP, prontos para o frontend consumir na Fase 5.

---

## Pré-requisitos

- Fase 2 concluída (`bot/sheets.py` funcionando)
- Fase 3 concluída (planilha com dados reais para testar)
- Dependências já instaladas via `requirements.txt`

---

## Estrutura de Arquivos

```
api/
├── main.py
├── sheets.py          ← novo: cópia de leitura do sheets do bot
└── routes/
    ├── transactions.py
    ├── summary.py
    └── history.py
```

> A API terá seu próprio `api/sheets.py`, focado exclusivamente em leitura. O `bot/sheets.py` continua responsável pela escrita.

---

## Implementação

### `api/sheets.py`

Módulo de leitura da planilha, compartilhado pelos três routers.

```python
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_sheet():
    creds = Credentials.from_service_account_file(
        os.path.join(_ROOT, os.getenv("GOOGLE_CREDENTIALS_PATH").lstrip("./")),
        scopes=SCOPES,
    )
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
    return spreadsheet.worksheet("transacoes")


def get_active_transactions() -> list[dict]:
    sheet = get_sheet()
    records = sheet.get_all_records()
    return [r for r in records if r.get("status") != "cancelado"]


def find_row_by_id(transaction_id: int):
    """Retorna (sheet, row_index) para uso nos endpoints de escrita."""
    sheet = get_sheet()
    cell = sheet.find(str(transaction_id), in_column=1)
    return sheet, cell
```

---

### `api/routes/transactions.py`

```python
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions, find_row_by_id

router = APIRouter()


class TransactionUpdate(BaseModel):
    valor: Optional[float] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    data: Optional[str] = None


@router.get("/transactions")
def list_transactions(mes: Optional[str] = None, ano: Optional[str] = None, tipo: Optional[str] = None):
    transactions = get_active_transactions()

    if mes and ano:
        transactions = [
            t for t in transactions
            if t["data"].startswith(f"{mes.zfill(2)}/") and t["data"].endswith(f"/{ano}")
        ]
    if tipo:
        transactions = [t for t in transactions if t["tipo"] == tipo]

    return transactions


@router.patch("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, body: TransactionUpdate):
    sheet, cell = find_row_by_id(transaction_id)
    if cell is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    # Mapeamento de campo -> coluna
    col_map = {"data": 2, "valor": 5, "descricao": 6, "categoria": 7}
    updates = body.model_dump(exclude_none=True)

    for field, col in col_map.items():
        if field in updates:
            sheet.update_cell(cell.row, col, updates[field])

    return {"ok": True, "id": transaction_id}


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    sheet, cell = find_row_by_id(transaction_id)
    if cell is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    sheet.update_cell(cell.row, 8, "cancelado")
    return {"ok": True, "id": transaction_id}
```

---

### `api/routes/summary.py`

```python
from fastapi import APIRouter
from typing import Optional
import sys, os
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions

router = APIRouter()


@router.get("/summary")
def get_summary(mes: Optional[str] = None, ano: Optional[str] = None):
    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    transactions = get_active_transactions()
    filtered = [
        t for t in transactions
        if t["data"].startswith(f"{mes.zfill(2)}/") and t["data"].endswith(f"/{ano}")
    ]

    total_entradas = sum(t["valor"] for t in filtered if t["tipo"] == "entrada")
    total_saidas = sum(t["valor"] for t in filtered if t["tipo"] == "saída")

    return {
        "total_entradas": round(total_entradas, 2),
        "total_saidas": round(total_saidas, 2),
        "saldo": round(total_entradas - total_saidas, 2),
        "mes": mes,
        "ano": ano,
    }
```

---

### `api/routes/history.py`

```python
from fastapi import APIRouter
import sys, os
from collections import defaultdict

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions

router = APIRouter()


@router.get("/history")
def get_history():
    transactions = get_active_transactions()

    # Agrupa por MM/AAAA preservando ordem cronológica
    monthly: dict[str, dict] = defaultdict(lambda: {"entradas": 0.0, "saidas": 0.0})

    for t in transactions:
        parts = t["data"].split("/")
        if len(parts) != 3:
            continue
        key = f"{parts[1]}/{parts[2]}"  # MM/AAAA
        if t["tipo"] == "entrada":
            monthly[key]["entradas"] += t["valor"]
        elif t["tipo"] == "saída":
            monthly[key]["saidas"] += t["valor"]

    return [
        {
            "mes": mes,
            "entradas": round(dados["entradas"], 2),
            "saidas": round(dados["saidas"], 2),
            "saldo": round(dados["entradas"] - dados["saidas"], 2),
        }
        for mes, dados in sorted(monthly.items(), key=lambda x: (x[0].split("/")[1], x[0].split("/")[0]))
    ]
```

---

### `api/main.py`

```python
import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

from routes.transactions import router as transactions_router
from routes.summary import router as summary_router
from routes.history import router as history_router

app = FastAPI(title="Finance Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["GET", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(transactions_router)
app.include_router(summary_router)
app.include_router(history_router)
```

---

## Executando a API

```bash
cd api
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

A documentação interativa estará disponível em:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

---

## Validação da Fase 4

### Testes via curl

Com a API rodando, executar cada comando e verificar a resposta:

**Listar todas as transações ativas:**
```bash
curl http://localhost:8000/transactions
```

**Filtrar por mês e ano:**
```bash
curl "http://localhost:8000/transactions?mes=06&ano=2026"
```

**Filtrar por tipo:**
```bash
curl "http://localhost:8000/transactions?mes=06&ano=2026&tipo=sa%C3%ADda"
```

**Resumo do mês atual:**
```bash
curl http://localhost:8000/summary
```

**Resumo de mês específico:**
```bash
curl "http://localhost:8000/summary?mes=06&ano=2026"
```

**Histórico mês a mês:**
```bash
curl http://localhost:8000/history
```

**Editar uma transação (substituir `1` pelo id real):**
```bash
curl -X PATCH http://localhost:8000/transactions/1 \
  -H "Content-Type: application/json" \
  -d '{"descricao": "mercado extra", "categoria": "alimentacao"}'
```

**Excluir uma transação:**
```bash
curl -X DELETE http://localhost:8000/transactions/1
```

### Respostas esperadas

| Endpoint | Código esperado | Indicador de sucesso |
|---|---|---|
| `GET /transactions` | 200 | Array JSON com transações ativas |
| `GET /summary` | 200 | Objeto com `total_entradas`, `total_saidas`, `saldo` |
| `GET /history` | 200 | Array ordenado cronologicamente por mês |
| `PATCH /transactions/{id}` | 200 | `{"ok": true, "id": N}` |
| `DELETE /transactions/{id}` | 200 | `{"ok": true, "id": N}` |
| `PATCH /transactions/9999` | 404 | `{"detail": "Transação não encontrada"}` |
| `DELETE /transactions/9999` | 404 | `{"detail": "Transação não encontrada"}` |

### Checklist final

- [ ] `api/sheets.py` criado com `get_active_transactions` e `find_row_by_id`
- [ ] `api/routes/transactions.py` implementado com GET, PATCH e DELETE
- [ ] `api/routes/summary.py` implementado com cálculo de totais e saldo
- [ ] `api/routes/history.py` implementado com agrupamento por mês ordenado
- [ ] `api/main.py` implementado com CORS configurado para `localhost:5173`
- [ ] API iniciada sem erros
- [ ] Todos os endpoints validados via curl ou Swagger UI (`/docs`)
- [ ] PATCH e DELETE retornam 404 para ids inexistentes

---

## O que Esta Fase Não Faz

- Não implementa autenticação na API (aceitável na V1.0 — acesso apenas local)
- Não cria o frontend
- Não implementa paginação nos endpoints de listagem

Tudo isso começa na Fase 5.
