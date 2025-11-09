# Frontend - Mudanças Necessárias por Melhorias n8n

## Resumo Executivo

Com a implementação das novas automações n8n e melhorias nos processos, o frontend precisa de 8 novas telas/componentes e alterações em 5 telas existentes para exibir dados, gerenciar fluxos e monitorar operações.

---

## 1. NOVAS TELAS

### 1.1 `/admin/n8n/workflows` - Gerenciador de Workflows N8N
**Prioridade:** Alta | **Complexidade:** Média | **Tempo:** 4-5h

**Objetivo:** Interface para visualizar, gerenciar e monitorar workflows n8n.

**Funcionalidades:**
- [ ] Listar todos os workflows com status (ativo/inativo)
- [ ] Card para cada workflow mostrando:
  - Nome e descrição
  - Última execução (quando, status)
  - Próxima execução agendada
  - Botão de ativar/desativar
  - Botão de forçar execução manual
  - Link para ver logs detalhados
- [ ] Filtros: por status, por tipo (scheduled/webhook), por last run
- [ ] Modal para criar novo workflow (conecta com n8n API)

**Dados da API:**
- GET `/api/n8n/workflows` - Lista workflows
- POST `/api/n8n/workflows/{id}/trigger` - Força execução
- PUT `/api/n8n/workflows/{id}` - Ativa/desativa
- GET `/api/n8n/workflows/{id}/logs` - Histórico de execuções

**Workflows a Gerenciar:**
1. WhatsApp Finance Bot (mensagens automáticas)
2. Seed & Tests (dados de teste)
3. Billing to Yampi (faturamento)
4. WhatsApp Sentiment Analysis (análise de humor)
5. RAG Indexing (indexação para RAG)
6. Usage Metrics Collection (coleta de uso)
7. Security Monitoring (monitoramento de segurança)

---

### 1.2 `/admin/rag/search` - Busca Semântica no RAG
**Prioridade:** Alta | **Complexidade:** Alta | **Tempo:** 5-6h

**Objetivo:** Interface para buscar e analisar conversas WhatsApp indexadas no RAG.

**Funcionalidades:**
- [ ] Campo de busca com autocomplete (palavras-chave recentes)
- [ ] Busca semântica (usa embeddings, não apenas texto)
- [ ] Filtros avançados:
  - Cliente (CNPJ)
  - Data (range)
  - Sentimento (positivo, neutro, negativo)
  - Tópico (financeiro, suporte, etc)
  - Urgência da resposta (low/medium/high/critical)
- [ ] Resultados em grid com:
  - Mensagem (truncada)
  - Cliente
  - Data
  - Sentimento (badge com cor)
  - Score de relevância (%)
- [ ] Detalhe ao clicar:
  - Conversa completa
  - Análise de sentimento completa
  - Contexto extraído (tópicos, entidades)
  - Embedding info (para debug)
- [ ] Ações:
  - Copiar contexto para clipboard
  - Exportar conversa
  - Marcar como reference (salva para treinamento)

**Dados da API:**
- POST `/api/rag/search` - Busca semântica (body: {query, filters, limit})
- GET `/api/rag/conversation/{id}` - Detalhe de conversa
- GET `/api/rag/topics` - Lista de tópicos
- POST `/api/rag/reference/{id}` - Marca como reference

**Tabelas do DB:**
- `rag_conversations`
- `rag_context_summary`
- `whatsapp_sentiment_analysis`

---

### 1.3 `/admin/analytics/usage-detail` - Detalhes Avançados de Uso
**Prioridade:** Média | **Complexidade:** Média | **Tempo:** 3-4h

**Objetivo:** Dashboard detalhado de uso por usuário/cliente com exportação.

**Funcionalidades:**
- [ ] Filtros avançados:
  - Período (date range)
  - Cliente
  - Usuário
  - Tipo de atividade (pages, api_calls, llm, whatsapp)
