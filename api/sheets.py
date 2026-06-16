import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os
import time

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

# Cache do worksheet e dos dados em memória
_sheet_cache = None
_data_cache: list[dict] = []
_data_cache_ts: float = 0
_CACHE_TTL = 30  # segundos entre re-leituras da planilha


def get_sheet():
    global _sheet_cache
    if _sheet_cache is None:
        creds = Credentials.from_service_account_file(
            os.path.join(_ROOT, os.getenv("GOOGLE_CREDENTIALS_PATH").lstrip("./")),
            scopes=SCOPES,
        )
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
        _sheet_cache = spreadsheet.worksheet("transacoes")
    return _sheet_cache


def _invalidate_cache():
    """Descarta o cache de dados para forçar re-leitura na próxima chamada."""
    global _data_cache_ts
    _data_cache_ts = 0


def get_active_transactions() -> list[dict]:
    global _data_cache, _data_cache_ts
    now = time.time()
    if now - _data_cache_ts > _CACHE_TTL:
        records = get_sheet().get_all_records()
        _data_cache = [r for r in records if r.get("status") != "cancelado"]
        _data_cache_ts = now
    return _data_cache


def find_row_by_id(transaction_id: int):
    sheet = get_sheet()
    cell = sheet.find(str(transaction_id), in_column=1)
    return sheet, cell
