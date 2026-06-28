# Fase 15 — Migração de Google Sheets para Supabase

---

## Objetivo

Transferir a fonte de verdade das transações financeiras do Google Sheets para o banco Supabase (PostgreSQL) já existente. Eliminar o delay de 30s causado pelo cache da API do Google Sheets, centralizar todos os dados no banco e simplificar o código removendo a dupla camada de acesso (bot/sheets.py + api/sheets.py).

A planilha **não será removida** nesta fase — ela permanece intacta e pode ser consultada como backup até que o usuário confirme que tudo está correto. A remoção do código do Sheets é uma etapa separada, posterior.

---

## Pré-requisitos

- Fase 10 concluída (Supabase configurado, `api/db.py` e `DATABASE_URL` no `.env`).
- Dados históricos na planilha Google Sheets (serão migrados pelo script).

---

## Nova tabela no Supabase

```sql
CREATE TABLE transacoes (
    id          SERIAL PRIMARY KEY,
    data        TEXT NOT NULL,          -- "DD/MM/AAAA"
    hora        TEXT NOT NULL,          -- "HH:MM"
    tipo        TEXT NOT NULL,          -- "entrada" | "saída" | "reembolso" | "investimento"
    valor       NUMERIC(12,2) NOT NULL,
    descricao   TEXT NOT NULL,
    categoria   TEXT DEFAULT '',
    status      TEXT DEFAULT 'ativo'    -- "ativo" | "cancelado"
);
```

**Convenções mantidas:**
- `id` gerado pelo banco (SERIAL), nunca reutilizado
- `data` como string `DD/MM/AAAA` — compatível com todo o código existente de filtro por mês/ano
- `status = "cancelado"` em vez de DELETE — mesmo comportamento do Sheets
- Nunca deletar linhas — apenas atualizar status

---

## O que muda em cada camada

### Novo módulo `api/transactions_store.py`

Substitui `bot/sheets.py` e `api/sheets.py` como interface de acesso aos dados. Expõe exatamente as mesmas funções que o restante do código já usa:

```python
def append_transaction(transaction: dict) -> int
def cancel_transaction(transaction_id: int) -> bool
def get_active_transactions() -> list[dict]
def find_by_id(transaction_id: int) -> dict | None
def update_transaction(transaction_id: int, fields: dict) -> bool
```

Não há cache — PostgreSQL local é rápido o suficiente. Se precisar de cache no futuro, pode ser adicionado na camada de rota.

### `bot/sheets.py`

Mantido sem alteração (backup). O bot para de importar deste arquivo e passa a usar `api/transactions_store.py`.

### `bot/handlers.py`

```python
# antes:
from bot.sheets import append_transaction, cancel_transaction

# depois:
from api.transactions_store import append_transaction, cancel_transaction
```

### `api/sheets.py`

Mantido sem alteração (backup). A API para de importar deste arquivo.

### `api/sheets_write.py`

Mantido sem alteração (backup). Ninguém importa mais deste arquivo.

### `api/routes/transactions.py`

```python
# antes:
from api.sheets import get_active_transactions, find_row_by_id, _invalidate_cache

# depois:
from api.transactions_store import get_active_transactions, find_by_id, update_transaction, cancel_transaction
```

O PATCH e DELETE deixam de manipular células diretamente e passam a chamar `update_transaction` e `cancel_transaction`.

### `api/routes/summary.py`, `history.py`, `summary_items.py`, `ai_analysis.py`, `pdf_import.py`

Todos importam `get_active_transactions` de `api.sheets`. Passam a importar de `api.transactions_store`.

---

## Script de migração `scripts/migrate_sheets_to_db.py`

Lê **todos** os registros da planilha (incluindo cancelados) e insere no Supabase. Seguro para rodar múltiplas vezes — usa `ON CONFLICT DO NOTHING` baseado no `id` original.

```
python -m scripts.migrate_sheets_to_db
```

Saída esperada:
```
Lendo planilha...
Encontradas 247 transações (incluindo canceladas)
Inserindo no Supabase...
247 inseridas, 0 ignoradas (já existiam)
Migração concluída.
```

