# Fase 2 — Integração com Google Sheets

---

## Objetivo

Configurar as credenciais da API do Google, criar a planilha com a estrutura de dados definida no PRD e implementar o módulo `bot/sheets.py` com as operações de leitura e escrita via `gspread`. Ao final desta fase, será possível gravar e consultar transações na planilha diretamente pelo Python, sem nenhum envolvimento do bot ou da API ainda.

---

## Pré-requisitos

- Fase 1 concluída (estrutura de pastas e `requirements.txt` existentes)
- Conta Google pessoal
- Dependências instaladas: `pip install -r requirements.txt`

---

## Etapas de Configuração

### 2.1 Criar o Projeto no Google Cloud

1. Acesse [console.cloud.google.com](https://console.cloud.google.com)
2. Clique em **"Novo Projeto"**, dê um nome (ex: `finance-bot`) e confirme
3. No menu lateral, vá em **"APIs e Serviços" → "Biblioteca"**
4. Busque por **"Google Sheets API"** e clique em **"Ativar"**
5. Busque por **"Google Drive API"** e clique em **"Ativar"**

> A Google Drive API é necessária porque o `gspread` usa internamente o Drive para localizar e abrir planilhas pelo ID.

---

### 2.2 Criar a Conta de Serviço

1. Vá em **"APIs e Serviços" → "Credenciais"**
2. Clique em **"Criar credenciais" → "Conta de serviço"**
3. Preencha:
   - **Nome:** `finance-bot-service`
   - **ID:** gerado automaticamente
   - **Descrição:** opcional
4. Clique em **"Criar e continuar"** → pule as etapas de permissão → **"Concluído"**
5. Na lista de contas de serviço, clique na que foi criada
6. Vá na aba **"Chaves"** → **"Adicionar chave" → "Criar nova chave"**
7. Escolha formato **JSON** e clique em **"Criar"**
8. O arquivo JSON será baixado automaticamente — mova-o para `credentials/google-credentials.json`

> Este arquivo contém a chave privada da conta de serviço. Nunca versione. O `.gitignore` já o exclui.

---

### 2.3 Criar a Planilha no Google Sheets

1. Acesse [sheets.google.com](https://sheets.google.com) e crie uma nova planilha
2. Renomeie a aba padrão de `"Página1"` para `"transacoes"`
3. Preencha a **linha 1** com os cabeçalhos exatamente como abaixo (sem espaços extras, sem acentos nas chaves):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| id | data | hora | tipo | valor | descricao | categoria | status |

4. Copie o **ID da planilha** da URL:
   ```
   https://docs.google.com/spreadsheets/d/ESTE_É_O_ID/edit
   ```
5. Cole o ID no `.env`:
   ```
   GOOGLE_SHEETS_ID=ESTE_É_O_ID
   ```

---

### 2.4 Compartilhar a Planilha com a Conta de Serviço

1. Abra o arquivo JSON de credenciais e copie o valor do campo `"client_email"`:
   ```json
   "client_email": "finance-bot-service@finance-bot-xxxxx.iam.gserviceaccount.com"
   ```
2. Na planilha, clique em **"Compartilhar"**
3. Cole o `client_email` no campo de destinatário
4. Defina a permissão como **"Editor"**
5. Desmarque "Notificar pessoas" e confirme

> Sem este passo, o `gspread` receberá erro 403 ao tentar acessar a planilha.

---

## Implementação do `bot/sheets.py`

Este módulo é a única parte do sistema que **escreve** na planilha. A API FastAPI usará uma cópia equivalente de leitura na Fase 4.

### Estrutura do módulo

```python
import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive",
]

def _get_sheet():
    creds = Credentials.from_service_account_file(
        os.getenv("GOOGLE_CREDENTIALS_PATH"), scopes=SCOPES
    )
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(os.getenv("GOOGLE_SHEETS_ID"))
    return spreadsheet.worksheet("transacoes")


def get_next_id(sheet) -> int:
    # Retorna o próximo id sequencial baseado na última linha preenchida
    values = sheet.col_values(1)  # coluna 'id'
    if len(values) <= 1:
        return 1
    return int(values[-1]) + 1


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
    # Busca a linha pelo id (coluna A)
    cell = sheet.find(str(transaction_id), in_column=1)
    if cell is None:
        return False
    # Coluna H é o status (índice 8)
    sheet.update_cell(cell.row, 8, "cancelado")
    return True


def get_all_transactions() -> list[dict]:
    sheet = _get_sheet()
    records = sheet.get_all_records()
    return [r for r in records if r.get("status") != "cancelado"]
```

### Responsabilidades de cada função

| Função | Responsabilidade |
|---|---|
| `_get_sheet()` | Abre conexão com o Sheets e retorna a aba `transacoes`. Uso interno. |
| `get_next_id(sheet)` | Lê a coluna `id` e retorna o próximo valor sequencial. |
| `append_transaction(transaction)` | Grava uma nova linha na planilha e retorna o `id` gerado. |
| `cancel_transaction(transaction_id)` | Localiza a linha pelo `id` e muda o `status` para `"cancelado"`. |
| `get_all_transactions()` | Retorna todas as linhas com `status != "cancelado"` como lista de dicts. |

---

## Script de Validação

Criar o arquivo `bot/test_sheets.py` temporariamente para validar a integração antes de avançar para o bot.

```python
# Arquivo temporário de validação — remover após a Fase 2
from sheets import append_transaction, cancel_transaction, get_all_transactions

# 1. Gravar uma transação de teste
transaction = {
    "data": "15/06/2026",
    "hora": "10:00",
    "tipo": "saída",
    "valor": 99.90,
    "descricao": "teste fase 2",
    "categoria": "",
    "status": "ativo",
}
new_id = append_transaction(transaction)
print(f"Transação gravada com id={new_id}")

# 2. Listar todas as transações ativas
all_transactions = get_all_transactions()
print(f"Total de transações ativas: {len(all_transactions)}")
print(all_transactions[-1])

# 3. Cancelar a transação recém-criada
success = cancel_transaction(new_id)
print(f"Cancelamento bem-sucedido: {success}")

# 4. Confirmar que sumiu da listagem ativa
all_transactions = get_all_transactions()
ids_ativos = [t["id"] for t in all_transactions]
print(f"id={new_id} ainda aparece na listagem ativa: {new_id in ids_ativos}")
```

Para executar (dentro da pasta `bot/`):
```bash
cd bot
python test_sheets.py
```

**Saída esperada:**
```
Transação gravada com id=1
Total de transações ativas: 1
{'id': 1, 'data': '15/06/2026', 'hora': '10:00', 'tipo': 'saída', 'valor': 99.9, 'descricao': 'teste fase 2', 'categoria': '', 'status': 'ativo'}
Cancelamento bem-sucedido: True
id=1 ainda aparece na listagem ativa: False
```

---

## Estrutura de Dados da Planilha

### Aba `transacoes` — cabeçalho (linha 1, imutável)

| Coluna | Header | Tipo | Exemplo |
|---|---|---|---|
| A | `id` | Inteiro sequencial | `1` |
| B | `data` | String `DD/MM/AAAA` | `15/06/2026` |
| C | `hora` | String `HH:MM` | `14:32` |
| D | `tipo` | `entrada` ou `saída` | `saída` |
| E | `valor` | Número decimal | `50.00` |
| F | `descricao` | Texto livre | `mercado` |
| G | `categoria` | String (vazio na V1.0) | `` |
| H | `status` | `ativo` ou `cancelado` | `ativo` |

### Regras invariáveis

- A **linha 1** é sempre o cabeçalho — nunca sobrescrita pelo código
- O `id` é sequencial e nunca reutilizado, mesmo após cancelamentos
- Registros com `status = cancelado` são preservados na planilha para auditoria
- Nenhuma linha é deletada fisicamente — apenas o `status` muda

---

## Validação da Fase 2

Ao final, verificar cada item:

- [ ] Projeto criado no Google Cloud com as APIs Sheets e Drive ativadas
- [ ] Conta de serviço criada e arquivo JSON salvo em `credentials/google-credentials.json`
- [ ] Planilha criada com a aba `transacoes` e cabeçalhos corretos na linha 1
- [ ] `GOOGLE_SHEETS_ID` preenchido no `.env`
- [ ] Planilha compartilhada com o `client_email` da conta de serviço como Editor
- [ ] `bot/sheets.py` implementado com as quatro funções
- [ ] Script de validação `bot/test_sheets.py` executado com saída esperada
- [ ] Transação de teste aparece na planilha com `status = cancelado` após o teste
- [ ] `bot/test_sheets.py` removido após validação

---

## O que Esta Fase Não Faz

- Não cria o bot no Telegram
- Não implementa o parser de mensagens
- Não cria nenhum endpoint da API
- Não trata erros de rede ou autenticação (tratamento de erros vem nas fases seguintes)

Tudo isso começa na Fase 3.
