#!/bin/bash

echo "Iniciando bot Telegram..."
cd bot && python main.py &
BOT_PID=$!

echo "Iniciando API FastAPI..."
cd ../api && uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
API_PID=$!

echo "Iniciando frontend React..."
cd ../frontend && npm run dev

kill $BOT_PID
kill $API_PID
