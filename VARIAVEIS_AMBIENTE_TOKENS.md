# 🔐 Variáveis de Ambiente e Tokens - Finance Oráculo

**Data:** Janeiro 2025  
**Versão:** 1.0  
**Status:** Documentação de Configuração

---

## 📋 INTRODUÇÃO

Este documento lista todas as **variáveis de ambiente e tokens de API** fundamentais para o funcionamento completo do sistema Finance Oráculo. Estas credenciais são essenciais para garantir a comunicação entre os diversos serviços, integrações e funcionalidades da plataforma.

**⚠️ IMPORTANTE:** Todas as variáveis listadas abaixo são **obrigatórias** para o funcionamento adequado do sistema. A ausência ou configuração incorreta de qualquer uma delas pode resultar em falhas críticas nas funcionalidades correspondentes.

---

## 🤖 1. PROVEDORES DE INTELIGÊNCIA ARTIFICIAL (LLMs)

As seguintes variáveis são necessárias para integração com diferentes provedores de modelos de linguagem, permitindo flexibilidade na escolha do melhor modelo para cada tarefa e garantindo redundância em caso de indisponibilidade.

```bash
# OpenAI (GPT-4, GPT-3.5, TTS)
OPENAI_API_KEY=

# Anthropic (Claude Sonnet 4.5, Claude Opus)
ANTHROPIC_API_KEY=

# Google Gemini
GEMINI_API_KEY=

# Cohere
COHERE_API_KEY=

# Mistral AI
MISTRAL_API_KEY=

# DeepSeek
DEEPSEEK_API_KEY=

# Perplexity AI
PERPLEXITY_API_KEY=

# Together AI
TOGETHERAI_API_KEY=

# AnyScale
ANYSCALE_API_KEY=

# Databricks
DATABRICKS_API_KEY=

# Fireworks AI
FIREWORKS_API_KEY=

# Groq
GROQ_API_KEY=

# Hugging Face
HUGGINGFACE_TOKEN=

# Unify AI
UNIFY_API_KEY=

# OpenRouter (Agregador de múltiplos LLMs)
OPENROUTER_API_KEY=

# Zhipu AI
ZHIPU_AI_API_KEY=

# X AI (Grok)
X_API_KEY=

# Copilot+ API
COPILOT_PLUS_API_KEY=
```

---

## 🗄️ 2. BANCO DE DADOS E INFRAESTRUTURA

Credenciais para acesso ao banco de dados principal, serviços de armazenamento e infraestrutura em nuvem.

```bash
# Supabase - URL do Projeto
SUPABASE_URL=

# Supabase - Chave Anônima (Frontend)
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_ANON_KEY=

# Supabase - Chave de Serviço (Backend)
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SERVICE_KEY=

# Supabase - Database URL
DATABASE_URL=

# Google Cloud Platform
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY=
GOOGLE_CLOUD_STORAGE_BUCKET=

# AWS (Opcional - para backups e storage)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_S3_BUCKET=

# Azure (Opcional)
AZURE_STORAGE_ACCOUNT=
AZURE_STORAGE_KEY=
AZURE_CONNECTION_STRING=
```

---

## 📱 3. MENSAGERIA E COMUNICAÇÃO

Tokens para integração com serviços de mensageria, WhatsApp e comunicação.

```bash
# Evolution API (WhatsApp Business)
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVO_API_URL=
EVO_API_KEY=

# Twilio (Opcional - SMS/WhatsApp alternativo)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# SendGrid (Email)
SENDGRID_API_KEY=

# Mailgun (Email alternativo)
MAILGUN_API_KEY=
MAILGUN_DOMAIN=

# Telegram Bot (Opcional)
TELEGRAM_BOT_TOKEN=
```

---

## 🔄 4. AUTOMAÇÃO E WORKFLOWS

Credenciais para serviços de automação e orquestração de workflows.

