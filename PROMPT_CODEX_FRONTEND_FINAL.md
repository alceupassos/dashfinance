# 🎨 PROMPT COMPLETO PARA CODEX - FRONTEND DASHFINANCE

## 🎯 CONTEXTO

Você está implementando o frontend de um sistema de gestão financeira empresarial com:
1. **Sistema de Alertas Inteligentes** (com notificações WhatsApp)
2. **Sistema de Conciliação Financeira** (bancária, cartões, taxas)
3. **Sistema de Onboarding via WhatsApp** (cadastro automático de clientes)
4. **Integração com ERPs** (F360 e Omie)

**TODO O BACKEND ESTÁ PRONTO E FUNCIONANDO!** ✅

---

## 📊 SISTEMAS IMPLEMENTADOS (BACKEND)

### 1. SISTEMA DE ALERTAS INTELIGENTES

**8 tipos de alertas automáticos:**
- 💰 Saldo bancário baixo
- 📈 Inadimplência alta
- 💸 Fluxo de caixa negativo projetado
- 📋 Contas vencendo
- 💳 Taxa bancária divergente
- 🔄 Conciliação bancária pendente
- 📊 Faturamento abaixo da meta
- 📉 Margem de lucro baixa

**Notificações:**
- WhatsApp (via WASender) - 3 formatos: resumido, detalhado, completo
- Email (planejado)
- Sistema (dashboard)

**Recursos:**
- Horário de silêncio (22h-7h)
- Frequência máxima configurável
- Escalonamento automático (após 30min sem resposta)
- Resumo diário (8h Brasília)

**Tabelas:**
- `alert_rules` - Regras configuradas
- `alert_notifications` - Histórico
- `alert_actions` - Ações (lido, snooze, resolvido)
- `financial_alerts` - Alertas criados

### 2. SISTEMA DE CONCILIAÇÃO FINANCEIRA

**Recursos:**
- Conciliação bancária automática
- Validação de taxas (cartão, boleto)
- Checagem de recebimentos
- Detecção de divergências
- Geração automática de alertas

**Tabelas:**
- `contract_fees` - Taxas contratadas
- `bank_statements` - Extratos bancários
- `card_transactions` - Transações de cartão
- `reconciliations` - Conciliações realizadas
- `fee_validations` - Validações de taxa

### 3. SISTEMA DE ONBOARDING VIA WHATSAPP ⭐ NOVO

**Fluxo:**
1. Admin gera token de 5 caracteres (ex: `VOL01`)
2. Cliente recebe token via email/SMS/WhatsApp
3. Cliente manda token no WhatsApp: `VOL01`
4. Sistema ativa automaticamente e envia boas-vindas + menu
5. Cliente interage pelo menu (1-6)

**17 clientes já cadastrados:**
- Grupo Volpe (5 empresas): VOL01, VOL02, VOL03, VOL04, VOL05
- Grupo Dex Invest (2): DEX01, DEX02
- Grupo AAS/AGS (2): AAS01, AGS01
- Grupo Acqua Mundi (2): ACQ01, ACQ02
- 6 clientes individuais: DER01, COR01, A3S01, CCA01, SAN01, ALL01

**Menu Interativo WhatsApp:**
```
1️⃣ Ver alertas ativos
2️⃣ Configurar alertas
3️⃣ Adicionar empresa
4️⃣ Minhas preferências
5️⃣ Estatísticas
6️⃣ Ajuda
```

**Tabelas:**
- `onboarding_tokens` - Tokens de cadastro
- `whatsapp_sessions` - Sessões de conversa
- `whatsapp_messages` - Log de mensagens
- `user_companies` - Empresas por usuário (N:N)

### 4. INTEGRAÇÃO COM ERPS

**ERPs Suportados:**
- F360 (11 tokens configurados)
- Omie (planejado)

**Recursos:**
- Sincronização automática (3h e 12:50 Brasília)
- Dados incrementais (apenas novos)
- Suporte a grupos empresariais (múltiplas empresas, 1 token)
- DRE e Cashflow automáticos

