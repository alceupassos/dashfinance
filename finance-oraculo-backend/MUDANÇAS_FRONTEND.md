# Mudanças Importantes para o Frontend

## 🚨 Alterações de Nomes de Tabelas

Durante a implementação, algumas tabelas tiveram que ser renomeadas devido a conflitos com tabelas existentes:

### 1. `api_keys` → `user_api_keys`
- **Motivo**: A tabela `api_keys` já existia e era usada para armazenar chaves de API dos provedores LLM (OpenAI, Anthropic)
- **Impacto**: A função `admin-api-keys` usa `user_api_keys`
- **Endpoints afetados**:
  - `GET /admin-api-keys` - listar chaves de API de usuários
  - `POST /admin-api-keys` - criar nova chave
  - `PUT /admin-api-keys/:id` - atualizar chave
  - `DELETE /admin-api-keys/:id` - revogar chave

### 2. `whatsapp_conversations` → `whatsapp_chat_sessions`
- **Motivo**: A tabela `whatsapp_conversations` já existia e armazena mensagens individuais (diferente schema)
- **Nova tabela**: `whatsapp_chat_sessions` armazena sessões/estado de conversas
- **Colunas**: id, phone_number, contact_name, company_cnpj, status, last_message_text, last_message_at, unread_count, tags, assigned_to, metadata
- **Impacto**: As funções de WhatsApp devem referenciar `whatsapp_chat_sessions` se forem implementadas

## ✅ Tabelas Criadas com Sucesso

### Admin/Observabilidade:
- ✅ `admin_api_metrics` - Métricas de Edge Functions (72 registros de teste)
- ✅ `admin_db_metrics` - Métricas do banco (168 registros)
- ✅ `admin_security_events` - Eventos de segurança (5 registros)
- ✅ `admin_sessions` - Sessões ativas (0 registros - requer usuários reais)
- ✅ `admin_backups` - Histórico de backups (30 registros)
- ✅ `admin_vulnerabilities` - Vulnerabilidades detectadas

### LLM:
- ✅ `llm_usage` - Uso de LLM (200 registros de teste)
- ✅ `llm_providers` - Já existia, populado com OpenAI e Anthropic
- ✅ `llm_models` - Já existia, populado com gpt-4-turbo, gpt-4o-mini, claude-3-5-sonnet, claude-3-5-haiku

### WhatsApp:
- ✅ `whatsapp_chat_sessions` - Sessões de conversa (4 registros)
- ✅ `whatsapp_scheduled` - Mensagens agendadas (3 registros)
- ✅ `whatsapp_templates` - Templates de mensagem (3 registros)

### Outros:
- ✅ `user_api_keys` - Chaves de API de usuários
- ✅ `user_companies` - Relação usuário ↔ empresas
- ✅ `dre_uploads` - Uploads de DRE (3 registros)
- ✅ `dashboard_cards` - Já existia

## 📡 Edge Functions Implementadas

Todas as 20 Edge Functions foram criadas:

### Autenticação:
- ✅ `auth-login` - POST para autenticação
- ✅ `profile` - GET/PUT perfil do usuário

### Dashboard:
- ✅ `kpi-monthly` - GET KPIs mensais (suporta ?cnpj= e ?alias=)
- ✅ `dashboard-metrics` - GET métricas, alertas, cashflow

### Admin - Segurança/Observabilidade:
- ✅ `admin-security-traffic` - GET métricas de tráfego de API
- ✅ `admin-security-database` - GET métricas de saúde do banco
- ✅ `admin-security-overview` - GET overview de segurança
- ✅ `admin-security-sessions` - GET sessões ativas
- ✅ `admin-security-backups` - GET histórico de backups

### Admin - CRUD:
- ✅ `admin-users` - GET/POST/PUT/DELETE usuários (apenas admin)
- ✅ `admin-api-keys` - GET/POST/PUT/DELETE chaves API (apenas admin) **[Usa user_api_keys]**
- ✅ `admin-llm-config` - GET/PUT config LLM (múltiplos subendpoints via ?endpoint=)

### Business Logic:
- ✅ `targets` - GET lista de grupos/aliases disponíveis
- ✅ `empresas` - GET lista de empresas com status de integração

### WhatsApp (esqueletos criados):
- ✅ `whatsapp-conversations` - (não implementado - skeleton)
- ✅ `whatsapp-scheduled` - (não implementado - skeleton)
- ✅ `whatsapp-templates` - (não implementado - skeleton)

### Upload/Export:
- ✅ `upload-dre` - POST upload de DRE
- ✅ `export-excel` - GET export para Excel

### Sync (já existiam):
- ✅ `sync-f360` - Sincronização F360
- ✅ `sync-omie` - Sincronização OMIE
- ✅ `analyze` - Análise de dados

## 🔑 Schemas Específicos

### llm_models.model_type
A tabela existente tem um CHECK constraint que só permite:
- `fast` - Modelos rápidos/baratos (gpt-4o-mini, claude-3-5-haiku)
- `reasoning` - Modelos de raciocínio (gpt-4-turbo)
- `complex` - Modelos complexos (claude-3-5-sonnet)

### llm_providers
Colunas: id, provider_name, display_name, api_key_id, is_active, **base_url** (não api_endpoint), created_at, updated_at

## 📊 Dados de Teste Disponíveis

- 72 horas de métricas de API
- 1 semana de métricas de DB
- 5 eventos de segurança (critical, high, medium, info, low)
- 30 dias de histórico de backups
- 3 vulnerabilidades (SQL injection, XSS, senha fraca)
- 200 registros de uso de LLM (últimos 400 horas)
- 4 sessões de WhatsApp
- 3 mensagens agendadas
- 3 templates de WhatsApp
- 3 uploads de DRE
- 2 providers LLM (OpenAI, Anthropic)
- 4 modelos LLM configurados
- 3 grupos de exemplo (holding-tech, holding-varejo, holding-servicos)

## 🚀 Próximos Passos

1. ✅ Migration executada com sucesso
2. ✅ Seeds populados (500+ registros)
3. ⏳ Edge Functions precisam ser deployadas manualmente via Supabase CLI se ainda não estiverem

## 📝 Notas

- As tabelas `profiles`, `llm_providers`, `llm_models`, `dashboard_cards`, `group_alias_members` já existiam e foram expandidas com novas colunas
- Alguns INSERTs de seed (como `admin_sessions`) foram comentados porque requerem user_id válido de auth.users
- Todas as políticas RLS foram criadas com DROP IF EXISTS para evitar conflitos
