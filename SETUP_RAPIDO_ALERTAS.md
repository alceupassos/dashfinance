# 🚀 SETUP RÁPIDO - SISTEMA DE ALERTAS

## ✅ JÁ ESTÁ IMPLEMENTADO!

Todo o backend do sistema de alertas está implementado e pronto. Você só precisa configurar!

---

## 📋 PASSO A PASSO (5 minutos)

### 1️⃣ Configurar WASender (WhatsApp)

**a) Criar conta e instância:**
- Acesse [WASender](https://wasender.com)
- Crie uma conta e uma instância
- Conecte seu WhatsApp Business
- Anote: **API URL**, **API Key**, **Instance ID**

**b) Adicionar ao Supabase:**

Execute no SQL Editor do Supabase:

```sql
-- Inserir configuração WASender
insert into wasender_config (
  workspace_id,
  api_url,
  api_key_enc,
  instance_id,
  ativo
) values (
  'SEU-WORKSPACE-ID'::uuid,  -- ← Substituir
  'https://api.wasender.com',
  pgp_sym_encrypt(
    'SUA-API-KEY-AQUI',      -- ← Substituir
    (select decrypted_secret from vault.decrypted_secrets where name = 'encryption_key' limit 1)
  ),
  'SEU-INSTANCE-ID',           -- ← Substituir
  true
);
```

### 2️⃣ Adicionar Números WhatsApp aos Usuários

```sql
-- Atualizar seu usuário
update users
set 
  nome = 'Seu Nome',
  telefone_whatsapp = '+5511999999999'  -- ← Formato: +5511999999999
where email = 'seu@email.com';
```

**⚠️ IMPORTANTE:** O número deve estar no formato `+5511999999999` (sem espaços, hífens ou parênteses)

### 3️⃣ Criar Sua Primeira Regra de Alerta

Exemplo: Alertar quando saldo < R$ 5.000

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
  (select id from users where email = 'seu@email.com'),  -- ← Seu email
  '12345678000190',                                       -- ← CNPJ da empresa
  'saldo_baixo',
  'financeiro',
  'Saldo Bancário Baixo',
  'Alerta quando saldo menor que R$ 5.000',
  true,                                                   -- Ativo
  '{"saldo_minimo": 5000}',                              -- Threshold
  true,                                                   -- WhatsApp
  false,                                                  -- Email (desativado por enquanto)
  true,                                                   -- Sistema
  array['08:00', '14:00', '18:00'],                      -- 3x por dia
  '1_por_hora',                                          -- Máx 1x por hora
  '22:00',                                               -- Silêncio das 22h
  '07:00',                                               -- até 7h
  true,                                                  -- Silenciar fim de semana
  30,                                                    -- Escalonar após 30min
  'detalhado'                                            -- Formato
);
```

### 4️⃣ Testar o Sistema

**a) Executar verificação manual:**

```bash
curl -X POST https://SEU-PROJETO.supabase.co/functions/v1/check-alerts \
  -H "Authorization: Bearer SEU-SERVICE-ROLE-KEY" \
  -H "Content-Type: application/json"
```

**b) Ver resultado:**

```sql
-- Ver alertas criados
select * from financial_alerts
order by created_at desc
limit 10;

-- Ver notificações enviadas
select * from alert_notifications
order by created_at desc
limit 10;
```

### 5️⃣ Verificar Cron Jobs

```sql
-- Ver status dos jobs
select * from v_alert_cron_status;

-- Deve mostrar 3 jobs:
-- - check-alerts-15min (a cada 15 minutos)
-- - escalate-alerts-5min (a cada 5 minutos)
-- - daily-alert-summary (diariamente às 08:00)
```

---

## 📱 TIPOS DE ALERTAS DISPONÍVEIS

Você pode criar regras para qualquer um destes tipos:

### Financeiros
- `saldo_baixo` - Saldo abaixo do mínimo
  - Config: `{"saldo_minimo": 5000}`

- `inadimplencia_alta` - Taxa de inadimplência alta
  - Config: `{"limite_percentual": 10}`

- `fluxo_negativo` - Fluxo de caixa negativo projetado
  - Config: `{"dias_projecao": 7}`

- `contas_vencendo` - Contas a pagar vencendo
  - Config: `{"dias_antecedencia": 3, "valor_minimo": 500}`

### Operacionais
- `taxa_divergente` - Taxa bancária diferente do contratado
  - Config: `{"valor_minimo": 10}`

- `conciliacao_pendente` - Conciliação bancária atrasada
  - Config: `{"dias_maximo": 5}`

### Performance
- `faturamento_baixo` - Faturamento abaixo da meta
  - Config: `{"meta_mensal": 100000, "percentual_alerta": 80}`

- `margem_baixa` - Margem de lucro baixa
  - Config: `{"margem_minima": 15}`

---

## 🎯 EXEMPLO COMPLETO: GRUPO VOLPE

```sql
-- 1. Configurar WASender (uma vez)
insert into wasender_config (workspace_id, api_url, api_key_enc, instance_id, ativo)
values (...);