- [ ] Tabela com:
  - Usuário / Email
  - Sessões (qtd, tempo total)
  - Páginas visitadas (top 5)
  - API calls (qtd, média por dia)
  - LLM interactions (qtd, tokens, custo)
  - WhatsApp (mensagens enviadas/recebidas)
- [ ] Gráficos:
  - Timeline de uso (atividade por hora/dia)
  - Heatmap de páginas mais usadas
  - Distribuição de features (pie chart)
- [ ] Exportar:
  - CSV (dados brutos)
  - PDF (relatório formatado)

**Dados da API:**
- GET `/api/usage/details` - Dados com filtros
- GET `/api/usage/features` - Top features
- POST `/api/usage/export` - Gera export

**Tabelas do DB:**
- `user_system_usage`

---

### 1.4 `/admin/analytics/mood-index-timeline` - Índice de Humor ao Longo do Tempo
**Prioridade:** Média | **Complexidade:** Média | **Tempo:** 3-4h

**Objetivo:** Visualizar tendência de humor/sentimento dos clientes ao longo do tempo.

**Funcionalidades:**
- [ ] Gráfico de linha mostrando:
  - Mood index diário por cliente (média)
  - Intervalo de confiança (min/max)
- [ ] Filtros:
  - Cliente (ou todos)
  - Período
  - Granularidade (diário, semanal, mensal)
- [ ] Alertas visuais:
  - Queda acentuada (↓ 20% em 3 dias) = cor vermelha + ⚠️
  - Recuperação (↑ 15% em 1 dia) = cor verde + ✅
- [ ] Tabela complementar:
  - Data
  - Mood index
  - Número de conversas
  - Principais sentimentos (contagem)
  - Ação recomendada (automática baseada em tendência)
- [ ] Ações:
  - Alertar cliente por email/WhatsApp se humor piora
  - Marcar período para revisar conversas

**Dados da API:**
- GET `/api/mood-index/timeline` - Dados de humor ao longo do tempo
- GET `/api/mood-index/alerts` - Alertas ativos

**Tabelas do DB:**
- `whatsapp_mood_index_timeline`
- `whatsapp_sentiment_analysis`

---

### 1.5 `/admin/config/integrations-tester` - Testador de Integrações
**Prioridade:** Média | **Complexidade:** Média | **Tempo:** 4-5h

**Objetivo:** Testes de conexão inline para todas as integrações configuradas.

**Funcionalidades:**
- [ ] Por cada integração, mostrar:
  - Nome e categoria (badge)
  - Status (verde=OK, vermelho=erro, amarelo=nunca testado)
  - Última verificação (timestamp)
  - Botão "Testar Agora"
  - Botão "Ver Detalhes"
- [ ] Modal de teste:
  - Loading spinner enquanto testa
  - Resultado: ✅ Conectado / ❌ Erro
  - Detalhes do erro (se houver)
  - Sugestões de fix (links para docs)
- [ ] Histórico de testes:
  - Últimas 10 verificações por integração
  - Timestamp, status, duração, mensagem

**Dados da API:**
- POST `/api/integrations/{id}/test` - Testa conexão
- GET `/api/integrations/{id}/test-history` - Histórico

**Integrações a Testar:**
1. Anthropic (API key valida?)
2. OpenAI (API key valida?)
3. Yampi (token OAuth válido? expirou?)
4. F360 (conexão com API?)
5. WASender (token válido?)
6. Evolution API (webhook ativo?)

---

### 1.6 `/admin/billing/yampi-config` - Configuração Yampi
**Prioridade:** Média | **Complexidade:** Baixa | **Tempo:** 2-3h

**Objetivo:** Interface para configurar integração com Yampi.

**Funcionalidades:**
- [ ] Formulário com campos:
  - API Key (input password, salvo criptografado)
  - Store ID (text)
  - Environment (radio: sandbox / production)
  - Product ID LLM Tokens (text)
  - Webhook URL (readonly, mostra URL para registrar em Yampi)
