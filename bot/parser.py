import re
from datetime import datetime

_REEMBOLSO_RE = re.compile(
    r"reembolso|recebi de volta|me pagaram|me devolveram|ressarcimento",
    re.IGNORECASE,
)


def parse_message(text: str) -> dict:
    text = text.strip()
    tipo = "saída"

    lower = text.lower()

    # --- reembolso (verificar antes de entrada/saída) ---
    if _REEMBOLSO_RE.search(lower):
        tipo = "reembolso"
        # extrai valor: "reembolso 50 jantar" ou "recebi 80 de volta almoço"
        sem_gatilho = _REEMBOLSO_RE.sub("", text).strip()
        # remove palavras de ligação comuns
        sem_gatilho = re.sub(r"\b(de|do|da|os|as|um|uma)\b", " ", sem_gatilho, flags=re.IGNORECASE)
        sem_gatilho = re.sub(r"\s+", " ", sem_gatilho).strip()
        match = re.match(r"^(\d[\d.,]*)\s*(.*)", sem_gatilho)
        if not match:
            # tenta valor no meio do texto original
            match = re.search(r"(\d[\d.,]+)\s+(.*)", text)
        if not match:
            raise ValueError(
                "❌ Não entendi o valor do reembolso.\n"
                "Exemplos: reembolso 50 jantar · recebi de volta 80 almoço"
            )
        raw_value = match.group(1).replace(",", ".")
        descricao = match.group(2).strip() or "reembolso"
        try:
            valor = float(raw_value)
        except ValueError:
            raise ValueError("❌ Não entendi o valor. Exemplo: reembolso 50 jantar")
        if valor <= 0:
            raise ValueError("❌ O valor precisa ser maior que zero")
        now = datetime.now()
        return {
            "valor": valor,
            "tipo": tipo,
            "descricao": descricao,
            "data": now.strftime("%d/%m/%Y"),
            "hora": now.strftime("%H:%M"),
            "categoria": "",
            "status": "ativo",
        }

    # --- entrada ---
    if lower.startswith("entrada "):
        tipo = "entrada"
        text = text[len("entrada "):].strip()
    elif re.match(r"^recebido\s+", lower):
        tipo = "entrada"
        text = re.sub(r"^recebido\s+", "", text, flags=re.IGNORECASE).strip()
    # --- saída ---
    elif lower.startswith("saída ") or lower.startswith("saida "):
        tipo = "saída"
        text = re.sub(r"^sa[íi]da\s+", "", text, flags=re.IGNORECASE).strip()
    elif re.match(r"^pago\s+", lower):
        tipo = "saída"
        text = re.sub(r"^pago\s+", "", text, flags=re.IGNORECASE).strip()

    # Remove "reais" após o valor
    text = re.sub(r"^(\d[\d.,]*)\s+reais\s+", r"\1 ", text, flags=re.IGNORECASE)

    match = re.match(r"^(\d[\d.,]*)\s+(.*)", text)
    if not match:
        raise ValueError(
            "❌ Não entendi o valor.\n"
            "Saída: 50 mercado\n"
            "Entrada: recebido 300 Gustavo\n"
            "Entrada: entrada 300 salário\n"
            "Reembolso: reembolso 50 jantar"
        )

    raw_value, descricao = match.group(1), match.group(2).strip()

    raw_value = raw_value.replace(",", ".")
    try:
        valor = float(raw_value)
    except ValueError:
        raise ValueError("❌ Não entendi o valor. Exemplo: 50 mercado")

    if valor <= 0:
        raise ValueError("❌ O valor precisa ser maior que zero")

    if not descricao:
        raise ValueError("❌ Adicione uma descrição. Exemplo: 50 mercado")

    now = datetime.now()
    return {
        "valor": valor,
        "tipo": tipo,
        "descricao": descricao,
        "data": now.strftime("%d/%m/%Y"),
        "hora": now.strftime("%H:%M"),
        "categoria": "",
        "status": "ativo",
    }