**Tabelas:**
- `integration_f360` - Integrações F360 (17 empresas)
- `integration_omie` - Integrações Omie
- `dre_entries` - Lançamentos DRE
- `cashflow_entries` - Fluxo de caixa
- `sync_state` - Estado de sincronização

---

## 🎨 TELAS A IMPLEMENTAR

### 📱 MÓDULO: ONBOARDING (NOVO - PRIORIDADE)

#### Tela 1: `/admin/tokens`
**Gestão de Tokens de Onboarding**

**Funcionalidades:**
- 📋 **Lista de Tokens**
  - Tabela com: Token, Empresa, Status, Criado em, Expira em, Ações
  - Filtros: Status (pendente/ativado/expirado), Empresa, Data
  - Badge de status colorido
  - Pesquisa por token ou empresa
  
- ➕ **Criar Novo Token**
  - Botão destacado "Novo Token"
  - Modal/formulário:
    ```
    CNPJ: [__.__.___.____/__-__]
    Razão Social: [________________]
    Grupo Empresarial: [________________] (opcional)
    Nome do Contato: [________________]
    Email: [________________] (opcional)
    
    [Gerar Token]
    ```
  
- ✅ **Token Gerado**
  - Modal de sucesso mostrando:
    ```
    ✅ Token Criado!
    
    Token: VOL01
    Empresa: Volpe Diadema
    Válido até: 08/12/2025
    
    Link WhatsApp:
    https://wa.me/5511999998888?text=VOL01
    
    [📋 Copiar Token] [💬 Abrir WhatsApp] [📧 Enviar Email]
    
    [QR Code do link WhatsApp]
    ```

- 🔍 **Detalhes do Token**
  - Ao clicar em um token:
    ```
    Token: VOL01
    Empresa: Volpe Diadema
    CNPJ: 00.026.888/0980-00
    Status: ⏳ Pendente / ✅ Ativado
    
    Criado em: 08/11/2025 10:30
    Expira em: 08/12/2025 10:30
    
    Se ativado:
    - Ativado por: +55 11 99999-9999
    - Ativado em: 10/11/2025 14:20
    - Usuário criado: João Silva
    
    [Revogar Token] [Reenviar] [Duplicar]
    ```

**API Endpoints:**
```typescript
GET  /api/tokens - Lista todos
POST /api/tokens - Cria novo
GET  /api/tokens/:id - Detalhes
PUT  /api/tokens/:id/revoke - Revoga
```

**Queries Supabase:**
```typescript
// Listar tokens
const { data: tokens } = await supabase
  .from('onboarding_tokens')
  .select('*')
  .order('created_at', { ascending: false });

// Criar token
const { data } = await supabase.rpc('fn_create_token', {
  p_cnpj: '00026888098000',
  p_name: 'Volpe Diadema',
  p_grupo: 'Grupo Volpe',
  p_contact: 'João Silva'
});
```

---

#### Tela 2: `/admin/clientes-whatsapp`
**Dashboard de Clientes WhatsApp**

**Funcionalidades:**
- 📊 **Cards de Resumo**
  ```
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ 12 Ativos   │ │ 5 Hoje      │ │ 17 Total    │ │ 3 Pendentes │
  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
  ```

- 📋 **Lista de Clientes**
  - Tabela:
    | WhatsApp | Nome | Empresas | Última Msg | Status | Ações |
    |----------|------|----------|-----------|--------|-------|
    | +55 11 999... | João Silva | 3 | há 5min | 🟢 Online | Ver |
    | +55 11 888... | Maria Costa | 1 | há 2h | 🟡 Away | Ver |

- 💬 **Últimas Conversas**
  - Timeline com últimas 10 mensagens
  - Filtro por cliente
  - Badge de não lidas

- 📈 **Gráfico de Ativação**
  - Ativações por dia (últimos 30 dias)
  - Gráfico de linha

