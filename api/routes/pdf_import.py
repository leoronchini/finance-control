import os
import io
import json
import pdfplumber
from google import genai
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from datetime import datetime
from bot.sheets import append_transaction
from api.sheets import _invalidate_cache

router = APIRouter()


def _normalize_date(date_str: str) -> str | None:
    if not date_str:
        return None
    parts = date_str.split("/")
    if len(parts) != 3:
        return None
    try:
        d, m, y = parts
        return f"{int(d):02d}/{int(m):02d}/{y}"
    except (ValueError, TypeError):
        return None


def _extract_text(file_bytes: bytes) -> str:
    parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                parts.append(text)
    return "\n".join(parts)


def _parse_with_gemini(raw_text: str, api_key: str) -> list:
    client = genai.Client(api_key=api_key)

    prompt = f"""Você é um assistente financeiro. Analise o texto abaixo extraído de uma fatura de cartão de crédito e extraia todos os lançamentos de compra.

Para cada lançamento retorne um objeto JSON com:
- "descricao": nome padronizado e legível em português (ex: "Mercado", "Gasolina", "Netflix", "Farmácia"). Se não for possível identificar, use "pendente".
- "valor": valor numérico em reais com ponto decimal (ex: 149.90). Ignore parcelas futuras — extraia apenas o valor da linha.
- "data": data no formato DD/MM/AAAA se encontrada, caso contrário null.
- "original": texto original da linha da fatura exatamente como aparece.

Ignore linhas de pagamento, crédito, saldo anterior ou total da fatura — apenas lançamentos de compra/débito.
Retorne APENAS um array JSON válido, sem markdown, sem texto antes ou depois.

Texto da fatura:
\"\"\"
{raw_text[:8000]}
\"\"\"
"""

    response = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    raw = response.text.strip()

    if raw.startswith("```"):
        lines = raw.split("\n")
        raw = "\n".join(lines[1:-1])

    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini retornou resposta inválida. Tente novamente.")


@router.post("/pdf/extract")
async def pdf_extract(file: UploadFile = File(...)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada no .env")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .pdf são aceitos")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Limite: 10 MB")

    try:
        raw_text = _extract_text(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erro ao ler o PDF: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="PDF sem texto extraível. Pode ser uma imagem escaneada.")

    items = _parse_with_gemini(raw_text, api_key)

    today = datetime.now().strftime("%d/%m/%Y")
    result = []
    for i, item in enumerate(items):
        desc = str(item.get("descricao") or "").strip() or "pendente"
        raw_date = str(item.get("data") or "").strip()
        normalized_date = _normalize_date(raw_date) or today
        result.append({
            "tmp_id": i,
            "descricao": desc,
            "valor": float(item.get("valor") or 0),
            "data": normalized_date,
            "original": str(item.get("original") or ""),
            "pendente": desc.lower() == "pendente",
        })

    return {
        "items": result,
        "total": len(result),
        "pendentes": sum(1 for r in result if r["pendente"]),
        "periodo": datetime.now().strftime("%m/%Y"),
    }


@router.post("/pdf/confirm")
def pdf_confirm(items: list = Body(...)):
    if not items:
        raise HTTPException(status_code=400, detail="Nenhum item para importar")

    hora = datetime.now().strftime("%H:%M")
    saved, errors = 0, []

    for item in items:
        try:
            append_transaction({
                "tipo": "saída",
                "valor": float(item["valor"]),
                "descricao": str(item["descricao"]).strip(),
                "data": str(item["data"]),
                "hora": hora,
                "categoria": "",
                "status": "ativo",
            })
            saved += 1
        except Exception as e:
            errors.append({"item": item.get("descricao"), "erro": str(e)})

    _invalidate_cache()
    return {"salvos": saved, "erros": errors}
