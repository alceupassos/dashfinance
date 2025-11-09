# 💰 Sistema de Cobrança e Planos - Oráculo Financeiro

## 📋 Visão Geral

Sistema completo de cobrança por excedente e planos de serviço como valor agregado, incluindo o **Plano Oráculo Premium** - um serviço especial para empresas que querem um verdadeiro oráculo financeiro.

## 🎯 Funcionalidades Implementadas

### 1. Planos de Serviço

#### Plano Básico ($49/mês)
- 100k tokens LLM/mês
- $10 em custos LLM/mês
- 500 mensagens WhatsApp/mês
- 1 empresa, 1 usuário
- Análise IA básica

#### Plano Profissional ($149/mês)
- 500k tokens LLM/mês
- $50 em custos LLM/mês
- 2.000 mensagens WhatsApp/mês
- 3 empresas, 5 usuários
- Todos os recursos básicos + API + Relatórios automáticos

#### Plano Enterprise ($499/mês)
- 2M tokens LLM/mês
- $200 em custos LLM/mês
- 10k mensagens WhatsApp/mês
- 10 empresas, 20 usuários
- Todos os recursos + Suporte prioritário

#### ⭐ Plano Oráculo Premium ($999/mês)
- **10M tokens LLM/mês**
- **$1.000 em custos LLM/mês**
- **50k mensagens WhatsApp/mês**
- **Empresas e usuários ilimitados**
- **Todos os recursos + Consultoria financeira mensal**

**Recursos Exclusivos do Oráculo:**
- Análise IA avançada com modelos premium
- Bot WhatsApp ilimitado
- Relatórios executivos personalizados
- Integrações customizadas
- Suporte prioritário 24/7
- Consultoria financeira mensal
- Dashboard executivo personalizado

### 2. Sistema de Cobrança por Excedente

- **Cobrança automática** quando limites são ultrapassados
- **Taxa de excedente**: 1.5x o custo normal (configurável)
- **Limites por período**: Mensal, renovação automática
- **Faturas detalhadas**: Base + Excedente separados

### 3. Monitoramento de Uso

- **Dashboard em tempo real** do uso atual
- **Barras de progresso** visuais
- **Alertas** quando próximo dos limites
- **Histórico** de uso e custos

### 4. Faturas e Pagamentos

- **Faturas automáticas** ao final de cada período
- **Detalhamento** de base + excedente
- **Histórico completo** de faturas
- **Status de pagamento** (pendente, pago, falhou)

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

1. **service_plans** - Planos de serviço disponíveis
2. **client_subscriptions** - Assinaturas dos clientes
3. **invoices** - Faturas geradas
4. **invoice_line_items** - Linhas detalhadas das faturas

### Funções SQL

- `calculate_current_period_usage()` - Calcula uso do período atual
- `check_usage_limits()` - Verifica limites e calcula excedente
- `create_period_invoice()` - Cria fatura ao final do período

## 🎨 Interfaces Criadas

### Admin

1. **`/admin/billing/plans`** - Gerenciar planos e preços
   - Visualização de todos os planos
   - Cards destacando o Plano Oráculo
   - Tabela detalhada de recursos

2. **`/admin/billing/subscriptions`** - Gerenciar assinaturas
   - Lista de todas as assinaturas
   - Status e uso de cada cliente
   - Próximas cobranças

3. **`/admin/llm-costs-per-client`** - Custos por cliente
   - Custo detalhado de LLM por cliente
   - Configuração de chaves por cliente
   - Gráficos de uso

### Cliente

1. **`/billing/my-usage`** - Meu uso e cobrança
   - Uso atual do período
   - Barras de progresso visuais
   - Alertas de excedente
   - Histórico de faturas

## 🔄 Fluxo de Cobrança

1. **Cliente assina um plano** → Cria registro em `client_subscriptions`
2. **Sistema monitora uso** → Atualiza métricas em tempo real
3. **Ao final do período** → `create_period_invoice()` é chamada
4. **Fatura é gerada** → Com base + excedente (se houver)
5. **Cliente recebe fatura** → Via email ou dashboard
6. **Pagamento processado** → Integração com Stripe/PagSeguro (futuro)

## 💡 Casos de Uso

### Exemplo 1: Cliente no Plano Básico
- Limite: 100k tokens/mês, $10 em custos
- Uso real: 120k tokens, $12 em custos
- **Cobrança**: $49 (base) + $3 (excedente 1.5x) = **$52**

### Exemplo 2: Cliente no Plano Oráculo
- Limite: 10M tokens/mês, $1.000 em custos
- Uso real: 8M tokens, $800 em custos
- **Cobrança**: $999 (base) + $0 (dentro do limite) = **$999**

## 🚀 Próximos Passos

1. **Integração com Gateway de Pagamento**
   - Stripe ou PagSeguro
   - Webhooks para atualizar status
   - Processamento automático

2. **Notificações Automáticas**
   - Email quando próximo do limite
   - Alerta de excedente
   - Fatura gerada

3. **Dashboard Executivo**
   - Métricas de receita
   - Churn rate
   - MRR (Monthly Recurring Revenue)

4. **Upgrade/Downgrade Automático**
   - Sugestão de upgrade quando próximo do limite
   - Processo simplificado de mudança de plano

## 📝 Notas Importantes

- **Criptografia**: Chaves de API por cliente são criptografadas
- **RLS**: Políticas de segurança implementadas
- **Auditoria**: Todas as ações são registradas
- **Escalabilidade**: Sistema preparado para crescimento

---

**💰 Sistema de cobrança completo e pronto para monetizar o Oráculo Financeiro!**

