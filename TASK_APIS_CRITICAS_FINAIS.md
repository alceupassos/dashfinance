# 🚀 TASK: APIs Críticas Finais - WhatsApp + Alertas + Grupos

**Data:** 09/11/2025  
**Status:** PLANEJAMENTO  
**Prioridade:** ALTA  
**Tempo Estimado:** 4-6 horas

---

## 🎯 OBJETIVO

Finalizar 3 conjuntos críticos de APIs para o frontend usar dados REAIS (não mocks):

1. ✅ **WhatsApp Endpoints** - Conversas, templates, agendadas
2. ✅ **Group Aliases** - Criar/editar com members
3. ✅ **Financial Alerts** - PATCH para resolver/ignorar

---

## 📋 CHECKLIST DE TAREFAS

### 1. WhatsApp Endpoints (2 horas)

#### 1.1 GET `/whatsapp-conversations`
```typescript
// RETORNA:
[
  {
    id: string;              // UUID
    empresa_cnpj: string;    // "12.345.678/0001-90"
    contato_phone: string;   // "5511999999999"
    contato_nome: string;    // "João Silva"
    contato_tipo: string;    // "cliente" | "fornecedor" | "interno"
    
    // Últimas mensagens
    ultimaMensagem?: string;
    ultimaMensagemEm: string; // ISO date
    
    // Status
    ativo: boolean;
    status: "ativo" | "pausado" | "encerrado";
    
    // Contagem
    totalMensagens: number;
    naoLidas: number;
    
    // Timestamps
    criadoEm: string;
    ultimaAtualizacao: string;
  }
]

// QUERY PARAMS:
// ?empresa_cnpj=12.345.678/0001-90
// ?status=ativo
// ?limit=50&offset=0
```

- [ ] Implementar query ao banco (table: whatsapp_conversations ou similar)
- [ ] Filtrar por empresa_cnpj
- [ ] Filtrar por status
- [ ] Paginação
- [ ] Ordenar por ultimaMensagemEm DESC

#### 1.2 GET `/whatsapp-conversations/{id}`
```typescript
// RETORNA conversação COMPLETA:
{
  id: string;
  empresa_cnpj: string;
  contato_phone: string;
  contato_nome: string;
  contato_tipo: string;
  status: string;
  ativo: boolean;
  
  // Histórico de mensagens
  mensagens: [
    {
      id: string;
      textoEnviado: string;
      textoRecebido?: string;
      timestamp: string;
      tipo: "enviada" | "recebida";
      status: "enviada" | "entregue" | "lida" | "falha";
      templateUsada?: string;
      variaveisUsadas?: Record<string, string>;
    }
  ];
  
  criadoEm: string;
  ultimaAtualizacao: string;
}
```

- [ ] Buscar conversação + últimas 50 mensagens
- [ ] Ordenar mensagens por data DESC
- [ ] Incluir status de entrega

#### 1.3 GET `/whatsapp-templates`
```typescript
// RETORNA:
[
  {
    id: string;
    nome: string;                    // "Recebimento de Pagamento"
    descricao: string;
    categoria: string;               // "financeiro" | "comercial" | "operacional"
    
    // Conteúdo
    corpo: string;                   // Template com {{variavel}}
    variaveisObrigatorias: string[]; // ["valor", "data"]
    variaveisOpcionais: string[];    // ["referencia"]
    
    // Status
    status: "ativa" | "inativa" | "aguardando_aprovacao";
    horaEnvioRecomendada?: string;   // "09:00"
    
    // Metadata
    empresaCnpj: string;
    criadoEm: string;
    ultimaAtualizacao: string;
  }
]

// QUERY PARAMS:
// ?empresa_cnpj=12.345.678/0001-90
// ?categoria=financeiro
// ?status=ativa
```

- [ ] Implementar query ao banco (table: whatsapp_templates)
- [ ] Filtrar por empresa
- [ ] Filtrar por status
- [ ] Retornar variáveis parseadas

#### 1.4 GET `/whatsapp-scheduled`
```typescript
// RETORNA mensagens agendadas:
[
  {
    id: string;
    empresa_cnpj: string;
    contato_phone: string;
    contato_nome: string;
    
    // Conteúdo
    mensagem: string;
    templateId?: string;
    variaveisPreenChidas?: Record<string, string>;
    
    // Agendamento
    dataAgendada: string;            // ISO date "2025-11-10T14:30:00Z"
    recorrencia?: string;             // "unica" | "diaria" | "semanal" | "mensal"
    
    // Status
    status: "agendada" | "enviada" | "falha" | "cancelada";
    tentativas: number;
    ultimaTentativa?: string;
    proximaTentativa?: string;
    
    // Metadata
    criadoEm: string;
    criadoPor: string;
  }
]

// QUERY PARAMS:
// ?empresa_cnpj=12.345.678/0001-90
// ?status=agendada
// ?dataAte=2025-11-15
```

