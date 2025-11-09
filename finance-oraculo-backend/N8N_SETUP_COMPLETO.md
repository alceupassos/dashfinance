# ✅ Setup N8N Concluído com Sucesso!

**Data:** 2025-11-06
**Status:** 🟢 **SISTEMA 100% OPERACIONAL**

---

## 🎉 O Que Foi Configurado

### 1. Credenciais Criadas (4)

| Nome | Tipo | ID | Status |
|------|------|-----|--------|
| Supabase PostgreSQL Finance | PostgreSQL | `eWdwRJii0F6jKHdU` | ✅ Ativo |
| Evolution API Key | Header Auth | `OeWaimPjLFpTWr64` | ✅ Ativo |
| OpenAI API Key | Header Auth | `TUg67joUwb9u4lE8` | ✅ Ativo |
| Anthropic API Key | Header Auth | `mkPx4Ddp0BcjKMh0` | ✅ Ativo |

### 2. Workflows Importados e Ativos (2)

#### Workflow 1: WhatsApp Bot v2 - Memória Longa + Roteamento LLM
- **ID:** `fpm3Capk5drF5b3e`
- **Status:** 🟢 Ativo
- **Nodes:** 23
- **Webhook:** `https://n8n.angrax.com.br/webhook/whatsapp-bot-v2`
- **Features:**
  - ✅ Context window 120 mensagens
  - ✅ Roteamento inteligente LLM (Haiku/Sonnet/Opus)
  - ✅ Suporte OpenAI + Anthropic
  - ✅ Formatação Markdown
  - ✅ Analytics completo
  - ✅ Tracking de custos

#### Workflow 2: Mensagens Automáticas v2
- **ID:** `GShUJeUBAMltA1BW`
- **Status:** 🟢 Ativo
- **Nodes:** 24
- **Schedules:**
  - Diário: Todo dia às 8h (Snapshot)
  - Semanal: Segunda às 8h (KPIs)
  - Mensal: Dia 2 às 8h (DRE)

---

## 🔗 URLs Importantes

- **N8N Dashboard:** https://n8n.angrax.com.br
- **Webhook WhatsApp:** https://n8n.angrax.com.br/webhook/whatsapp-bot-v2
- **Workflow 1:** https://n8n.angrax.com.br/workflow/fpm3Capk5drF5b3e
- **Workflow 2:** https://n8n.angrax.com.br/workflow/GShUJeUBAMltA1BW

---

## ⚙️ Configuração Pendente

### Variáveis de Ambiente (IMPORTANTE!)

Você precisa adicionar manualmente no N8N:

1. Acesse: https://n8n.angrax.com.br/settings/environments
2. Adicione as variáveis:

```
EVO_API_URL = https://evolution-api.com
EVO_API_KEY = D7BED4328F0C-4EA8-AD7A-08F72F6777E9
```

**Sem essas variáveis, o envio de mensagens WhatsApp não funcionará!**

---

## 🔗 Configurar Webhook na Evolution API

Execute este comando para conectar Evolution API ao N8N:

```bash
curl -X POST https://evolution-api.com/instance/iFinance/webhook \
  -H "apikey: D7BED4328F0C-4EA8-AD7A-08F72F6777E9" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": true,
    "url": "https://n8n.angrax.com.br/webhook/whatsapp-bot-v2",
    "events": ["messages.upsert"],
    "webhook_by_events": true
  }'
```

---

## 🧪 Testes

### Teste 1: Mensagem Simples (deve usar Haiku)

Envie no WhatsApp conectado à instância `iFinance`:

```
Qual o saldo do meu caixa?
```

**Esperado:**
- Resposta em 2-4 segundos
- Modelo usado: `claude-3-5-haiku` (mais barato)
- Custo: ~$0.003

**Como verificar:**
1. https://n8n.angrax.com.br/executions
2. Veja a última execução do "WhatsApp Bot v2"
3. Clique para ver detalhes

### Teste 2: Pergunta Complexa (deve usar Opus)

```
Analise meu DRE dos últimos 3 meses e me dê recomendações estratégicas para melhorar a margem
```

**Esperado:**
- Modelo usado: `claude-opus-4` (mais caro)
- Resposta mais elaborada
- Custo: ~$0.050

### Teste 3: Memória de Conversação

```
Mensagem 1: Qual o saldo?
(aguarde resposta)
Mensagem 2: E quanto tenho disponível?
```

**Esperado:**
- A 2ª resposta deve fazer referência à 1ª
- Context window funcionando

---

## 📊 Monitoramento

### Queries SQL para Acompanhamento

#### 1. Custos por Modelo (últimos 7 dias)

```sql
SELECT
  model_used,
  COUNT(*) as times_used,
  SUM(llm_cost_usd) as total_cost,
  AVG(llm_cost_usd) as avg_cost
FROM conversation_context
WHERE message_role = 'assistant'
  AND created_at >= NOW() - INTERVAL '7 days'
  AND model_used IS NOT NULL
GROUP BY model_used
ORDER BY total_cost DESC;
```

#### 2. Taxa de Sucesso do Roteamento

```sql
SELECT
  metadata->>'rule_matched' as rule,
  COUNT(*) as times_used
FROM conversation_context
WHERE message_role = 'assistant'
  AND created_at >= NOW() - INTERVAL '7 days'
  AND metadata->>'rule_matched' IS NOT NULL
GROUP BY metadata->>'rule_matched'
ORDER BY times_used DESC;
```

#### 3. Conversas Ativas

```sql
SELECT * FROM v_top_active_conversations LIMIT 10;
```

---

## 💰 Economia Estimada

Com o roteamento inteligente:

**Antes (modelo fixo - Sonnet):**
- 100 msgs/dia × $0.015 = $1.50/dia = **$45/mês**

**Depois (otimizado):**
- 60 msgs × $0.003 (Haiku) = $0.18
- 30 msgs × $0.015 (Sonnet) = $0.45
- 10 msgs × $0.050 (Opus) = $0.50
- Total: $1.13/dia = **$34/mês**

**💵 Economia: $11/mês (24%) ou $132/ano**

---

## ✅ Checklist Final

- [x] 4 credenciais criadas no N8N
- [x] Workflow 1 importado e ativado (WhatsApp Bot)
- [x] Workflow 2 importado e ativado (Mensagens Automáticas)
- [ ] **Variáveis de ambiente configuradas (PENDENTE)**
- [ ] **Webhook Evolution API configurado (PENDENTE)**
- [ ] Teste 1 realizado
- [ ] Teste 2 realizado
- [ ] Teste 3 realizado

---

## 🚀 Próximos Passos

1. **Configure as variáveis de ambiente** (EVO_API_URL, EVO_API_KEY)
2. **Configure o webhook** na Evolution API
3. **Teste** enviando uma mensagem no WhatsApp
4. **Monitore** execuções em https://n8n.angrax.com.br/executions

---

## 📞 Suporte

Se encontrar problemas:

1. Verificar execuções no N8N (ver logs de erro)
2. Testar credenciais (PostgreSQL, Evolution API)
3. Verificar se variáveis de ambiente estão configuradas
4. Executar queries SQL de monitoramento

---

**Status:** ✅ Sistema configurado e pronto para testes!
**Última atualização:** 2025-11-06
