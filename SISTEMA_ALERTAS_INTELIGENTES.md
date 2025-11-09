# 🔔 SISTEMA DE ALERTAS INTELIGENTES - PLANEJAMENTO COMPLETO

## 🎯 VISÃO GERAL

Sistema configurável de alertas para donos de empresas e grupos empresariais receberem notificações em tempo real sobre eventos críticos do negócio via WhatsApp, email e dashboard.

## 📊 CATEGORIAS DE ALERTAS

### 1. 💰 ALERTAS FINANCEIROS

#### 1.1 Saldo Bancário
- **Saldo baixo** - Quando saldo < threshold configurado
- **Saldo negativo** - Quando conta fica negativa
- **Saldo crítico** - Quando não há saldo para cobrir contas do dia
- **Limite de crédito** - Quando atinge X% do limite

**Configurações:**
- Valor mínimo de saldo
- Horário de verificação (ex: 08:00, 14:00, 18:00)
- Contas específicas ou todas
- Frequência máxima de notificação

#### 1.2 Fluxo de Caixa
- **Fluxo negativo previsto** - Projeção de caixa negativo nos próximos N dias
- **Queima de caixa alta** - Taxa de queima acima do normal
- **Recebimentos atrasados** - Valores a receber vencidos
- **Saídas concentradas** - Muitos pagamentos no mesmo dia

**Configurações:**
- Dias de projeção (7, 15, 30)
- Threshold de alerta
- Horário de verificação diária

#### 1.3 Inadimplência
- **Inadimplência alta** - % de inadimplência acima do configurado
- **Cliente inadimplente** - Cliente específico com atraso > X dias
- **Tendência de crescimento** - Inadimplência crescendo mês a mês
- **Títulos vencidos hoje** - Resumo diário

**Configurações:**
- % máximo de inadimplência aceitável
- Dias de atraso para alertar
- Valor mínimo para alertar
- Clientes VIP (prioridade)

#### 1.4 Contas a Pagar
- **Contas vencendo hoje** - Resumo matinal
- **Contas vencendo em 3 dias** - Aviso antecipado
- **Contas não pagas** - Vencidas e não quitadas
- **Fornecedor crítico** - Atraso com fornecedor importante

**Configurações:**
- Dias de antecedência
- Valor mínimo
- Fornecedores críticos (lista)
- Horário de notificação

### 2. 📈 ALERTAS DE PERFORMANCE

#### 2.1 KPIs Críticos
- **Faturamento abaixo da meta** - Comparação com meta mensal
- **Margem de lucro baixa** - Margem < threshold
- **Custos elevados** - Custos acima do esperado
- **Ticket médio em queda** - Comparação com período anterior

**Configurações:**
- Metas mensais por empresa/grupo
- Threshold de alerta (%)
- Comparação com mês anterior ou média
- Frequência (diária, semanal, mensal)

#### 2.2 Vendas e Receitas
- **Queda de vendas** - Redução > X% comparado com período
- **Meta não atingida** - Projeção indica não atingir meta
- **Sazonalidade negativa** - Abaixo do esperado para o período
- **Vendedor com baixa performance** - Individual

**Configurações:**
- % de queda para alertar
- Período de comparação
- Metas por vendedor/loja
- Dias antes do fim do mês

#### 2.3 Despesas e Custos
- **Despesa acima do orçado** - Centro de custo extrapolou
- **Custo variável elevado** - CMV ou similar
- **Despesa não recorrente alta** - Gastos extraordinários
- **Categoria de despesa crescendo** - Tendência de alta

**Configurações:**
- Orçamento por centro de custo
- % de variação aceitável
- Categorias para monitorar
- Frequência de verificação

### 3. 🔄 ALERTAS OPERACIONAIS

#### 3.1 Conciliação Bancária
- **Conciliação pendente** - Lançamentos não conciliados > X dias
- **Taxa de conciliação baixa** - % conciliado < threshold
- **Lançamentos órfãos** - Movimentos sem origem
- **Divergência de saldo** - Saldo contábil ≠ saldo bancário

**Configurações:**
- Dias máximo sem conciliar
- % mínimo de conciliação
- Valor mínimo de divergência
- Horário de verificação

#### 3.2 Taxas e Tarifas
- **Taxa bancária divergente** - Cobrado diferente do contratado
- **Taxa de cartão elevada** - Operadora cobrando mais
- **Tarifa não prevista** - Cobrança inesperada
- **Antecipação cara** - Taxa de antecipação > X%

