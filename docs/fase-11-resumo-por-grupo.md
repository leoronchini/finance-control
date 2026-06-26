# Fase 11 — Resumo de Gastos por Grupo (Agrupamento com IA)

---

## Objetivo

Adicionar ao painel uma camada de resumo que agrupa **todos os lançamentos do mês** (entradas e saídas) em grupos maiores — como *Gastos Fixos*, *Alimentação*, *Transporte*, *Lazer*, *Saúde*, *Renda* — e exibe o total consolidado de cada grupo e o percentual que representa.

O agrupamento é feito por um **agente de IA** que:

1. **Tenta categorizar sozinho** cada lançamento, com base na descrição e no contexto financeiro.
2. **Tem memória**: associações descrição → grupo já confirmadas ficam salvas e nunca mais são perguntadas nem reenviadas à IA.
3. **Não chuta**: quando não tem certeza do grupo, **não decide sozinho** — devolve o lançamento como *pendente de decisão* para o usuário escolher na tela.
4. **Pode sugerir grupos novos**: além dos grupos já existentes, a IA pode propor um grupo inédito quando achar que faz sentido; a criação só é efetivada após o usuário aprovar.

A regra central é: **todo lançamento do mês precisa pertencer a um grupo**. A tela só fica "completa" quando não há mais pendências.

---

## ⚠️ Pré-requisito bloqueante — Banco de dados (Fase 10)

A memória do agente (as regras `descrição → grupo` e a lista de grupos) **exige persistência em banco de dados**.

Esta fase depende da **[Fase 10 — Persistência com Banco de Dados (Supabase)](fase-10-persistencia-banco.md)**, que entrega:

- Projeto configurado no Supabase (PostgreSQL gratuito).
- Módulo `api/db.py` com conexão reutilizável.
- Módulo `api/groups_store.py` como única porta de acesso às tabelas.
- Tabelas `grupos` e `regras_grupo` já criadas via `scripts/migrate_db.py`.

**Enquanto a Fase 10 não for executada, esta fase fica bloqueada.** Todo o restante deste documento assume que o banco já existe e o módulo `api/groups_store.py` está disponível.

> Observação: a Fase 9 (importação de PDF) **não** é pré-requisito desta fase. O agrupamento opera sobre os lançamentos já existentes na planilha, independente de como entraram.

---

## Pré-requisitos

- Fase 4 concluída (API FastAPI com `GET /transactions`).
- Fase 5 concluída (frontend React — a tela `GroupSummary.jsx` já existe em versão V1 com mapeamento estático e será substituída).
- Fase 8 concluída (`google-genai` instalado e `GEMINI_API_KEY` no `.env`).
- **Fase 10 (banco de dados Supabase) concluída** — ver bloqueio acima.

---

## Estado atual (V1 — a ser substituído)

A tela `frontend/src/pages/GroupSummary.jsx` já existe, mas usa um **mapeamento estático hardcoded** (`GROUP_MAP`) no próprio frontend, sem IA e sem memória. Tudo que não bate em uma palavra-chave fixa cai em "Outros".

Esta fase **remove** essa lógica do frontend e a move para o agente no backend, com memória persistente e resolução de dúvidas pelo usuário.

---

## Modelo de dados

Duas tabelas no banco (criadas pela Fase de Persistência):

### `grupos`

| coluna | tipo | descrição |
|---|---|---|
| `nome` | TEXT PK | nome do grupo (ex: "Alimentação") |
| `cor` | TEXT | cor hex para o gráfico (ex: "#f97316") |
| `criado_em` | TEXT | data de criação (DD/MM/AAAA) |

Seed inicial sugerido: `Gastos Fixos`, `Alimentação`, `Transporte`, `Lazer & Assinaturas`, `Saúde`, `Renda`, `Outros`.

### `regras_grupo` (a memória do agente)

| coluna | tipo | descrição |
|---|---|---|
| `descricao` | TEXT PK | descrição normalizada (`.strip().lower()`) |
| `grupo` | TEXT | nome do grupo (FK lógica para `grupos.nome`) |
| `origem` | TEXT | `"ia"` (auto, alta confiança) ou `"usuario"` (confirmado na tela) |
| `atualizado_em` | TEXT | DD/MM/AAAA |

A chave é a **descrição exata normalizada**. Resolvida uma vez, vale para sempre — qualquer lançamento futuro com a mesma descrição é agrupado direto, sem IA.

---

## Lógica do agente

Para cada **descrição única** dos lançamentos do mês (entradas e saídas):

