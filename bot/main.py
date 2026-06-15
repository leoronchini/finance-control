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