**Queries:**
```typescript
// Sessões ativas
const { data: sessions } = await supabase
  .from('v_active_whatsapp_sessions')
  .select('*')
  .order('last_message_at', { ascending: false });

// Estatísticas
const { data: stats } = await supabase.rpc('fn_token_statistics');
```

---

### 🔔 MÓDULO: ALERTAS

#### Tela 3: `/alertas/dashboard`
**Central de Alertas**

**Layout:**
```
┌─────────────────────────────────────────────┐
│ 🔔 Central de Alertas                      │
│ [Configurar] [Histórico] [Relatórios]      │
├─────────────────────────────────────────────┤
│ 📊 Últimas 24h                             │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ 3    │ │ 8    │ │ 15   │ │ 142  │       │
│ │🔴Crit│ │🟠Alta│ │🟡Média│ │✅OK  │       │
│ └──────┘ └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────────────┤
│ 🔥 Alertas Ativos                          │
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ 🔴 SALDO BAIXO - Volpe Diadema         ││
│ │ R$ 1.245,00 (abaixo de R$ 5.000)       ││
│ │ há 30min | WhatsApp ✅                  ││
│ │ [Detalhes] [Marcar Lido] [Snooze]     ││
│ └─────────────────────────────────────────┘│
│                                             │
│ ┌─────────────────────────────────────────┐│
│ │ 🟠 INADIMPLÊNCIA 15,3% - Grupo Volpe   ││
│ │ Limite: 10% | 23 títulos              ││
│ │ há 2h | WhatsApp ✅ Email ✅            ││
│ │ [Detalhes] [Marcar Lido] [Snooze]     ││
│ └─────────────────────────────────────────┘│
├─────────────────────────────────────────────┤
│ 📈 Tendências (7 dias)                     │
│ [Gráfico de linha]                         │
└─────────────────────────────────────────────┘
```

**Queries:**
```typescript
// Alertas ativos
const { data: alertas } = await supabase
  .from('v_alerts_with_actions')
  .select('*')
  .eq('status', 'open')
  .order('prioridade, created_at desc');

// Estatísticas
const { data: stats } = await supabase.rpc('fn_alert_statistics', {
  p_cnpj: null,
  p_dias: 30
});
```

---

#### Tela 4: `/alertas/configurar`
**Configurar Meus Alertas**

**Layout:**
```
⚙️ CONFIGURAR ALERTAS
━━━━━━━━━━━━━━━━━━━━━━

🔍 [Buscar alerta...] [Todas Categorias ▼]

💰 FINANCEIROS (12 ativos)
┌─────────────────────────────────────┐
│ ☑️ Saldo Bancário Baixo   [Config ▼]│
│    📱 WhatsApp  📧 Email  🖥️ Sistema  │
│    ┌─────────────────────────────┐  │
│    │ Valor mínimo: R$ 5.000,00   │  │
│    │ Verificar: ☑️8h ☑️14h ☑️18h │  │
│    │ Frequência: 1x por hora ▼   │  │
│    │ [Salvar] [Testar]          │  │
│    └─────────────────────────────┘  │
└─────────────────────────────────────┘

☑️ Inadimplência Alta         [Config ▼]
☐ Fluxo de Caixa Negativo     [Config ▼]
```

**Componentes:**
- Toggle para ativar/desativar
- Accordion para expandir configurações
- Checkboxes para canais (WhatsApp, Email, Sistema)
- Inputs para valores/limites
- Dropdown para horários e frequência
- Botão "Testar Agora" (envia notificação teste)

**Queries:**
```typescript
// Buscar regras do usuário
const { data: rules } = await supabase
  .from('alert_rules')
  .select('*')
  .eq('user_id', userId)
  .order('categoria, nome');

// Criar/atualizar regra
await supabase
  .from('alert_rules')
  .upsert({
    user_id: userId,
    company_cnpj: cnpj,
    tipo_alerta: 'saldo_baixo',
    ativo: true,
    config: { saldo_minimo: 5000 },
    notify_whatsapp: true,
    horarios_verificacao: ['08:00', '14:00', '18:00'],
    frequencia_maxima: '1_por_hora'
  });
```

