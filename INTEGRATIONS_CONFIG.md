# 🔐 Configurações Centralizadas de Integrações

## 📋 Visão Geral

Sistema centralizado para gerenciar todas as credenciais e tokens de API de todas as integrações do sistema, incluindo Yampi, LLMs, ERPs, WhatsApp, Storage, Email e Analytics.

## 🎯 Funcionalidades

### 1. Gerenciamento Centralizado

- **Uma única página** para todas as integrações
- **Organização por categoria** (Payment, LLM, ERP, WhatsApp, etc)
- **Status visual** (Ativa/Inativa, Configurada/Não configurada)
- **Histórico de alterações** (auditoria completa)

### 2. Segurança

- **Criptografia AES-GCM** de todas as credenciais
- **Apenas admin** pode visualizar e editar
- **Mascaramento** de valores sensíveis na interface
- **Auditoria** de todas as mudanças

### 3. Integrações Suportadas

#### Pagamentos
- **Yampi** - E-commerce e pagamentos
- **Stripe** - Gateway internacional
- **PagSeguro** - Gateway brasileiro

#### LLM
- **Anthropic Claude** - API do Claude
- **OpenAI GPT** - API do GPT
- **Google AI** - API do Gemini

#### ERP
- **F360** - Integração F360
- **Omie** - Integração Omie

#### WhatsApp
- **WASender** - API WASender
- **Evolution API** - Evolution API

#### Storage
- **AWS S3** - Armazenamento AWS
- **Google Cloud Storage** - GCS

#### Email
- **SendGrid** - Email transacional
- **Resend** - API de email moderna

#### Analytics
- **Google Analytics** - Analytics Google
- **Mixpanel** - Plataforma analytics

## 📊 Estrutura do Banco de Dados

### Tabelas

1. **integration_configs** - Configurações de integrações
   - Credenciais criptografadas
   - Configurações específicas (JSON)
   - Status e metadados

2. **integration_config_history** - Histórico de alterações
   - Auditoria completa
   - Valores antigos e novos
   - Quem alterou e quando

### Funções SQL

- `update_integration_config()` - Atualiza configuração com auditoria

## 🎨 Interface

### Página Principal: `/admin/config/integrations`

**Características:**
- **Tabs por categoria** - Organização visual
- **Cards de resumo** - Total, configuradas, ativas
- **Tabela de integrações** - Lista completa
- **Dialog de configuração** - Edição inline

**Campos de Configuração:**
- API Key
- API Secret (se aplicável)
- Access Token (se aplicável)
- Refresh Token (se aplicável)
- Config Data (JSON para configurações específicas)
- Status Ativo/Inativo

## 🔄 Fluxo de Uso

1. **Acessar página** `/admin/config/integrations`
2. **Selecionar categoria** (Payment, LLM, etc)
3. **Clicar em "Configurar"** na integração desejada
4. **Preencher credenciais** necessárias
5. **Adicionar config data** (JSON) se necessário
6. **Ativar** a integração
7. **Salvar** - Credenciais são criptografadas automaticamente

## 💡 Exemplos de Config Data

### Yampi
```json
{
  "store_id": "12345",
  "environment": "production",
  "product_id_llm_tokens": "prod_abc123",
  "product_id_whatsapp_messages": "prod_xyz789"
}
```

### Anthropic
```json
{
  "api_version": "2023-06-01",
  "max_tokens": 4096
}
```

### Omie
```json
{
  "app_key": "your_app_key",
  "app_secret": "your_app_secret"
}
```

## 🔒 Segurança

- **Criptografia**: Todas as credenciais são criptografadas com AES-GCM
- **RLS**: Apenas admin pode acessar
- **Mascaramento**: Valores sensíveis são mascarados na interface
- **Auditoria**: Todas as alterações são registradas
- **Validação**: Validação de JSON antes de salvar

## 📝 Próximos Passos

1. **Testes de Conexão**: Botão para testar cada integração
2. **Validação de Credenciais**: Verificar se credenciais são válidas
3. **Rotação Automática**: Suporte a rotação de tokens
4. **Webhooks**: Configuração de webhooks por integração
5. **Métricas**: Dashboard de uso de cada integração

---

**🔐 Sistema centralizado de configurações de integrações pronto!**

