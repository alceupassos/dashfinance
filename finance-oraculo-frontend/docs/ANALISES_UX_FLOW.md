# 📊 Página "Análises Assistidas" – Fluxo UX & estados

Documento oficial para guiar o redesign e implementação definitiva da página `app/(app)/analises/page.tsx`. Serve para qualquer agente (Codex ou subprompt) entender layout, interações, dados necessários e como tratar erros/estados vazios.

---

## 1. Objetivo da tela
- Entregar um **relatório narrativo** para o cliente selecionado combinando DRE, fluxo de caixa, alertas e saídas do endpoint `/analyze` (LLM).
- Permitir reprocessamento rápido com estilos diferentes (Técnico/ Criativo) e salvar os highlights principais.
- Disponibilizar blocos visuais (gráficos, listas, tabelas) que reforçam cada parágrafo de texto.

## 2. Estrutura macro
| Zona | Conteúdo | Fonte de dados |
|------|----------|----------------|
| **Toolbar** | Breadcrumb "Análises assistidas", seletor de estilo atual, botões "Gerar imagens" e "Reprocessar" | Zustand `useDashboardStore`, mutations `/analyze` |
| **Header** | Título (empresa ou grupo), período (store), score 0-100, cards de KPIs e resumo narrativo | `buildAnalysisReport(header)` que usa `kpi`, `dashboardMetrics`, `profile` |
| **Blocos visuais** | 3–4 cards por seção com título, descrição, gráfico/tabela/lista e highlights | `buildAnalysisReport(blocks)` + `analyzeOutput.sections` |
| **Checklist** | Lista com próximos passos gerados automaticamente | `buildAnalysisReport(checklist)` |
| **Ações auxiliares** | Botões para salvar PDF, enviar por WhatsApp, abrir histórico | backlog (placeholder) |

## 3. Fluxo de dados
1. **Entrada**: `selectedTarget`, intervalo vigente e `analysisStyle` do store.
2. **Fetcher primário**: `postAnalyze(style, target)` → chamada Edge Function `/analyze` (usa Agent Skill financial-cards + builder TS).
3. **Builder**: `buildAnalysisReport({profile, kpi, metrics, analyzeOutput})` agrega dados já carregados no dashboard (`react-query`).
4. **Saída**: objeto `AnalysisReport` com `header`, `blocks`, `checklist`, `status`.

### Estados obrigatórios
- `loading`: shimmer + card “Carregando narrativa do oráculo…”.
- `error`: card vermelho com opção “Tentar novamente”.
- `empty`: quando `blocks.length === 0` → mensagem “Ainda não há dados suficientes para gerar um relatório. Suba um DRE ou rode uma sincronização OMIE/F360.”
- `success`: renderizar layout completo.

## 4. Componentização sugerida
```
analises/
  AnalysisHeader.tsx     // score + cards + summary
  AnalysisBlock.tsx      // bloco visual + highlights
  AnalysisChecklist.tsx  // lista numerada com CTA
  AnalysisEmptyState.tsx // mensagem e botões para subir DRE/sincronizar
```

Cada componente recebe apenas o pedaço necessário do `AnalysisReport` para facilitar testes unitários.

## 5. Interações
- **Alterar estilo** (criativo/técnico): abre `Sheet` lateral com descrições → atualiza `analysisStyle` e força `refetch`.
- **Reprocessar**: chama `refetch()` e mostra `Button` com spinner `isFetching`.
- **Gerar imagens**: botão dispara ação assíncrona (`functions/analyze` + Gemini) → placeholder exibindo toast.
- **Hover no score badge**: tooltip com legenda `OK / Alerta / Crítico` de acordo com `report.status`.

## 6. Visuals (layouts)
1. **Header cards**: `Grid sm:grid-cols-2 lg:grid-cols-4`, cada card com label, valor e tooltip.
2. **Line chart**: usa Tremor `LineChart` com série receita/despesa/lucro. Dados já formatados no builder.
3. **Cashflow bars**: `BarChart` comparando entradas x saídas.
4. **Tabela DRE**: `Table` responsiva, permite download CSV (CTA secundário).
5. **Lista de alertas**: badges coloridos de acordo com `variant`.

## 7. Checklist lógico
1. Buscar dados prévios (`profile`, `kpi`, `metrics`) já carregados pelo dashboard.
2. Invocar `postAnalyze` e mesclar com `buildAnalysisReport`.
3. Renderizar componentes seguindo estados descritos acima.
4. Logar ação no RAG (`SESSION_2025-11-07_FRONTEND.md`).
5. Garantir responsividade (empilha em 1 coluna < 1024px).

## 8. Edge cases & requisitos não-funcionais
- **Timeout** do `/analyze`: após 25s mostrar fallback textual “Use o último relatório salvo (link)”.
- **Sem dados de DRE**: builder retorna score 0 e status `critical` → forçar exibição do empty-state + CTA “Upload DRE”.
- **Acessibilidade**: botões com `aria-live` para feedback, gráficos com descrições no footer.
- **Performance**: memorizar blocos com `useMemo` e evitar re-render enquanto `isFetching` (usar `dataUpdatedAt`).

---

> Toda alteração na UX desta página deve atualizar este documento + checklist em `.codex/PROMPT_CHECKLIST.md` antes da entrega.

