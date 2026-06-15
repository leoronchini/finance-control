import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]


def get_sheet():
    creds = Credentials.from_service_account_file(
        os.path.join(_ROOT, os.getenv("GOOGLE_CREDENTIALS_PATH").lstrip("./")),
        scopes=SCOPES,
    )
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
    return spreadsheet.worksheet("transacoes")


def get_active_transactions() -> list[dict]:
    sheet = get_sheet()
    records = sheet.get_all_records()
    return [r for r in records if r.get("status") != "cancelado"]


def find_row_by_id(transaction_id: int):
    sheet = get_sheet()
    cell = sheet.find(str(transaction_id), in_column=1)
    return sheet, cell
