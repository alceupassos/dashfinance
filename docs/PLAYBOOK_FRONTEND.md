# 📘 Playbook de Reconstrução – Finance Oráculo Frontend (2025-11-07)

Este playbook consolida o conteúdo do arquivo `PROMPT_COMPLETO_FRONTEND_PARA_CODEX.md` (6.5k linhas), das referências visuais extras e das novas diretrizes definidas hoje com o cliente. Será a fonte única para o rebuild do frontend.

## 1. Fundamentos
- **Stack**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui, React Query, Zustand, TanStack Table, React Hook Form + Zod, Recharts, Framer Motion.
- **Pasta base**: `finance-oraculo-frontend/` (App Router). Estrutura sugerida no prompt deve ser seguida (`app/(auth)`, `app/(app)/*`, `components/charts`, `components/ui`, `lib/api`, `store`, `docs`).
- **Variáveis**: usar Supabase (`NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`) e endpoint das Edge Functions `https://xzrmzmcoslomtzkzgskn.functions.supabase.co`. Arquivo `.env.local.example` será atualizado quando necessário.

## 2. Autenticação (Modo DEV)
- Implementar fluxo completo Supabase Auth (client, RoleGuard, middleware) **mas** manter `AUTH_MODE=dev` ativado para desenvolvimento: o app sobe sem exigir credenciais e usa um usuário mockado.
- Documentar claramente no README como trocar para modo produção (ativar middleware/cookies). O código do login real já ficará pronto para uso futuro.

## 3. Dashboard & Sistema de Cards
- Usar o novo sistema de cards pré-calculados (12 cards em 50–100 ms) vindo de `v_dashboard_cards_valid` / `dashboard_cards` endpoint.
- Componentes obrigatórios: `DashboardCards`, `MetricCard`, `TrendCard`, `AlertCard`, `ChartCard`.
- Gráficos principais: Receita × Despesa × Lucro (line), Cashflow in/out (stacked bar), comparativo mensal e alertas laterais, seguindo o layout do screenshot fornecido.

## 4. Análises IA (Oráculo Financeiro)
- Builder `buildAnalysisReport` gera header + blocos (Panorama, Lucro & Margens, Custos, Caixa & Liquidez, Riscos & Oportunidades, Checklist 30/60/90).
- Cada bloco possui cards, gráficos, highlights e narrativa textual (estilos “Creative GPT‑5” ou “Técnico Claude”).
- Botão “Reprocessar” chama `/analyze`; estados loading/erro/vazio com CTAs apropriados.
- Integração com Gemini/Nano Banana para gerar imagens de capa quando disponível.

## 5. Admin & Segurança
- Páginas CRUD: `/admin/users`, `/admin/api-keys`, `/admin/llm-config`, `/admin/llm-usage`.
- Segurança (Grafana style): `/admin/security/overview`, `/traffic`, `/database`, `/sessions`, `/backups`, `/security` usando `GrafanaLineChart`, `GrafanaAreaChart`, `GrafanaBarChart`.
- Dados vêm dos novos endpoints `admin-security-*` com seeds já existentes.

## 6. Relatórios, Empresas e WhatsApp
- `/empresas` com filtros por status/integration e cards de resumo.
- `/relatorios/dre`, `/cashflow`, `/kpis`: gráficos, tabelas, export Excel.
- `/whatsapp/conversations`, `/scheduled`, `/templates`: UI moderna (cards, timelines).
- Fluxos `upload-dre` e `export-excel` com feedback visual.

## 7. Componentes Compartilhados & Estilo
- Criar biblioteca consistente: `StatusBadge`, `TagChip`, `Grafana*`, `DonutChart`, `SimpleBarChart`, `DataTable`, etc.
- Layout dark premium (gradientes aqua/roxo, cantos arredondados, sombras suaves) inspirado nos novos screenshots; versões claras pastel também devem ser possíveis.
- Animações suaves e feedback visual de alto nível (Framer Motion + shadcn/ui).

## 8. Workflow & Checkpoints
- Registrar progresso no `.plan.md` e no RAG (`.codex/SESSION_2025-11-07_FRONTEND.md`) a cada incremento de **5 %**.
- Cada checkpoint deve gerar um commit no Git com mensagem `feat(frontend): ... (XX%)` ou similar.
- Lint/build/preview local obrigatórios no final de cada fase relevante.

## 9. Referências e Assets
- Documentar todos os links/imagens de referência usados (dashboards claros/escuros, gráficos complexos). Sempre se basear nelas para manter a identidade.

## 10. Próximos Passos Imediatos
1. Reconfigurar o projeto para modo DEV sem autenticação obrigatória (remover middleware, ajustar `use-user-store`).
2. Atualizar `lib/api.ts` e stores para usar mocks/real endpoints conforme prompt.
3. Iniciar Fase 1 do checklist (Setup + Dashboard base) e marcar o progresso em 5 % no próximo commit.

> Todo o restante do conteúdo (exemplos de código, checklist de 20 fases, detalhes de cada componente) continua disponível em `PROMPT_COMPLETO_FRONTEND_PARA_CODEX.md`. Este playbook é o mapa rápido para consulta diária.