- [ ] Botão "Salvar"
- [ ] Botão "Testar Conexão"
- [ ] Exibir status atual:
  - ✅ Configurado e funcional
  - ⚠️ Configurado mas não testado
  - ❌ Não configurado
- [ ] Documentação inline (links para Yampi docs)

**Dados da API:**
- GET `/api/integrations/yampi` - Config atual
- PUT `/api/integrations/yampi` - Salva
- POST `/api/integrations/yampi/test` - Testa

---

### 1.7 `/admin/llm/optimizer` - Otimizador de LLM
**Prioridade:** Média | **Complexidade:** Alta | **Tempo:** 5-6h

**Objetivo:** Analisar padrões de uso de LLM e sugerir modelos mais eficientes.

**Funcionalidades:**
- [ ] Dashboard com:
  - Modelo LLM usado atualmente
  - Custo médio por request
  - Latência média
  - Tokens médios (input/output)
  - Taxa de erro (%)
- [ ] Análise:
  - Comparar com outros modelos (custo, velocidade, qualidade)
  - Sugerir modelo mais econômico para cada caso de uso
  - Mostrar economia potencial ($/mês)
- [ ] Recomendações por tipo de request:
  - Análise de sentimento → haiku (mais barato, rápido)
  - Geração de relatórios → sonnet (melhor qualidade)
  - RAG + busca → buscador local (sem custo)
- [ ] Histórico de decisões:
  - Log de quando modelo foi trocado e por que
  - Monitorar se economia foi obtida
- [ ] Controle:
  - Dropdown para selecionar novo modelo default
  - Botão para aplicar
  - Preview de impacto (custo, latência)

**Dados da API:**
- GET `/api/llm/metrics` - Dados de uso
- GET `/api/llm/models-comparison` - Comparação
- POST `/api/llm/switch-model` - Troca modelo

**Tabelas do DB:**
- `llm_token_usage`
- `llm_api_keys_per_client`
- `llm_pricing_config`

---

### 1.8 `/admin/n8n/monitor-dashboard` - Dashboard de Monitoramento N8N
**Prioridade:** Alta | **Complexidade:** Média | **Tempo:** 4-5h

**Objetivo:** Painel em tempo real com status de todos os workflows.

**Funcionalidades:**
- [ ] Cards em grid (2-3 colunas):
  - Um card por workflow
  - Mostra: nome, status, última execução, próxima
  - Indicador visual grande (🟢 OK / 🔴 ERRO / 🟡 WAITING)
  - Mini-gráfico (últimas 10 execuções: duração)
- [ ] Logs em tempo real (websocket ou polling):
  - Abrir modal com logs da última execução
  - Auto-refresh a cada 5s
- [ ] Alertas:
  - Workflow falhou por 3x consecutivas
  - Workflow atrasado (passou horário agendado)
  - Workflow com tempo execução 2x acima do normal
- [ ] Estatísticas globais (topo do dashboard):
  - Workflows ativos / total
  - Taxa de sucesso (%)
  - Execuções hoje
  - Tempo médio de execução

**Dados da API:**
- GET `/api/n8n/status` - Status de todos
- GET `/api/n8n/workflows/{id}/logs?limit=10` - Últimos logs
- WebSocket `/api/n8n/monitor` - Real-time updates

---

## 2. ALTERAÇÕES EM TELAS EXISTENTES

### 2.1 `/admin/security/noc` - Adicionar Seção N8N
**Tela Existente:** `/admin/security/noc/page.tsx`
**Prioridade:** Alta | **Tempo:** 2-3h

**O que adicionar:**
- [ ] Nova aba: "N8N Workflows"
- [ ] Mostrar status de workflows críticos:
  - WhatsApp Bot status
  - Billing automation status
  - Security monitoring status
- [ ] Card com últimos 5 logs de erro
- [ ] Alarmes se algum workflow falhar

**Componentes:**
- Tab adicional em `<Tabs>`
- Cards para workflows
- Link para `/admin/n8n/workflows` (gerenciador completo)

---