```bash
# n8n
N8N_API_KEY=
N8N_WEBHOOK_URL=
N8N_BASIC_AUTH_USER=
N8N_BASIC_AUTH_PASSWORD=

# Zapier (Opcional)
ZAPIER_WEBHOOK_KEY=

# Make (Integromat) - Opcional
MAKE_API_KEY=
```

---

## 🏢 5. INTEGRAÇÕES ERP E CONTÁBEIS

Credenciais para integração com sistemas ERP e plataformas contábeis.

```bash
# F360 API
F360_API_BASE=
F360_API_KEY=
F360_CLIENT_ID=
F360_CLIENT_SECRET=

# OMIE API
OMIE_API_BASE=
OMIE_API_KEY=
OMIE_APP_KEY=
OMIE_APP_SECRET=

# TOTVS Protheus (Opcional)
TOTVS_API_URL=
TOTVS_API_KEY=

# SAP (Opcional)
SAP_API_URL=
SAP_API_KEY=
SAP_CLIENT_ID=
SAP_CLIENT_SECRET=
```

---

## 🗺️ 6. SERVIÇOS DE MAPAS E LOCALIZAÇÃO

Tokens para serviços de geolocalização e mapas.

```bash
# Mapbox
MAPBOX_TOKEN=
MAPBOX_ACCESS_TOKEN=

# Google Maps (Opcional)
GOOGLE_MAPS_API_KEY=

# Here Maps (Opcional)
HERE_API_KEY=
```

---

## 📊 7. ANALYTICS E MONITORAMENTO

Credenciais para serviços de análise, monitoramento e observabilidade.

```bash
# Sentry (Error Tracking)
SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# Datadog (Opcional)
DATADOG_API_KEY=
DATADOG_APP_KEY=

# New Relic (Opcional)
NEW_RELIC_LICENSE_KEY=
NEW_RELIC_APP_NAME=

# LogRocket (Opcional)
LOGROCKET_APP_ID=

# Mixpanel (Analytics)
MIXPANEL_TOKEN=

# Google Analytics
GOOGLE_ANALYTICS_ID=
```

---

## 🔒 8. SEGURANÇA E CRIPTOGRAFIA

Chaves para criptografia, segurança e gerenciamento de secrets.

```bash
# KMS Secret (Chave Mestra de Criptografia)
KMS_SECRET=

# JWT Secret
JWT_SECRET=
JWT_ALGORITHM=

# Encryption Key
ENCRYPTION_KEY=

# Session Secret
SESSION_SECRET=

# API Gateway Keys
API_GATEWAY_KEY=
```

---

## 🌐 9. APIS E SERVIÇOS EXTERNOS

Credenciais para diversos serviços e APIs externas utilizadas pelo sistema.

```bash
# APIDog
APIDOG_API_KEY=

# API Pie
APIPIE_API_KEY=

# Stripe (Pagamentos)
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# PayPal (Opcional)
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=

# Pipedrive (CRM - Opcional)
PIPEDRIVE_API_TOKEN=

# HubSpot (CRM - Opcional)
HUBSPOT_API_KEY=
```

---

## 🐳 10. DOCKER E CONTAINERIZAÇÃO

Variáveis para configuração de containers e orquestração.

```bash
# Docker Registry
DOCKER_REGISTRY_URL=
DOCKER_REGISTRY_USERNAME=
DOCKER_REGISTRY_PASSWORD=

# Docker Compose
COMPOSE_PROJECT_NAME=
```

---

## 🚀 11. DEPLOYMENT E CI/CD

Credenciais para pipelines de deploy e integração contínua.

```bash
# Vercel
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=

# GitHub Actions
GITHUB_TOKEN=
GITHUB_SECRET=

# GitLab CI
GITLAB_TOKEN=

# Railway
RAILWAY_TOKEN=

# Render
RENDER_API_KEY=
```

---

## 📧 12. NOTIFICAÇÕES E ALERTAS

Tokens para serviços de notificação e alertas.

