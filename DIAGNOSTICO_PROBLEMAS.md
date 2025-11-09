# 🔍 Diagnóstico de Problemas Identificados

**Data:** 09/11/2025  
**Status:** Investigação em andamento

---

## Problema 1: N8N Workflows com Erro

### Sintoma
4 workflows importados dão "Lost connection to the server":
- Dashboard Cards Pre-Processor
- ERP Sync - OMIE Intelligent
- ERP Sync - F360 Intelligent
- WhatsApp Bot v3

### Possíveis Causas
1. Query SQL muito complexa causa timeout
2. Cross joins com tabelas vazias
3. N8N na VPS com problema de memória/firewall
4. Versão incompatível

### Recomendação
✅ Usar N8N apenas como scheduler, lógica nas Edge Functions

### Status
⏳ Requer investigação em staging

---

## Problema 2: Tabela `clientes` com CNPJs Vazios

### Impacto
10 empresas ativas sem CNPJ

### Verificação
```sql
SELECT cnpj, razao_social, status
FROM clientes
WHERE status = 'Ativo' AND (cnpj IS NULL OR cnpj = '');
```

### Solução Possível
1. Popular CNPJs faltantes (se disponível)
2. Marcar como inativas (se não temos CNPJ)

### Status
⏳ Requer validação de dados

---

## Problema 3: Tabelas Vazias

### Tabelas críticas vazias
- `transactions`
- `omie_config`
- `f360_config`
- `daily_snapshots`

### Impacto
Workflows não podem ser testados sem dados

### Solução
1. Criar script de seed com dados fictícios
2. OU conectar com integrações reais

### Status
⏳ Requer seed data ou integração

---

## Problema 4: Syncs Parados

### Observação
Syncs F360/OMIE não rodam há meses (última: Janeiro 2025)

### Ações Necessárias
1. Verificar logs de `sync-omie` e `sync-f360`
2. Verificar se Cron jobs estão configurados
3. Testar manualmente as Edge Functions
4. Verificar credenciais OMIE/F360

### Status
⏳ Requer investigação de infraestrutura

---

## 📊 Resumo de Prioridades

| Problema | Prioridade | Impacto | Tempo |
|----------|-----------|--------|-------|
| N8N Workflows | 🟡 Média | Automações para | 4h |
| CNPJs Vazios | 🟡 Média | 10 empresas | 1h |
| Tabelas Vazias | 🟢 Baixa | Testes | 2h |
| Syncs Parados | 🔴 Alta | Integração | 3h |

---

## ✅ Próximos Passos

1. **Hoje:** Documentar estado atual
2. **Amanhã:** Investigar Problema 4 (Syncs Parados)
3. **Próxima semana:** Resolver Problemas 2-3
4. **Depois:** N8N optimization

