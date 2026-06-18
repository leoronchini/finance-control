from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.sheets import get_active_transactions, find_row_by_id, _invalidate_cache

router = APIRouter()


class TransactionUpdate(BaseModel):
    valor: Optional[float] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    data: Optional[str] = None


@router.get("/transactions")
def list_transactions(
    mes: Optional[str] = None,
    ano: Optional[str] = None,
    tipo: Optional[str] = None,
):
    transactions = get_active_transactions()

    if mes and ano:
        transactions = [
            t for t in transactions
            if len(t["data"].split("/")) == 3
            and t["data"].split("/")[1] == mes.zfill(2)
            and t["data"].split("/")[2] == ano
        ]
    if tipo:
        transactions = [t for t in transactions if t["tipo"] == tipo]

    return transactions


@router.patch("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, body: TransactionUpdate):
    sheet, cell = find_row_by_id(transaction_id)
    if cell is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    col_map = {"data": 2, "valor": 5, "descricao": 6, "categoria": 7}
    updates = body.model_dump(exclude_none=True)

    for field, col in col_map.items():
        if field in updates:
            sheet.update_cell(cell.row, col, updates[field])

    _invalidate_cache()
    return {"ok": True, "id": transaction_id}


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    sheet, cell = find_row_by_id(transaction_id)
    if cell is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    sheet.update_cell(cell.row, 8, "cancelado")
    _invalidate_cache()
    return {"ok": True, "id": transaction_id}