- [ ] Implementar query ao banco (table: whatsapp_scheduled ou similar)
- [ ] Filtrar por status
- [ ] Filtrar por empresa
- [ ] Filtrar por data
- [ ] Paginação

#### 1.5 POST `/whatsapp-send` (ou usar wasender-send-message)
```typescript
// REQUEST:
{
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
  
  // Opcionais
  templateId?: string;
  variaveis?: Record<string, string>;
  idempotencyKey?: string;           // Para evitar duplicação
}

// RESPONSE:
{
  success: boolean;
  messageId: string;                 // ID retornado do WASender
  status: "enviada" | "fila" | "erro";
  erro?: string;
  timestamp: string;
}
```

- [ ] Validar campos obrigatórios
- [ ] Chamar WASender API com autenticação
- [ ] Armazenar em whatsapp_messages
- [ ] Retornar messageId para tracking
- [ ] Documentar no API-REFERENCE.md

#### 1.6 POST `/whatsapp-schedule`
```typescript
// REQUEST:
{
  empresa_cnpj: string;
  contato_phone: string;
  mensagem: string;
  dataAgendada: string;              // ISO datetime
  
  templateId?: string;
  variaveis?: Record<string, string>;
  recorrencia?: "unica" | "diaria" | "semanal" | "mensal";
  
  idempotencyKey?: string;
}

// RESPONSE:
{
  success: boolean;
  scheduledId: string;
  status: "agendada";
  dataAgendada: string;
  proximaTentativa: string;
  timestamp: string;
}
```

- [ ] Validar data no futuro
- [ ] Armazenar em whatsapp_scheduled
- [ ] Configurar job no pg_cron ou N8N
- [ ] Retornar scheduledId

#### 1.7 DELETE `/whatsapp-scheduled/{id}`
```typescript
// REQUEST: (vazio)

// RESPONSE:
{
  success: boolean;
  message: "Agendamento cancelado";
  timestamp: string;
}
```

- [ ] Validar ownership (empresa_cnpj)
- [ ] Cancelar job agendado
- [ ] Marcar como "cancelada" na DB

---

### 2. Group Aliases - POST/PATCH (2 horas)

#### 2.1 POST `/group-aliases`
```typescript
// REQUEST:
{
  label: string;                     // "Grupo VIP"
  description?: string;
  color?: string;                    // "#FF5733"
  icon?: string;                     // "star"
  
  // Membros (empresas/cnpj)
  members: [
    {
      company_cnpj: string;          // "12.345.678/0001-90"
      position?: number;              // 1, 2, 3...
    }
  ];
}

// RESPONSE (Prefer: return=representation):
{
  id: string;                        // UUID gerado
  label: string;
  description?: string;
  color?: string;
  icon?: string;
  
  // Membros COMPLETOS
  members: [
    {
      id: string;                    // ID do membro
      alias_id: string;              // ID do grupo
      company_cnpj: string;
      company_name: string;          // ← Buscar de clientes
      position: number;
      
      // Integrations (da tabela clientes)
      integracao_f360: boolean;
      integracao_omie: boolean;
      whatsapp_ativo: boolean;
    }
  ];
  
  totalMembers: number;
  criadoEm: string;
  atualizadoEm: string;
}
```

- [ ] Validar label único por usuário
- [ ] Inserir em group_aliases
- [ ] Inserir membros em group_alias_members
- [ ] JOIN com clientes para retornar company_name
- [ ] Retornar representação completa

#### 2.2 PATCH `/group-aliases/{id}`
```typescript
// REQUEST (qualquer campo):
{
  label?: string;
  description?: string;
  color?: string;
  icon?: string;
  
  // Atualizar membros (REPLACE completo)
  members?: [
    {
      company_cnpj: string;
      position?: number;
    }
  ];
}

// RESPONSE (Prefer: return=representation):
// Mesma estrutura do POST (com members completos)
```

- [ ] Atualizar campos em group_aliases
- [ ] Se members fornecido: DELETE old + INSERT new
- [ ] Retornar representação completa
- [ ] Validar que pelo menos 1 membro existe

