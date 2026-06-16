# Script de inicializacao -- Finance Control (Windows / PowerShell)
# Uso: .\start.ps1           (bot + API)
#      .\start.ps1 -Frontend (bot + API + frontend React)

param([switch]$Frontend)

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Log  { param($m) Write-Host "[finance] $m" -ForegroundColor Cyan }
function Write-Ok   { param($m) Write-Host "[ok] $m"      -ForegroundColor Green }
function Write-Warn { param($m) Write-Host "[aviso] $m"   -ForegroundColor Yellow }
function Write-Err  { param($m) Write-Host "[erro] $m"    -ForegroundColor Red }

# -- Pre-checks ----------------------------------------------------------------
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
Write-Ok "Ambiente OK"

# -- Encerrar processos anteriores ---------------------------------------------
Write-Log "Encerrando processos anteriores..."

# Mata todos os processos python em execucao (bot e API anteriores)
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
if ($pythonProcs) {
    foreach ($p in $pythonProcs) {
        Write-Warn "Encerrando python.exe (PID $($p.Id))..."
        Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
    }
    Start-Sleep -Seconds 2
}

# Mata processo na porta 5173 (frontend anterior)
$conn5173 = netstat -ano | Select-String ":5173\s.*LISTENING"
if ($conn5173) {
    $pid_ = ($conn5173 -split '\s+' | Where-Object { $_ -ne '' })[-1]
    Write-Warn "Porta 5173 em uso (PID $pid_). Encerrando..."
    Stop-Process -Id $pid_ -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 1
}

# -- Iniciar bot ---------------------------------------------------------------
Write-Log "Iniciando bot Telegram..."
$botProc = Start-Process python `
    -ArgumentList "main.py" `
    -WorkingDirectory "$Root\bot" `
    -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 2

if (-not $botProc.HasExited) {
    Write-Ok "Bot iniciado (PID $($botProc.Id))"
} else {
    Write-Err "Falha ao iniciar o bot. Verifique TELEGRAM_BOT_TOKEN no .env."
    exit 1
}

# -- Iniciar API ---------------------------------------------------------------
Write-Log "Iniciando API FastAPI..."
$apiProc = Start-Process python `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory "$Root\api" `
    -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3

if (-not $apiProc.HasExited) {
    Write-Ok "API iniciada (PID $($apiProc.Id)) -> http://localhost:8000"
    Write-Ok "Docs da API -> http://localhost:8000/docs"
} else {
    Write-Err "Falha ao iniciar a API."
    Stop-Process -Id $botProc.Id -Force -ErrorAction SilentlyContinue
    exit 1
}

# -- Iniciar frontend (opcional) -----------------------------------------------
$frontProc = $null
if ($Frontend) {
    if (-not (Test-Path "$Root\frontend\node_modules")) {
        Write-Log "Instalando dependencias do frontend..."
        Start-Process npm -ArgumentList "install" -WorkingDirectory "$Root\frontend" -Wait -NoNewWindow
    }
    Write-Log "Iniciando frontend React..."
    $frontProc = Start-Process npm `
        -ArgumentList "run", "dev" `
        -WorkingDirectory "$Root\frontend" `
        -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 3

    if (-not $frontProc.HasExited) {
        Write-Ok "Frontend iniciado (PID $($frontProc.Id)) -> http://localhost:5173"
    } else {
        Write-Err "Falha ao iniciar o frontend."
    }
} else {
    Write-Warn "Frontend nao iniciado. Use '.\start.ps1 -Frontend' para subir o painel web."
}

# -- Resumo --------------------------------------------------------------------
Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Finance Control -- rodando"                 -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "  Bot Telegram   PID $($botProc.Id)   [ON]"  -ForegroundColor Green
Write-Host "  API FastAPI    PID $($apiProc.Id)   [ON]  http://localhost:8000" -ForegroundColor Green
if ($null -ne $frontProc) {
    Write-Host "  Frontend       PID $($frontProc.Id)   [ON]  http://localhost:5173" -ForegroundColor Green
}
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Pressione Ctrl+C para encerrar tudo." -ForegroundColor Yellow
Write-Host ""

# -- Aguardar e encerrar ao Ctrl+C ---------------------------------------------
try {
    while ($true) {
        Start-Sleep -Seconds 5
        if ($botProc.HasExited) {
            Write-Warn "Bot encerrou inesperadamente (codigo $($botProc.ExitCode))."
        }
        if ($apiProc.HasExited) {
            Write-Warn "API encerrou inesperadamente (codigo $($apiProc.ExitCode))."
        }
    }
} finally {
    Write-Log "Encerrando servicos..."
    Stop-Process -Id $botProc.Id -Force -ErrorAction SilentlyContinue
    Stop-Process -Id $apiProc.Id -Force -ErrorAction SilentlyContinue
    if ($null -ne $frontProc) {
        Stop-Process -Id $frontProc.Id -Force -ErrorAction SilentlyContinue
    }
    Write-Ok "Tudo encerrado."
}
