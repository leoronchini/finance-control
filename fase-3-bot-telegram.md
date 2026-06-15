# Fase 3 — Bot Telegram

---

## Objetivo

Implementar o bot do Telegram com parser de mensagens, gravação no Google Sheets e resposta de confirmação. Ao final desta fase, será possível enviar uma mensagem no Telegram e ver a transação aparecer na planilha em tempo real, além de desfazê-la com o comando `cancelar`.

---

## Pré-requisitos

- Fase 2 concluída (`bot/sheets.py` funcionando)
- Bot criado no Telegram via [@BotFather](https://t.me/BotFather) com o token salvo no `.env`
- `TELEGRAM_CHAT_ID` preenchido no `.env` (instruções abaixo)

---

## Obtendo o TELEGRAM_CHAT_ID

O `TELEGRAM_CHAT_ID` garante que o bot processe mensagens **apenas do dono** — qualquer outra pessoa que encontre o bot será ignorada silenciosamente.

1. Inicie uma conversa com seu bot no Telegram (envie qualquer mensagem)
2. Acesse no navegador:
   ```
   https://api.telegram.org/bot<SEU_TOKEN>/getUpdates
   ```
3. No JSON retornado, localize o campo:
   ```json
   "chat": { "id": 123456789 }
   ```
4. Cole esse número no `.env`:
   ```
   TELEGRAM_CHAT_ID=123456789
   ```

---

## Implementação

### `bot/parser.py`

Recebe o texto cru da mensagem e retorna um dicionário estruturado ou lança `ValueError` com a mensagem de erro a ser enviada ao usuário.

**Regras de interpretação:**

| Padrão da mensagem | Tipo detectado | Exemplo |
|---|---|---|
| `[valor] [descrição]` | `saída` | `50 mercado` |
| `[valor] reais [descrição]` | `saída` | `50 reais mercado` |
| `entrada [valor] [descrição]` | `entrada` | `entrada 1500 salário` |
| `saída [valor] [descrição]` | `saída` | `saída 200 farmácia` |

```python
import re
from datetime import datetime


def parse_message(text: str) -> dict:
    text = text.strip()
    tipo = "saída"

    # Detecta prefixo de tipo explícito
    lower = text.lower()
    if lower.startswith("entrada "):
        tipo = "entrada"
        text = text[len("entrada "):].strip()
    elif lower.startswith("saída ") or lower.startswith("saida "):
        tipo = "saída"
        text = re.sub(r"^sa[íi]da\s+", "", text, flags=re.IGNORECASE).strip()

    # Remove a palavra "reais" se presente após o valor
    text = re.sub(r"^(\d[\d.,]*)\s+reais\s+", r"\1 ", text, flags=re.IGNORECASE)

    # Extrai valor numérico no início da string
    match = re.match(r"^(\d[\d.,]*)\s+(.*)", text)
    if not match:
        raise ValueError("❌ Não entendi o valor. Exemplo: 50 mercado")

    raw_value, descricao = match.group(1), match.group(2).strip()

    # Normaliza separador decimal (vírgula → ponto)
    raw_value = raw_value.replace(",", ".")
    try:
        valor = float(raw_value)
    except ValueError:
        raise ValueError("❌ Não entendi o valor. Exemplo: 50 mercado")

    if valor <= 0:
        raise ValueError("❌ O valor precisa ser maior que zero")

    if not descricao:
        raise ValueError("❌ Adicione uma descrição. Exemplo: 50 mercado")

    now = datetime.now()
    return {
        "valor": valor,
        "tipo": tipo,
        "descricao": descricao,
        "data": now.strftime("%d/%m/%Y"),
        "hora": now.strftime("%H:%M"),
        "categoria": "",
        "status": "ativo",
    }
```

---

### `bot/handlers.py`

Contém os dois handlers registrados no bot: um para mensagens de texto comuns (transações) e um para o comando cancelar.

```python
from telegram import Update
from telegram.ext import ContextTypes
from parser import parse_message
from sheets import append_transaction, cancel_transaction

# Guarda o id da última transação gravada por chat_id
_last_id: dict[int, int] = {}


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id

    try:
        transaction = parse_message(update.message.text)
    except ValueError as e:
        await update.message.reply_text(str(e))
        return

    new_id = append_transaction(transaction)
    _last_id[chat_id] = new_id

    emoji = "💰" if transaction["tipo"] == "entrada" else "💸"
    await update.message.reply_text(
        f"{emoji} *{transaction['tipo'].capitalize()}* registrada!\n"
        f"Valor: R$ {transaction['valor']:.2f}\n"
        f"Descrição: {transaction['descricao']}\n"
        f"Data: {transaction['data']} às {transaction['hora']}",
        parse_mode="Markdown",
    )


async def handle_cancel(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    last_id = _last_id.get(chat_id)

    if last_id is None:
        await update.message.reply_text("⚠️ Nenhum registro recente para desfazer.")
        return

    success = cancel_transaction(last_id)
    if success:
        _last_id.pop(chat_id, None)
        await update.message.reply_text("↩️ Último registro desfeito.")
    else:
        await update.message.reply_text("⚠️ Não foi possível desfazer. Registro não encontrado.")
```

---

### `bot/main.py`

Ponto de entrada. Inicializa a aplicação, valida o `TELEGRAM_CHAT_ID` em todos os updates e registra os handlers.

```python
import os
import logging
from dotenv import load_dotenv
from telegram import Update
from telegram.ext import ApplicationBuilder, MessageHandler, filters, ContextTypes

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

from handlers import handle_message, handle_cancel

ALLOWED_CHAT_ID = int(os.getenv("TELEGRAM_CHAT_ID"))


async def auth_filter(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Rejeita silenciosamente qualquer mensagem fora do chat autorizado."""
    return update.effective_chat.id == ALLOWED_CHAT_ID


def main():
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    app = ApplicationBuilder().token(token).build()

    cancel_keywords = filters.Regex(r"^(cancelar|desfazer)$")
    auth = filters.ChatType.PRIVATE & filters.User(user_id=ALLOWED_CHAT_ID)

    app.add_handler(MessageHandler(auth & cancel_keywords, handle_cancel))
    app.add_handler(MessageHandler(auth & filters.TEXT & ~filters.COMMAND, handle_message))

    logging.info("Bot iniciado. Aguardando mensagens...")
    app.run_polling()


if __name__ == "__main__":
    main()
```

> O filtro `filters.User(user_id=ALLOWED_CHAT_ID)` garante que apenas o dono do bot consiga interagir — nenhum código extra de validação é necessário nos handlers.

---

## Fluxo Completo de uma Mensagem

```
Usuário envia "50 mercado"
        ↓
main.py recebe o Update via polling
        ↓
Filtro de autenticação verifica chat_id
        ↓
handle_message() chama parse_message("50 mercado")
        ↓
parser retorna { valor: 50.0, tipo: "saída", descricao: "mercado", ... }
        ↓
append_transaction() grava na planilha e retorna id=2
        ↓
_last_id[chat_id] = 2
        ↓
Bot responde: "💸 Saída registrada! Valor: R$ 50.00 ..."
```

```
Usuário envia "cancelar"
        ↓
handle_cancel() lê _last_id[chat_id] = 2
        ↓
cancel_transaction(2) muda status para "cancelado" no Sheets
        ↓
Bot responde: "↩️ Último registro desfeito."
```

---

## Validação da Fase 3

### Testes manuais no Telegram

Enviar cada mensagem abaixo e verificar a resposta esperada:

| Mensagem enviada | Resposta esperada | Planilha |
|---|---|---|
| `50 mercado` | `💸 Saída registrada! Valor: R$ 50.00 ...` | Nova linha com tipo=saída |
| `entrada 1500 salário` | `💰 Entrada registrada! Valor: R$ 1500.00 ...` | Nova linha com tipo=entrada |
| `30 reais farmácia` | `💸 Saída registrada! Valor: R$ 30.00 ...` | Nova linha com tipo=saída |
| `saída 200 aluguel` | `💸 Saída registrada! Valor: R$ 200.00 ...` | Nova linha com tipo=saída |
| `cancelar` | `↩️ Último registro desfeito.` | status da última linha → cancelado |
| `cancelar` (sem registro recente) | `⚠️ Nenhum registro recente para desfazer.` | Sem alteração |
| `mercado` (sem valor) | `❌ Não entendi o valor. Exemplo: 50 mercado` | Sem alteração |
| `50` (sem descrição) | `❌ Adicione uma descrição. Exemplo: 50 mercado` | Sem alteração |
| `-10 mercado` | `❌ O valor precisa ser maior que zero` | Sem alteração |

### Checklist final

- [ ] `TELEGRAM_BOT_TOKEN` e `TELEGRAM_CHAT_ID` preenchidos no `.env`
- [ ] `bot/parser.py` implementado
- [ ] `bot/handlers.py` implementado
- [ ] `bot/main.py` implementado
- [ ] Bot iniciado com `python bot/main.py` sem erros
- [ ] Todos os casos da tabela de testes validados manualmente
- [ ] Mensagens de outro usuário/chat são ignoradas silenciosamente

---

## Executando o Bot

```bash
cd bot
python main.py
```

O terminal exibirá:
```
INFO - Bot iniciado. Aguardando mensagens...
```

Para encerrar: `Ctrl+C`

---

## O que Esta Fase Não Faz

- Não cria nenhum endpoint da API
- Não implementa o frontend
- O comando `cancelar` só funciona dentro da mesma sessão do processo — reiniciar o bot limpa o `_last_id` em memória (comportamento esperado na V1.0)

Tudo isso começa na Fase 4.
