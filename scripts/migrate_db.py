"""
Cria as tabelas do banco e insere os grupos padrão.
Uso (da raiz do projeto): python -m scripts.migrate_db
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from api.db import execute

DDL = """
CREATE TABLE IF NOT EXISTS grupos (
    nome       TEXT PRIMARY KEY,
    cor        TEXT NOT NULL DEFAULT '#7c85a2',
    criado_em  TEXT
);

CREATE TABLE IF NOT EXISTS regras_grupo (
    descricao     TEXT PRIMARY KEY,
    grupo         TEXT NOT NULL,
    origem        TEXT NOT NULL DEFAULT 'usuario',
    atualizado_em TEXT
);
"""

SEED_GRUPOS = [
    ("Gastos Fixos",        "#ef4444"),
    ("Alimentação",         "#f97316"),
    ("Transporte",          "#a855f7"),
    ("Lazer & Assinaturas", "#3b82f6"),
    ("Saúde",               "#22c55e"),
    ("Renda",               "#10b981"),
    ("Outros",              "#7c85a2"),
]

if __name__ == "__main__":
    print("Criando tabelas...")
    execute(DDL)
    print("Inserindo grupos padrão...")
    for nome, cor in SEED_GRUPOS:
        execute(
            "INSERT INTO grupos (nome, cor, criado_em) VALUES (%s, %s, NOW()::text) ON CONFLICT DO NOTHING",
            (nome, cor),
        )
    print("Concluído. 7 grupos inseridos (ou já existiam).")
