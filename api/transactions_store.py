from api.db import execute


def append_transaction(transaction: dict) -> int:
    rows = execute(
        """
        INSERT INTO transacoes (data, hora, tipo, valor, descricao, categoria, status)
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        RETURNING id
        """,
        (
            transaction["data"],
            transaction["hora"],
            transaction["tipo"],
            transaction["valor"],
            transaction["descricao"],
            transaction.get("categoria", ""),
            transaction.get("status", "ativo"),
        ),
    )
    return rows[0]["id"]


def cancel_transaction(transaction_id: int) -> bool:
    execute(
        "UPDATE transacoes SET status = 'cancelado' WHERE id = %s AND status = 'ativo'",
        (transaction_id,),
    )
    rows = execute("SELECT status FROM transacoes WHERE id = %s", (transaction_id,))
    return bool(rows and rows[0]["status"] == "cancelado")


def get_active_transactions() -> list[dict]:
    rows = execute(
        "SELECT id, data, hora, tipo, valor, descricao, categoria, status "
        "FROM transacoes WHERE status = 'ativo' ORDER BY id"
    )
    return [_normalize(r) for r in rows]


def find_by_id(transaction_id: int) -> dict | None:
    rows = execute("SELECT * FROM transacoes WHERE id = %s", (transaction_id,))
    return _normalize(rows[0]) if rows else None


def update_transaction(transaction_id: int, fields: dict) -> bool:
    allowed = {"data", "hora", "valor", "descricao", "categoria", "tipo"}
    updates = {k: v for k, v in fields.items() if k in allowed and v is not None}
    if not updates:
        return False
    set_clause = ", ".join(f"{k} = %s" for k in updates)
    execute(
        f"UPDATE transacoes SET {set_clause} WHERE id = %s",
        (*updates.values(), transaction_id),
    )
    return True


def _normalize(r: dict) -> dict:
    r = dict(r)
    r["valor"] = float(r.get("valor") or 0)
    return r