**Configurações:**
- % de tolerância na divergência
- Valor mínimo para alertar
- Bancos e operadoras monitorados
- Frequência de validação

#### 3.3 Recebimentos
- **Cartão não recebido** - Prazo de recebimento vencido
- **Boleto não compensado** - Após vencimento
- **Chargeback** - Contestação de pagamento
- **Estorno** - Devolução de pagamento

**Configurações:**
- Prazo esperado por operadora
- Valor mínimo
- Tipos de pagamento monitorados

### 4. 🎯 ALERTAS ESTRATÉGICOS

#### 4.1 Metas e Objetivos
- **OKR em risco** - Objetivo não será atingido
- **Meta trimestral** - Status no meio do trimestre
- **Crescimento abaixo do esperado** - MoM ou YoY
- **Market share** - Perda de participação

**Configurações:**
- Metas por período
- Marcos de verificação
- Benchmarks do mercado

#### 4.2 Tendências
- **Receita em queda** - 3 meses consecutivos
- **Aumento de custos** - Tendência de crescimento
- **Sazonalidade** - Comparação com ano anterior
- **Ciclo de vida do produto** - Performance por produto

**Configurações:**
- Períodos de análise
- Produtos/serviços monitorados
- Thresholds de tendência

#### 4.3 Comparativo de Grupo
- **Empresa com baixa performance** - Dentro do grupo
- **Disparidade de margem** - Entre empresas do grupo
- **Concentração de receita** - Dependência de uma empresa
- **Sinergia baixa** - Oportunidades perdidas

**Configurações:**
- Empresas do grupo
- Métricas comparativas
- % de variação aceitável

### 5. 🚨 ALERTAS CRÍTICOS

#### 5.1 Situações de Emergência
- **Conta sem saldo para folha** - Dia do pagamento
- **Cheque especial** - Entrou no limite
- **Protesto** - Título protestado
- **Execução fiscal** - Notificação judicial
- **Bloqueio de conta** - Conta bloqueada

**Configurações:**
- Sempre ativo (não configurável)
- Notificação imediata
- Múltiplos canais
- Escalonamento para gerentes

#### 5.2 Compliance
- **Certificado vencendo** - Digital, SSL, etc
- **Licença vencendo** - Alvarás, registros
- **Obrigação fiscal atrasada** - DCTF, SPED, etc
- **Auditoria pendente** - Prazo de resposta

**Configurações:**
- Dias de antecedência
- Responsável por tipo
- Documentos monitorados

#### 5.3 Operacional Crítico
- **Sistema fora do ar** - API não responde
- **Sincronização falhou** - ERP não sincronizou
- **Backup não realizado** - Falha no backup
- **Limite de API** - Atingindo limite de requisições

**Configurações:**
- Tempo máximo sem sincronizar
- Sistemas críticos
- Ações automáticas

---

## 🎨 TELAS DO SISTEMA

### TELA 1: Central de Alertas (Dashboard Principal)
**Rota:** `/alertas/dashboard`

