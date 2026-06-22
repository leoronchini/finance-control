import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

from api.routes.transactions import router as transactions_router
from api.routes.summary import router as summary_router
from api.routes.history import router as history_router
from api.routes.summary_items import router as summary_items_router
from api.routes.ai_analysis import router as ai_analysis_router
from api.routes.pdf_import import router as pdf_import_router
from api.webhook import init_telegram, shutdown_telegram, handle_webhook


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_telegram()
    yield
    await shutdown_telegram()


app = FastAPI(title="Finance Bot API", lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:5175",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
_frontend_url = os.getenv("FRONTEND_URL", "")
if _frontend_url:
    origins.append(_frontend_url)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_methods=["GET", "PATCH", "DELETE", "POST"],
    allow_headers=["Content-Type", "Accept"],
)

app.add_api_route("/webhook", handle_webhook, methods=["POST"])

app.include_router(transactions_router)
app.include_router(summary_router)
app.include_router(history_router)
app.include_router(summary_items_router)
app.include_router(ai_analysis_router)
app.include_router(pdf_import_router)