```
descrição normalizada (.strip().lower())
        │
        ├─ existe em regras_grupo?  ──► SIM ──► usa o grupo salvo (definitivo, sem IA)
        │
        └─ NÃO
              │
              └─ envia à IA (em lote) junto com a lista de grupos existentes
                       │
                       ├─ IA responde { grupo, confianca: "alta", novo_grupo: false }
                       │       └─► aplica e grava regra (origem: "ia")
                       │
                       ├─ IA responde { grupo: "<novo>", novo_grupo: true }
                       │       └─► NÃO cria sozinho ──► vira PENDENTE (sugestão de grupo novo)
                       │
                       └─ IA responde { confianca: "baixa" } ou incerto
                               └─► vira PENDENTE (usuário decide)
```

Princípios:

- **Só decide sozinho com confiança alta** e usando um grupo **já existente**. Qualquer incerteza ou proposta de grupo novo vira pendência.
- **Chamada à IA só para o desconhecido**: descrições já em `regras_grupo` nunca são enviadas (economia de tokens e velocidade).
- **Uma única chamada em lote** por requisição: todas as descrições novas vão num único prompt pedindo um array JSON, em vez de N chamadas.

---

## Endpoints (backend)

Novo arquivo `api/routes/groups.py`.

| método | rota | função |
|---|---|---|
| `GET` | `/groups` | lista os grupos cadastrados (de `grupos`) |
| `GET` | `/groups/summary?mes&ano` | resumo agrupado do mês **+ lista de pendências** |
| `POST` | `/groups/confirm` | grava decisões do usuário em `regras_grupo` (e cria grupo novo se aprovado) |

### `GET /groups/summary`

1. Lê `get_active_transactions()` e filtra pelo mês/ano.
2. Resolve cada descrição pela lógica do agente acima.
3. Retorna os grupos já resolvidos **e** as pendências.

```json
{
  "mes": "06",
  "ano": "2026",
  "grupos": [
    {
      "nome": "Alimentação",
      "cor": "#f97316",
      "total": 730.50,
      "percentual": 23.1,
      "itens": [
        { "descricao": "mercado", "total": 430.00 },
        { "descricao": "ifood", "total": 300.50 }
      ]
    }
  ],
  "pendentes": [
    {
      "descricao": "padaria do josé",
      "valor_total": 85.00,
      "ocorrencias": 3,
      "sugestao": "Alimentação",
      "novo_grupo": false,
      "motivo": "Pode ser Alimentação, mas a descrição é ambígua."
    },
    {
      "descricao": "curso de inglês",
      "valor_total": 250.00,
      "ocorrencias": 1,
      "sugestao": "Educação",
      "novo_grupo": true,
      "motivo": "Sugiro um grupo novo 'Educação' — não há grupo equivalente."
    }
  ],
  "total_geral": 3155.00
}
```

> O frontend deve tratar `pendentes` como bloqueio: enquanto houver itens nessa lista, a visualização está incompleta e o usuário é chamado a resolver.

### `POST /groups/confirm`

Recebe as escolhas do usuário e grava na memória. Se algum item aprovar um grupo novo, o grupo é criado em `grupos` antes da regra.

```json
{
  "decisoes": [
    { "descricao": "padaria do josé", "grupo": "Alimentação", "novo_grupo": false },
    { "descricao": "curso de inglês", "grupo": "Educação", "novo_grupo": true, "cor": "#06b6d4" }
  ]
}
```

Resposta:

```json
{ "gravadas": 2, "grupos_criados": ["Educação"] }
```

---

## Módulo de memória — `api/groups_store.py`

Única porta de acesso à memória. Isola o banco do resto do código.

```python
# Assinaturas esperadas (implementação usa api/db.py da Fase de Persistência)

def list_groups() -> list[dict]: ...
    # [{ "nome": ..., "cor": ... }, ...]

def get_rules() -> dict[str, str]: ...
    # { descricao_normalizada: grupo }  — carregado de regras_grupo

def upsert_rule(descricao: str, grupo: str, origem: str) -> None: ...
    # grava/atualiza uma regra (PK = descricao normalizada)

def create_group(nome: str, cor: str) -> None: ...
    # cria grupo se não existir
```

---

## Esboço do agente — `api/routes/groups.py`

