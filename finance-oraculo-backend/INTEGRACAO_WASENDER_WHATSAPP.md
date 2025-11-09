# 📱 INTEGRAÇÃO WASENDER - WHATSAPP BUSINESS API

## 🎯 VISÃO GERAL

Este documento descreve a integração com **WASender** para envio de alertas via WhatsApp no sistema de gestão financeira.

## 🔧 CONFIGURAÇÃO INICIAL

### 1. Criar Conta WASender

1. Acesse [WASender](https://wasender.com) e crie uma conta
2. Crie uma nova instância WhatsApp
3. Conecte seu número WhatsApp Business à instância
4. Anote:
   - **API URL**: `https://api.wasender.com` (ou sua instância)
   - **API Key**: Sua chave de API
   - **Instance ID**: ID da sua instância

### 2. Configurar no Supabase

Execute o SQL abaixo para adicionar as credenciais:

```sql
-- Inserir configuração WASender (substitua pelos seus dados)
insert into wasender_config (
  workspace_id,
  api_url,
  api_key_enc,
  instance_id,
  ativo
) values (
  'seu-workspace-id'::uuid,
  'https://api.wasender.com',
  pgp_sym_encrypt(
    'sua-api-key-aqui',
    (select decrypted_secret from vault.decrypted_secrets where name = 'encryption_key' limit 1)
  ),
  'seu-instance-id',
  true
);
```

### 3. Configurar Números de Usuários

Adicione números WhatsApp aos usuários:

```sql
-- Atualizar usuário com número WhatsApp
update users
set 
  nome = 'João Silva',
  telefone = '+55 11 99999-9999',
  telefone_whatsapp = '+5511999999999'  -- Formato: +DDI + DDD + Número (sem espaços/hífens)
where email = 'joao@empresa.com';
```

**⚠️ IMPORTANTE:** O formato do número deve ser:
- `+5511999999999` (Brasil)
- Incluir código do país (+55)
- Incluir DDD
- SEM espaços, hífens ou parênteses

---

## 📚 COMO FUNCIONA

### Fluxo de Envio

```
┌─────────────────────┐
│ check-alerts        │ ── Verifica regras ──┐
│ (CRON 15min)        │                       │
└─────────────────────┘                       ▼
                                    ┌─────────────────────┐
                                    │ Criar Alerta        │
                                    │ (financial_alerts)  │
                                    └─────────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────────┐
                                    │ send-alert-whatsapp │
                                    │ (Edge Function)     │
                                    └─────────────────────┘
                                              │
                                              ├─ Formata mensagem
                                              ├─ Chama WASender API
                                              ├─ Registra notificação
                                              └─ Atualiza alerta
                                              
                                              ▼
                                    ┌─────────────────────┐
                                    │ WhatsApp do Usuário │
                                    └─────────────────────┘
```

### Edge Functions Criadas

1. **`send-alert-whatsapp`** - Envia alerta individual via WhatsApp
2. **`check-alerts`** - Verifica regras e cria alertas (CRON)
3. **`escalate-alert`** - Escalona alertas não respondidos (CRON)
4. **`alert-summary-daily`** - Resumo diário (CRON)

---

## 🚀 USANDO A INTEGRAÇÃO

### 1. Enviar Alerta Manual

```typescript
// Chamar Edge Function
const { data, error } = await supabase.functions.invoke('send-alert-whatsapp', {
  body: {
    alert_id: 'uuid-do-alerta',
    alert_rule_id: 'uuid-da-regra', // opcional
    workspace_id: 'uuid-do-workspace',
    formato: 'detalhado' // ou 'resumido', 'completo'
  }
});
```

### 2. Testar Conexão WASender

```typescript
import { getWASenderConfig, testarWASender } from '../common/wasender.ts';

// Testar conexão
const config = await getWASenderConfig(supabase, workspaceId);
const resultado = await testarWASender(config);

if (resultado.success) {
  console.log('✅ WASender conectado!');
} else {
  console.error('❌ Erro:', resultado.erro);
}
```

### 3. Enviar Mensagem Customizada

```typescript
import { enviarWhatsApp } from '../common/wasender.ts';

const resultado = await enviarWhatsApp(config, {
  numero: '+5511999999999',
  mensagem: '🔴 ALERTA: Saldo baixo!\n\nR$ 1.234,56',
  formato: 'detalhado'
});

if (resultado.success) {
  console.log('✅ Enviado! Message ID:', resultado.messageId);
} else {
  console.error('❌ Erro:', resultado.erro);
}
```

---

## 📋 FORMATOS DE MENSAGEM

### Formato: `resumido`
```
🔴 ALERTA CRÍTICO

Saldo Baixo - Volpe Diadema
R$ 1.245 (limite: R$ 5.000)

Ação necessária!
Ver detalhes: [link]
```

### Formato: `detalhado` (padrão)
```
🔴 *Saldo Bancário Baixo*

📊 *Empresa:* 12.345.678/0001-90
📅 *Data:* 08/11/2025 14:30

Saldo atual de R$ 1.245,00 está abaixo do mínimo de R$ 5.000,00.
Diferença: R$ 3.755,00 (-75%)

💰 Saldo Atual: R$ 1.245,00
📉 Saldo Mínimo: R$ 5.000,00
⚠️ Diferença: R$ -3.755,00

_Ver detalhes no sistema_
```

### Formato: `completo`
```
🔴 *ALERTA: Saldo Bancário Baixo*

📊 *DETALHES*
Empresa: 12.345.678/0001-90
Data/Hora: 08/11/2025 14:30
Prioridade: CRÍTICA

💬 *DESCRIÇÃO*
Saldo atual de R$ 1.245,00 está abaixo do mínimo de R$ 5.000,00.

📈 *INFORMAÇÕES*
💰 Saldo Atual: R$ 1.245,00
📉 Saldo Mínimo: R$ 5.000,00
⚠️ Diferença: R$ -3.755,00
📊 Percentual: 24,9%

⚠️ *AÇÃO NECESSÁRIA*
Acesse o sistema para ver detalhes completos e tomar ações.

_Alerta gerado automaticamente pelo sistema_
```

---

## ⚙️ CONFIGURAÇÃO DE REGRAS

### Criar Regra de Alerta

```sql
insert into alert_rules (
  user_id,
  company_cnpj,
  tipo_alerta,
  categoria,
  nome,
  descricao,
  ativo,
  config,
  notify_whatsapp,
  notify_email,
  notify_sistema,
  horarios_verificacao,
  frequencia_maxima,
  horario_silencio_inicio,
  horario_silencio_fim,
  silencio_fim_semana,
  escalonamento_minutos,
  formato_mensagem
) values (
  'user-uuid',
  '12345678000190',
  'saldo_baixo',
  'financeiro',
  'Saldo Bancário Baixo',
  'Alerta quando saldo < R$ 5.000',
  true,
  jsonb_build_object('saldo_minimo', 5000),
  true,  -- WhatsApp
  true,  -- Email
  true,  -- Sistema
  array['08:00', '14:00', '18:00'],  -- Horários de verificação
  '1_por_hora',  -- Frequência máxima
  '22:00'::time,  -- Silêncio início
  '07:00'::time,  -- Silêncio fim
  true,  -- Silenciar fim de semana
  30,  -- Escalonar após 30 minutos
  'detalhado'  -- Formato
);
```

### Tipos de Alerta Disponíveis

| Tipo | Descrição | Config Exemplo |
|------|-----------|----------------|
| `saldo_baixo` | Saldo abaixo do mínimo | `{"saldo_minimo": 5000}` |
| `inadimplencia_alta` | Inadimplência > % | `{"limite_percentual": 10}` |
| `fluxo_negativo` | Caixa negativo projetado | `{"dias_projecao": 7}` |
| `contas_vencendo` | Contas vencendo | `{"dias_antecedencia": 3, "valor_minimo": 500}` |
| `taxa_divergente` | Taxa bancária errada | `{"valor_minimo": 10}` |
| `conciliacao_pendente` | Conciliação atrasada | `{"dias_maximo": 5}` |
| `faturamento_baixo` | Abaixo da meta | `{"meta_mensal": 100000, "percentual_alerta": 80}` |
| `margem_baixa` | Margem < % | `{"margem_minima": 15}` |

---

## 🕐 CRON JOBS

### Configuração Automática

Os seguintes jobs foram configurados:

1. **check-alerts-15min** - A cada 15 minutos
   - Verifica todas as regras ativas
   - Cria alertas quando necessário
   - Envia notificações

2. **escalate-alerts-5min** - A cada 5 minutos
   - Verifica alertas críticos/altos não respondidos
   - Escalona após 30 minutos sem resposta
   - Notifica gestor responsável

3. **daily-alert-summary** - Diariamente às 08:00 Brasília
   - Envia resumo de alertas das últimas 24h
   - Inclui estatísticas
   - Lista alertas críticos pendentes

### Verificar Status dos Jobs

```sql
select * from v_alert_cron_status;
```

### Configuração Manual (se necessário)

Se os cron jobs não foram criados automaticamente, configure manualmente:

**Via Supabase Dashboard:**
1. Vá em Database > Cron Jobs
2. Create a new job
3. Configure conforme especificado acima

**Via SQL:**
```sql
-- Job 1: Verificar alertas a cada 15 minutos
select cron.schedule(
  'check-alerts-15min',
  '*/15 * * * *',
  $$ select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/check-alerts',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  ); $$
);

-- Job 2: Escalonamento a cada 5 minutos
select cron.schedule(
  'escalate-alerts-5min',
  '*/5 * * * *',
  $$ select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/escalate-alert',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  ); $$
);

-- Job 3: Resumo diário às 08:00 Brasília (11:00 UTC)
select cron.schedule(
  'daily-alert-summary',
  '0 11 * * *',
  $$ select net.http_post(
    url := current_setting('app.supabase_url') || '/functions/v1/alert-summary-daily',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body := '{}'::jsonb
  ); $$
);
```

---

## 🔍 MONITORAMENTO

### Ver Notificações Enviadas

```sql
select 
  an.*,
  fa.titulo as alerta_titulo,
  fa.prioridade,
  u.nome as usuario_nome
from alert_notifications an
join financial_alerts fa on fa.id = an.alert_id
join alert_rules ar on ar.id = an.alert_rule_id
join users u on u.id = ar.user_id
where an.canal = 'whatsapp'
  and an.created_at > now() - interval '24 hours'
order by an.created_at desc
limit 50;
```

### Ver Alertas Ativos

```sql
select * from v_alerts_with_actions
where status = 'open'
order by 
  case prioridade
    when 'critica' then 1
    when 'alta' then 2
    when 'media' then 3
    else 4
  end,
  created_at desc;
```

### Estatísticas

```sql
-- Últimos 30 dias
select * from fn_alert_statistics(null, 30);

-- Por empresa
select * from fn_alert_statistics('12345678000190', 30);
```

---

## 🐛 TROUBLESHOOTING

### WhatsApp não está enviando

**1. Verificar configuração WASender**
```sql
select 
  id,
  workspace_id,
  api_url,
  instance_id,
  ativo,
  ultimo_teste,
  ultimo_teste_sucesso,
  ultimo_erro
from wasender_config;
```

**2. Verificar número do usuário**
```sql
select id, email, nome, telefone_whatsapp
from users
where id = 'user-uuid';
```

**3. Testar conexão manualmente**
```bash
# Via Edge Function
curl -X POST https://seu-projeto.supabase.co/functions/v1/send-alert-whatsapp \
  -H "Authorization: Bearer seu-anon-key" \
  -H "Content-Type: application/json" \
  -d '{
    "alert_id": "uuid-do-alerta",
    "workspace_id": "uuid-do-workspace"
  }'
```

**4. Ver logs de erros**
```sql
select *
from alert_notifications
where status = 'falhou'
  and canal = 'whatsapp'
order by created_at desc
limit 20;
```

### Alerta não está sendo criado

**1. Verificar regra ativa**
```sql
select * from alert_rules
where tipo_alerta = 'saldo_baixo'
  and ativo = true;
```

**2. Verificar horário de silêncio**
```sql
select fn_is_quiet_hours('regra-uuid');
```

**3. Verificar frequência**
```sql
select fn_check_notification_frequency(
  'regra-uuid',
  'saldo_baixo'
);
```

**4. Executar verificação manual**
```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/check-alerts \
  -H "Authorization: Bearer seu-service-role-key" \
  -H "Content-Type: application/json"
```

---

## 📦 ESTRUTURA DE ARQUIVOS

```
finance-oraculo-backend/
├── supabase/
│   └── functions/
│       ├── common/
│       │   ├── db.ts                    # Utilitários gerais
│       │   └── wasender.ts              # ✨ Integração WASender
│       ├── send-alert-whatsapp/
│       │   └── index.ts                 # ✨ Envio de WhatsApp
│       ├── check-alerts/
│       │   └── index.ts                 # ✨ Verificação periódica
│       ├── escalate-alert/
│       │   └── index.ts                 # ✨ Escalonamento
│       └── alert-summary-daily/
│           └── index.ts                 # ✨ Resumo diário
```

---

## 🎯 PRÓXIMOS PASSOS

1. ✅ Integração WASender configurada
2. ✅ Edge Functions criadas
3. ✅ Cron jobs configurados
4. ⏳ Implementar envio de email
5. ⏳ Criar telas no frontend (ver `PROMPT_CODEX_FRONTEND_CONCILIACAO.md`)
6. ⏳ Adicionar mais tipos de alertas conforme necessário

---

## 📞 SUPORTE

- **WASender**: [https://wasender.com/docs](https://wasender.com/docs)
- **Supabase**: [https://supabase.com/docs](https://supabase.com/docs)
- **Documentação interna**: Ver `SISTEMA_ALERTAS_INTELIGENTES.md`

---

**STATUS:** ✅ IMPLEMENTADO E DOCUMENTADO  
**Data:** 08/11/2025  
**Versão:** 1.0

