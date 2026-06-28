"""
Migra todas as transações do Google Sheets para o Supabase.
Preserva os IDs originais. Seguro para rodar múltiplas vezes (ON CONFLICT DO NOTHING).

Uso (da raiz do projeto): python -m scripts.migrate_sheets_to_db
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.db import execute
from bot.sheets import _get_sheet


DDL_TRANSACOES = """
CREATE TABLE IF NOT EXISTS transacoes (
    id          SERIAL PRIMARY KEY,
    data        TEXT NOT NULL,
    hora        TEXT NOT NULL,
    tipo        TEXT NOT NULL,
    valor       NUMERIC(12,2) NOT NULL,
    descricao   TEXT NOT NULL,
    categoria   TEXT DEFAULT '',
    status      TEXT DEFAULT 'ativo'
);
"""


def _serial_to_date(value) -> str:
    from datetime import datetime, timedelta
    if isinstance(value, (int, float)) and value > 1:
        dt = datetime(1899, 12, 30) + timedelta(days=int(value))
        return dt.strftime("%d/%m/%Y")
    return str(value)


def _serial_to_time(value) -> str:
    if isinstance(value, float) and 0 <= value < 1:
        total_min = round(value * 24 * 60)
        h, m = divmod(total_min, 60)
        return f"{h:02d}:{m:02d}"
    return str(value)


def main():
    print("Criando tabela transacoes (se não existir)...")
    execute(DDL_TRANSACOES)

    print("Lendo planilha Google Sheets...")
    sheet = _get_sheet()
    records = sheet.get_all_records(value_render_option="UNFORMATTED_VALUE")
    print(f"Encontradas {len(records)} linhas (incluindo canceladas)")

    inserted = skipped = errors = 0

    for r in records:
        try:
            row_id = int(r.get("id") or 0)
            if not row_id:
                print(f"  AVISO: linha sem id, ignorada: {r}")
                skipped += 1
                continue

            data     = _serial_to_date(r.get("data", ""))
            hora     = _serial_to_time(r.get("hora", ""))
            tipo     = str(r.get("tipo") or "saída").strip()
            valor    = float(r.get("valor") or 0)
            descricao = str(r.get("descricao") or "").strip()
            categoria = str(r.get("categoria") or "").strip()
            status   = str(r.get("status") or "ativo").strip()

            result = execute(
                """
                INSERT INTO transacoes (id, data, hora, tipo, valor, descricao, categoria, status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO NOTHING
                RETURNING id
                """,
                (row_id, data, hora, tipo, valor, descricao, categoria, status),
            )

            if result:
                inserted += 1
            else:
                skipped += 1

        except Exception as e:
            print(f"  ERRO na linha {r}: {e}")
            errors += 1

    # Ajusta a sequência do SERIAL para continuar após o maior ID migrado
    execute("SELECT setval('transacoes_id_seq', (SELECT MAX(id) FROM transacoes))")

    print(f"\nMigração concluída:")
    print(f"  {inserted} inseridas")
    print(f"  {skipped} ignoradas (já existiam ou sem id)")
    print(f"  {errors} erros")

    total_db = execute("SELECT COUNT(*) AS n FROM transacoes")[0]["n"]
    print(f"\nTotal no banco agora: {total_db} transações")
    print("Verifique no painel Supabase e confirme que os números batem com a planilha.")


if __name__ == "__main__":
    main()
