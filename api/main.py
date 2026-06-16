import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(_ROOT, ".env"))

from routes.transactions import router as transactions_router
from routes.summary import router as summary_router
from routes.history import router as history_router
from routes.summary_items import router as summary_items_router

app = FastAPI(title="Finance Bot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
    ],
    allow_methods=["GET", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)

app.include_router(transactions_router)
app.include_router(summary_router)
app.include_router(history_router)
app.include_router(summary_items_router)