```
┌─────────────────────────────────────────────────────────┐
│ 🔔 Central de Alertas Inteligentes                      │
│ [Configurar Alertas] [Histórico] [Relatórios]          │
├─────────────────────────────────────────────────────────┤
│ 📊 Visão Geral - Últimas 24h                            │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │🔴 3  │ │🟠 8  │ │🟡 15 │ │✅ 142│                   │
│ │Crítico│ │Alta  │ │Média │ │OK    │                   │
│ └──────┘ └──────┘ └──────┘ └──────┘                   │
├─────────────────────────────────────────────────────────┤
│ 🔥 Alertas Ativos                                       │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 SALDO BAIXO - Empresa Volpe Diadema              │ │
│ │ Saldo atual: R$ 1.245,00 (abaixo de R$ 5.000)      │ │
│ │ há 30 minutos | Notificado: WhatsApp ✅             │ │
│ │ [Ver Detalhes] [Marcar como Lido] [Snooze]         │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🟠 INADIMPLÊNCIA ALTA - Grupo Volpe                 │ │
│ │ Taxa: 15,3% (limite: 10%) | 23 títulos             │ │
│ │ há 2 horas | Notificado: WhatsApp ✅ Email ✅       │ │
│ │ [Ver Detalhes] [Marcar como Lido] [Snooze]         │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 📈 Tendências (Últimos 7 dias)                          │
│ [Gráfico de linha mostrando alertas por dia/tipo]      │
├─────────────────────────────────────────────────────────┤
│ 🎯 Alertas por Categoria                                │
│ Financeiros: 12 | Performance: 8 | Operacionais: 5     │
│ [Ver Todos]                                             │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Cards de resumo (total por prioridade)
- Lista de alertas ativos
- Filtros (categoria, prioridade, empresa)
- Ações rápidas (ler, snooze, resolver)
- Gráfico de tendências
- Auto-refresh (30 segundos)

---

### TELA 2: Configurar Meus Alertas
**Rota:** `/alertas/configurar`

```
┌─────────────────────────────────────────────────────────┐
│ ⚙️ Configurar Meus Alertas                              │
│ Escolha quais alertas você quer receber e por qual canal│
├─────────────────────────────────────────────────────────┤
│ 🔍 Buscar alerta: [________________] [Todas Categorias ▼]│
├─────────────────────────────────────────────────────────┤
│ 💰 FINANCEIROS                              [12 ativos] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Saldo Bancário Baixo                 [Expandir ▼]│ │
│ │    📱 WhatsApp  📧 Email  🖥️ Sistema                │ │
│ │    ┌───────────────────────────────────────────────┐│ │
│ │    │ Valor mínimo: R$ [5.000,00]                   ││ │
│ │    │ Verificar: [X] 08:00 [X] 14:00 [X] 18:00     ││ │
│ │    │ Aplicar a: [X] Todas contas [ ] Específicas  ││ │
│ │    │ Frequência máxima: [1x por dia ▼]            ││ │
│ │    │ [Salvar] [Testar Agora]                      ││ │
│ │    └───────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Inadimplência Alta                   [Expandir ▼]│ │
│ │    📱 WhatsApp  📧 Email  🖥️ Sistema                │ │
│ │    ┌───────────────────────────────────────────────┐│ │
│ │    │ % máximo aceitável: [10%]                     ││ │
│ │    │ Valor mínimo p/ alertar: R$ [500,00]         ││ │
│ │    │ Verificar: [1x por dia às 09:00 ▼]           ││ │
│ │    │ Incluir projeção: [X] Sim                    ││ │
│ │    │ [Salvar] [Testar Agora]                      ││ │
│ │    └───────────────────────────────────────────────┘│ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☐ Fluxo de Caixa Negativo              [Expandir ▼]│ │
│ │    (Desativado - clique para configurar)            │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 📈 PERFORMANCE                               [5 ativos] │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Faturamento Abaixo da Meta          [Expandir ▼]│ │
│ │    📱 WhatsApp  🖥️ Sistema                          │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [Ver Todos] [Ativar Pacote Recomendado] [Salvar Tudo] │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Lista de todos os alertas disponíveis
- Ativar/desativar por tipo
- Configurar canais de notificação
- Configurar thresholds e regras
- Horários de verificação
- Frequência de notificação
- Testar alerta individualmente
- Pacotes pré-configurados (Iniciante, Intermediário, Avançado)

---

### TELA 3: Histórico de Alertas
**Rota:** `/alertas/historico`

