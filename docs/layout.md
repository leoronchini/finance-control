# Frontend — Especificação Visual e Estrutural

## Visão Geral

Interface web minimalista e objetiva, pensada para uso no computador. O foco é clareza dos números — sem excesso de elementos visuais.

**Paleta:** dark mode com fundo `#0f1117` e painéis em `#1a1d27`.  
**Destaques:** verde `#22c55e` para entradas, vermelho `#ef4444` para saídas — padrão consolidado em aplicações financeiras.  
**Tipografia:** `Segoe UI` / `system-ui`, corpo em `14px`.  
**Stack:** Vite + React (Fase 5).

---

## Tokens de Design

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0f1117` | Fundo da aplicação |
| `--bg2` | `#1a1d27` | Sidebar e painéis |
| `--bg3` | `#242838` | Inputs, hover, badges |
| `--border` | `#2e3347` | Bordas gerais |
| `--text` | `#e2e8f0` | Texto principal |
| `--muted` | `#7c85a2` | Labels, datas, textos secundários |
| `--green` | `#22c55e` | Entradas, saldo positivo |
| `--red` | `#ef4444` | Saídas, saldo negativo |
| `--blue` | `#3b82f6` | Ações primárias, foco, IA |

---

## Estrutura de Layout

```
┌──────────────┬──────────────────────────────────────────┐
│   Sidebar    │              Conteúdo Principal           │
│  (220px)     │         (restante da largura)             │
│              │  ┌──────────────────────────────────────┐ │
│  Dashboard   │  │  Top Bar (título + Importar PDF)     │ │
│  Transações  │  ├──────────────────────────────────────┤ │
│  Histórico   │  │                                      │ │
│  Res. Item   │  │          Conteúdo da Tela            │ │
│  Res. Grupo  │  │                                      │ │
│  Análise IA  │  ├──────────────────────────────────────┤ │
│              │  │  Footer (última atualização)         │ │
│              │  └──────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────┘
```

### Sidebar

- Largura fixa: `220px`; fundo `--bg2`; borda direita `--border`
- Logo `finance.` no topo — ponto em `--green`
- Itens de navegação com ícone SVG + label
- Item ativo: `border-left: 3px solid --green` + fundo `--bg3`
- Item hover: fundo `--bg3`, texto claro

### Elementos Globais Presentes em Todas as Telas

| Elemento | Posição | Comportamento |
|---|---|---|
| **Botão "Importar PDF"** | Canto superior direito da top bar | Abre modal de upload com drag-and-drop |
| **Seletor de Mês** | Abaixo da top bar (ou na top bar) | `< Junho 2025 >` — navega mês a mês |
| **Footer** | Rodapé de cada tela | `Dados atualizados há X minutos · Atualizar agora` |
| **Toasts** | Canto inferior direito | Desaparecem após 3 s; confirmam ações |

---

## Componentes Reutilizáveis

### Seletor de Mês

```
[ < ]   Junho 2025   [ > ]
```

- Botões `32×32px`, `border-radius: 8px`, fundo `--bg3`
- Label centralizado, `font-size: 16px`, `font-weight: 600`, `min-width: 140px`

### Card de Resumo

```
┌────────────────────────────┐
│  TOTAL DE ENTRADAS         │
│  R$ 8.400,00  ← verde      │
└────────────────────────────┘
```

- `border-radius: 12px`, padding `20px 24px`, fundo `--bg2`
- Label em `--muted`, `12px`, maiúsculas
- Valor em `26px`, `font-weight: 700`

### Painel

Container padrão com `border-radius: 12px`, borda `--border`, fundo `--bg2`, padding `20px`.  
Título interno: `panel-title` — `13px`, `--muted`, maiúsculas, `letter-spacing: 0.5px`.

### Tabela

- Header: `--muted`, `11px`, maiúsculas
- Linhas: separadas por `border-bottom: 1px solid --border`; hover em `--bg3`
- Última linha sem borda inferior

### Badge de Tipo

| Tipo | Fundo | Cor do texto |
|---|---|---|
| `entrada` | `#16a34a22` (verde diluído) | `--green` |
| `saída` | `#dc262622` (vermelho diluído) | `--red` |

### Botões de Ação (inline na tabela)

`28×28px`, `border-radius: 6px`, fundo `--bg3`. Hover: borda `--blue`, texto claro.

### Botões de Filtro

`padding: 6px 14px`, `border-radius: 8px`. Estado ativo: borda e texto `--blue`, fundo `#3b82f611`.

---

## Tela — Dashboard

Tela inicial e mais acessada.

```
top bar:  [< Junho 2025 >]                    [Importar PDF]

cards:    [ Total Entradas ]  [ Total Saídas ]  [ Saldo do Mês ]
          [  R$ 8.400 🟢  ]  [  R$ 5.230 🔴 ]  [  R$ 3.169 🟢 ]

linha 3:
  ┌─────────────────────────┐  ┌────────────────────┐
  │  Maiores Gastos (60%)   │  │ Transações Recentes│
  │  [gráfico de barras]    │  │  (40%)             │
  └─────────────────────────┘  └────────────────────┘

footer: Dados atualizados há 2 minutos · Atualizar agora
```