#### 2.3 GET `/group-aliases`
```typescript
// RETORNA lista com members inline:
[
  {
    id: string;
    label: string;
    description?: string;
    color?: string;
    icon?: string;
    
    members: [
      {
        id: string;
        company_cnpj: string;
        company_name: string;
        position: number;
        integracao_f360: boolean;
        integracao_omie: boolean;
        whatsapp_ativo: boolean;
      }
    ];
    
    totalMembers: number;
    criadoEm: string;
  }
]

// QUERY PARAMS:
// ?limit=50&offset=0
```

- [ ] Implementar query com JOINs
- [ ] Incluir todos os members
- [ ] Ordenar por position

#### 2.4 GET `/group-aliases/{id}`
```typescript
// RETORNA grupo completo com members
// Mesma estrutura acima
```

- [ ] Buscar por ID
- [ ] Incluir members com dados completos

---

### 3. Financial Alerts - PATCH (1.5 horas)

#### 3.1 PATCH `/financial-alerts/{id}`
```typescript
// REQUEST:
{
  status?: "pendente" | "resolvido" | "ignorado";
  
  // Se resolvido/ignorado
  resolucao_tipo?: "corrigido" | "falso_positivo" | "ignorar";
  resolucao_observacoes?: string;
  
  // Metadata
  resolvido_por?: string;            // user_id ou admin_cnpj
  resolvido_em?: string;             // ISO timestamp (opcional, usa agora)
}

// RESPONSE (Prefer: return=representation):
{
  id: string;
  company_cnpj: string;
  tipo: string;
  prioridade: string;
  titulo: string;
  descricao: string;
  status: string;                    // ← ATUALIZADO
  dados: Record<string, any>;
  
  // Resolução
  resolucao_tipo?: string;           // ← NOVO
  resolucao_observacoes?: string;    // ← NOVO
  resolvido_por?: string;            // ← NOVO
  
  created_at: string;
  resolved_at?: string;              // ← NOVO/ATUALIZADO
}
```

- [ ] Validar status permitido
- [ ] Validar transição (ex: pendente → resolvido OK, mas resolvido → pendente?)
- [ ] Atualizar resolved_at ao resolver
- [ ] Armazenar resolucao_tipo e resolucao_observacoes
- [ ] Retornar representação completa

#### 3.2 GET `/financial-alerts`
```typescript
// RETORNA com campos de resolução:
[
  {
    id: string;
    // ... campos existentes
    status: string;
    
    // Resolução
    resolucao_tipo?: string;
    resolucao_observacoes?: string;
    resolvido_por?: string;
    resolved_at?: string;
  }
]

// QUERY PARAMS:
// ?status=pendente
// ?prioridade=crítica
// ?empresa_cnpj=12.345.678/0001-90
```

- [ ] Incluir campos de resolução na query
- [ ] Filtrar por status

#### 3.3 GET `/financial-alerts/{id}`
```typescript
// RETORNA alerta completo com resolução
// Mesma estrutura acima
```

---

## 📚 Documentação (1 hora)

### docs/API-REFERENCE.md

Criar/atualizar com:

```markdown
# API Reference - DashFinance

## WhatsApp Endpoints

### GET /whatsapp-conversations
Retorna lista de conversas WhatsApp ativas.

**Params:**
- empresa_cnpj (optional)
- status (ativo | pausado | encerrado)
- limit (default: 50)
- offset (default: 0)

**Response:** Array de conversas com status, mensagens, contato

---

### POST /whatsapp-send
Envia mensagem WhatsApp imediata via WASender.

**Request:**
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Sua fatura está pronta",
  "templateId": "uuid (opcional)",
  "variaveis": {"valor": "R$ 1.500"}
}
```

**Response:** { success, messageId, status }

---

### POST /whatsapp-schedule
Agenda envio de mensagem WhatsApp.

**Request:**
```json
{
  "empresa_cnpj": "12.345.678/0001-90",
  "contato_phone": "5511999999999",
  "mensagem": "Aviso: fatura vence em 5 dias",
  "dataAgendada": "2025-11-10T14:30:00Z",
  "recorrencia": "semanal"
}
```

**Response:** { success, scheduledId, dataAgendada }

---

### DELETE /whatsapp-scheduled/{id}
Cancela agendamento de mensagem.

**Response:** { success, message }

---

## Group Aliases

### POST /group-aliases
Cria novo grupo de empresas.

**Request:**
```json
{
  "label": "Grupo VIP",
  "color": "#FF5733",
  "members": [
    {"company_cnpj": "12.345.678/0001-90", "position": 1},
    {"company_cnpj": "98.765.432/0001-10", "position": 2}
  ]
}
```

