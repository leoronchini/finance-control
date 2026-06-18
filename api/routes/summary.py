from fastapi import APIRouter
from typing import Optional
from datetime import datetime
from api.sheets import get_active_transactions

router = APIRouter()


@router.get("/summary")
def get_summary(mes: Optional[str] = None, ano: Optional[str] = None):
    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    transactions = get_active_transactions()
    filtered = [
        t for t in transactions
        if len(t["data"].split("/")) == 3
        and t["data"].split("/")[1] == mes.zfill(2)
        and t["data"].split("/")[2] == ano
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