### Cards de Resumo

- Grid `3 colunas`, gap `16px`, largura total
- `Saldo do Mês`: verde se positivo, vermelho se negativo

### Gráfico de Maiores Gastos (60%)

- Barras verticais `width: 100%` dentro de grupos flex, cor `--red`
- `border-radius: 4px 4px 0 0`; altura proporcional ao valor
- Label abaixo: `10px`, `--muted`, truncado com `text-overflow: ellipsis`

### Transações Recentes (40%)

Até 10 itens. Cada linha:

```
Salário                          +R$ 7.000
01/06/2025 · 09:00
──────────────────────────────────────────
Aluguel                          −R$ 1.800
02/06/2025 · 10:30
```

- Descrição: `font-weight: 500`
- Data/hora: `11px`, `--muted`
- Valor: `font-weight: 600`, verde (entrada) ou vermelho (saída)
- Separador: `border-bottom: 1px solid --border`; último item sem borda

---

## Tela — Transações

Tabela completa das transações do mês com filtros.

```
top bar:  Transações                          [Importar PDF]

filters:  [< Junho 2025 >]  [Todas][Entradas][Saídas]  [🔍 Buscar...]

tabela:
  Data      Hora   Tipo       Descrição   Categoria  Valor        Ações
  01/06     09:00  entrada    Salário     —          R$ 7.000,00  [✏️][🗑️]
  02/06     10:30  saída      Aluguel     —          R$ 1.800,00  [✏️][🗑️]
  ...
```

### Barra de Filtros

- Seletor de mês (padrão global)
- Grupo de filtros por tipo: `Todas · Entradas · Saídas` (toggle, um ativo por vez)
- Campo de busca: `width: 220px`, `border-radius: 8px`, foco em `--blue`

### Modal de Edição

Ativado pelo ícone ✏️. Sobrepõe a tela com overlay `#00000088`.

```
┌─────────────────────────────────┐
│  Editar Transação               │
│                                 │
│  Valor     [____________]       │
│  Descrição [____________]       │
│  Categoria [____________]       │
│  Data      [____________]       │
│                                 │
│              [Cancelar] [Salvar]│
└─────────────────────────────────┘
```

- Modal: `width: 420px`, `border-radius: 14px`, fundo `--bg2`
- Clicar fora do modal o fecha
- Ao salvar: fecha o modal e dispara toast `"Edição salva com sucesso."`

---

## Tela — Histórico

Evolução financeira ao longo dos meses.

```
top bar:  Histórico                           [Importar PDF]

painel:   Entradas × Saídas por Mês
          [gráfico de barras agrupadas: Jan–Jun]
          Legenda: 🟢 Entradas   🔴 Saídas

tabela:   Mês            Entradas    Saídas      Saldo
          Janeiro 2025   R$ 7.000    R$ 4.800    R$ 2.200
          ...
```

### Gráfico de Barras Agrupadas

- Por mês: duas barras lado a lado — verde (entradas) e vermelha (saídas)
- `width: 22px` por barra, `border-radius: 4px 4px 0 0`, gap `4px` entre as duas
- Altura proporcional ao valor; label do mês abaixo em `10px`, `--muted`

### Tabela Resumida

Colunas: `Mês · Entradas · Saídas · Saldo`  
Entradas em `--green`, saídas em `--red`, saldo em `--green` / `--red` conforme o valor, `font-weight: 600`.

---

## Tela — Resumo por Item

Gastos detalhados por descrição no mês.

```
top bar:  Resumo por Item                     [Importar PDF]

          [< Junho 2025 >]              [Tabela] [Gráfico ✓]

painel:   Gastos por Descrição — Junho 2025

  Aluguel      ████████████████████  R$ 1.800
  Mercado      ███████████           R$ 1.008
  Gasolina     ████████              R$ 560
  Streaming    █████                 R$ 390
  Farmácia     ████                  R$ 272
  Academia     ███                   R$ 200
  Restaurante  ██                    R$ 120
```

### Modo Gráfico (barras horizontais)

- Layout: `label (120px, alinhado à direita) | barra (flex-grow) | valor (80px)`
- Track: `height: 18px`, fundo `--bg3`, `border-radius: 4px`
- Fill: `background: --red`, `border-radius: 4px`, largura percentual relativa ao maior item
- Valor: `12px`, `font-weight: 600`, `--red`

### Modo Tabela

Colunas: `Descrição · Total Gasto · Nº de Lançamentos · % do Total de Saídas`  
Ordenado do maior para o menor valor.

---

## Tela — Resumo por Grupo

Gastos agrupados por categoria.