---

#### Tela 5: `/alertas/[id]`
**Detalhes do Alerta (Modal ou Página)**

```
🔴 Saldo Bancário Baixo                [X]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 INFORMAÇÕES
Empresa: Volpe Diadema
Criado: 08/11/2025 14:30
Status: ⚠️ Ativo (há 30min)
Prioridade: 🔴 Crítica

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 DETALHES
Conta: Bradesco Ag 1234 CC 12345-6
Saldo Atual: R$ 1.245,00
Saldo Mínimo: R$ 5.000,00
Diferença: -R$ 3.755,00 (-75%)

Contas Hoje: R$ 2.350,00
Contas (3 dias): R$ 8.900,00
Recebimentos (3 dias): R$ 12.500,00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📱 NOTIFICAÇÕES ENVIADAS
✅ WhatsApp: 14:30 - Entregue
✅ Email: 14:31 - Lido (14:35)
✅ Sistema: 14:30

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 AÇÕES SUGERIDAS
• Verificar recebimentos do dia
• Adiar pagamento não crítico
• Transferir de outra conta

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💬 OBSERVAÇÕES
[_________________________________]

[Marcar Resolvido] [Snooze 1h] [Snooze 4h]
[Encaminhar] [Adicionar Tarefa]
```

**Queries:**
```typescript
// Buscar alerta completo
const { data: alerta } = await supabase
  .from('v_alerts_with_actions')
  .select('*')
  .eq('id', alertId)
  .single();

// Marcar como lido
await supabase.rpc('fn_marcar_alerta_lido', {
  p_alert_id: alertId,
  p_user_id: userId
});

// Snooze
await supabase.rpc('fn_snooze_alerta', {
  p_alert_id: alertId,
  p_user_id: userId,
  p_minutos: 60
});

// Resolver
await supabase.rpc('fn_resolver_alerta', {
  p_alert_id: alertId,
  p_user_id: userId,
  p_observacoes: observacoes
});
```

---

#### Tela 6: `/alertas/historico`
**Histórico de Alertas**

```
📜 HISTÓRICO DE ALERTAS
Período: [Últimos 30 dias ▼] [Exportar ↓]

Filtros: [Categoria▼] [Prioridade▼] [Status▼] [Empresa▼]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 ESTATÍSTICAS DO PERÍODO
Total: 1.245 | Críticos: 23 | Tempo médio: 2h

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

| Data/Hora | Tipo | Prioridade | Status | Tempo | Ações |
|-----------|------|-----------|--------|-------|-------|
| 08/11 14:30 | Saldo | 🔴 | ✅ Resolvido | 30m | Ver |
| 08/11 09:00 | Inadimp | 🟠 | ✅ Resolvido | 4h | Ver |
| 07/11 18:00 | Taxa | 🟡 | ⏸️ Snooze | - | Ver |

[Anterior] Página 1 de 42 [Próxima]
```

---

#### Tela 7: `/alertas/preferencias`
**Preferências de Notificação**

```
🔔 PREFERÊNCIAS DE NOTIFICAÇÃO

📱 WHATSAPP
┌─────────────────────────────────────┐
│ ☑️ Ativar WhatsApp                   │
│ Número: +55 11 99999-9999           │
│                                      │
│ Horário de Silêncio:                │
│ Das [22:00] às [07:00]              │
│ ☑️ Fim de semana                     │
│                                      │
│ Frequência Máxima:                  │
│ Críticos: [Imediato ▼]              │
│ Alta: [1 por hora ▼]                │
│ Média: [3 por dia ▼]                │
│                                      │
│ Formato: (•) Detalhado ( ) Completo │
└─────────────────────────────────────┘

📧 EMAIL
┌─────────────────────────────────────┐
│ ☑️ Ativar Email                      │
│ Email: dono@empresa.com             │
│ ☑️ Resumo diário (08:00)             │
│ ☑️ Resumo semanal (Segunda 09:00)    │
└─────────────────────────────────────┘

👥 ESCALONAMENTO
┌─────────────────────────────────────┐
│ Se não responder em [30 min],       │
│ notificar: [Gerente ▼]              │
└─────────────────────────────────────┘

[Salvar] [Testar Notificações]
```

