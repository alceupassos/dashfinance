## Pendências Atuais

- Corrigir o erro de TypeScript em `app/(app)/admin/billing/pricing/page.tsx` (tipagem do `supabase.from().update`) para liberar `npm run build` e `npm run security:all`.
- Tratar os avisos `react-hooks/exhaustive-deps` em `app/(app)/whatsapp/conversations/page.tsx` e `components/alias-selector.tsx` para limpar o lint.
- Validar os secrets sensíveis (`WASENDER_TOKEN`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`) via `supabase secrets list` ou pipeline CI antes do deploy.
- Reexecutar `npm audit` após o ajuste das dependências e aplicar correções (as 4 vulnerabilidades moderadas ainda precisam ser tratadas).
- Após as correções acima, repetir `npm run lint`, `npm run build`, `npm run security:all` e `npm run data:consistency` para gerar um checklist final válido.

