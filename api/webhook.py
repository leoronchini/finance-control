import os
import logging
from telegram import Update
from telegram.ext import Application, ApplicationBuilder, MessageHandler, CommandHandler, filters
from fastapi import Request, Response

logger = logging.getLogger(__name__)

_telegram_app: Application | None = None


async def init_telegram():
    global _telegram_app
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN não definido — webhook desativado")
        return

    chat_id = int(os.getenv("TELEGRAM_CHAT_ID"))
    from bot.handlers import handle_message, handle_cancel, handle_ajuda

    cancel_keywords = filters.Regex(r"^(cancelar|desfazer)$")
    auth = filters.ChatType.PRIVATE & filters.User(user_id=chat_id)

    # updater(None) é obrigatório em modo webhook — sem ele o PTB tenta criar
    # um Updater para polling, o que é desnecessário e quebra no Python 3.14
    app = ApplicationBuilder().token(token).updater(None).build()
    app.add_handler(CommandHandler("ajuda", handle_ajuda))
    app.add_handler(CommandHandler("help",  handle_ajuda))
    app.add_handler(MessageHandler(auth & cancel_keywords, handle_cancel))
    app.add_handler(MessageHandler(auth & filters.TEXT & ~filters.COMMAND, handle_message))

    await app.initialize()
    _telegram_app = app
    logger.info("Telegram webhook inicializado")


async def shutdown_telegram():
    global _telegram_app
    if _telegram_app:
        await _telegram_app.shutdown()
        _telegram_app = None


async def handle_webhook(request: Request) -> Response:
    if _telegram_app is None:
        return Response(content="webhook não inicializado", status_code=503)
    data = await request.json()
    update = Update.de_json(data, _telegram_app.bot)
    await _telegram_app.process_update(update)
    return Response(content="ok")
