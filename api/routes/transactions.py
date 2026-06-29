from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from api.transactions_store import (
    get_active_transactions, find_by_id, update_transaction as store_update,
    cancel_transaction as store_cancel,
)

router = APIRouter()


class TransactionUpdate(BaseModel):
    valor: Optional[float] = None
    descricao: Optional[str] = None
    categoria: Optional[str] = None
    data: Optional[str] = None
    tipo: Optional[str] = None


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
    if find_by_id(transaction_id) is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    store_update(transaction_id, body.model_dump(exclude_none=True))
    return {"ok": True, "id": transaction_id}


@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int):
    if find_by_id(transaction_id) is None:
        raise HTTPException(status_code=404, detail="Transação não encontrada")

    store_cancel(transaction_id)
    return {"ok": True, "id": transaction_id}