```
┌─────────────────────────────────────────────────────────┐
│ 📜 Histórico de Alertas                                 │
│ Período: [Últimos 30 dias ▼] [Exportar ↓]              │
├─────────────────────────────────────────────────────────┤
│ Filtros: [Categoria▼] [Prioridade▼] [Status▼] [Empresa▼]│
├─────────────────────────────────────────────────────────┤
│ 📊 Estatísticas do Período                              │
│ Total: 1.245 | Críticos: 23 | Tempo médio resposta: 2h │
├─────────────────────────────────────────────────────────┤
│ Data/Hora │Tipo│Prioridade│Mensagem│Status│Tempo│Ação  │
│ 08/11 14:30│Saldo│🔴Crítico│Saldo<R$1k│✅Resolvido│30m│Ver│
│ 08/11 09:00│Inadimp│🟠Alta│15,3%│✅Resolvido│4h│Ver│
│ 07/11 18:00│Taxa│🟡Média│Divergência│⏸️Snooze│-│Ver│
│ 07/11 14:25│Concil│🟡Média│45 pendente│📖Lido│-│Ver│
│ ...                                                      │
├─────────────────────────────────────────────────────────┤
│ [Anterior] Página 1 de 42 [Próxima]                    │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Histórico completo de alertas
- Filtros avançados
- Estatísticas do período
- Tempo de resposta
- Status de cada alerta
- Exportar para Excel
- Ver detalhes de alertas passados

---

### TELA 4: Detalhes do Alerta
**Rota:** `/alertas/[id]` (Modal ou página)

```
┌─────────────────────────────────────────────────────────┐
│ 🔴 Alerta: Saldo Bancário Baixo                  [X]    │
├─────────────────────────────────────────────────────────┤
│ Empresa: Volpe Diadema                                  │
│ Criado em: 08/11/2025 14:30                            │
│ Status: ⚠️ Ativo (há 30 minutos)                       │
│ Prioridade: 🔴 Crítica                                  │
├─────────────────────────────────────────────────────────┤
│ 📊 Informações Detalhadas                               │
│                                                          │
│ Conta: Bradesco - Ag: 1234 - CC: 12345-6               │
│ Saldo Atual: R$ 1.245,00                               │
│ Saldo Mínimo Configurado: R$ 5.000,00                  │
│ Diferença: -R$ 3.755,00 (-75,1%)                       │
│                                                          │
│ Contas a Pagar Hoje: R$ 2.350,00                       │
│ Contas a Pagar (3 dias): R$ 8.900,00                   │
│ Recebimentos Previstos (3 dias): R$ 12.500,00          │
│                                                          │
│ ⚠️ ATENÇÃO: Saldo insuficiente para cobrir contas hoje │
├─────────────────────────────────────────────────────────┤
│ 📱 Notificações Enviadas                                │
│ ✅ WhatsApp: 08/11 14:30 - Entregue                    │
│ ✅ Email: 08/11 14:31 - Lido (14:35)                   │
│ ✅ Sistema: 08/11 14:30                                 │
├─────────────────────────────────────────────────────────┤
│ 🎯 Ações Sugeridas                                      │
│ • Verificar recebimentos do dia                         │
│ • Adiar pagamento não crítico                           │
│ • Solicitar antecipação de recebíveis                   │
│ • Transferir de outra conta                             │
├─────────────────────────────────────────────────────────┤
│ 💬 Observações                                           │
│ [____________________________________________________]  │
│ [____________________________________________________]  │
│                                                          │
│ [Marcar como Resolvido] [Snooze 1h] [Snooze 4h]       │
│ [Encaminhar] [Adicionar Tarefa] [Fechar]              │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Detalhes completos do alerta
- Dados contextuais
- Histórico de notificações
- Ações sugeridas automaticamente
- Campo de observações
- Ações rápidas
- Encaminhar para outro usuário
- Criar tarefa relacionada

---

### TELA 5: Preferências de Notificação
**Rota:** `/alertas/preferencias`