-- 2. Adicionar telefone ao dono
update users
set telefone_whatsapp = '+5511999999999'
where email = 'dono@grupovolpe.com';

-- 3. Criar regras para cada empresa do grupo
insert into alert_rules (user_id, company_cnpj, tipo_alerta, categoria, nome, ativo, config, notify_whatsapp, horarios_verificacao, frequencia_maxima, formato_mensagem)
select 
  (select id from users where email = 'dono@grupovolpe.com'),
  cnpj,
  'saldo_baixo',
  'financeiro',
  'Saldo Baixo - ' || razao_social,
  true,
  '{"saldo_minimo": 5000}',
  true,
  array['08:00', '14:00', '18:00'],
  '1_por_hora',
  'detalhado'
from (values
  ('12345678000190', 'Volpe Diadema'),
  ('12345678000191', 'Volpe Grajaú'),
  ('12345678000192', 'Volpe POA'),
  ('12345678000193', 'Volpe Santo André'),
  ('12345678000194', 'Volpe São Mateus')
) as empresas(cnpj, razao_social);

-- 4. Criar regra de inadimplência para o grupo todo
insert into alert_rules (user_id, grupo_empresarial, tipo_alerta, categoria, nome, ativo, config, notify_whatsapp, horarios_verificacao, frequencia_maxima, formato_mensagem)
values (
  (select id from users where email = 'dono@grupovolpe.com'),
  'Grupo Volpe',
  'inadimplencia_alta',
  'financeiro',
  'Inadimplência Alta - Grupo',
  true,
  '{"limite_percentual": 10}',
  true,
  array['09:00'],
  '1_por_dia',
  'completo'
);
```

---

## 🔍 COMANDOS ÚTEIS

### Ver regras ativas
```sql
select 
  ar.nome,
  ar.tipo_alerta,
  ar.ativo,
  u.email as usuario,
  ar.config
from alert_rules ar
join users u on u.id = ar.user_id
where ar.ativo = true
order by ar.categoria, ar.nome;
```

### Ver alertas hoje
```sql
select 
  titulo,
  prioridade,
  tipo_alerta,
  company_cnpj,
  status,
  created_at
from financial_alerts
where created_at::date = current_date
order by created_at desc;
```

### Ver estatísticas (últimos 7 dias)
```sql
select * from fn_alert_statistics(null, 7);
```

### Desativar uma regra
```sql
update alert_rules
set ativo = false
where nome = 'Nome da Regra';
```

### Marcar alerta como lido
```sql
select fn_marcar_alerta_lido(
  'alert-uuid',
  'user-uuid'
);
```

---

## 🎨 PRÓXIMOS PASSOS (Frontend)

O backend está 100% pronto! Agora precisa criar as telas no frontend.

**Ver prompt completo em:** `PROMPT_CODEX_FRONTEND_CONCILIACAO.md`

### Telas a criar:
1. `/alertas/dashboard` - Dashboard principal
2. `/alertas/configurar` - Configurar alertas
3. `/alertas/historico` - Histórico
4. `/alertas/[id]` - Detalhes
5. `/alertas/preferencias` - Preferências
6. `/alertas/grupo` - Visão consolidada do grupo

---

## 📚 DOCUMENTAÇÃO

- 📋 **Planejamento**: `SISTEMA_ALERTAS_INTELIGENTES.md`
- 📱 **WASender**: `INTEGRACAO_WASENDER_WHATSAPP.md`
- ✅ **Implementação**: `SISTEMA_ALERTAS_IMPLEMENTADO.md`
- 🎨 **Frontend**: `PROMPT_CODEX_FRONTEND_CONCILIACAO.md`

---

## 🐛 PROBLEMAS?

### WhatsApp não envia
1. Verificar config: `select * from wasender_config;`
2. Verificar número: `select telefone_whatsapp from users;`
3. Ver erros: `select * from alert_notifications where status = 'falhou';`

### Alerta não cria
1. Verificar regra: `select * from alert_rules where ativo = true;`
2. Executar manual: Ver comando no passo 4️⃣
3. Ver logs no Supabase Dashboard

### Mais ajuda
- Ver `INTEGRACAO_WASENDER_WHATSAPP.md` seção "TROUBLESHOOTING"

---

**🎉 PRONTO! EM 5 MINUTOS VOCÊ TEM ALERTAS FUNCIONANDO!**

Data: 08/11/2025 | Versão: 1.0

