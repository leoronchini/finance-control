import re
from datetime import datetime


def parse_message(text: str) -> dict:
    text = text.strip()
    tipo = "saída"

    lower = text.lower()
    if lower.startswith("entrada "):
        tipo = "entrada"
        text = text[len("entrada "):].strip()
    elif re.match(r"^recebido\s+", lower):
        # "Recebido 300 Gustavo" ou "Recebido 300 reais Gustavo"
        tipo = "entrada"
        text = re.sub(r"^recebido\s+", "", text, flags=re.IGNORECASE).strip()
    elif lower.startswith("saída ") or lower.startswith("saida "):
        tipo = "saída"
        text = re.sub(r"^sa[íi]da\s+", "", text, flags=re.IGNORECASE).strip()
    elif re.match(r"^pago\s+", lower):
        # "Pago 247,80 condomínio"
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
            "Entrada: entrada 300 salário"
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
