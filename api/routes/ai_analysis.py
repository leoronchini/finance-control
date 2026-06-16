import os
from google import genai
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from collections import defaultdict

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions

router = APIRouter()


def _build_month_summary(transactions: list, mes: str, ano: str) -> dict:
    filtered = [
        t for t in transactions
        if len(t["data"].split("/")) == 3
        and t["data"].split("/")[1] == mes.zfill(2)
        and t["data"].split("/")[2] == ano
    ]
    entradas = sum(float(t["valor"]) for t in filtered if t.get("tipo") == "entrada")
    saidas = sum(float(t["valor"]) for t in filtered if t.get("tipo") == "saída")

    por_item: dict = defaultdict(float)
    for t in filtered:
        if t.get("tipo") == "saída":
            por_item[t["descricao"].strip().lower()] += float(t["valor"])

    top_itens = sorted(por_item.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "mes": mes,
        "ano": ano,
        "entradas": round(entradas, 2),
        "saidas": round(saidas, 2),
        "saldo": round(entradas - saidas, 2),
        "top_itens": [{"descricao": k, "total": round(v, 2)} for k, v in top_itens],
    }


def _prev_month(mes: str, ano: str) -> tuple:
    m, a = int(mes), int(ano)
    m -= 1
    if m == 0:
        m, a = 12, a - 1
    return str(m).zfill(2), str(a)


def _format_summary(s: dict) -> str:
    itens = ", ".join(f"{i['descricao']} R$ {i['total']:.2f}" for i in s["top_itens"])
    return (
        f"  Mês {s['mes']}/{s['ano']}: entradas R$ {s['entradas']:.2f}, "
        f"saídas R$ {s['saidas']:.2f}, saldo R$ {s['saldo']:.2f}. "
        f"Top saídas: {itens or 'nenhuma'}."
    )


@router.post("/ai/analysis")
def ai_analysis(mes: str = Query(None), ano: str = Query(None)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada no .env")

    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    transactions = get_active_transactions()

    mes1, ano1 = _prev_month(mes, ano)
    mes2, ano2 = _prev_month(mes1, ano1)

    atual = _build_month_summary(transactions, mes, ano)
    anterior = _build_month_summary(transactions, mes1, ano1)
    retrasado = _build_month_summary(transactions, mes2, ano2)

    prompt = f"""Você é um assistente financeiro pessoal. Analise os dados de gastos abaixo e forneça um relatório em português com:
1. Resumo do mês atual
2. Comparativo com os dois meses anteriores (tendências)
3. Categorias ou itens com maior gasto
4. Pelo menos 2 sugestões práticas de economia

Dados financeiros:

Mês atual:
{_format_summary(atual)}

Mês anterior:
{_format_summary(anterior)}

Dois meses atrás:
{_format_summary(retrasado)}

Responda de forma clara, objetiva e amigável. Use marcadores para as sugestões."""

    client = genai.Client(api_key=api_key)

    try:
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        analysis_text = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao chamar a API do Gemini: {str(e)}")

    return {
        "mes": mes,
        "ano": ano,
        "resumo": atual,
        "analise": analysis_text,
    }
