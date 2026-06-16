# Fase 8 — Análise de Dados com IA

---

## Objetivo

Adicionar ao painel um módulo de análise inteligente que lê as transações do mês selecionado, envia os dados para a API do Gemini e exibe no frontend uma análise em linguagem natural com insights sobre padrões de consumo, categorias com maior gasto, comparativo com meses anteriores e sugestões de economia. Nenhum dado é gravado na planilha — funcionalidade exclusivamente de leitura e análise.

---

## Pré-requisitos

- Fase 4 concluída (API FastAPI funcionando com `GET /transactions` e `GET /summary`)
- Fase 5 concluída (Frontend React rodando e consumindo a API)
- Chave de API do Gemini (`GEMINI_API_KEY`) disponível em `.env`

---

## Variável de ambiente adicionada

Adicionar ao `.env` e ao `.env.example`:

```
GEMINI_API_KEY=sua_chave_aqui
```

---

## O que será criado

### Backend (FastAPI)

- Novo endpoint `POST /ai/analysis` em `api/routes/ai_analysis.py`
- Recebe `mes` e `ano` como parâmetros
- Lê as transações via `get_active_transactions()` (sem nova leitura à planilha — reutiliza a camada existente)
- Monta um prompt estruturado com os dados do mês atual e dos dois meses anteriores
- Chama a API do Gemini e retorna a análise gerada

### Frontend (React)

- Nova seção "Análise com IA" na tela Dashboard
- Seletor de mês/ano (reutilizado das outras telas)
- Botão "Analisar" que dispara a chamada ao endpoint
- Área de exibição do texto gerado, com estado de loading e tratamento de erro

---

## Passo a passo — Backend

### 1. Instalar dependência

```bash
pip install google-generativeai
```

Adicionar ao `requirements.txt`:

```
google-generativeai>=0.5.0
```

### 2. Criar `api/routes/ai_analysis.py`

```python
import os
import google.generativeai as genai
from fastapi import APIRouter, Query, HTTPException
from datetime import datetime
from collections import defaultdict
from api.sheets import get_active_transactions

router = APIRouter()

def _build_month_summary(transactions: list, mes: str, ano: str) -> dict:
    filtered = [
        t for t in transactions
        if len(t["data"].split("/")) == 3
        and t["data"].split("/")[1] == mes.zfill(2)
        and t["data"].split("/")[2] == ano
    ]
    entradas = sum(float(t["valor"]) for t in filtered if t.get("tipo") == "entrada")
    saidas = sum(float(t["valor"]) for t in filtered if t.get("tipo") == "saída")

    por_item: dict = defaultdict(float)
    for t in filtered:
        if t.get("tipo") == "saída":
            por_item[t["descricao"].strip().lower()] += float(t["valor"])

    top_itens = sorted(por_item.items(), key=lambda x: x[1], reverse=True)[:5]

    return {
        "mes": mes,
        "ano": ano,
        "entradas": round(entradas, 2),
        "saidas": round(saidas, 2),
        "saldo": round(entradas - saidas, 2),
        "top_itens": [{"descricao": k, "total": round(v, 2)} for k, v in top_itens],
    }


def _prev_month(mes: str, ano: str) -> tuple[str, str]:
    m, a = int(mes), int(ano)
    m -= 1
    if m == 0:
        m, a = 12, a - 1
    return str(m).zfill(2), str(a)


def _format_summary(s: dict) -> str:
    itens = ", ".join(f"{i['descricao']} R$ {i['total']:.2f}" for i in s["top_itens"])
    return (
        f"  Mês {s['mes']}/{s['ano']}: entradas R$ {s['entradas']:.2f}, "
        f"saídas R$ {s['saidas']:.2f}, saldo R$ {s['saldo']:.2f}. "
        f"Top saídas: {itens or 'nenhuma'}."
    )


@router.post("/ai/analysis")
def ai_analysis(mes: str = Query(None), ano: str = Query(None)):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="GEMINI_API_KEY não configurada")

    now = datetime.now()
    mes = mes or now.strftime("%m")
    ano = ano or now.strftime("%Y")

    transactions = get_active_transactions()

    mes1, ano1 = _prev_month(mes, ano)
    mes2, ano2 = _prev_month(mes1, ano1)

    atual = _build_month_summary(transactions, mes, ano)
    anterior = _build_month_summary(transactions, mes1, ano1)
    retrasado = _build_month_summary(transactions, mes2, ano2)

    prompt = f"""Você é um assistente financeiro pessoal. Analise os dados de gastos abaixo e forneça um relatório em português com:
1. Resumo do mês atual
2. Comparativo com os dois meses anteriores (tendências)
3. Categorias ou itens com maior gasto
4. Pelo menos 2 sugestões práticas de economia

Dados financeiros:

Mês atual:
{_format_summary(atual)}

Mês anterior:
{_format_summary(anterior)}

Dois meses atrás:
{_format_summary(retrasado)}

Responda de forma clara, objetiva e amigável. Use marcadores para as sugestões."""

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel("gemini-1.5-flash")

    try:
        response = model.generate_content(prompt)
        analysis_text = response.text
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao chamar a API do Gemini: {str(e)}")

    return {
        "mes": mes,
        "ano": ano,
        "resumo": atual,
        "analise": analysis_text,
    }
```

