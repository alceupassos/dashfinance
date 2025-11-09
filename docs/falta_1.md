## Pendências Identificadas (09/11/2025)

- **Corrigir tipagem de billing**  
  Ajustar `app/(app)/admin/billing/pricing/page.tsx`:
  - `supabase.from().update()` reclama porque o payload não bate com o tipo inferido.
  - A chamada genérica (`supabase.from<LLMPricing>`) está sem os dois parâmetros exigidos pela tipagem atual.

- **Pre-commit / security**  
  O hook `setup-hooks.js` aciona `npm run security:all`, que falha pelos erros de TypeScript acima. O commit fica bloqueado até essa correção.

- **Verificação de ambiente**  
  Confirmar em staging/CI se `WASENDER_TOKEN`, `OPENAI_API_KEY` e `ANTHROPIC_API_KEY` estão disponíveis (o `.env.local` fica protegido).

- **Warnings pendentes**  
  Os avisos de `react-hooks/exhaustive-deps` em `app/(app)/whatsapp/conversations/page.tsx` e `components/alias-selector.tsx` permanecem inalterados (já existiam).


