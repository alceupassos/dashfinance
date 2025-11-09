# Lista de Pendências Atuais (09/11/2025)

1. **Corrigir build do frontend (`npm run build`)**
   - Ajustar tipos em `app/(app)/admin/analytics/usage-detail/[userId]/page.tsx` (importar/typedef `AnalyticsMoodDriver`).
   - Resolver avisos `react-hooks/exhaustive-deps` em:
     - `app/(app)/admin/analytics/usage-detail/[userId]/page.tsx`
     - `app/(app)/admin/analytics/user-usage/page.tsx`
     - `app/(app)/whatsapp/conversations/page.tsx`
     - `components/alias-selector.tsx`

2. **Executar scripts do checklist de segurança e dados**
   - Rodar `./scripts/security-check.sh` e tratar as 4 vulnerabilidades moderadas apontadas pelo `npm audit`.
   - Confirmar geração dos types com `supabase gen types` (item pendente do pré-deploy).
   - Reexecutar `SEED_DADOS_TESTE.sql` e `FIX_CNPJ_VAZIOS.sql` no ambiente staging (dependente de credenciais).

3. **Deploy / Integração**
   - Deploy das 15 Edge Functions em staging e validação completa (CORS, auth, logs).
   - Concluir `fase5-checklist` (integração frontend + checagens com time).
   - Preparar deploy em produção após QA (backup, monitoramento, suporte).

4. **Frontend (Codex)**
   - Implementar as 6 páginas e 14 componentes definidos no prompt (substituir mocks pelas APIs reais).
   - Ajustar consumo das novas APIs em `lib/api.ts` após as correções acima.

5. **N8N / Rotinas de Sync**
   - Investigar workflows com erro (“Lost connection to server”) e definir estratégia (scheduler vs. refactor).
   - Verificar cron jobs das rotinas `sync-omie` e `sync-f360` (logs recentes, credenciais, agendamento ativo).

6. **Testes & QA**
   - Rodar suíte completa pós-deploy em staging (sincronização, conciliação, alertas, WhatsApp).
   - Validar performance com dados reais (queries, índices, caching, limits).

> Referências: `CHECKLIST_PRE_DEPLOY.md`, `DIAGNOSTICO_PROBLEMAS.md`, `STATUS_BACKEND_FINAL.txt`.
