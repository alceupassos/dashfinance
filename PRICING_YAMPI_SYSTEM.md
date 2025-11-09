# 💰 Sistema de Precificação LLM e Integração Yampi

## 📋 Visão Geral

Sistema completo de precificação com margem de **3.5x** sobre custos reais de LLM, com integração automática com **Yampi** para emissão de faturas.

## 🎯 Funcionalidades

### 1. Precificação Automática (3.5x Markup)

- **Custo Real**: O que pagamos aos provedores (Anthropic, OpenAI, etc)
- **Preço Cliente**: Custo × 3.5 (configurável)
- **Cálculo Automático**: Sistema calcula preço baseado no custo real

### 2. Configuração por Modelo

Cada modelo LLM tem:
- Custo por 1k tokens input
- Custo por 1k tokens output
- Preço por 1k tokens input (custo × markup)
- Preço por 1k tokens output (custo × markup)
- Markup multiplicador (padrão: 3.5x)

### 3. Integração Yampi

- **Emissão Automática**: Faturas criadas automaticamente no Yampi
- **Sincronização**: Status de pagamento sincronizado
- **Webhooks**: Recebe atualizações de status do Yampi

## 📊 Estrutura do Banco de Dados

### Tabelas Criadas

1. **llm_pricing** - Precificação de cada modelo
   - Custo real (input/output)
   - Preço para cliente (input/output)
   - Markup multiplicador

2. **yampi_config** - Configuração Yampi
   - API Key (criptografada)
   - Store ID
   - Ambiente (sandbox/production)
   - IDs de produtos

3. **yampi_invoices** - Faturas sincronizadas
   - Order ID do Yampi
   - Status de pagamento
   - Valores e detalhes de uso

### Funções SQL

- `calculate_client_price()` - Calcula preço para cliente baseado no custo
- `record_llm_usage_with_pricing()` - Registra uso com preço calculado
- View `v_llm_profit_margin` - Relatório de margem de lucro

## 🎨 Interfaces Criadas

### Admin

1. **`/admin/billing/pricing`** - Gerenciar precificação
   - Ver todos os modelos e seus custos/preços
   - Editar custos e markup
   - Ver margem de lucro em tempo real
   - Relatório de lucro por modelo

2. **`/admin/billing/yampi-config`** - Configurar Yampi
   - Configurar API Key
   - Configurar Store ID
   - Configurar IDs de produtos
   - Testar conexão

## 💡 Exemplo de Precificação

### Claude 3.5 Haiku
- **Custo Real**: 
  - Input: $0.001 por 1k tokens
  - Output: $0.005 por 1k tokens
- **Preço Cliente** (3.5x):
  - Input: $0.0035 por 1k tokens
  - Output: $0.0175 por 1k tokens

### Exemplo de Uso
- Cliente usa: 10k tokens input + 5k tokens output
- **Custo Real**: (10 × $0.001) + (5 × $0.005) = $0.035
- **Preço Cliente**: (10 × $0.0035) + (5 × $0.0175) = $0.1225
- **Lucro**: $0.1225 - $0.035 = **$0.0875 (250% de margem)**

## 🔄 Fluxo de Cobrança com Yampi

1. **Uso Registrado** → Sistema calcula custo real e preço cliente
2. **Fim do Período** → Agrega uso do cliente
3. **Cria Pedido Yampi** → Via API do Yampi
4. **Fatura Gerada** → Cliente recebe link de pagamento
5. **Webhook Yampi** → Atualiza status quando pago
6. **Sincronização** → Status atualizado no sistema

## 📝 Configuração Inicial

### 1. Configurar Precificação

Acesse `/admin/billing/pricing` e configure:
- Custos reais de cada modelo
- Markup desejado (padrão: 3.5x)
- Preços são calculados automaticamente

### 2. Configurar Yampi

Acesse `/admin/billing/yampi-config` e configure:
- API Key do Yampi
- Store ID
- IDs dos produtos (LLM e WhatsApp)
- Ambiente (sandbox para testes)

### 3. Criar Produtos no Yampi

No Yampi, crie produtos para:
- **Tokens LLM**: Produto para cobrança de uso de LLM
- **Mensagens WhatsApp**: Produto para cobrança de mensagens

## 🚀 Edge Functions

### `yampi-create-invoice`
- Cria pedido no Yampi
- Sincroniza com banco de dados
- Retorna link de pagamento

### `manage-yampi-config`
- Gerencia configuração Yampi
- Criptografa API Key
- Valida configuração

### `yampi-test-connection`
- Testa conexão com Yampi
- Valida credenciais
- Verifica produtos

## 📊 Relatórios Disponíveis

### Margem de Lucro
- Custo total vs Receita total
- Lucro por modelo
- Margem percentual
- Requests por modelo

### Dashboard de Precificação
- Visualização de todos os modelos
- Comparação custo vs preço
- Status ativo/inativo
- Edição rápida

## 🔒 Segurança

- **API Keys Criptografadas**: Chaves do Yampi são criptografadas
- **RLS Policies**: Apenas admin pode gerenciar
- **Validação**: Testes de conexão antes de ativar
- **Auditoria**: Todas as ações são registradas

## 📈 Próximos Passos

1. **Webhook Handler**: Receber atualizações do Yampi
2. **Notificações**: Email quando fatura é gerada
3. **Relatórios Avançados**: Análise de margem por período
4. **Multi-currency**: Suporte a outras moedas

---

**💰 Sistema de precificação 3.5x e integração Yampi prontos para monetização!**