### 2.2 `/admin/analytics/user-usage` - Adicionar Botão para Detalhes
**Tela Existente:** `/admin/analytics/user-usage/page.tsx`
**Prioridade:** Média | **Tempo:** 1-2h

**O que adicionar:**
- [ ] Botão "Ver Detalhes" em cada linha da tabela
- [ ] Leva para `/admin/analytics/usage-detail?user_id=X`
- [ ] Filtros avançados (expandir/colapsar)

---

### 2.3 `/admin/analytics/mood-index` - Adicionar Alertas
**Tela Existente:** `/admin/analytics/mood-index/page.tsx`
**Prioridade:** Média | **Tempo:** 2-3h

**O que adicionar:**
- [ ] Exibir alertas ativos (queda de humor)
- [ ] Badge visual para clientes em risco
- [ ] Link para `/admin/analytics/mood-index-timeline` (gráfico temporal)
- [ ] Ações rápidas:
  - Enviar email automático ao cliente
  - Criar task de follow-up

---

### 2.4 `/admin/config/integrations` - Adicionar Testador
**Tela Existente:** `/admin/config/integrations/page.tsx`
**Prioridade:** Média | **Tempo:** 2-3h

**O que adicionar:**
- [ ] Status visual ao lado de cada integração (✅/❌/⚠️)
- [ ] Botão "Testar" em cada linha
- [ ] Modal com resultado do teste
- [ ] Link para página de tester completa (`/admin/config/integrations-tester`)

---

### 2.5 `/admin/billing/pricing` - Mostrar Custos Reais
**Tela Existente:** `/admin/billing/pricing/page.tsx`
**Prioridade:** Média | **Tempo:** 2-3h

**O que adicionar:**
- [ ] Coluna nova: "Custo Real (USD)"
- [ ] Coluna nova: "Markup x3.5"
- [ ] Mostrar economia por cliente se usar modelo otimizado
- [ ] Link para `/admin/llm/optimizer`

---

## 3. TABELA DE PRIORIZAÇÃO

| Tela | Prioridade | Tempo | Bloqueador | Status |
|------|-----------|-------|-----------|--------|
| `/admin/n8n/workflows` | 🔴 Alta | 4-5h | Nenhum | Pendente |
| `/admin/n8n/monitor-dashboard` | 🔴 Alta | 4-5h | Nenhum | Pendente |
| `/admin/rag/search` | 🟠 Média | 5-6h | RAG deve estar indexando | Pendente |
| `/admin/config/integrations-tester` | 🟠 Média | 4-5h | APIs de teste prontas | Pendente |
| `/admin/llm/optimizer` | 🟠 Média | 5-6h | Dados de LLM no DB | Pendente |
| `/admin/analytics/usage-detail` | 🟠 Média | 3-4h | Dados de uso no DB | Pendente |
| `/admin/analytics/mood-index-timeline` | 🟠 Média | 3-4h | Dados de mood no DB | Pendente |
| `/admin/billing/yampi-config` | 🟠 Média | 2-3h | Nenhum | Pendente |
| Alterar: `/admin/security/noc` | 🟠 Média | 2-3h | Nenhum | Pendente |
| Alterar: `/admin/analytics/user-usage` | 🟡 Baixa | 1-2h | Nenhum | Pendente |
| Alterar: `/admin/analytics/mood-index` | 🟡 Baixa | 2-3h | Nenhum | Pendente |
| Alterar: `/admin/config/integrations` | 🟡 Baixa | 2-3h | Nenhum | Pendente |
| Alterar: `/admin/billing/pricing` | 🟡 Baixa | 2-3h | Nenhum | Pendente |

---

## 4. ROTEIRO RECOMENDADO

### Semana 1 (Prioridade Alta)
1. `/admin/n8n/workflows` (gerenciador)
2. `/admin/n8n/monitor-dashboard` (monitoramento)

### Semana 2 (Prioridade Média - Parte 1)
1. `/admin/rag/search` (busca semântica)
2. `/admin/config/integrations-tester` (tester)

