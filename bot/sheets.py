import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

# Carrega o .env da raiz do projeto (um nível acima de bot/)
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

_sheet_cache = None


def _get_sheet():
    global _sheet_cache
    if _sheet_cache is None:
        credentials_path = os.path.join(_ROOT, os.getenv("GOOGLE_CREDENTIALS_PATH").lstrip("./"))
        creds = Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
        _sheet_cache = spreadsheet.worksheet("transacoes")
    return _sheet_cache


def get_next_id(sheet) -> int:
    values = sheet.col_values(1)  # coluna 'id'
    numeric = [v for v in values[1:] if str(v).strip().isdigit()]
    if not numeric:
        return 1
    return int(numeric[-1]) + 1


def append_transaction(transaction: dict) -> int:
    sheet = _get_sheet()
    next_id = get_next_id(sheet)
    row = [
        next_id,
        transaction["data"],
        transaction["hora"],
        transaction["tipo"],
        transaction["valor"],
        transaction["descricao"],
        transaction.get("categoria", ""),
        transaction.get("status", "ativo"),
    ]
    sheet.append_row(row, value_input_option="USER_ENTERED")
    return next_id


def cancel_transaction(transaction_id: int) -> bool:
    sheet = _get_sheet()
    cell = sheet.find(str(transaction_id), in_column=1)
    if cell is None:
        return False
    sheet.update_cell(cell.row, 8, "cancelado")
    return True


def get_all_transactions() -> list[dict]:
    sheet = _get_sheet()
    records = sheet.get_all_records()
    return [r for r in records if r.get("status") != "cancelado"]
