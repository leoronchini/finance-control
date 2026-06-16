"""
Cria (ou recria) a aba 'resumo_por_item' na planilha do Google Sheets.
Uso: python scripts/setup_resumo_por_item.py
"""
import os, sys
from dotenv import load_dotenv
import gspread
from google.oauth2.service_account import Credentials

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

def get_spreadsheet():
    creds_path = os.path.join(
        _ROOT,
        os.getenv("GOOGLE_CREDENTIALS_PATH").lstrip("./")
    )
    creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
    client = gspread.authorize(creds)
    return client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))

def setup():
    print("Conectando ao Google Sheets...")
    spreadsheet = get_spreadsheet()

    # Remove aba existente se houver
    try:
        ws = spreadsheet.worksheet("resumo_por_item")
        spreadsheet.del_worksheet(ws)
        print("Aba anterior removida.")
    except gspread.exceptions.WorksheetNotFound:
        pass

    # Cria nova aba
    ws = spreadsheet.add_worksheet(title="resumo_por_item", rows=200, cols=10)
    print("Aba 'resumo_por_item' criada.")

    # Mês atual para preencher B1/B2 como padrão
    from datetime import datetime
    now = datetime.now()
    mes_atual = now.strftime("%m")
    ano_atual = now.strftime("%Y")

    # Estrutura da aba
    ws.update(values=[["Mes",  mes_atual]], range_name="A1")
    ws.update(values=[["Ano",  ano_atual]], range_name="A2")
    ws.update(values=[["Total de saidas (R$)", ""]], range_name="A3")
    ws.update(values=[["Descricao", "Total (R$)", "Qtd."]], range_name="A4")

    # Fórmula QUERY — agrupa saídas do mês/ano definidos em B1/B2
    query_formula = (
        '=IFERROR('
        'QUERY('
        'transacoes!A:H,'
        '"SELECT F, SUM(E), COUNT(E) '
        'WHERE D = \'saída\' '
        'AND H = \'ativo\' '
        'AND B LIKE \'%/"&TEXT(B1,"00")&"/"&B2&"\' '
        'GROUP BY F '
        'ORDER BY SUM(E) DESC '
        'LABEL F \'\', SUM(E) \'\', COUNT(E) \'\'",0),'
        '"Sem dados para o periodo")'
    )
    ws.update(values=[[query_formula]], range_name="A5", value_input_option="USER_ENTERED")

    # Fórmula de total em B3
    ws.update(values=[["=IFERROR(SUM(B5:B200),0)"]], range_name="B3", value_input_option="USER_ENTERED")

    print(f"Filtro padrão: mês {mes_atual}/{ano_atual} (edite B1 e B2 na aba para trocar o período)")
    print("Concluido! Abra a planilha e acesse a aba 'resumo_por_item'.")

if __name__ == "__main__":
    setup()