```
top bar:  Resumo por Grupo                    [Importar PDF]

          [< Junho 2025 >]

cards (2 colunas):
  ┌─────────────────┐  ┌─────────────────┐
  │ Gastos Fixos    │  │ Alimentação     │
  │ R$ 2.000,00     │  │ R$ 1.428,00     │
  │ 38,2% saídas    │  │ 27,3% saídas    │
  │ • Aluguel 1.800 │  │ • Mercado 1.008 │
  │ • Academia 200  │  │ • Restaurante120│
  └─────────────────┘  └─────────────────┘
  ┌─────────────────┐  ┌─────────────────┐
  │ Transporte      │  │ Lazer & Assin.  │
  │ R$ 560,00       │  │ R$ 390,00       │
  │ 10,7% saídas    │  │ 7,5% saídas     │
  │ • Gasolina 560  │  │ • Streaming 390 │
  └─────────────────┘  └─────────────────┘

painel:   Proporção por Grupo
          [donut chart]  🔴 Gastos Fixos 38,2%
                         🟠 Alimentação 27,3%
                         🟣 Transporte 10,7%
                         🔵 Lazer 7,5%
```

### Cards de Grupo

- Grid `2 colunas`, gap `16px`
- Cada card: `border-radius: 12px`, padding `18px`, fundo `--bg2`
- Nome do grupo: `font-weight: 600`
- Total: `20px`, `font-weight: 700`, `--red`
- Percentual: `11px`, `--muted`
- Itens internos: flex row `justify-content: space-between`, `12px`, `--muted` / `--text`

### Gráfico de Pizza (Donut)

- SVG `160×160px`, raio externo `60`, stroke-width `28`, furo central preenchido com `--bg2`
- Cada grupo: cor distinta (`--red`, `#f97316`, `#a855f7`, `--blue`)
- Legenda ao lado: dot colorido + label + percentual em negrito

---

## Tela — Análise IA

```
top bar:  Análise IA                          [Importar PDF]

          [< Junho 2025 >]

── Estado Inicial ──────────────────────────────────────────
painel:   [ Gerar Análise do Mês ]  ← botão centralizado
          A análise considera todas as transações do mês selecionado.

── Após Geração ────────────────────────────────────────────
                                              [↺ Regenerar]

┌─ Padrão de Consumo ───────────────────────────────────────┐
│ Você gastou R$ 5.230,50 em junho, concentrando 65% das   │
│ saídas em apenas três categorias...                       │
└───────────────────────────────────────────────────────────┘
┌─ Maior Gasto ─────────────────────────────────────────────┐
│ O item de maior impacto foi Aluguel com R$ 1.800...       │
└───────────────────────────────────────────────────────────┘
┌─ Comparativo com Mês Anterior ────────────────────────────┐
│ Em comparação com maio (R$ 5.500), as saídas de junho...  │
└───────────────────────────────────────────────────────────┘
┌─ Sugestão de Economia ────────────────────────────────────┐
│ O gasto em Streaming somou R$ 390 entre múltiplas...      │
└───────────────────────────────────────────────────────────┘
```

### Estado Inicial

- Painel único centralizado (`min-height: 300px`)
- Botão "Gerar Análise do Mês": fundo `--blue`, `padding: 12px 28px`, `border-radius: 10px`, `15px`, `font-weight: 600`
- Hint abaixo: `12px`, `--muted`

### Estado Após Geração

- Botão "↺ Regenerar" alinhado à direita, estilo `import-btn`
- Blocos por tema: `border-radius: 10px`, fundo `--bg3`, padding `16px 20px`
- Título do bloco: `font-weight: 600`, cor `--blue`, `13px`
- Conteúdo: `--muted`, `line-height: 1.6`, `13px`
- Temas padrão: **Padrão de Consumo · Maior Gasto · Comparativo com Mês Anterior · Sugestão de Economia**

---

## Modal de Importação de PDF

Disponível via botão "Importar PDF" em qualquer tela.

```
┌──────────────────────────────────────────┐
│  Importar PDF                            │
│                                          │
│  ┌──────────────────────────────────┐   │
│  │                                  │   │
│  │   Arraste o arquivo aqui ou      │   │
│  │   clique para selecionar         │   │
│  │                                  │   │
│  └──────────────────────────────────┘   │
│                                          │
│  [Cancelar]                [Confirmar]  │
└──────────────────────────────────────────┘
```

Após upload: exibe tela de revisão dos itens extraídos antes de confirmar importação.

---

## Sistema de Toasts

- Posição: `fixed`, canto inferior direito (`bottom: 24px; right: 24px`)
- Estilo: fundo `--bg3`, borda `--green`, texto `--green`, `border-radius: 10px`
- Duração: desaparecem automaticamente após **3 segundos**
- Exemplos de mensagens:
  - `"Edição salva com sucesso."`
  - `"Transação excluída."`
  - `"Importação concluída."`