---

### 🏢 MÓDULO: VISÃO DE GRUPO

#### Tela 8: `/alertas/grupo`
**Consolidado do Grupo**

```
🏢 ALERTAS DO GRUPO VOLPE
[Dashboard] [Por Empresa] [Comparativo]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 VISÃO CONSOLIDADA
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ 5 🔴 │ │ 12🟠 │ │ 28🟡 │ │ 3 ⚠️ │
│Crític│ │Alta  │ │Média │ │Empr  │
└──────┘ └──────┘ └──────┘ └──────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ALERTAS CRÍTICOS DO GRUPO
• 🔴 Volpe Diadema - Saldo R$ 1.245
• 🔴 Volpe Grajaú - Inadimp 18%
• 🔴 Volpe POA - 3 contas vencidas

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📈 PERFORMANCE POR EMPRESA

| Empresa | Crítico | Alta | Média | Score |
|---------|---------|------|-------|-------|
| Volpe Diadema | 2 | 4 | 8 | 🟡 Atenção |
| Volpe Grajaú | 1 | 3 | 5 | 🟠 Problema |
| Volpe POA | 1 | 2 | 6 | 🟠 Problema |
| Volpe S.André | 0 | 2 | 4 | 🟢 OK |
| Volpe S.Mateus | 1 | 1 | 5 | 🟡 Atenção |

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎨 COMPARATIVO
[Gráfico comparando métricas das 5 empresas]
```

**Query:**
```typescript
// Buscar empresas do grupo
const { data: empresas } = await supabase
  .from('user_companies')
  .select('*')
  .eq('user_id', userId)
  .eq('grupo_empresarial', 'Grupo Volpe');

// Alertas por empresa
for (const empresa of empresas) {
  const { data: alertas } = await supabase
    .from('financial_alerts')
    .select('*')
    .eq('company_cnpj', empresa.company_cnpj)
    .eq('status', 'open');
}
```

---

### 💳 MÓDULO: CONCILIAÇÃO

#### Tela 9: `/conciliacao/dashboard`
**Dashboard de Conciliação**

```
💳 CONCILIAÇÃO FINANCEIRA

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 STATUS GERAL
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ 45 Pendentes │ │ 12 Divergênc │ │ 1.234 OK     │
└──────────────┘ └──────────────┘ └──────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔴 DIVERGÊNCIAS CRÍTICAS

• Taxa Cartão Divergente
  Bradesco - R$ 45,00 a mais
  [Ver Detalhes] [Contestar]

• Boleto Não Recebido
  Vencido há 5 dias - R$ 1.250,00
  [Verificar] [Marcar Recebido]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 PENDENTES DE CONCILIAÇÃO

[Filtro: Tipo ▼] [Período ▼]

| Data | Tipo | Valor | Status | Ações |
|------|------|-------|--------|-------|
| 08/11 | Cartão | R$ 1.200 | Pendente | Conc |
| 07/11 | Boleto | R$ 850 | Pendente | Conc |
```

**Queries:**
```typescript
// Divergências
const { data: divergencias } = await supabase
  .from('fee_validations')
  .select('*')
  .eq('company_cnpj', cnpj)
  .eq('status', 'pending')
  .gt('divergence', 0);

// Conciliações pendentes
const { data: pendentes } = await supabase
  .from('reconciliations')
  .select('*')
  .eq('company_cnpj', cnpj)
  .eq('status', 'pending');
```

---

