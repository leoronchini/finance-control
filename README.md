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
```bash
chmod +x start.sh
./start.sh
```