```
┌─────────────────────────────────────────────────────────┐
│ 🔔 Preferências de Notificação                          │
├─────────────────────────────────────────────────────────┤
│ 📱 WhatsApp                                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Ativar notificações WhatsApp                      │ │
│ │ Número: [+55 11 99999-9999] [Verificar]             │ │
│ │                                                       │ │
│ │ Horário de Silêncio:                                 │ │
│ │ Das [22:00] às [07:00]                               │ │
│ │ ☑️ Aplicar aos finais de semana                      │ │
│ │                                                       │ │
│ │ Frequência Máxima:                                   │ │
│ │ Críticos: [Imediato ▼]                               │ │
│ │ Alta: [Máximo 1 por hora ▼]                          │ │
│ │ Média: [Máximo 3 por dia ▼]                          │ │
│ │ Baixa: [Apenas resumo diário ▼]                      │ │
│ │                                                       │ │
│ │ Formato da Mensagem:                                 │ │
│ │ ( ) Resumido  (•) Detalhado  ( ) Completo           │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 📧 Email                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Ativar notificações por Email                     │ │
│ │ Email: [dono@empresa.com]                            │ │
│ │                                                       │ │
│ │ ☑️ Enviar resumo diário às [08:00]                   │ │
│ │ ☑️ Enviar resumo semanal (Segunda-feira 09:00)       │ │
│ │ ☐ Enviar relatório mensal                            │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 🖥️ Sistema (Dashboard)                                  │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ☑️ Mostrar notificações no sistema                   │ │
│ │ ☑️ Som para alertas críticos                         │ │
│ │ ☑️ Badge no menu (contador)                          │ │
│ │ ☑️ Pop-up para alertas críticos                      │ │
│ │                                                       │ │
│ │ Auto-refresh: [30 segundos ▼]                        │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 👥 Escalonamento                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Se eu não responder em [30 minutos], notificar:     │ │
│ │ Gerente: [João Silva ▼] via [WhatsApp + Email ▼]    │ │
│ │                                                       │ │
│ │ Para alertas críticos, notificar também:            │ │
│ │ [+ Adicionar pessoa]                                 │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ [Salvar Preferências] [Testar Notificações]            │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Configurar canais de notificação
- Horários de silêncio
- Frequência máxima por prioridade
- Formato das mensagens
- Resumos automáticos
- Escalonamento automático
- Testar notificações

---

### TELA 6: Alertas do Grupo (Consolidado)
**Rota:** `/alertas/grupo`

```
┌─────────────────────────────────────────────────────────┐
│ 🏢 Alertas do Grupo Volpe                               │
│ [Dashboard] [Por Empresa] [Comparativo] [Configurar]   │
├─────────────────────────────────────────────────────────┤
│ 📊 Visão Consolidada                                    │
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                   │
│ │ 5 🔴 │ │ 12🟠 │ │ 28🟡 │ │ 3 ⚠️ │                   │
│ │Crítico│ │Alta  │ │Média │ │Empresa│                  │
│ │       │ │      │ │      │ │Probl. │                  │
│ └──────┘ └──────┘ └──────┘ └──────┘                   │
├─────────────────────────────────────────────────────────┤
│ 🎯 Alertas Críticos do Grupo                            │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 🔴 Volpe Diadema - Saldo Baixo (R$ 1.245)           │ │
│ │ 🔴 Volpe Grajaú - Inadimplência 18% (crítica!)      │ │
│ │ 🔴 Volpe POA - 3 contas vencidas não pagas          │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 📈 Performance por Empresa                              │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Empresa          │Crítico│Alta│Média│Score Geral   │ │
│ │ Volpe Diadema    │   2   │ 4  │  8  │ 🟡 Atenção  │ │
│ │ Volpe Grajaú     │   1   │ 3  │  5  │ 🟠 Problema │ │
│ │ Volpe POA        │   1   │ 2  │  6  │ 🟠 Problema │ │
│ │ Volpe S.André    │   0   │ 2  │  4  │ 🟢 OK       │ │
│ │ Volpe S.Mateus   │   1   │ 1  │  5  │ 🟡 Atenção  │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 🎨 Comparativo de Indicadores                           │
│ [Gráfico comparando as 5 empresas em métricas chave]   │
│                                                          │
│ • Saldo disponível                                      │
│ • % Inadimplência                                       │
│ • Taxa de conciliação                                   │
│ • Faturamento vs Meta                                   │
├─────────────────────────────────────────────────────────┤
│ 💡 Insights do Grupo                                     │
│ • Volpe Grajaú precisa atenção urgente                 │
│ • Saldo consolidado do grupo: R$ 45.230                │
│ • 3 empresas com inadimplência acima do aceitável      │
│ • Oportunidade: transferir saldo entre empresas        │
└─────────────────────────────────────────────────────────┘
```

**Funcionalidades:**
- Visão consolidada de todas as empresas
- Comparativo de performance
- Empresas com problemas destacadas
- Insights automáticos
- Oportunidades de sinergia
- Transferência de recursos sugerida
- Score geral por empresa

---

## 🔧 ESTRUTURA DE DADOS (Backend)

### Tabela: `alert_rules` (Regras de Alertas)
```sql
create table alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  company_cnpj text,
  grupo_empresarial text,
  
  tipo_alerta text not null,
  categoria text not null,
  ativo boolean default true,
  
  -- Thresholds e configurações (JSON flexível)
  config jsonb not null,
  
  -- Canais de notificação
  notify_whatsapp boolean default true,
  notify_email boolean default true,
  notify_sistema boolean default true,
  
  -- Horários e frequência
  horarios_verificacao text[], -- ['08:00', '14:00', '18:00']
  frequencia_maxima text, -- '1_por_hora', '3_por_dia', etc
  horario_silencio_inicio time,
  horario_silencio_fim time,
  silencio_fim_semana boolean default false,
  
  -- Escalonamento
  escalonamento_minutos integer,
  escalonamento_user_id uuid references users(id),
  
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_alert_rules_user on alert_rules (user_id);
create index idx_alert_rules_company on alert_rules (company_cnpj);
create index idx_alert_rules_ativo on alert_rules (ativo) where ativo = true;
```

### Tabela: `alert_notifications` (Histórico de Notificações)
```sql
create table alert_notifications (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references financial_alerts(id),
  alert_rule_id uuid references alert_rules(id),
  
  canal text not null, -- 'whatsapp', 'email', 'sistema'
  destinatario text not null,
  mensagem text not null,
  
  status text not null, -- 'enviado', 'entregue', 'lido', 'falhou'
  enviado_em timestamptz,
  entregue_em timestamptz,
  lido_em timestamptz,
  
  erro text,
  tentativas integer default 1,
  
  created_at timestamptz default now()
);