## 🎨 COMPONENTES REUSÁVEIS

### 1. AlertCard
```tsx
<AlertCard
  title="Saldo Bancário Baixo"
  prioridade="critica"
  empresa="Volpe Diadema"
  mensagem="Saldo de R$ 1.245,00..."
  timestamp="há 30min"
  notificacoes={['whatsapp', 'email']}
  onMarkRead={() => {}}
  onSnooze={() => {}}
  onViewDetails={() => {}}
/>
```

### 2. TokenCard
```tsx
<TokenCard
  token="VOL01"
  empresa="Volpe Diadema"
  status="pending"
  createdAt="2024-11-08"
  expiresAt="2024-12-08"
  whatsappLink="https://wa.me/..."
  onCopy={() => {}}
  onOpenWhatsApp={() => {}}
  onRevoke={() => {}}
/>
```

### 3. WhatsAppSessionCard
```tsx
<WhatsAppSessionCard
  phone="+55 11 99999-9999"
  userName="João Silva"
  empresas={3}
  lastMessage="há 5min"
  status="online"
  unreadCount={2}
  onClick={() => {}}
/>
```

### 4. AlertFilters
```tsx
<AlertFilters
  categories={['financeiro', 'operacional']}
  priorities={['critica', 'alta', 'media']}
  statuses={['open', 'resolved']}
  empresas={empresasList}
  onChange={(filters) => {}}
/>
```

### 5. NotificationPreferences
```tsx
<NotificationPreferences
  whatsapp={{
    enabled: true,
    phone: '+5511999999999',
    quietHours: { start: '22:00', end: '07:00' }
  }}
  email={{
    enabled: true,
    address: 'user@example.com'
  }}
  onChange={(prefs) => {}}
/>
```

---

## 📱 FUNCIONALIDADES ESPECIAIS

### 1. Notificações em Tempo Real
```typescript
// Supabase Realtime
const subscription = supabase
  .channel('financial_alerts')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'financial_alerts',
    filter: `company_cnpj=eq.${cnpj}`
  }, (payload) => {
    // Mostrar toast/notification
    showNotification(payload.new);
  })
  .subscribe();
```

### 2. Auto-refresh Dashboard
```typescript
// Atualizar a cada 30 segundos
useEffect(() => {
  const interval = setInterval(() => {
    refetchAlertas();
  }, 30000);
  return () => clearInterval(interval);
}, []);
```

### 3. Export para Excel
```typescript
// Exportar histórico
const exportToExcel = async () => {
  const { data } = await supabase
    .from('financial_alerts')
    .select('*')
    .gte('created_at', startDate)
    .lte('created_at', endDate);
  
  // Usar lib como xlsx ou exceljs
  generateExcel(data);
};
```

### 4. QR Code para Token
```typescript
import QRCode from 'qrcode.react';

<QRCode 
  value={token.whatsapp_link}
  size={256}
  level="H"
/>
```

---

## 🎯 PRIORIDADES DE IMPLEMENTAÇÃO

### FASE 1 - ESSENCIAL (1-2 dias)
1. ✅ `/admin/tokens` - Gestão de tokens
2. ✅ `/admin/clientes-whatsapp` - Dashboard clientes
3. ✅ `/alertas/dashboard` - Central de alertas
4. ✅ `/alertas/[id]` - Detalhes do alerta

### FASE 2 - IMPORTANTE (2-3 dias)
5. ✅ `/alertas/configurar` - Configurar alertas
6. ✅ `/alertas/preferencias` - Preferências
7. ✅ `/alertas/historico` - Histórico
8. ✅ `/alertas/grupo` - Visão de grupo

### FASE 3 - COMPLEMENTAR (1-2 dias)
9. ✅ `/conciliacao/dashboard` - Conciliação
10. ✅ Notificações em tempo real
11. ✅ Componentes reusáveis
12. ✅ Export Excel

---

## 📚 DOCUMENTAÇÃO BACKEND

