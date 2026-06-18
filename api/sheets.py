import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
from datetime import datetime, timedelta
import os
import time

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_sheet_cache = None
_data_cache: list[dict] = []
_data_cache_ts: float = 0
_CACHE_TTL = 30


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
    global _data_cache_ts
    _data_cache_ts = 0


def _serial_to_date(value) -> str:
    """Converte serial de data do Google Sheets (ex: 46189) para DD/MM/AAAA.
    Se já for string, retorna como está."""
    if isinstance(value, (int, float)) and value > 1:
        dt = datetime(1899, 12, 30) + timedelta(days=int(value))
        return dt.strftime("%d/%m/%Y")
    return str(value)


def _serial_to_time(value) -> str:
    """Converte serial de hora do Google Sheets (ex: 0.9520) para HH:MM.
    Se já for string, retorna como está."""
    if isinstance(value, float) and 0 <= value < 1:
        total_min = round(value * 24 * 60)
        h, m = divmod(total_min, 60)
        return f"{h:02d}:{m:02d}"
    return str(value)


def _normalize_record(r: dict) -> dict:
    """Normaliza um registro lido com UNFORMATTED_VALUE."""
    r["data"] = _serial_to_date(r.get("data", ""))
    r["hora"] = _serial_to_time(r.get("hora", ""))
    r["valor"] = float(r.get("valor") or 0)
    return r


def get_active_transactions() -> list[dict]:
    global _data_cache, _data_cache_ts
    now = time.time()
    if now - _data_cache_ts > _CACHE_TTL:
        # UNFORMATTED_VALUE evita que o gspread confunda separadores de locale:
        # "103,45" (pt-BR) → numericise errado → 10345. Com UNFORMATTED vem 103.45 direto.
        records = get_sheet().get_all_records(value_render_option="UNFORMATTED_VALUE")
        _data_cache = [
            _normalize_record(r)
            for r in records
            if r.get("status") != "cancelado"
        ]
        _data_cache_ts = now
    return _data_cache


def find_row_by_id(transaction_id: int):
    sheet = get_sheet()
    cell = sheet.find(str(transaction_id), in_column=1)
    return sheet, cell