```python
import os, json
from google import genai
from fastapi import APIRouter, Query, Body, HTTPException
from datetime import datetime
from collections import defaultdict
from api.sheets import get_active_transactions
from api.groups_store import list_groups, get_rules, upsert_rule, create_group

router = APIRouter()


def _filter_month(transactions, mes, ano):
    return [
        t for t in transactions
        if len(t["data"].split("/")) == 3
        and t["data"].split("/")[1] == mes.zfill(2)
        and t["data"].split("/")[2] == ano
    ]


def _classify_with_ia(descricoes: list[str], grupos: list[str], api_key: str) -> list[dict]:
    """Classifica em lote as descrições ainda sem regra. Uma única chamada."""
    client = genai.Client(api_key=api_key)
    grupos_str = ", ".join(grupos)
    prompt = f"""Você é um agente de categorização financeira pessoal.
Grupos já existentes: {grupos_str}.

Para cada descrição abaixo, escolha o grupo MAIS provável APENAS entre os existentes.
Regras importantes:
- Só use confianca "alta" quando tiver real certeza. Na menor dúvida, use "baixa".
- Se nenhum grupo existente servir e fizer sentido um grupo novo, defina "novo_grupo": true
  e em "grupo" coloque o nome sugerido do novo grupo.
- NUNCA invente certeza. É melhor "baixa" do que errar.

Retorne APENAS um array JSON, um objeto por descrição, na mesma ordem:
[{{"descricao": "...", "grupo": "...", "confianca": "alta|baixa", "novo_grupo": false, "motivo": "curto"}}]

Descrições:
{json.dumps(descricoes, ensure_ascii=False)}
"""
    resp = client.models.generate_content(model="gemini-2.5-flash", contents=prompt)
    raw = resp.text.strip()
    if raw.startswith("```"):
        raw = raw.split("```")[1]
        if raw.startswith("json"):
            raw = raw[4:]
    return json.loads(raw)


@router.get("/groups/summary")
def groups_summary(mes: str = Query(None), ano: str = Query(None)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    txs = _filter_month(get_active_transactions(), mes, ano)
    grupos = list_groups()
    grupos_nomes = [g["nome"] for g in grupos]
    cor_por_grupo = {g["nome"]: g["cor"] for g in grupos}
    regras = get_rules()  # { descricao: grupo }

    # totais e ocorrências por descrição normalizada
    agg = defaultdict(lambda: {"total": 0.0, "ocorrencias": 0})
    for t in txs:
        d = t["descricao"].strip().lower()
        agg[d]["total"] += float(t["valor"])
        agg[d]["ocorrencias"] += 1

    desconhecidas = [d for d in agg if d not in regras]
    classificacoes = (
        _classify_with_ia(desconhecidas, grupos_nomes, api_key)
        if desconhecidas else []
    )

    grupos_resolvidos = defaultdict(lambda: {"total": 0.0, "itens": []})
    pendentes = []

    # já memorizadas
    for d, info in agg.items():
        if d in regras:
            g = grupos_resolvidos[regras[d]]
            g["total"] += info["total"]
            g["itens"].append({"descricao": d, "total": round(info["total"], 2)})

    # recém-classificadas pela IA
    for c in classificacoes:
        d = c["descricao"]
        info = agg.get(d, {"total": 0, "ocorrencias": 0})
        certeza = c.get("confianca") == "alta" and not c.get("novo_grupo")
        if certeza and c["grupo"] in grupos_nomes:
            upsert_rule(d, c["grupo"], origem="ia")
            g = grupos_resolvidos[c["grupo"]]
            g["total"] += info["total"]
            g["itens"].append({"descricao": d, "total": round(info["total"], 2)})
        else:
            pendentes.append({
                "descricao": d,
                "valor_total": round(info["total"], 2),
                "ocorrencias": info["ocorrencias"],
                "sugestao": c.get("grupo"),
                "novo_grupo": bool(c.get("novo_grupo")),
                "motivo": c.get("motivo", ""),
            })

    total_geral = sum(v["total"] for v in agg.values())
    grupos_out = sorted(
        (
            {
                "nome": nome,
                "cor": cor_por_grupo.get(nome, "#7c85a2"),
                "total": round(g["total"], 2),
                "percentual": round(g["total"] / total_geral * 100, 1) if total_geral else 0,
                "itens": sorted(g["itens"], key=lambda x: x["total"], reverse=True),
            }
            for nome, g in grupos_resolvidos.items()
        ),
        key=lambda x: x["total"], reverse=True,
    )

    return {
        "mes": mes, "ano": ano,
        "grupos": grupos_out,
        "pendentes": pendentes,
        "total_geral": round(total_geral, 2),
    }


@router.post("/groups/confirm")
def groups_confirm(payload: dict = Body(...)):
    decisoes = payload.get("decisoes", [])
    if not decisoes:
        raise HTTPException(status_code=400, detail="Nenhuma decisão enviada")

    grupos_criados = []
    gravadas = 0
    for d in decisoes:
        if d.get("novo_grupo"):
            create_group(d["grupo"], d.get("cor", "#7c85a2"))
            grupos_criados.append(d["grupo"])
        upsert_rule(d["descricao"].strip().lower(), d["grupo"], origem="usuario")
        gravadas += 1

    return {"gravadas": gravadas, "grupos_criados": grupos_criados}
```

Registrar em `api/main.py`:

```python
from api.routes.groups import router as groups_router
app.include_router(groups_router)
```

---

## Frontend — `GroupSummary.jsx` (reescrito)

Substituir a lógica estática atual por consumo dos novos endpoints.

### Funções em `frontend/src/services/api.js`

```js
export const getGroupSummary = (mes, ano) =>
  fetch(`${BASE}/groups/summary?mes=${mes}&ano=${ano}`).then(json)

export const confirmGroups = (decisoes) =>
  fetch(`${BASE}/groups/confirm`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ decisoes }),
  }).then(json)
