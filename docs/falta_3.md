# Pendências Restantes

1. Corrigir erro de build: ajustar `AlertsList` em `app/(app)/admin/analytics/usage-detail/[userId]/page.tsx` para aceitar os dados de alertas retornados (atualmente tratados como `AnalyticsMoodDriver[]`). Após a correção, rerodar `npm run build` e garantir que a build passe sem erros críticos.
2. Executar o checklist pré-deploy conforme `CHECKLIST_PRE_DEPLOY.md`: `npm run security:all`, `npm run data:consistency`, validar `.env.local` e registrar logs/prints com os resultados no documento.
3. Rodar seed/testes: aplicar `SEED_DADOS_TESTE.sql`, executar `./run-all-tests.sh` e atualizar `DEPLOYMENT_VALIDATION.md` (ou doc equivalente) com o passo a passo e status (sucessos/falhas).
4. Repetir `npm run build` após as correções/acertos acima para confirmar que o build final está ok antes do deploy.
