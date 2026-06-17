from fastapi import APIRouter
from collections import defaultdict
import sys, os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions

router = APIRouter()


@router.get("/history")
def get_history():
    transactions = get_active_transactions()

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
        for mes, dados in sorted(
            monthly.items(),
            key=lambda x: (int(x[0].split("/")[1]), int(x[0].split("/")[0])),
        )
    ]
