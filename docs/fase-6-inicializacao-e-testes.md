# Fase 6 — Script de Inicialização e Testes Finais

---

## Objetivo

Criar o script de inicialização unificado que sobe todos os serviços com um único comando, corrigir os problemas encontrados durante os testes de integração e validar o fluxo completo ponta a ponta: mensagem no Telegram → Google Sheets → API → painel web.

---

## O que foi implementado

### `start.ps1` — Windows (principal)

Script PowerShell que inicia bot, API e (opcionalmente) o frontend com um único comando. Inclui verificação de ambiente, encerramento de processos anteriores e monitoramento contínuo.

```
.\start.ps1              # bot + API
.\start.ps1 -Frontend   # bot + API + frontend React
```

**Fluxo interno do script:**

1. Verifica existência do `.env` e de `credentials/google-credentials.json`
2. Verifica se Python está no PATH
3. Encerra **todos** os processos `python.exe` em execução (evita instâncias duplicadas do bot)
4. Encerra processo na porta 5173 se houver (frontend anterior)
5. Inicia o bot em background (`bot/main.py`)
6. Aguarda 2s e confirma que o processo ainda está vivo
7. Inicia a API em background (`api/main.py` via uvicorn)
8. Aguarda 3s e confirma que o processo ainda está vivo
9. (Opcional) Instala dependências do frontend se `node_modules` não existir, depois inicia o Vite
10. Exibe resumo com PIDs e endereços
11. Fica em loop monitorando se os processos continuam vivos
12. Ao `Ctrl+C`, encerra todos os processos filhos

### `start.sh` — Git Bash / WSL

Equivalente para ambientes Unix com as mesmas etapas e flags:

```bash
./start.sh                 # bot + API
./start.sh --com-frontend  # bot + API + frontend React
```

### `start.bat` — executável de duplo clique

Wrapper que chama o `start.ps1` com `ExecutionPolicy Bypass`, permitindo execução direta pelo Windows Explorer sem configuração prévia do PowerShell:

```bat
@echo off
powershell.exe -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
```

---

## Problema encontrado e corrigido

### Duplicação de mensagens no Telegram

**Sintoma:** cada mensagem enviada pelo Telegram gerava duas linhas na planilha.

**Causa:** ao executar o `start.ps1` uma segunda vez, o script encerrava apenas o processo na porta 8000 (API), mas deixava o processo do bot anterior rodando. Com dois bots ativos simultaneamente, cada mensagem era processada duas vezes.

**Correção:** o script passou a encerrar **todos os processos `python.exe`** antes de iniciar os novos, garantindo que apenas uma instância de cada serviço exista.

```powershell
# Antes — só matava a porta 8000
$conn = netstat -ano | Select-String ":8000\s.*LISTENING"
Stop-Process -Id $pid_ -Force

# Depois — mata todos os python.exe
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue
foreach ($p in $pythonProcs) {
    Stop-Process -Id $p.Id -Force
}
```

### Logs com caracteres corrompidos

**Sintoma:** o bloco de resumo final exibia código PowerShell em texto puro e caracteres ilegíveis (`â†'`, `â━â`, etc.).

**Causa:** o PowerShell 5.1 (Windows PowerShell padrão) não renderiza corretamente caracteres Unicode de desenho de caixa (`━`, `●`, `→`) quando o arquivo `.ps1` não está salvo com BOM UTF-8. Além disso, o `if ($frontProc)` sem o operador `-ne $null` explícito causava falha silenciosa que fazia o restante do script ser impresso como texto.

**Correção:** substituição de todos os caracteres especiais por equivalentes ASCII (`=`, `[ON]`, `->`) e correção da condição para `if ($null -ne $frontProc)`.

---

## Testes de integração realizados

### Fluxo de gravação

| Etapa | Comando / Ação | Resultado esperado |
|---|---|---|
| 1 | Subir serviços com `start.bat` | Bot e API iniciados sem erros |
| 2 | Enviar `50 mercado` no Telegram | Bot responde com confirmação |
| 3 | Abrir planilha no Google Sheets | Nova linha com `status=ativo` |
| 4 | `GET /transactions?mes=06&ano=2026` | Transação aparece no JSON |
| 5 | `GET /summary?mes=06&ano=2026` | Saldo atualizado corretamente |

### Fluxo de cancelamento

| Etapa | Ação | Resultado esperado |
|---|---|---|
| 1 | Enviar `cancelar` no Telegram | Bot responde `↩️ Último registro desfeito.` |
| 2 | Abrir planilha | Linha com `status=cancelado` |
| 3 | `GET /transactions` | Transação não aparece mais |

### Fluxo de edição via API

| Etapa | Comando | Resultado esperado |
|---|---|---|
| 1 | `PATCH /transactions/{id}` com novo valor | `{"ok": true}` |
| 2 | Abrir planilha | Célula atualizada |
| 3 | `GET /transactions` | Valor novo retornado |

### Fluxo de exclusão via API

| Etapa | Comando | Resultado esperado |
|---|---|---|
| 1 | `DELETE /transactions/{id}` | `{"ok": true}` |
| 2 | Abrir planilha | `status=cancelado` na linha |
| 3 | `GET /transactions` | Transação ausente |

---

## Validação da Fase 6

- [x] `start.bat` executa com duplo clique sem configuração adicional
- [x] `start.ps1` encerra instâncias anteriores antes de subir novas
- [x] `start.sh` funciona no Git Bash com as mesmas garantias
- [x] Nenhuma duplicação de mensagens ao reiniciar os serviços
- [x] Logs legíveis no terminal do PowerShell
- [x] Bot e API sobem em menos de 10 segundos no total
- [x] `Ctrl+C` encerra todos os processos filhos sem deixar processos órfãos
- [x] Fluxo Telegram → Sheets validado manualmente
- [x] Fluxo de cancelamento validado manualmente
- [x] Endpoints PATCH e DELETE validados via requisição HTTP

---

## Resultado final

Com a Fase 6 concluída, a **Versão 1.0 do Finance Control** está operacional nas seguintes frentes:

| Componente | Status |
|---|---|
| Bot Telegram | ✅ Funcionando — grava e cancela transações |
| Google Sheets | ✅ Funcionando — fonte de verdade do sistema |
| API FastAPI | ✅ Funcionando — todos os endpoints validados |
| Script de inicialização | ✅ Funcionando — `start.bat` para Windows |
| Frontend React | ⏳ Pendente — implementação na Fase 5 |

O único componente pendente é o frontend (Fase 5), que será desenvolvido em sequência. Bot, planilha e API já operam de forma estável e integrada.