O script preserva os IDs originais da planilha — o SERIAL do banco é configurado para continuar a partir do maior ID migrado, evitando colisões.

---

## Passo a passo

### 1. Criar tabela no Supabase

Rodar `scripts/migrate_db.py` atualizado com o DDL da tabela `transacoes` (ou rodar o SQL diretamente no painel Supabase).

### 2. Criar `api/transactions_store.py`

Interface única de acesso ao banco. Substitui os dois módulos de sheets.

### 3. Criar `scripts/migrate_sheets_to_db.py`

Script de migração one-shot. Lê o Sheets e insere tudo no Supabase com IDs preservados.

### 4. Rodar a migração

```powershell
python -m scripts.migrate_sheets_to_db
```

Verificar no painel Supabase que o número de linhas bate com a planilha.

### 5. Atualizar imports em todos os módulos

Arquivos a alterar:
- `bot/handlers.py` → importar de `api.transactions_store`
- `api/routes/transactions.py` → importar de `api.transactions_store`
- `api/routes/summary.py` → importar de `api.transactions_store`
- `api/routes/summary_items.py` → importar de `api.transactions_store`
- `api/routes/history.py` → importar de `api.transactions_store`
- `api/routes/ai_analysis.py` → importar de `api.transactions_store`
- `api/routes/pdf_import.py` → importar de `api.transactions_store`

### 6. Validação

- Abrir o painel web e confirmar que as transações históricas aparecem
- Enviar uma nova transação pelo Telegram e confirmar que aparece no painel
- Editar e excluir uma transação pelo painel e confirmar que funciona
- Verificar que o summary, history e items estão corretos

### 7. Planilha (não remover ainda)

Manter `bot/sheets.py`, `api/sheets.py` e `api/sheets_write.py` no repositório. A planilha Google Sheets permanece acessível para conferência. A remoção ocorre em uma fase futura, após aprovação do usuário.

---

## O que NÃO muda

- Formato das datas (`DD/MM/AAAA`) — nenhuma migração de formato
- Lógica de negócio dos handlers e rotas — só os imports mudam
- Tipos de transação: `"entrada"`, `"saída"`, `"reembolso"`, `"investimento"`
- Comportamento do cancelamento: `status = "cancelado"`, nunca DELETE
- IDs sequenciais, nunca reutilizados

---

## Remoção futura do Google Sheets (fase separada)

Após validação, uma fase posterior pode:
1. Remover `bot/sheets.py`, `api/sheets.py`, `api/sheets_write.py`
2. Remover dependências `gspread`, `google-auth` do `requirements.txt`
3. Remover variáveis `GOOGLE_SHEETS_ID`, `GOOGLE_CREDENTIALS_PATH`, `GOOGLE_CREDENTIALS_JSON` do `.env`
4. Remover a aba `resumo_por_item` do Sheets (opcional)

---

## Critérios de validação

- [ ] Tabela `transacoes` criada no Supabase com schema correto
- [ ] Script de migração roda sem erros e insere todos os registros históricos
- [ ] Contagem de registros no Supabase bate com a planilha
- [ ] Novas transações via Telegram aparecem no banco (não na planilha)
- [ ] `GET /transactions` retorna dados corretos
- [ ] `GET /summary` retorna totais corretos
- [ ] `GET /history` retorna histórico correto
- [ ] `PATCH /transactions/{id}` atualiza corretamente no banco
- [ ] `DELETE /transactions/{id}` marca como cancelado no banco
- [ ] Planilha original intacta e acessível para conferência

---

## Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Supabase pause (7 dias inatividade) | Usuário usa o bot mais de 1x/semana — risco baixo |
| IDs colidindo após migração | Script ajusta o SERIAL do banco para continuar após o maior ID migrado |
| Dados históricos perdidos | Script roda antes de qualquer mudança de código; planilha mantida como backup |
| pdf_import grava transações | `pdf_import.py` usa `sheets_write.py` que re-exporta `append_transaction` — atualizar para usar `transactions_store` |
