# Fase 09 — Importação de Fatura via PDF

---

## Objetivo

Adicionar ao painel um fluxo de importação de fatura de cartão de crédito em PDF. O usuário faz upload do arquivo, a API extrai os lançamentos, usa o Gemini para interpretar e padronizar as descrições, e exibe uma tela de revisão antes de confirmar a gravação na planilha. Itens que a IA não conseguir identificar ficam com descrição `"pendente"` para preenchimento manual.

---

## Pré-requisitos

- Fase 4 concluída (API FastAPI com endpoints de leitura e escrita)
- Fase 8 concluída (`google-genai` já instalado e `GEMINI_API_KEY` no `.env`)
- Bot Telegram funcionando (a gravação final reutiliza `bot/sheets.py`)

---

## Fluxo completo

```
Usuário faz upload do PDF
        ↓
API extrai texto bruto do PDF (pdfplumber)
        ↓
Gemini interpreta os lançamentos → lista de itens com valor + descrição padronizada
        ↓
API retorna lista de itens ao frontend (status: "pendente" para itens não identificados)
        ↓
Usuário revisa, edita descrições pendentes e remove itens indesejados
        ↓
Usuário confirma → API grava cada item na planilha como transação do tipo "saída"
```

---

## Estrutura de arquivos criados/modificados

```
api/
├── routes/
│   └── pdf_import.py       ← novo
frontend/src/
├── pages/
│   └── PdfImport.jsx       ← novo
├── components/
│   └── ImportModal.jsx     ← já existe (reutilizado/adaptado)
├── services/
│   └── api.js              ← adicionar uploadPdf + confirmImport
```

---

## Passo a passo — Backend

### 1. Instalar dependência

```bash
pip install pdfplumber
```

Adicionar ao `requirements.txt`:

```
pdfplumber>=0.10.0
```

### 2. Criar `api/routes/pdf_import.py`

```python
import os
import io
import json
import pdfplumber
from google import genai
from fastapi import APIRouter, UploadFile, File, HTTPException, Body
from datetime import datetime

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from sheets import get_active_transactions, append_transaction

router = APIRouter()


def _extract_text(file_bytes: bytes) -> str:
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                text_parts.append(text)
    return "\n".join(text_parts)


def _parse_with_gemini(raw_text: str, api_key: str) -> list[dict]:
    client = genai.Client(api_key=api_key)

    prompt = f"""Você é um assistente financeiro. Analise o texto abaixo extraído de uma fatura de cartão de crédito e extraia todos os lançamentos de compra.

Para cada lançamento retorne um objeto JSON com:
- "descricao": nome padronizado e legível do estabelecimento/serviço (ex: "Mercado", "Gasolina", "Netflix", "Farmácia", "Restaurante"). Use substantivo simples em português. Se não for possível identificar, use "pendente".
- "valor": valor numérico em reais (apenas números, sem R$ ou vírgula — use ponto decimal). Exemplo: 149.90
- "data": data no formato DD/MM/AAAA se encontrada na linha, caso contrário null.
- "original": texto original da linha da fatura, exatamente como aparece no PDF.

Retorne APENAS um array JSON válido, sem markdown, sem explicações, sem texto antes ou depois.

Texto da fatura:
\"\"\"
{raw_text[:8000]}
\"\"\"
"""

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=prompt,
    )

    raw = response.text.strip()
    # remove blocos markdown se o modelo os incluir
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]

    try:
        items = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Gemini retornou resposta inválida. Tente novamente.")

    return items


@router.post("/pdf/extract")
async def pdf_extract(file: UploadFile = File(...)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada no .env")

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Apenas arquivos .pdf são aceitos")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:  # 10 MB
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Limite: 10 MB")

    try:
        raw_text = _extract_text(content)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Erro ao ler o PDF: {str(e)}")

    if not raw_text.strip():
        raise HTTPException(status_code=422, detail="PDF sem texto extraível. Pode ser uma imagem escaneada.")

    items = _parse_with_gemini(raw_text, api_key)

    # garante campos obrigatórios e id temporário para o frontend
    now = datetime.now().strftime("%m/%Y")
    result = []
    for i, item in enumerate(items):
        result.append({
            "tmp_id": i,
            "descricao": str(item.get("descricao") or "pendente").strip() or "pendente",
            "valor": float(item.get("valor") or 0),
            "data": item.get("data") or datetime.now().strftime("%d/%m/%Y"),
            "original": str(item.get("original") or ""),
            "pendente": str(item.get("descricao") or "").strip().lower() == "pendente",
        })

    return {"items": result, "total": len(result), "periodo": now}


@router.post("/pdf/confirm")
def pdf_confirm(items: list = Body(...)):
    """
    Recebe a lista revisada pelo usuário e grava cada item na planilha.
    Cada item deve ter: descricao, valor, data.
    """
    if not items:
        raise HTTPException(status_code=400, detail="Nenhum item para importar")

    saved = 0
    errors = []
    for item in items:
        try:
            append_transaction(
                tipo="saída",
                valor=float(item["valor"]),
                descricao=str(item["descricao"]).strip(),
                data=str(item["data"]),
            )
            saved += 1
        except Exception as e:
            errors.append({"item": item.get("descricao"), "erro": str(e)})

    return {"salvos": saved, "erros": errors}
```

