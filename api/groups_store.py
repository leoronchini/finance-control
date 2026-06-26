from api.db import execute


def list_groups() -> list[dict]:
    """[{ nome, cor }, ...]"""
    return execute("SELECT nome, cor FROM grupos ORDER BY nome")


def get_rules() -> dict[str, str]:
    """{ descricao_normalizada: grupo }"""
    rows = execute("SELECT descricao, grupo FROM regras_grupo")
    return {r["descricao"]: r["grupo"] for r in rows}


def upsert_rule(descricao: str, grupo: str, origem: str = "usuario") -> None:
    execute(
        """
        INSERT INTO regras_grupo (descricao, grupo, origem, atualizado_em)
        VALUES (%s, %s, %s, NOW()::text)
        ON CONFLICT (descricao) DO UPDATE
          SET grupo = EXCLUDED.grupo,
              origem = EXCLUDED.origem,
              atualizado_em = EXCLUDED.atualizado_em
        """,
        (descricao.strip().lower(), grupo, origem),
    )


def create_group(nome: str, cor: str = "#7c85a2") -> None:
    execute(
        """
        INSERT INTO grupos (nome, cor, criado_em)
        VALUES (%s, %s, NOW()::text)
        ON CONFLICT (nome) DO NOTHING
        """,
        (nome, cor),
    )