**Response:** Grupo criado com members completos (JOINs)

---

### PATCH /group-aliases/{id}
Atualiza grupo e/ou membros.

**Request:**
```json
{
  "label": "Grupo VIP Premium",
  "members": [...]  // Novo array (REPLACE)
}
```

**Response:** Grupo atualizado com members

---

## Financial Alerts

### PATCH /financial-alerts/{id}
Atualiza status e resolução de alerta.

**Request:**
```json
{
  "status": "resolvido",
  "resolucao_tipo": "corrigido",
  "resolucao_observacoes": "Taxa corrigida no banco",
  "resolvido_por": "admin_user_id"
}
```

**Response:** Alerta com campos de resolução

---
```

- [ ] Documentar todos os endpoints
- [ ] Incluir exemplos de request/response
- [ ] Documentar query params
- [ ] Documentar validações
- [ ] Documentar erros possíveis

---

## 🗄️ Banco de Dados - Verificações

### Verificar se existem tabelas:

```sql
-- Checar tabelas necessárias
\dt whatsapp_*
\dt group_*
\dt financial_alerts

-- Se faltarem, criar:
-- whatsapp_conversations (id, empresa_cnpj, contato_phone, etc)
-- whatsapp_messages (id, conversation_id, texto, tipo, status)
-- whatsapp_templates (id, empresa_cnpj, nome, corpo, variaveis)
-- whatsapp_scheduled (id, empresa_cnpj, contato_phone, mensagem, dataAgendada, status)
-- group_aliases (id, label, description, color, icon)
-- group_alias_members (id, alias_id, company_cnpj, position)
-- financial_alerts (id, empresa_cnpj, tipo, status, resolucao_tipo, resolucao_observacoes, resolvido_em)
```

- [ ] Validar que todas as tabelas existem
- [ ] Validar que colunas necessárias existem
- [ ] Criar índices para performance

---

## 🔌 Integração Frontend

### APIs Frontend a Apontar Para:

```typescript
// Em lib/api.ts, adicionar:

// WhatsApp
export async function getWhatsappConversations(companyCnpj?: string)
export async function getWhatsappConversation(id: string)
export async function getWhatsappTemplates(companyCnpj?: string)
export async function getWhatsappScheduled(companyCnpj?: string)
export async function sendWhatsappMessage(data: {...})
export async function scheduleWhatsappMessage(data: {...})
export async function cancelWhatsappScheduled(id: string)

// Group Aliases
export async function getGroupAliases()
export async function getGroupAlias(id: string)
export async function createGroupAlias(data: {...})
export async function updateGroupAlias(id: string, data: {...})

// Financial Alerts
export async function updateFinancialAlertStatus(id: string, data: {...})
```

- [ ] Implementar todas as funções
- [ ] Usar Prefer: return=representation
- [ ] Cache com React Query
- [ ] Error handling

---

## ✅ CHECKLIST FINAL

**WhatsApp:**
- [ ] GET /whatsapp-conversations
- [ ] GET /whatsapp-conversations/{id}
- [ ] GET /whatsapp-templates
- [ ] GET /whatsapp-scheduled
- [ ] POST /whatsapp-send
- [ ] POST /whatsapp-schedule
- [ ] DELETE /whatsapp-scheduled/{id}

**Group Aliases:**
- [ ] POST /group-aliases
- [ ] PATCH /group-aliases/{id}
- [ ] GET /group-aliases
- [ ] GET /group-aliases/{id}
- [ ] JOINs com clientes funcionando
- [ ] Retorna members completos

**Financial Alerts:**
- [ ] PATCH /financial-alerts/{id}
- [ ] GET retorna resolucao_tipo, resolucao_observacoes
- [ ] Validações de status

**Documentação:**
- [ ] docs/API-REFERENCE.md criado/atualizado
- [ ] Todos endpoints documentados
- [ ] Exemplos de request/response
- [ ] Validações documentadas

**Frontend Integration:**
- [ ] lib/api.ts atualizado
- [ ] Todas funções implementadas
- [ ] Tipos TypeScript
- [ ] Error handling

---

## 📝 NOTAS

- Todas as respostas devem suportar `Prefer: return=representation`
- Validar `company_cnpj` em todas as operações (segurança)
- Usar transações para operações com múltiplas tabelas
- Implementar retry logic para WASender
- Cache com Redis se possível
- Logging de todas as operações

---

**Próximo Passo:** Implementar cada Edge Function conforme este guia  
**Tempo Total:** 4-6 horas  
**Prioridade:** ALTA


