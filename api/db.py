import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

_conn = None


def get_conn():
    global _conn
    try:
        if _conn is None or _conn.closed:
            raise psycopg2.OperationalError("sem conexão")
        _conn.cursor().execute("SELECT 1")
    except Exception:
        url = os.getenv("DATABASE_URL")
        if not url:
            raise RuntimeError("DATABASE_URL não configurada no .env")
        _conn = psycopg2.connect(url, cursor_factory=psycopg2.extras.RealDictCursor)
        _conn.autocommit = True
    return _conn


def execute(sql: str, params=None) -> list[dict]:
    cur = get_conn().cursor()
    cur.execute(sql, params or ())
    try:
        return [dict(r) for r in cur.fetchall()]
    except psycopg2.ProgrammingError:
        return []
