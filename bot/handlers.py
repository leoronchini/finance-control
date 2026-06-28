from telegram import Update
from telegram.ext import ContextTypes
from bot.parser import parse_message
from api.transactions_store import append_transaction, cancel_transaction

# Guarda o id da última transação gravada por chat_id
_last_id: dict[int, int] = {}


async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id

    try:
        transaction = parse_message(update.message.text)
    except ValueError as e:
        await update.message.reply_text(str(e))
        return

    try:
        new_id = append_transaction(transaction)
    except Exception as e:
        await update.message.reply_text(
            f"⚠️ Erro ao gravar na planilha. Tente novamente.\n_{type(e).__name__}: {e}_",
            parse_mode="Markdown",
        )
        return

    _last_id[chat_id] = new_id

    _TIPO_META = {
        "entrada":      ("💰", "Entrada registrada"),
        "saída":        ("💸", "Saída registrada"),
        "reembolso":    ("🔵", "Reembolso registrado"),
        "investimento": ("🟣", "Investimento registrado"),
    }
    emoji, label = _TIPO_META.get(transaction["tipo"], ("💸", "Transação registrada"))
    await update.message.reply_text(
        f"{emoji} *{label}*\n"
        f"Valor: R$ {transaction['valor']:.2f}\n"
        f"Descrição: {transaction['descricao']}\n"
        f"Data: {transaction['data']} às {transaction['hora']}",
        parse_mode="Markdown",
    )


_AJUDA_TEXT = (
    "📋 *Comandos e mensagens aceitos*\n\n"
    "💸 *Saída:*\n"
    "`50 mercado`\n"
    "`saída 50 almoço`\n\n"
    "💰 *Entrada:*\n"
    "`entrada 3000 salário`\n"
    "`recebido 500 freelance`\n\n"
    "🔵 *Reembolso:*\n"
    "`reembolso 80 jantar`\n"
    "`me devolveram 50 uber`\n"
    "`recebi de volta 100`\n\n"
    "🟣 *Investimento:*\n"
    "`investimento 500 tesouro`\n"
    "`investi 1000 ações`\n"
    "`aporte 200 fundo`\n"
    "`aplicação 300`\n\n"
    "⚙️ *Comandos:*\n"
    "/cancelar — cancela o último lançamento\n"
    "/ajuda — exibe esta mensagem"
)


async def handle_ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(_AJUDA_TEXT, parse_mode="Markdown")


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
