# Fase 11 — Hospedagem em Nuvem

---

## Objetivo

Migrar o bot do modo polling para webhook e publicar todos os serviços em plataformas gratuitas de nuvem, garantindo que o bot processe mensagens do Telegram 24h por dia independente do computador do usuário estar ligado.

---

## Pré-requisitos

- Fase 3 concluída (bot Telegram funcionando em modo polling)
- Fase 4 concluída (API FastAPI com todos os endpoints)
- Fase 5 concluída (frontend React buildável via `npm run build`)
- Repositório no GitHub com o código atualizado
- Conta criada no [Render](https://render.com) e na [Vercel](https://vercel.com)

---

## Arquitetura após a fase

```
Telegram → HTTPS → Render (bot + API) → Google Sheets
                         ↑
                    Vercel (frontend) → Render (API)
```

- **Render (free):** roda o bot em modo webhook + a API FastAPI no mesmo processo
- **Vercel (free):** serve o frontend React como site estático
- **Google Sheets:** continua como banco de dados, sem alterações

---

## Por que webhook em vez de polling

No modo polling o bot fica perguntando ao Telegram "tem mensagem nova?" em loop. Isso exige que o processo esteja sempre rodando. O Render free tier dorme após 15 minutos de inatividade, o que causaria perda de mensagens.

No modo webhook o Telegram empurra a mensagem para uma URL HTTPS assim que ela chega. O Render acorda em ~30 segundos para processar. O Telegram retenta a entrega por até 24 horas em caso de falha, então nenhuma mensagem é perdida mesmo com cold start.

---

## Parte 1 — Migração do bot para webhook

### 1.1 — Unificar bot e API no mesmo processo

Atualmente o bot roda em `bot/main.py` com `app.run_polling()` e a API roda separada em `api/main.py`. Na nuvem, o Render sobe apenas um processo. A solução é registrar um endpoint `/webhook` na FastAPI e deixar o bot responder a ele.

Criar `api/webhook.py`:

```python
from telegram import Update
from telegram.ext import Application
from fastapi import Request
import os

_telegram_app: Application | None = None

async def get_telegram_app() -> Application:
    global _telegram_app
    if _telegram_app is None:
        token = os.environ["TELEGRAM_BOT_TOKEN"]
        # importa os handlers do módulo bot/
        from bot.handlers import handle_message, handle_cancel
        from bot.main import build_application
        _telegram_app = await build_application(token)
        await _telegram_app.initialize()
    return _telegram_app

async def handle_webhook(request: Request):
    app = await get_telegram_app()
    data = await request.json()
    update = Update.de_json(data, app.bot)
    await app.process_update(update)
    return {"ok": True}
```

Registrar a rota em `api/main.py`:

```python
from api.webhook import handle_webhook

fastapi_app.add_api_route("/webhook", handle_webhook, methods=["POST"])
```

### 1.2 — Refatorar `bot/main.py`

Extrair a construção do `Application` para uma função reutilizável e remover o `run_polling()` do fluxo principal:

```python
async def build_application(token: str) -> Application:
    auth = filters.ChatType.PRIVATE & filters.User(user_id=ALLOWED_CHAT_ID)
    app = ApplicationBuilder().token(token).build()
    app.add_handler(MessageHandler(auth & filters.TEXT, handle_message))
    app.add_handler(MessageHandler(auth & filters.COMMAND, handle_cancel))
    return app

if __name__ == "__main__":
    # mantém o modo polling para desenvolvimento local
    import asyncio
    async def main():
        app = await build_application(os.environ["TELEGRAM_BOT_TOKEN"])
        await app.run_polling()
    asyncio.run(main())
```

### 1.3 — Registrar o webhook no Telegram

Após o deploy no Render, executar uma vez via terminal ou script:

```bash
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://<seu-app>.onrender.com/webhook"
```

Verificar se foi registrado:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

---

## Parte 2 — Deploy no Render (bot + API)

### 2.1 — Criar `render.yaml` na raiz do projeto

```yaml
services:
  - type: web
    name: finance-control-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn api.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: TELEGRAM_CHAT_ID
        sync: false
      - key: GOOGLE_SHEETS_ID
        sync: false
      - key: GOOGLE_CREDENTIALS_JSON
        sync: false
      - key: GEMINI_API_KEY
        sync: false
```

### 2.2 — Adaptar leitura de credenciais Google

Na nuvem não existe o arquivo `credentials/google-credentials.json`. A credencial será passada como variável de ambiente em formato JSON string.

Alterar `bot/sheets.py` e `api/sheets.py` para ler a credencial de duas formas:

```python
import json, os, gspread
from google.oauth2.service_account import Credentials

def _get_client() -> gspread.Client:
    scopes = ["https://spreadsheets.google.com/feeds",
              "https://www.googleapis.com/auth/drive"]
    json_str = os.environ.get("GOOGLE_CREDENTIALS_JSON")
    if json_str:
        info = json.loads(json_str)
        creds = Credentials.from_service_account_info(info, scopes=scopes)
    else:
        path = os.environ.get("GOOGLE_CREDENTIALS_PATH",
                              "./credentials/google-credentials.json")
        creds = Credentials.from_service_account_file(path, scopes=scopes)
    return gspread.authorize(creds)
```

Localmente continua usando o arquivo. Na nuvem usa a variável `GOOGLE_CREDENTIALS_JSON`.

### 2.3 — Passos no painel do Render

1. Criar novo **Web Service** conectando o repositório GitHub
2. Runtime: **Python 3**
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
5. Adicionar as variáveis de ambiente:
   - `TELEGRAM_BOT_TOKEN`
   - `TELEGRAM_CHAT_ID`
   - `GOOGLE_SHEETS_ID`
   - `GOOGLE_CREDENTIALS_JSON` — colar o conteúdo do `google-credentials.json` como string JSON
   - `GEMINI_API_KEY`
6. Fazer o deploy e copiar a URL gerada (ex: `https://finance-control-api.onrender.com`)
7. Registrar o webhook conforme item 1.3

---

## Parte 3 — Deploy na Vercel (frontend)

### 3.1 — Variável de ambiente do frontend

O frontend precisa apontar para a URL da API no Render em vez de `localhost:8000`. Criar `.env.production` no `frontend/`:

```
VITE_API_URL=https://finance-control-api.onrender.com
```

Garantir que todas as chamadas fetch no frontend usem `import.meta.env.VITE_API_URL` em vez de URL fixa.

### 3.2 — Passos no painel da Vercel

1. Criar novo projeto conectando o repositório GitHub
2. Framework Preset: **Vite**
3. Root Directory: `frontend`
4. Build command: `npm run build`
5. Output directory: `dist`
6. Adicionar variável de ambiente:
   - `VITE_API_URL` = URL do Render
7. Fazer o deploy

### 3.3 — CORS na API

Adicionar a URL da Vercel nas origens permitidas em `api/main.py`:

```python
origins = [
    "http://localhost:5173",
    "https://<seu-projeto>.vercel.app",
]
```

---

## Parte 4 — Desenvolvimento local após a fase

O fluxo local não muda. O bot ainda pode rodar em modo polling via `python bot/main.py` apontando para o `.env` local. A API roda via `uvicorn` normalmente. O frontend roda via `npm run dev`.

O arquivo `.env` local continua com `GOOGLE_CREDENTIALS_PATH` apontando para o arquivo. Apenas na nuvem usa-se `GOOGLE_CREDENTIALS_JSON`.

---

## Checklist de conclusão

- [ ] `bot/main.py` refatorado com `build_application()` separado do polling
- [ ] Endpoint `POST /webhook` registrado na FastAPI
- [ ] `bot/sheets.py` e `api/sheets.py` aceitam credencial via variável de ambiente
- [ ] `render.yaml` criado na raiz
- [ ] Deploy no Render funcionando (logs sem erro)
- [ ] Webhook registrado no Telegram e confirmado via `getWebhookInfo`
- [ ] Mensagem de teste enviada e processada com computador fora do ar
- [ ] `.env.production` criado no frontend com URL do Render
- [ ] Deploy na Vercel funcionando
- [ ] CORS atualizado com URL da Vercel
- [ ] Frontend acessa a API na nuvem corretamente

---

## Variáveis de ambiente — resumo final

| Variável | Local (`.env`) | Render | Vercel |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | ✅ | — |
| `TELEGRAM_CHAT_ID` | ✅ | ✅ | — |
| `GOOGLE_SHEETS_ID` | ✅ | ✅ | — |
| `GOOGLE_CREDENTIALS_PATH` | ✅ | — | — |
| `GOOGLE_CREDENTIALS_JSON` | — | ✅ | — |
| `GEMINI_API_KEY` | ✅ | ✅ | — |
| `VITE_API_URL` | — | — | ✅ |