```bash
# Slack
SLACK_BOT_TOKEN=
SLACK_WEBHOOK_URL=
SLACK_CHANNEL_ID=

# Discord (Opcional)
DISCORD_WEBHOOK_URL=

# Microsoft Teams (Opcional)
TEAMS_WEBHOOK_URL=

# PagerDuty (Alertas críticos)
PAGERDUTY_INTEGRATION_KEY=
```

---

## 🔍 13. BUSCA E INDEXAÇÃO

Credenciais para serviços de busca e indexação.

```bash
# Algolia (Busca)
ALGOLIA_APP_ID=
ALGOLIA_API_KEY=
ALGOLIA_SEARCH_KEY=

# Elasticsearch (Opcional)
ELASTICSEARCH_URL=
ELASTICSEARCH_API_KEY=

# Meilisearch (Opcional)
MEILISEARCH_HOST=
MEILISEARCH_MASTER_KEY=
```

---

## 📁 14. ARMAZENAMENTO DE ARQUIVOS

Tokens para serviços de armazenamento de arquivos e mídia.

```bash
# Cloudinary (Imagens e vídeos)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# ImageKit (Opcional)
IMAGEKIT_PUBLIC_KEY=
IMAGEKIT_PRIVATE_KEY=
IMAGEKIT_URL_ENDPOINT=

# Uploadcare (Opcional)
UPLOADCARE_PUBLIC_KEY=
UPLOADCARE_SECRET_KEY=
```

---

## 🌍 15. CONFIGURAÇÕES DE AMBIENTE

Variáveis gerais de configuração do ambiente e aplicação.

```bash
# Ambiente
NODE_ENV=production
ENVIRONMENT=production

# URLs da Aplicação
NEXT_PUBLIC_APP_URL=
APP_URL=
API_URL=

# Portas
PORT=3000
API_PORT=5000

# Timezone
TZ=America/Sao_Paulo

# Locale
LOCALE=pt-BR

# Debug
DEBUG=
LOG_LEVEL=info
```

---

## 🔐 16. F5-TTS E SÍNTESE DE VOZ

Configurações específicas para o serviço de síntese de voz.

```bash
# F5-TTS API
F5_TTS_API_URL=
F5_TTS_API_KEY=

# TTS Model Path
TTS_MODEL_PATH=
TTS_CACHE_DIR=
```

---

## 📝 17. TEMPLATE COMPLETO (.env)

Abaixo está um template completo do arquivo `.env` com todas as variáveis organizadas:

```bash
# ============================================
# FINANCE ORÁCULO - VARIÁVEIS DE AMBIENTE
# ============================================

# ========== LLMs e IA ==========
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
COHERE_API_KEY=
MISTRAL_API_KEY=
DEEPSEEK_API_KEY=
PERPLEXITY_API_KEY=
TOGETHERAI_API_KEY=
ANYSCALE_API_KEY=
DATABRICKS_API_KEY=
FIREWORKS_API_KEY=
GROQ_API_KEY=
HUGGINGFACE_TOKEN=
UNIFY_API_KEY=
OPENROUTER_API_KEY=
ZHIPU_AI_API_KEY=
X_API_KEY=
COPILOT_PLUS_API_KEY=

# ========== Banco de Dados ==========
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SUPABASE_SERVICE_KEY=
DATABASE_URL=

# ========== Google Cloud ==========
GOOGLE_CLOUD_PROJECT_ID=
GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY=
GOOGLE_CLOUD_STORAGE_BUCKET=

# ========== Mensageria ==========
EVOLUTION_API_URL=
EVOLUTION_API_KEY=
EVO_API_URL=
EVO_API_KEY=

# ========== Automação ==========
N8N_API_KEY=
N8N_WEBHOOK_URL=

# ========== ERPs ==========
F360_API_BASE=
F360_API_KEY=
OMIE_API_BASE=
OMIE_API_KEY=
OMIE_APP_KEY=
OMIE_APP_SECRET=

# ========== Mapas ==========
MAPBOX_TOKEN=

# ========== APIs Externas ==========
APIDOG_API_KEY=
APIPIE_API_KEY=

# ========== Segurança ==========
KMS_SECRET=
JWT_SECRET=
ENCRYPTION_KEY=

# ========== TTS ==========
F5_TTS_API_URL=

# ========== Ambiente ==========
NODE_ENV=production
NEXT_PUBLIC_APP_URL=
APP_URL=
TZ=America/Sao_Paulo
LOG_LEVEL=info
```