```

### Comportamento da tela

1. Ao abrir, chama `GET /groups/summary?mes&ano` (estado de loading — a primeira categorização chama a IA e pode levar alguns segundos).
2. **Se houver `pendentes`** → exibir um painel de destaque no topo: *"N lançamentos precisam da sua decisão"*. Cada pendência mostra:
   - descrição, valor total, nº de ocorrências e o `motivo` da dúvida;
   - um seletor de grupo (lista dos grupos existentes) **+ opção de aceitar o grupo novo sugerido** quando `novo_grupo: true` (com escolha de cor);
   - botão por linha ou um "Confirmar todas" → dispara `POST /groups/confirm`.
3. Após confirmar, **recarregar** o resumo: as descrições resolvidas agora vêm já agrupadas e somem das pendências.
4. **Cards de grupo** (já existentes na V1): nome, total, percentual, lista de itens.
5. **Gráfico de pizza** (recharts, já existente na V1): proporção por grupo.
6. Enquanto houver pendências, sinalizar visualmente que o resumo ainda está incompleto (ex: aviso no topo do gráfico).

---

## Critérios de validação — Backend

- [ ] `GET /groups/summary` retorna `grupos` e `pendentes` para um mês com lançamentos.
- [ ] Descrição já presente em `regras_grupo` **não** é enviada à IA (verificável: sem regra → vai à IA; com regra → não vai).
- [ ] Lançamento com confiança baixa **ou** com sugestão de grupo novo aparece em `pendentes`, nunca agrupado automaticamente.
- [ ] Lançamento com confiança alta em grupo existente é agrupado e vira regra `origem: "ia"`.
- [ ] `POST /groups/confirm` grava as regras; chamadas seguintes a `/groups/summary` já trazem os itens agrupados.
- [ ] Aprovar um grupo novo no confirm cria o grupo em `grupos`.
- [ ] Entradas **e** saídas são consideradas (todo lançamento do mês entra em algum grupo ou em pendências).
- [ ] `GEMINI_API_KEY` ausente retorna HTTP 500.

## Critérios de validação — Frontend

- [ ] Pendências aparecem em destaque com motivo, valor e ocorrências.
- [ ] Usuário consegue escolher grupo existente ou aceitar grupo novo sugerido (com cor).
- [ ] Após confirmar, o item sai das pendências e aparece no card do grupo correto.
- [ ] Com zero pendências, a tela mostra o resumo completo (cards + pizza) sem aviso de incompletude.
- [ ] Trocar o mês recarrega o agrupamento corretamente.

---

## Observações

- **Custo de IA controlado**: a IA só é chamada para descrições sem regra. Depois que o histórico de descrições estabiliza, as aberturas da tela passam a não chamar a IA quase nunca.
- **Memória cresce com o uso**: quanto mais o usuário confirma, menos pendências surgem — o agente "aprende" as preferências dele.
- **Normalização é crítica**: a chave da memória é `descricao.strip().lower()`. Descrições com grafias diferentes ("Mercado X" vs "mercado x ") são tratadas como iguais; variações reais ("Mercado X" vs "Mercado Y") são regras distintas — comportamento intencional.
- **Reversão**: como tudo fica em `regras_grupo`, uma futura tela de "gerenciar grupos/regras" poderia permitir reclassificar uma descrição (atualizar a regra). Fora do escopo desta fase.
- **A V1 estática do `GroupSummary.jsx` é descartada** — o `GROUP_MAP` hardcoded sai do frontend.
