# ⚠️ Reverter Dashboard Cards para Edge Function

**Data:** 2025-11-06
**Decisão:** Workflow muito complexo, muitos erros, reverter para Edge Function

---

## 🔧 Ações Necessárias

### 1. No N8N - Desativar e Deletar Workflow

```
1. Acessar: https://n8n.angrax.com.br
2. Abrir workflow "Dashboard Cards Pre-Processor"
3. Desativar (toggle cinza)
4. Deletar workflow (⋮ menu → Delete)
```

### 2. Edge Function já existe

A Edge Function de Dashboard Cards **já deve existir** no Supabase. Não precisa recriar.

**Verificar se existe:**
```
Supabase Dashboard → Edge Functions → Procurar por "dashboard-cards"
```

Se não existir, avisar para eu criar.

---

## 📊 Status Atualizado dos Workflows N8N

### ✅ Workflows que FICAM no N8N (funcionam):
1. **WhatsApp Bot v3** - Importado, aguardando configuração
2. **ERP Sync OMIE** - Importado, query corrigida
3. **ERP Sync F360** - Importado, query corrigida

### ❌ Workflows REMOVIDOS do N8N (muito complexos):
1. **Dashboard Cards** - Voltou para Edge Function

---

## 💰 Nova Economia Esperada

**Antes (tudo em N8N):**
- Economia: $68.50/mês

**Agora (sem Dashboard Cards no N8N):**
- WhatsApp Bot v3: $43.50/mês
- ERP Sync OMIE: $5/mês
- ERP Sync F360: $5/mês
- **Total:** $53.50/mês (93% economia)

**Dashboard Cards continua custando ~$15/mês** como Edge Function.

---

## 🎯 Próximos Passos

1. ✅ Deletar workflow Dashboard Cards do N8N
2. ⏳ Testar workflows de ERP Sync (simples, devem funcionar)
3. ⏳ Configurar WhatsApp Bot v3 quando houver dados

---

## 📝 Lições Aprendidas

**Dashboard Cards NÃO é bom candidato para N8N porque:**
- Query muito complexa (6 CTEs, 130 linhas)
- Depende de múltiplas tabelas vazias
- Difícil de debugar sem dados
- Cross joins podem causar timeouts

**Melhor manter como Edge Function onde:**
- Controle total do código
- Melhor para queries complexas
- Mais fácil de debugar
- Já está funcionando

---

**Decisão:** Dashboard Cards **permanece como Edge Function**. Foco agora nos workflows simples de ERP.
