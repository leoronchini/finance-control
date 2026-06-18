import os
import logging
from telegram import Update
from telegram.ext import Application
from fastapi import Request, Response

logger = logging.getLogger(__name__)

_telegram_app: Application | None = None


async def init_telegram():
    global _telegram_app
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    if not token:
        logger.warning("TELEGRAM_BOT_TOKEN não definido — webhook desativado")
        return
    from bot.main import build_application
    app = build_application(token)
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