### 3. Registrar o router em `api/main.py`

```python
from api.routes.ai_analysis import router as ai_analysis_router
app.include_router(ai_analysis_router)
```

### Resposta esperada

```json
{
  "mes": "06",
  "ano": "2026",
  "resumo": {
    "mes": "06",
    "ano": "2026",
    "entradas": 5000.00,
    "saidas": 3155.00,
    "saldo": 1845.00,
    "top_itens": [
      { "descricao": "aluguel",  "total": 1200.00 },
      { "descricao": "mercado",  "total": 430.00  },
      { "descricao": "gasolina", "total": 310.00  }
    ]
  },
  "analise": "## Análise Financeira — Junho/2026\n\n**Resumo do mês atual**\n..."
}
```

---

## Passo a passo — Frontend

### 1. Criar `frontend/src/pages/AiAnalysis.jsx`

Estrutura da tela:

- Cabeçalho: "Análise com IA"
- Seletor de mês/ano (mesmo padrão das outras telas)
- Botão "Analisar" — faz `POST /ai/analysis?mes=XX&ano=XXXX`
- Durante a chamada: exibir skeleton/spinner com texto "Analisando seus dados..."
- Resultado: renderizar o texto em markdown (usar `react-markdown` ou exibir como `<pre>` estilizado)
- Em caso de erro: mensagem amigável com opção de tentar novamente

### 2. Adicionar rota em `frontend/src/App.jsx`

```jsx
import AiAnalysis from "./pages/AiAnalysis";

// dentro das rotas:
<Route path="/ai" element={<AiAnalysis />} />
```

### 3. Adicionar item de navegação no Sidebar/Navbar

```jsx
<NavLink to="/ai">Análise com IA</NavLink>
```

### 4. Instalar `react-markdown` (opcional)

```bash
npm install react-markdown
```

Uso no componente:

```jsx
import ReactMarkdown from "react-markdown";

<ReactMarkdown>{analise}</ReactMarkdown>
```

---

## Critérios de validação — Backend

- [ ] `POST /ai/analysis?mes=06&ano=2026` retorna campo `analise` com texto em português
- [ ] Se `GEMINI_API_KEY` não estiver no `.env`, retorna HTTP 500 com mensagem clara
- [ ] Se a API do Gemini falhar, retorna HTTP 502 com detalhe do erro
- [ ] Mês sem transações retorna análise indicando ausência de dados (não quebra)

## Critérios de validação — Frontend

- [ ] Botão "Analisar" dispara a chamada e exibe estado de loading
- [ ] Texto da análise é renderizado corretamente após a resposta
- [ ] Seletor de mês/ano funciona e atualiza a análise ao clicar em "Analisar"
- [ ] Erro de rede ou API exibe mensagem amigável (não tela em branco)

---

## Observações

- O modelo `gemini-1.5-flash` é recomendado pela relação custo/velocidade; pode ser substituído por `gemini-1.5-pro` para respostas mais elaboradas
- O prompt envia apenas totais agregados — nenhum dado pessoal identificável além de descrições de itens é transmitido
- A chamada ao Gemini pode levar de 3 a 10 segundos — o estado de loading no frontend é obrigatório
- Esta fase não altera nenhum dado da planilha nem dos endpoints existentes
