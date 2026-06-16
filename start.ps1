# Finance Control — script de inicializacao completo
# Uso: .\start.ps1

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Log  { param($m) Write-Host "[finance] $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "   [ok] $m"   -ForegroundColor Green }
function Write-Warn { param($m) Write-Host " [aviso] $m"  -ForegroundColor Yellow }
function Write-Err  { param($m) Write-Host "  [erro] $m"  -ForegroundColor Red }

function Kill-Port {
    param([int]$Port)
    $lines = netstat -ano | Select-String ":$Port\s.*LISTENING"
    foreach ($line in $lines) {
        $pid_ = ($line -split '\s+' | Where-Object { $_ -ne '' })[-1]
        if ($pid_ -match '^\d+$') {
            Stop-Process -Id ([int]$pid_) -Force -ErrorAction SilentlyContinue
        }
    }
}

# ── Pre-checks ─────────────────────────────────────────────────────────────────
Write-Log "Verificando ambiente..."

if (-not (Test-Path "$Root\.env")) {
    Write-Err ".env nao encontrado. Copie .env.example para .env e preencha as variaveis."
    exit 1
}
if (-not (Test-Path "$Root\credentials\google-credentials.json")) {
    Write-Err "credentials\google-credentials.json nao encontrado."
    exit 1
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
    Write-Err "Python nao encontrado no PATH."
    exit 1
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    Write-Err "Node/npm nao encontrado no PATH."
    exit 1
}
if (-not (Test-Path "$Root\frontend\node_modules")) {
    Write-Log "Instalando dependencias do frontend (primeira vez)..."
    cmd /c "npm install --prefix `"$Root\frontend`" --silent"
}
Write-Ok "Ambiente OK"

# ── Encerrar processos anteriores ──────────────────────────────────────────────
Write-Log "Encerrando processos anteriores..."

$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
foreach ($p in $pythonProcs) {
    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
}
Kill-Port 8000
Kill-Port 5173
Kill-Port 5174
Kill-Port 5175

Start-Sleep -Seconds 2

# ── Bot Telegram ───────────────────────────────────────────────────────────────
Write-Log "Iniciando bot Telegram..."
$botProc = Start-Process python `
    -ArgumentList "main.py" `
    -WorkingDirectory "$Root\bot" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 2

if ($botProc.HasExited) {
    Write-Err "Falha ao iniciar o bot. Verifique TELEGRAM_BOT_TOKEN no .env."
    exit 1
}
Write-Ok "Bot iniciado         PID $($botProc.Id)"

# ── API FastAPI ────────────────────────────────────────────────────────────────
Write-Log "Iniciando API FastAPI..."
$apiProc = Start-Process python `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory "$Root\api" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 4

if ($apiProc.HasExited) {
    Write-Err "Falha ao iniciar a API. Verifique as credenciais do Google Sheets."
    Stop-Process -Id $botProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# Teste rapido de saude da API
try {
    $null = Invoke-RestMethod "http://localhost:8000/summary" -TimeoutSec 5
    Write-Ok "API iniciada         PID $($apiProc.Id)   -> http://localhost:8000"
} catch {
    Write-Warn "API iniciada mas nao respondeu ao health-check. Pode demorar mais."
}

# ── Frontend React ─────────────────────────────────────────────────────────────
Write-Log "Iniciando frontend React..."
$frontProc = Start-Process cmd `
    -ArgumentList "/c", "npm run dev" `
    -WorkingDirectory "$Root\frontend" `
    -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 5

if ($frontProc.HasExited) {
    Write-Err "Falha ao iniciar o frontend."
    Stop-Process -Id $botProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}
Write-Ok "Frontend iniciado    PID $($frontProc.Id)   -> http://localhost:5173"

# ── Resumo ─────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Finance Control esta no ar"              -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Bot Telegram  [ON]  PID $($botProc.Id)"                          -ForegroundColor Green
Write-Host "  API FastAPI   [ON]  PID $($apiProc.Id)  -> http://localhost:8000" -ForegroundColor Green
Write-Host "  Frontend      [ON]  PID $($frontProc.Id) -> http://localhost:5173" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Pressione Ctrl+C para encerrar tudo." -ForegroundColor Yellow
Write-Host ""

# Abre o navegador automaticamente
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

# ── Aguardar Ctrl+C ────────────────────────────────────────────────────────────
try {
    while ($true) {
        Start-Sleep -Seconds 10
        if ($botProc.HasExited)   { Write-Warn "Bot encerrou inesperadamente (cod $($botProc.ExitCode))." }
        if ($apiProc.HasExited)   { Write-Warn "API encerrou inesperadamente (cod $($apiProc.ExitCode))." }
        if ($frontProc.HasExited) { Write-Warn "Frontend encerrou inesperadamente." }
    }
} finally {
    Write-Log "Encerrando servicos..."
    Stop-Process -Id $botProc.Id   -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $apiProc.Id   -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $frontProc.Id -Force -ErrorAction SilentlyContinue
    Write-Ok "Tudo encerrado."
}
