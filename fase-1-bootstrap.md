# Fase 1 — Bootstrap do Projeto

---

## Objetivo

Criar a estrutura completa de pastas e arquivos base do projeto. Ao final desta fase, nenhuma funcionalidade estará implementada, mas toda a fundação estará pronta para as fases seguintes.

---

## Estrutura de Pastas a Criar

```
finance-bot/
├── bot/
│   ├── main.py
│   ├── handlers.py
│   ├── sheets.py
│   └── parser.py
│
├── api/
│   ├── main.py
│   └── routes/
│       ├── transactions.py
│       ├── summary.py
│       └── history.py
│
├── frontend/
│   └── (gerado pelo Vite na Fase 5)
│
├── credentials/
│   └── .gitkeep
│
├── .env
├── .env.example
├── .gitignore
├── requirements.txt
├── start.sh
└── README.md
```

---

## Arquivos e Conteúdo

### `.env`
Arquivo com as variáveis reais. Nunca versionado.
```
TELEGRAM_BOT_TOKEN=seu_token_aqui
TELEGRAM_CHAT_ID=seu_chat_id_aqui
GOOGLE_SHEETS_ID=seu_sheets_id_aqui
GOOGLE_CREDENTIALS_PATH=./credentials/google-credentials.json
API_PORT=8000
```

### `.env.example`
Modelo público do `.env`. Versionado no repositório como referência.
```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
GOOGLE_SHEETS_ID=
GOOGLE_CREDENTIALS_PATH=./credentials/google-credentials.json
API_PORT=8000
```

### `.gitignore`
```
.env
credentials/google-credentials.json
__pycache__/
*.pyc
.venv/
node_modules/
dist/
.DS_Store
```

### `requirements.txt`
```
python-telegram-bot==20.7
gspread==6.0.0
google-auth==2.27.0
fastapi==0.109.0
uvicorn==0.27.0
python-dotenv==1.0.0
```

### `start.sh`
```bash
#!/bin/bash

echo "Iniciando bot Telegram..."
cd bot && python main.py &
BOT_PID=$!

echo "Iniciando API FastAPI..."
cd ../api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "Iniciando frontend React..."
cd ../frontend && npm run dev

kill $BOT_PID
kill $API_PID
```

### `README.md`
```markdown
# Finance Bot

Controle de finanças pessoais via Telegram + Google Sheets + Painel Web.

## Pré-requisitos
- Python 3.11+
- Node.js 18+
- Conta Google com acesso ao Google Sheets API
- Bot criado no Telegram via @BotFather

## Configuração inicial
1. Copie `.env.example` para `.env` e preencha as variáveis
2. Coloque o arquivo de credenciais do Google em `credentials/google-credentials.json`
3. Instale as dependências Python: `pip install -r requirements.txt`
4. Instale as dependências do frontend: `cd frontend && npm install`

## Execução
\`\`\`bash
chmod +x start.sh
./start.sh
\`\`\`
```

---

### `bot/main.py`
```python
# Ponto de entrada do bot Telegram
# Inicializa a aplicação e registra os handlers
# Implementado na Fase 3

if __name__ == "__main__":
    print("Bot ainda não implementado. Ver Fase 3.")
```

### `bot/handlers.py`
```python
# Handlers de mensagens do Telegram
# Recebe as mensagens, chama o parser e grava no Sheets
# Implementado na Fase 3
```

### `bot/parser.py`
```python
# Parser de mensagens do usuário
# Extrai valor, tipo e descrição do texto recebido
# Implementado na Fase 3
```

### `bot/sheets.py`
```python
# Integração do bot com o Google Sheets
# Responsável por gravar e atualizar transações
# Implementado na Fase 2
```

---

### `api/main.py`
```python
# Ponto de entrada da API FastAPI
# Registra os routers e configura o CORS
# Implementado na Fase 4

if __name__ == "__main__":
    print("API ainda não implementada. Ver Fase 4.")
```

### `api/routes/transactions.py`
```python
# Endpoints de transações
# GET /transactions, PATCH /transactions/{id}, DELETE /transactions/{id}
# Implementado na Fase 4
```

### `api/routes/summary.py`
```python
# Endpoint de resumo mensal
# GET /summary
# Implementado na Fase 4
```

### `api/routes/history.py`
```python
# Endpoint de histórico mês a mês
# GET /history
# Implementado na Fase 4
```

---

### `credentials/.gitkeep`
Arquivo vazio que força o Git a versionar a pasta `credentials/` sem expor seu conteúdo real. O arquivo `google-credentials.json` ficará aqui mas nunca será versionado.

---

## Validação da Fase 1

Ao final, verificar cada item:

- [ ] Toda a estrutura de pastas existe conforme o diagrama
- [ ] `.env` criado e preenchido com as variáveis (valores podem ser fictícios por ora)
- [ ] `.env.example` criado e versionável
- [ ] `.gitignore` impedindo que `.env` e `credentials/google-credentials.json` sejam versionados
- [ ] `requirements.txt` com todas as dependências e versões fixadas
- [ ] `start.sh` criado com permissão de execução (`chmod +x start.sh`)
- [ ] Todos os arquivos `.py` existem com seus comentários descritivos
- [ ] `credentials/` existe e contém apenas o `.gitkeep`
- [ ] `README.md` criado com instruções básicas

---

## O que Esta Fase Não Faz

- Não instala nenhuma dependência
- Não cria o bot no Telegram
- Não configura o Google Sheets
- Não escreve nenhuma lógica funcional

Tudo isso começa na Fase 2.
