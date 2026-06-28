import os
import logging
from dotenv import load_dotenv
from telegram.ext import ApplicationBuilder, MessageHandler, CommandHandler, filters, Application

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

logging.basicConfig(
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    level=logging.INFO,
)

logger = logging.getLogger(__name__)

from bot.handlers import handle_message, handle_cancel, handle_ajuda

ALLOWED_CHAT_ID = int(os.getenv("TELEGRAM_CHAT_ID"))


def build_application(token: str) -> Application:
    cancel_keywords = filters.Regex(r"^(cancelar|desfazer)$")
    auth = filters.ChatType.PRIVATE & filters.User(user_id=ALLOWED_CHAT_ID)

    app = ApplicationBuilder().token(token).build()
    app.add_handler(CommandHandler("ajuda", handle_ajuda))
    app.add_handler(CommandHandler("help",  handle_ajuda))
    app.add_handler(MessageHandler(auth & cancel_keywords, handle_cancel))
    app.add_handler(MessageHandler(auth & filters.TEXT & ~filters.COMMAND, handle_message))
    return app


if __name__ == "__main__":
    token = os.getenv("TELEGRAM_BOT_TOKEN")
    app = build_application(token)
    logger.info("Bot iniciado em modo polling. Aguardando mensagens...")
    app.run_polling()