create index idx_alert_notifications_alert on alert_notifications (alert_id);
create index idx_alert_notifications_status on alert_notifications (status);
```

### Tabela: `alert_actions` (Ações sobre Alertas)
```sql
create table alert_actions (
  id uuid primary key default gen_random_uuid(),
  alert_id uuid references financial_alerts(id),
  user_id uuid references users(id),
  
  acao text not null, -- 'lido', 'snooze', 'resolvido', 'ignorado', 'encaminhado'
  observacoes text,
  snooze_ate timestamptz,
  encaminhado_para uuid references users(id),
  
  created_at timestamptz default now()
);

create index idx_alert_actions_alert on alert_actions (alert_id);
create index idx_alert_actions_user on alert_actions (user_id);
```

---

## 🤖 EDGE FUNCTIONS

### 1. `check-alerts` - Verificação de Alertas
```typescript
// Roda a cada 15 minutos
// Verifica todas as regras ativas
// Cria alertas quando threshold é atingido
// Envia notificações

serve(async (req) => {
  const supabase = getSupabaseClient();
  
  // Buscar regras ativas
  const { data: rules } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('ativo', true);
  
  for (const rule of rules) {
    // Verificar se está no horário de verificação
    if (!isHorarioVerificacao(rule)) continue;
    
    // Verificar se está no horário de silêncio
    if (isHorarioSilencio(rule)) continue;
    
    // Executar verificação baseada no tipo
    const shouldAlert = await checkRule(rule);
    
    if (shouldAlert) {
      // Verificar frequência máxima
      if (await excedeuFrequencia(rule)) continue;
      
      // Criar alerta
      const alert = await criarAlerta(rule, shouldAlert.data);
      
      // Enviar notificações
      await enviarNotificacoes(alert, rule);
    }
  }
});
```

### 2. `send-alert-notification` - Envio de Notificações
```typescript
// Envia notificação via canal específico
// Trata erros e retries
// Atualiza status de entrega

async function enviarNotificacoes(alert, rule) {
  const notifications = [];
  
  // WhatsApp
  if (rule.notify_whatsapp) {
    const msg = formatarMensagemWhatsApp(alert, rule.config.formato);
    await enviarWhatsApp(rule.user_id, msg);
    notifications.push({ canal: 'whatsapp', status: 'enviado' });
  }
  
  // Email
  if (rule.notify_email) {
    const html = formatarMensagemEmail(alert);
    await enviarEmail(rule.user_id, html);
    notifications.push({ canal: 'email', status: 'enviado' });
  }
  
  // Sistema
  if (rule.notify_sistema) {
    await criarNotificacaoSistema(alert);
    notifications.push({ canal: 'sistema', status: 'enviado' });
  }
  
  // Salvar histórico
  await salvarHistoricoNotificacoes(alert.id, notifications);
}
```

### 3. `escalate-alert` - Escalonamento de Alertas
```typescript
// Roda a cada 5 minutos
// Verifica alertas não respondidos
// Escalona para próximo nível

