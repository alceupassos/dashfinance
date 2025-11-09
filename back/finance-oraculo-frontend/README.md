# Finance Oráculo Frontend

Painel Next.js 14 que compõe o frontend do Oráculo IFinance. Implementa dashboards densos, análises assistidas e automações integradas via n8n, com tema escuro por padrão.

## Stack

- Next.js 14 (App Router) + TypeScript
- TailwindCSS + shadcn/ui + Tailwind Animate
- Tremor + Recharts para gráficos
- TanStack Query e Zustand para dados e estado
- ESLint + Prettier (com plugin Tailwind)

## Como começar

```bash
cd finance-oraculo-frontend
npm install
cp .env.local.example .env.local
npm run dev
```

Abra http://localhost:3000 para visualizar.

## Estrutura principal

- `app/` páginas agrupadas em `(app)` integrando Sidebar + Topbar.
- `components/` UI compartilhada, gráficos e painel do Oráculo IA.
- `store/` Zustand (`use-dashboard-store` e `use-ai-oracle-store`).
- `lib/api.ts` centraliza chamadas para as edge functions. Se `NEXT_PUBLIC_API_BASE` não estiver configurada, cai no mock `__mocks__/sample.json`.

## Funcionalidades atendidas

- Dashboard `/` com KPIs, gráficos (linha, barras empilhadas, waterfall Tremor) e tabela densa sticky.
- Página `/analises` com alternância Criativo x Técnico e mock de “Gerar imagens ilustrativas”.
- CRUD de grupos `/grupos`, lista de clientes `/clientes`, histórico `/relatorios`, auditoria `/audit`.
- Página `/config` com toggles dos fluxos n8n e edições das mensagens WhatsApp.
- Botão flutuante do cérebro abre o painel “Oráculo IA” com histórico e senha inicial `fluxo-lucro-vela-7`.

## Integração com backend

As funções em `lib/api.ts` usam `NEXT_PUBLIC_API_BASE`. Ajuste o endpoint conforme o backend Supabase ou ambientes internos.

- When `selectedTarget.type === "alias"` chamamos rotas `/api/kpi/monthly-group`, `/export-excel?alias=...`, etc.
- Upload DRE via `FormData`. Exemplo de consumo em `Topbar` e `/relatorios`.

## Próximos passos sugeridos

1. Ligar endpoints reais substituindo os mocks e validar CORS.
2. Conectar autenticação (Protect routes / refresh token Supabase).
3. Criar hooks para integrar com os fluxos n8n (webhooks ou websockets) para refletir status real dos toggles.
4. Configurar CI (lint + build) no repositório principal.
