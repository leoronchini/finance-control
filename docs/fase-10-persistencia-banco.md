# Fase 10 — Persistência com Banco de Dados (Supabase)

---

## Objetivo

Introduzir um banco de dados PostgreSQL externo como camada de persistência complementar ao Google Sheets. O Sheets continua sendo a **fonte de verdade das transações financeiras**; o banco é usado para dados estruturados que não cabem bem numa planilha — a memória do agente de agrupamento (Fase 11) é o primeiro caso de uso.

Esta fase entrega:
- Projeto configurado no Supabase (gratuito).
- Variável de ambiente `DATABASE_URL` no `.env` e no Render.
- Módulo `api/db.py` com conexão reutilizável.
- Criação das tabelas iniciais (`grupos` e `regras_grupo`) via script de migração.
- Seed dos grupos padrão.

---

## Por que Supabase

**Supabase** é um serviço gerenciado de PostgreSQL com plano gratuito que inclui:
- 500 MB de armazenamento
- Conexão via URL padrão (`postgresql://...`) compatível com `psycopg2`/`SQLAlchemy`/`asyncpg`
- Dashboard web para inspecionar e editar dados visualmente
- Backups automáticos

Para este projeto, 500 MB é mais do que suficiente — a memória do agente armazena apenas strings de descrição e nomes de grupo.

### ⚠️ Comportamento importante: pausa por inatividade

Projetos no plano gratuito do Supabase **pausam após 7 dias sem acesso**. Quando pausado:
- A conexão é recusada até o projeto ser "acordado" pelo dashboard do Supabase.
- A primeira requisição que tentar conectar **falhará** — a API retornará erro até o banco estar ativo novamente.

**Mitigação aplicada nesta fase:** a conexão em `api/db.py` terá tratamento de erro explícito — se o banco estiver indisponível, a API retorna um erro claro (`503 Banco de dados indisponível — pode estar pausado no Supabase`) em vez de travar ou retornar 500 genérico. As rotas que **não dependem** do banco (transações, resumo, histórico, IA) continuam funcionando normalmente.

