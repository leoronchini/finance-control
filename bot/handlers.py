from telegram import Update
from telegram.ext import ContextTypes
from bot.parser import parse_message
from bot.sheets import append_transaction, cancel_transaction

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