---

## ⚠️ 18. SEGURANÇA E BOAS PRÁTICAS

### 18.1. Armazenamento Seguro

- ✅ **Nunca** commite arquivos `.env` no Git
- ✅ Use `.env.example` como template (sem valores reais)
- ✅ Configure `.gitignore` para excluir `.env`
- ✅ Use serviços de gerenciamento de secrets (AWS Secrets Manager, HashiCorp Vault, etc.)
- ✅ Rotacione chaves regularmente (a cada 90 dias)

### 18.2. Permissões de Arquivo

```bash
# Definir permissões restritas no arquivo .env
chmod 600 .env

# Verificar permissões
ls -la .env
```

### 18.3. Validação de Variáveis

Implemente validação no código para garantir que todas as variáveis obrigatórias estejam presentes:

```typescript
// Exemplo de validação
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_KEY',
  'OPENAI_API_KEY',
  'EVOLUTION_API_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});
```

---

## 📋 19. CHECKLIST DE CONFIGURAÇÃO

Use este checklist para garantir que todas as variáveis necessárias estão configuradas:

### Variáveis Críticas (Obrigatórias)
- [ ] `SUPABASE_URL`
- [ ] `SUPABASE_SERVICE_KEY`
- [ ] `SUPABASE_ANON_KEY`
- [ ] `DATABASE_URL`
- [ ] `OPENAI_API_KEY` ou `ANTHROPIC_API_KEY`
- [ ] `EVOLUTION_API_KEY`
- [ ] `F360_API_KEY` ou `OMIE_API_KEY`
- [ ] `N8N_API_KEY`
- [ ] `KMS_SECRET`

### Variáveis Importantes (Recomendadas)
- [ ] `MAPBOX_TOKEN`
- [ ] `SENTRY_DSN`
- [ ] `SLACK_WEBHOOK_URL`
- [ ] `GOOGLE_CLOUD_PROJECT_ID`

### Variáveis Opcionais (Conforme Necessidade)
- [ ] Tokens de LLMs alternativos
- [ ] Serviços de analytics
- [ ] Integrações adicionais

---

## 🔄 20. ATUALIZAÇÃO E MANUTENÇÃO

### 20.1. Rotação de Chaves

- **Frequência:** A cada 90 dias para chaves críticas
- **Processo:** 
  1. Gerar nova chave no provedor
  2. Atualizar variável de ambiente
  3. Testar funcionalidade
  4. Revogar chave antiga após 7 dias

### 20.2. Auditoria

- Mantenha log de quando cada chave foi criada/atualizada
- Documente qual serviço utiliza cada chave
- Monitore uso anormal de APIs

---

## 📞 21. SUPORTE

Em caso de dúvidas sobre configuração de variáveis de ambiente:

1. Consulte a documentação específica de cada serviço
2. Verifique os logs de erro para identificar variáveis faltantes
3. Use ferramentas de validação de ambiente
4. Entre em contato com a equipe de desenvolvimento

---

## 📝 NOTAS FINAIS

Este documento deve ser atualizado sempre que:
- Novas integrações forem adicionadas ao sistema
- Novos provedores de serviços forem incorporados
- Variáveis forem deprecadas ou substituídas
- Mudanças na arquitetura exigirem novas credenciais

**Última atualização:** Janeiro 2025  
**Próxima revisão:** Abril 2025

---

**⚠️ CONFIDENCIAL:** Este documento contém informações sensíveis. Mantenha-o seguro e acessível apenas a membros autorizados da equipe.