**Mitigação manual:** se o projeto pausar, acesse [supabase.com](https://supabase.com), abra o projeto e clique em "Restore project". Leva ~30 segundos.

> Futuramente, um ping periódico (cron job gratuito via cron-job.org ou similar) pode manter o projeto ativo batendo em `/health` regularmente — mas isso é opcional e fora do escopo desta fase.

---

## Pré-requisitos

- Fase 4 concluída (API FastAPI rodando).
- Conta no [Supabase](https://supabase.com) (gratuita).

---

## Variáveis de ambiente adicionadas

```
DATABASE_URL=postgresql://postgres:<senha>@<host>.supabase.co:5432/postgres
```

Adicionar ao `.env`, ao `.env.example` e às variáveis de ambiente do Render.

---

## Estrutura de arquivos criados/modificados

```
api/
├── db.py              ← novo — conexão e helpers
├── groups_store.py    ← novo — acesso às tabelas grupos e regras_grupo
scripts/
└── migrate_db.py      ← novo — cria tabelas e insere seed
requirements.txt       ← adicionar psycopg2-binary
```

---

## Passo a passo

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) → New project.
2. Escolha nome (ex: `finance-control`), região mais próxima (South America se disponível, senão US East) e senha forte.
3. Aguarde o projeto subir (~2 min).
4. Vá em **Project Settings → Database → Connection string → URI** e copie a URL. Substitua `[YOUR-PASSWORD]` pela senha escolhida.
5. Cole no `.env` como `DATABASE_URL=<url copiada>`.

### 2. Instalar dependência

```bash
pip install psycopg2-binary
```

Adicionar ao `requirements.txt`:

```
psycopg2-binary>=2.9.0
```

### 3. Criar `api/db.py`

Módulo de conexão. Usa uma única conexão por processo (suficiente para a carga de uso pessoal) com reconexão automática em caso de falha.

```python
import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

_conn = None


def get_conn():
    """Retorna conexão ativa, reconectando se necessário."""
    global _conn
    try:
        if _conn is None or _conn.closed:
            raise psycopg2.OperationalError("sem conexão")
        # testa se a conexão ainda está viva
        _conn.cursor().execute("SELECT 1")
    except Exception:
        url = os.getenv("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL não configurada no .env")
        _conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
        _conn.autocommit = True
    return _conn


def execute(sql: str, params=None) -> list[dict]:
    """Executa uma query e retorna as linhas como lista de dicts."""
    cur = get_conn().cursor()
    cur.execute(sql, params or ())
    try:
        return [dict(r) for r in cur.fetchall()]
    except psycopg2.ProgrammingError:
        return []
```

### 4. Criar `api/groups_store.py`

Única porta de acesso às tabelas `grupos` e `regras_grupo`. Se o banco não estiver disponível, lança `RuntimeError` com mensagem clara.

```python
from api.db import execute


def list_groups() -> list[dict]:
    """[{ nome, cor }, ...]"""
    return execute("SELECT nome, cor FROM grupos ORDER BY nome")


def get_rules() -> dict[str, str]:
    """{ descricao_normalizada: grupo } — carregado inteiro em memória."""
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
```

### 5. Criar `scripts/migrate_db.py`

Script de migração manual — rodar uma única vez para criar as tabelas e inserir os grupos padrão.

```python
"""
Cria as tabelas do banco e insere os grupos padrão.
Uso: python -m scripts.migrate_db
"""
import os, sys
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
    print("Concluído.")
```

Rodar da raiz do projeto:

```bash
python -m scripts.migrate_db
```

### 6. Adicionar tratamento de erro nas rotas que usam banco

As rotas que dependem do banco (Fase 11) devem capturar `RuntimeError` e `psycopg2.OperationalError` e retornar 503:

```python
from fastapi import HTTPException
import psycopg2

try:
    grupos = list_groups()
except (RuntimeError, psycopg2.OperationalError) as e:
    raise HTTPException(
        status_code=503,
        detail=f"Banco de dados indisponível. Se estiver usando Supabase free tier, o projeto pode estar pausado. Acesse supabase.com e restaure o projeto. Detalhe: {e}"
    )
```

---

## Modelo de dados final

### Tabela `grupos`

| coluna | tipo | descrição |
|---|---|---|
| `nome` | TEXT PK | nome do grupo (ex: "Alimentação") |
| `cor` | TEXT | cor hex para o frontend (ex: "#f97316") |
| `criado_em` | TEXT | timestamp da criação |

### Tabela `regras_grupo`

| coluna | tipo | descrição |
|---|---|---|
| `descricao` | TEXT PK | descrição normalizada (`.strip().lower()`) |
| `grupo` | TEXT | grupo ao qual pertence |
| `origem` | TEXT | `"ia"` (categorizado automaticamente) ou `"usuario"` (confirmado na tela) |
| `atualizado_em` | TEXT | timestamp da última atualização |

---

## Configurar no Render

Após criar o projeto no Supabase e testar localmente:

1. No Render, vá em **Environment → Environment Variables**.
2. Adicione `DATABASE_URL` com a URL do Supabase.
3. Faça um novo deploy (ou aguarde o próximo deploy automático via GitHub).

---

## Critérios de validação

- [ ] `python -m scripts.migrate_db` cria as tabelas sem erro e insere os 7 grupos padrão.
- [ ] `api/db.py` conecta com sucesso usando `DATABASE_URL` do `.env`.
- [ ] Sem `DATABASE_URL`, `get_conn()` lança `RuntimeError` com mensagem clara (não stack trace genérico).
- [ ] Com banco pausado (simulado desconectando a URL), a API retorna 503 com mensagem orientando a restaurar o projeto no Supabase.
- [ ] As rotas existentes (`/transactions`, `/summary`, `/history`, `/ai/analysis`) **continuam funcionando** independentemente do banco — elas só usam Google Sheets.
- [ ] `list_groups()` retorna os 7 grupos seed após a migração.
- [ ] `upsert_rule()` insere e atualiza corretamente (testar inserção e depois atualização da mesma descrição).

---

## Observações

- **Google Sheets permanece fonte de verdade das transações.** O banco não replica nem sincroniza com a planilha — são responsabilidades distintas.
- **`psycopg2-binary`** inclui os binários compilados, sem necessidade de instalar `libpq-dev` no servidor. Adequado para Render.
- **`autocommit = True`** é configurado na conexão para simplificar — sem `BEGIN`/`COMMIT` explícito. Para operações que precisem de transação (ex: criar grupo + regra atomicamente, na Fase 11), usar `_conn.autocommit = False` e `_conn.commit()`/`_conn.rollback()` pontualmente.
- A conexão é global por processo. No Render free tier, que roda em processo único, isso é suficiente. Se no futuro a API for escalada para múltiplos workers, usar `psycopg2.pool.ThreadedConnectionPool` ou migrar para `asyncpg`.