### Semana 3 (Prioridade Média - Parte 2)
1. `/admin/llm/optimizer` (otimização)
2. `/admin/analytics/usage-detail` (uso detalhado)

### Semana 4 (Prioridade Média/Baixa)
1. `/admin/analytics/mood-index-timeline` (humor temporal)
2. `/admin/billing/yampi-config` (Yampi)
3. Alterações em 5 telas existentes

---

## 5. COMPONENTES REUTILIZÁVEIS A CRIAR

### 5.1 `components/n8n/WorkflowCard.tsx`
- Card com status visual, buttons, mini-gráfico

### 5.2 `components/integrations/IntegrationTester.tsx`
- Modal de teste com loading, resultado, histórico

### 5.3 `components/charts/MoodTimeline.tsx`
- Gráfico de linha com alertas visuais

### 5.4 `components/rag/SearchFilters.tsx`
- Filtros avançados reutilizáveis

### 5.5 `components/llm/ModelComparison.tsx`
- Tabela comparativa de modelos

---

## 6. APIs NECESSÁRIAS

Resumo das Edge Functions/endpoints a criar/adaptar:

- [ ] `GET /api/n8n/workflows` - Lista workflows
- [ ] `POST /api/n8n/workflows/{id}/trigger` - Força execução
- [ ] `PUT /api/n8n/workflows/{id}` - Ativa/desativa
- [ ] `GET /api/n8n/workflows/{id}/logs` - Logs
- [ ] `POST /api/rag/search` - Busca semântica
- [ ] `GET /api/rag/conversation/{id}` - Detalhe
- [ ] `GET /api/usage/details` - Uso detalhado
- [ ] `GET /api/mood-index/timeline` - Humor temporal
- [ ] `POST /api/integrations/{id}/test` - Testa integração
- [ ] `GET /api/integrations/{id}/test-history` - Histórico de testes
- [ ] `GET /api/llm/metrics` - Métricas LLM
- [ ] `GET /api/llm/models-comparison` - Comparação de modelos
- [ ] `POST /api/llm/switch-model` - Troca modelo

---

## 7. ESTRUTURA DE PASTAS RECOMENDADA

```
finance-oraculo-frontend/
├── app/(app)/admin/
│   ├── n8n/
│   │   ├── workflows/
│   │   │   └── page.tsx (NEW)
│   │   └── monitor-dashboard/
│   │       └── page.tsx (NEW)
│   ├── rag/
│   │   └── search/
│   │       └── page.tsx (NEW)
│   ├── analytics/
│   │   ├── usage-detail/
│   │   │   └── page.tsx (NEW)
│   │   └── mood-index-timeline/
│   │       └── page.tsx (NEW)
│   ├── config/
│   │   └── integrations-tester/
│   │       └── page.tsx (NEW)
│   ├── billing/
│   │   ├── yampi-config/
│   │   │   └── page.tsx (NEW)
│   │   └── pricing/
│   │       └── page.tsx (UPDATED)
│   └── llm/
│       └── optimizer/
│           └── page.tsx (NEW)
└── components/
    ├── n8n/
    │   ├── WorkflowCard.tsx (NEW)
    │   ├── WorkflowList.tsx (NEW)
    │   └── Monitor.tsx (NEW)
    ├── integrations/
    │   └── IntegrationTester.tsx (NEW)
    ├── rag/
    │   ├── SearchFilters.tsx (NEW)
    │   └── ResultsList.tsx (NEW)
    └── llm/
        ├── ModelComparison.tsx (NEW)
        └── Recommendations.tsx (NEW)
```

---

## 8. PRÓXIMAS ETAPAS

1. **Revisar este documento** com o time frontend
2. **Priorizar** quais telas fazer primeiro
3. **Criar tasks** no seu sistema de rastreamento
4. **Implementar por prioridade**
5. **Testar integração** com as Edge Functions
6. **Fazer PR** para revisão