### 3. Expor `append_transaction` na API

O módulo `bot/sheets.py` já tem `append_transaction`. A API precisa importá-lo. Criar `api/sheets_write.py` que reutiliza a função do bot:

```python
import os, sys
from dotenv import load_dotenv

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))
sys.path.insert(0, os.path.join(_ROOT, "bot"))

from sheets import append_transaction  # noqa: F401
```

E no `api/routes/pdf_import.py`, substituir o import:

```python
from sheets_write import append_transaction
```

### 4. Registrar o router em `api/main.py`

```python
from routes.pdf_import import router as pdf_import_router
app.include_router(pdf_import_router)
```

Adicionar `"POST"` e `"PUT"` ao `allow_methods` do CORS (já feito na Fase 8 para `POST`).

### Resposta de `POST /pdf/extract`

```json
{
  "items": [
    {
      "tmp_id": 0,
      "descricao": "Mercado",
      "valor": 320.50,
      "data": "05/06/2026",
      "original": "SUPERMERCADO EXTRA         05/06  320,50",
      "pendente": false
    },
    {
      "tmp_id": 1,
      "descricao": "pendente",
      "valor": 89.00,
      "data": "07/06/2026",
      "original": "XPTO SERV 7482             07/06   89,00",
      "pendente": true
    }
  ],
  "total": 2,
  "periodo": "06/2026"
}
```

### Resposta de `POST /pdf/confirm`

```json
{ "salvos": 2, "erros": [] }
```

---

## Passo a passo — Frontend

### 1. Tela `frontend/src/pages/PdfImport.jsx`

Estrutura em três etapas controladas por estado:

**Etapa 1 — Upload**
- Área de drag-and-drop ou botão "Escolher PDF"
- Validação: apenas `.pdf`, máx 10 MB
- Ao selecionar: exibe nome do arquivo + botão "Extrair Lançamentos"
- Dispara `POST /pdf/extract` com `multipart/form-data`

**Etapa 2 — Revisão**
- Tabela editável com os itens retornados
- Colunas: Descrição (input editável) · Valor · Data · Texto original (colapsável)
- Linhas com `pendente: true` destacadas em amarelo com ícone de alerta
- Botão "×" para remover linha individual
- Contador: "X lançamentos · Y pendentes"
- Botão "Confirmar Importação" (desabilitado se ainda houver itens `pendente`)
- Botão "Cancelar" volta à etapa 1

**Etapa 3 — Confirmação**
- Exibe: "X lançamentos importados com sucesso"
- Lista eventuais erros
- Botão "Importar outro PDF" reinicia o fluxo
- Botão "Ver Transações" navega para `/transactions`

### 2. Adicionar rota em `frontend/src/App.jsx`

```jsx
import PdfImport from "./pages/PdfImport"

<Route path="/pdf" element={<PdfImport />} />
```

### 3. Adicionar funções em `frontend/src/services/api.js`

```js
export const uploadPdf = (file) => {
  const form = new FormData()
  form.append('file', file)
  return fetch(`${BASE}/pdf/extract`, { method: 'POST', body: form }).then(json)
}

export const confirmImport = (items) =>
  fetch(`${BASE}/pdf/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(items),
  }).then(json)
```

### 4. Adicionar item de navegação no Sidebar

```jsx
<NavLink to="/pdf">Importar PDF</NavLink>
```

---

## Critérios de validação — Backend

- [ ] `POST /pdf/extract` com PDF válido retorna lista de itens com `descricao`, `valor`, `data`
- [ ] Itens não identificados retornam `descricao: "pendente"` e `pendente: true`
- [ ] Upload de arquivo não-PDF retorna HTTP 400
- [ ] PDF sem texto extraível retorna HTTP 422 com mensagem clara
- [ ] `POST /pdf/confirm` grava os itens na planilha e retorna `salvos: N`
- [ ] `GEMINI_API_KEY` ausente retorna HTTP 500

## Critérios de validação — Frontend

- [ ] Drag-and-drop e seleção via botão funcionam
- [ ] Itens pendentes ficam destacados e o botão "Confirmar" fica desabilitado enquanto houver pendentes
- [ ] Editar a descrição de um item pendente remove o destaque e habilita a confirmação
- [ ] Remover uma linha a exclui da lista antes da confirmação
- [ ] Após confirmar, exibe contagem correta de itens salvos
- [ ] Erros de gravação individual são exibidos sem bloquear os demais itens

---

## Observações

- PDFs escaneados (imagens) não têm texto extraível com `pdfplumber` — a mensagem de erro orienta o usuário. Suporte a OCR não está no escopo desta fase.
- O Gemini pode interpretar lançamentos em moeda estrangeira como dólares; nesta fase não há conversão — o valor é importado como está na fatura.
- `append_transaction` é chamado diretamente da API para gravar na planilha, sem passar pelo bot do Telegram — ambos usam `gspread` com a mesma credencial.
- Cada chamada a `POST /pdf/extract` consome tokens do Gemini; PDFs muito grandes são truncados em 8 000 caracteres de texto bruto para controlar custo.
