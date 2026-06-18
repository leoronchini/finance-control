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

    totals: dict[str, dict] = {}
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
        item["percentual"] = round(item["total"] / total_saidas * 100, 1) if total_saidas else 0.0

    return {"mes": mes, "ano": ano, "total_saidas": round(total_saidas, 2), "items": items}