**Arquivos de Referência:**
- `SISTEMA_ALERTAS_INTELIGENTES.md` - Planejamento alertas
- `INTEGRACAO_WASENDER_WHATSAPP.md` - WhatsApp/WASender
- `SISTEMA_ONBOARDING_WHATSAPP.md` - Onboarding via WhatsApp
- `CLIENTES_TOKENS_ONBOARDING_CRIADOS.md` - Lista de tokens
- `SISTEMA_CONCILIACAO_RESUMO.md` - Conciliação financeira

**Tabelas Principais:**
```
Alertas:
- financial_alerts
- alert_rules
- alert_notifications
- alert_actions

Onboarding:
- onboarding_tokens
- whatsapp_sessions
- whatsapp_messages
- user_companies

Conciliação:
- reconciliations
- fee_validations
- contract_fees
- bank_statements
- card_transactions

ERP:
- integration_f360
- integration_omie
- dre_entries
- cashflow_entries
```

**Funções SQL Úteis:**
```sql
fn_create_token() - Cria token onboarding
fn_validate_token() - Valida token
fn_get_user_companies() - Empresas do usuário
fn_alert_statistics() - Estatísticas de alertas
fn_marcar_alerta_lido() - Marca alerta como lido
fn_snooze_alerta() - Adia alerta
fn_resolver_alerta() - Resolve alerta
fn_token_statistics() - Estatísticas de tokens
```

---

## 🎨 DESIGN SYSTEM

**Cores de Prioridade:**
- 🔴 Crítica: `red-600`
- 🟠 Alta: `orange-500`
- 🟡 Média: `yellow-500`
- 🟢 Baixa: `green-500`

**Cores de Status:**
- ✅ Ativo: `green-600`
- ⏸️ Snooze: `yellow-600`
- ❌ Resolvido: `gray-400`
- ⏳ Pendente: `blue-500`

**Ícones:**
- Alertas: 🔔
- WhatsApp: 📱
- Email: 📧
- Sistema: 🖥️
- Configuração: ⚙️
- Estatísticas: 📊
- Conciliação: 💳

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

### Backend (PRONTO ✅)
- [x] Sistema de alertas completo
- [x] Sistema de conciliação
- [x] Sistema de onboarding WhatsApp
- [x] 17 clientes cadastrados
- [x] Integrações F360 configuradas
- [x] Edge Functions deployadas
- [x] Tabelas criadas
- [x] Funções SQL prontas

### Frontend (TODO)
- [ ] Módulo de Tokens (/admin/tokens)
- [ ] Dashboard WhatsApp (/admin/clientes-whatsapp)
- [ ] Central de Alertas (/alertas/dashboard)
- [ ] Configurar Alertas (/alertas/configurar)
- [ ] Detalhes do Alerta (/alertas/[id])
- [ ] Histórico (/alertas/historico)
- [ ] Preferências (/alertas/preferencias)
- [ ] Visão de Grupo (/alertas/grupo)
- [ ] Dashboard Conciliação (/conciliacao/dashboard)
- [ ] Componentes reusáveis
- [ ] Notificações em tempo real
- [ ] Integração Supabase

---

## 🚀 COMEÇAR POR

1. **Setup Supabase Client**
   ```typescript
   // lib/supabase.ts
   import { createClient } from '@supabase/supabase-js';
   
   export const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL!,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
   );
   ```

2. **Primeira Tela: `/admin/tokens`**
   - Lista de tokens
   - Botão criar novo
   - Modal de sucesso com QR Code

3. **Segunda Tela: `/alertas/dashboard`**
   - Cards de resumo
   - Lista de alertas ativos
   - Gráfico de tendências

---

**📱 TODO O BACKEND ESTÁ PRONTO! BASTA IMPLEMENTAR O FRONTEND!**

**Data:** 08/11/2025  
**Versão:** 2.0 (atualizada com onboarding)  
**Status:** ✅ Completo e atualizado