serve(async (req) => {
  const supabase = getSupabaseClient();
  
  // Buscar alertas críticos não respondidos
  const { data: alerts } = await supabase
    .from('financial_alerts')
    .select('*, rule:alert_rules(*)')
    .eq('status', 'pendente')
    .eq('prioridade', 'critica');
  
  for (const alert of alerts) {
    const tempoSemResposta = Date.now() - new Date(alert.created_at).getTime();
    const limiteMinutos = alert.rule.escalonamento_minutos || 30;
    
    if (tempoSemResposta > limiteMinutos * 60 * 1000) {
      // Escalonar
      await notificarEscalonamento(alert, alert.rule.escalonamento_user_id);
      
      // Registrar escalonamento
      await registrarEscalonamento(alert.id);
    }
  }
});
```

---

## 🎯 PACOTES PRÉ-CONFIGURADOS

### Pacote "Iniciante" (Essencial)
- ✅ Saldo baixo
- ✅ Contas vencendo hoje
- ✅ Inadimplência > 15%
- ✅ Contas não pagas
- ✅ Taxa divergente > R$ 50

**Canais:** WhatsApp + Sistema

### Pacote "Intermediário" (Recomendado)
- ✅ Todos do Iniciante
- ✅ Fluxo de caixa negativo (7 dias)
- ✅ Faturamento abaixo da meta
- ✅ Conciliação pendente > 5 dias
- ✅ Margem de lucro < 15%
- ✅ Despesa acima do orçado

**Canais:** WhatsApp + Email + Sistema

### Pacote "Avançado" (Completo)
- ✅ Todos do Intermediário
- ✅ Tendências negativas
- ✅ Comparativo de grupo
- ✅ OKRs em risco
- ✅ Compliance (certificados, licenças)
- ✅ Operacional crítico

**Canais:** WhatsApp + Email + Sistema + Escalonamento

---

## 📱 EXEMPLO DE NOTIFICAÇÃO WHATSAPP

### Formato Resumido:
```
🔴 ALERTA CRÍTICO

Saldo Baixo - Volpe Diadema
R$ 1.245 (limite: R$ 5.000)

Ação necessária!
Ver detalhes: [link]
```

### Formato Detalhado:
```
🔴 ALERTA CRÍTICO: Saldo Bancário Baixo

Empresa: Volpe Diadema
Conta: Bradesco Ag 1234 CC 12345-6

💰 Situação:
Saldo Atual: R$ 1.245,00
Saldo Mínimo: R$ 5.000,00
Diferença: -R$ 3.755,00 (-75%)

⚠️ Contas Hoje: R$ 2.350,00

🎯 Ações Sugeridas:
• Verificar recebimentos
• Transferir de outra conta
• Adiar pagamento não crítico

Ver detalhes: [link]
Marcar como lido: [link]
```

### Formato Completo:
```
🔴 ALERTA CRÍTICO: Saldo Bancário Baixo

📊 DETALHES
Empresa: Volpe Diadema
Conta: Bradesco Ag 1234 CC 12345-6
Data/Hora: 08/11/2025 14:30

💰 SITUAÇÃO FINANCEIRA
Saldo Atual: R$ 1.245,00
Saldo Mínimo: R$ 5.000,00
Diferença: -R$ 3.755,00 (-75,1%)

📅 COMPROMISSOS
Contas Hoje: R$ 2.350,00
Contas (3 dias): R$ 8.900,00
Recebimentos (3 dias): R$ 12.500,00

⚠️ ALERTA
Saldo insuficiente para cobrir contas de hoje!

🎯 AÇÕES SUGERIDAS
1. Verificar recebimentos do dia
2. Transferir de outra conta do grupo
3. Solicitar antecipação de recebíveis
4. Adiar pagamento não crítico

Ver detalhes completos: [link]
Marcar como resolvido: [link]
Adiar por 1h: [link]
```

---

## 🎨 RESUMO DE IMPLEMENTAÇÃO

### Backend (Edge Functions)
1. `check-alerts` - Verificação periódica (15min)
2. `send-alert-notification` - Envio de notificações
3. `escalate-alert` - Escalonamento automático (5min)
4. `alert-summary-daily` - Resumo diário (1x/dia)
5. `alert-summary-weekly` - Resumo semanal (1x/semana)

### Frontend (6 Telas)
1. Dashboard Principal
2. Configurar Alertas
3. Histórico
4. Detalhes do Alerta
5. Preferências de Notificação
6. Visão de Grupo

### Database (3 Tabelas Novas)
1. `alert_rules` - Regras configuradas
2. `alert_notifications` - Histórico de notificações
3. `alert_actions` - Ações do usuário

---

**STATUS:** 📋 PLANEJAMENTO COMPLETO  
**PRÓXIMO PASSO:** Implementar backend (Edge Functions + Tabelas)  
**DEPOIS:** Frontend (6 telas documentadas)

