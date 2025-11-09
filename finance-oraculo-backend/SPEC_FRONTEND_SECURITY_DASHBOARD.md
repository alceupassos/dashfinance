# 🔒 Painel de Segurança e Monitoramento - Especificação Frontend

**Para:** Codex (Criador do Frontend)
**Data:** 2025-01-06
**Backend:** 100% Completo e Deployado
**Objetivo:** Criar dashboards de segurança estilo Grafana com gráficos animados

---

## 📊 Visão Geral

Criar um **Painel de Controle de Segurança e Monitoramento** completo para administradores, com:

- 🔐 6 dashboards especializados
- 📈 Gráficos interativos estilo Grafana
- 🎨 Animações suaves e modernas
- ⚡ Atualização em tempo real
- 🎯 Alertas visuais de segurança

---

## 🎨 Stack Tecnológica Recomendada

### Gráficos e Visualização
- **Recharts** (principal) - Gráficos responsivos
- **Chart.js** (alternativa) - Mais customizável
- **Visx** (d3-based) - Para gráficos complexos
- **React-Gauge-Chart** - Medidores/gauges
- **React-Sparklines** - Mini gráficos inline

### UI/UX
- **shadcn/ui** - Componentes base
- **Framer Motion** - Animações
- **Tailwind CSS** - Estilos
- **Lucide React** - Ícones

### Dados
- **SWR** ou **React Query** - Fetching e cache
- **Zustand** - State management
- **date-fns** - Manipulação de datas

---

## 🗂️ Estrutura de Rotas

```
/admin/security/
├── overview          # Dashboard principal (resumo geral)
├── traffic           # Tráfego e latência de APIs
├── security          # Eventos de segurança
├── sessions          # Sessões ativas
├── database          # Saúde do banco de dados
└── backups           # Status de backups
```

**Todas as rotas são ADMIN APENAS.**

---

## 📍 API Backend (Deployada)

**Base URL:** `https://xzrmzmcoslomtzkzgskn.functions.supabase.co/admin-security-dashboard`

**Header obrigatório:**
```
Authorization: Bearer <JWT_TOKEN>
```

### Endpoints Disponíveis

| Endpoint | Descrição | Parâmetros |
|----------|-----------|------------|
| `/overview` | Dashboard principal com resumo | - |
| `/traffic` | Tráfego de APIs e latência | `?hours=24` |
| `/security` | Eventos de segurança | `?days=7` |
| `/sessions` | Sessões ativas e distribuição | - |
| `/database` | Métricas do banco de dados | `?hours=24` |
| `/backups` | Status de backups | - |

---

## 📊 DASHBOARD 1: Overview (Resumo Geral)

### Rota
`/admin/security/overview`

### API
```typescript
GET /admin-security-dashboard/overview

Response:
{
  active_users: [
    {
      id: string,
      email: string,
      full_name: string,
      role: string,
      active_sessions: number,
      last_activity: timestamp,
      unique_ips: number
    }
  ],
  vulnerabilities: [
    {
      severity: 'critical' | 'high' | 'medium' | 'low',
      vulnerability_type: string,
      count: number,
      recent_descriptions: string[],
      oldest: timestamp,
      newest: timestamp
    }
  ],
  failed_logins: [
    {
      email: string,
      ip_address: string,
      failure_count: number,
      reasons: string[],
      first_attempt: timestamp,
      last_attempt: timestamp
    }
  ],
  suspicious_ips: [
    {
      ip_address: string,
      request_count: number,
      error_count: number,
      auth_failures: number,
      rate_limited: number,
      accessed_functions: string[],
      first_seen: timestamp,
      last_seen: timestamp
    }
  ],
  database_health: [
    {
      metric_name: string,
      avg_value: number,
      min_value: number,
      max_value: number,
      metric_unit: string,
      last_recorded: timestamp
    }
  ],
  active_sessions_count: number,
  vulnerability_count: {
    critical: number,
    high: number,
    medium: number,
    low: number
  },
  timestamp: timestamp
}
```

### Layout

#### Seção 1: Cards de Métricas Principais (Grid 4 colunas)

**Card 1: Usuários Ativos (24h)**
- Valor grande: `active_sessions_count`
- Tendência: % de mudança
- Ícone: Users
- Cor: Verde
- Mini gráfico sparkline (sessões por hora)

**Card 2: Vulnerabilidades Abertas**
- Valor grande: `total de vulnerability_count`
- Breakdown: Critical (vermelho), High (laranja), Medium (amarelo), Low (azul)
- Ícone: ShieldAlert
- Cor: Vermelho se critical > 0

**Card 3: Tentativas de Login Falhadas**
- Valor grande: `failed_logins.length`
- Subtítulo: "Últimas 24 horas"
- Ícone: Lock
- Cor: Amarelo

**Card 4: IPs Suspeitos**
- Valor grande: `suspicious_ips.length`
- Subtítulo: "Atividade anormal detectada"
- Ícone: AlertTriangle
- Cor: Laranja

#### Seção 2: Gráficos (Grid 2 colunas)

**Gráfico 1: Distribuição de Vulnerabilidades (Donut Chart)**
```typescript
Recharts <PieChart>
- Dados: vulnerability_count
- Cores:
  - Critical: #EF4444 (red-500)
  - High: #F97316 (orange-500)
  - Medium: #FBBF24 (yellow-400)
  - Low: #3B82F6 (blue-500)
- Animação: Entrada com escala
- Tooltip customizado
- Legenda posicionada à direita
```

**Gráfico 2: Saúde do Banco (Gauge/Radial)**
```typescript
React-Gauge-Chart
- Métrica: Baseado em database_health
- Cálculo de "health score" (0-100):
  - Conexões ativas < 50: +30
  - DB size < 1000MB: +30
  - Queries rápidas: +40
- Cores:
  - 0-50: Vermelho (crítico)
  - 51-75: Amarelo (atenção)
  - 76-100: Verde (saudável)
- Animação: Preenchimento progressivo
```

#### Seção 3: Tabelas (Grid 2 colunas)

**Tabela 1: Top Usuários Ativos**
- Dados: `active_users` (top 10)
- Colunas:
  - Avatar + Nome
  - Email
  - Role (badge colorido)
  - Sessões ativas
  - Última atividade (relativa: "há 5min")
  - IPs únicos
- Ordenação: Por last_activity desc
- Hover: Highlight linha
- Clique: Ver detalhes da sessão

**Tabela 2: Tentativas de Login Falhadas**
- Dados: `failed_logins` (top 10)
- Colunas:
  - Email
  - IP Address
  - Tentativas (badge vermelho se >= 5)
  - Razões (chips/tags)
  - Primeira tentativa
  - Última tentativa
  - Ação: Botão "Bloquear IP" (se >= 5 tentativas)
- Ordenação: Por failure_count desc
- Row condicional: Fundo vermelho claro se >= 10 tentativas

---

## 📊 DASHBOARD 2: Tráfego e Latência

### Rota
`/admin/security/traffic`

### API
```typescript
GET /admin-security-dashboard/traffic?hours=24

Response:
{
  hourly_traffic: [
    {
      hour: timestamp,
      function_name: string,
      request_count: number,
      avg_response_time: number,
      error_count: number,
      total_request_bytes: number,
      total_response_bytes: number
    }
  ],
  top_endpoints: [
    {
      name: string,
      total: number,
      success: number,
      errors: number
    }
  ],
  latency: [
    {
      function_name: string,
      avg_latency: number,
      min_latency: number,
      max_latency: number,
      p95_latency: number
    }
  ]
}
```

### Layout

#### Seção 1: Filtros e Período
- Dropdown: "Últimas 24h", "Últimas 48h", "7 dias", "30 dias"
- Botão: "Atualizar" (refetch)
- Checkbox: "Auto-refresh" (a cada 30s)

#### Seção 2: Cards de Métricas (Grid 4 colunas)

**Card 1: Total de Requisições**
- Valor: `Sum de hourly_traffic.request_count`
- Tendência: % vs período anterior
- Mini sparkline

**Card 2: Latência Média**
- Valor: `Média de latency.avg_latency` em ms
- Subtítulo: P95 = `média de p95_latency`
- Gauge circular inline (0-500ms range)

**Card 3: Taxa de Erro**
- Valor: `(total errors / total requests) * 100` %
- Cor: Verde se < 1%, Amarelo se < 5%, Vermelho se >= 5%
- Badge de status

**Card 4: Bandwidth Total**
- Valor: `Sum de (request_bytes + response_bytes)` em MB/GB
- Ícone: HardDrive

#### Seção 3: Gráfico Principal - Tráfego ao Longo do Tempo

```typescript
Recharts <AreaChart> ou <LineChart>
- Dados: hourly_traffic
- Eixo X: hour (formatado como "14:00", "15:00")
- Eixo Y: request_count
- Múltiplas séries:
  - Série 1 (Area): Total requests (azul, opacity 0.3)
  - Série 2 (Line): Errors (vermelho, dashed)
- Tooltip customizado:
  - Hora
  - Total requests
  - Errors
  - Avg response time
- Grid suave
- Animação: Entrada da esquerda para direita
- Responsivo: Adapta labels do eixo X
```

#### Seção 4: Gráfico - Latência por Endpoint (Bar Chart)

```typescript
Recharts <BarChart>
- Dados: latency
- Eixo X: function_name
- Eixos Y:
  - Y1: avg_latency (barras azuis)
  - Y2: p95_latency (barras laranjas, opacity 0.6)
- Barras agrupadas
- Hover: Mostrar min/max latency
- Linha de referência: 200ms (threshold aceitável)
- Ordenação: Por avg_latency desc
```

#### Seção 5: Tabela - Top Endpoints

- Dados: `top_endpoints`
- Colunas:
  - Endpoint (com ícone de função)
  - Total Requests
  - Success (badge verde)
  - Errors (badge vermelho)
  - Success Rate (% + barra de progresso)
- Ordenação: Por total desc
- Expansível: Clique para ver detalhes (últimas 100 requests)

---

## 📊 DASHBOARD 3: Segurança

### Rota
`/admin/security/security`

### API
```typescript
GET /admin-security-dashboard/security?days=7

Response:
{
  vulnerability_timeline: [
    {
      id: string,
      vulnerability_type: string,
      severity: string,
      description: string,
      affected_component: string,
      affected_id: string,
      ip_address: string,
      user_id: string,
      status: string,
      detected_at: timestamp,
      resolved_at: timestamp,
      resolved_by: string
    }
  ],
  login_attempts: [
    {
      attempted_at: timestamp,
      success: boolean
    }
  ],
  top_failed_ips: [
    {
      ip_address: string,
      failure_count: number,
      first_attempt: timestamp,
      last_attempt: timestamp
    }
  ]
}
```

### Layout

#### Seção 1: Filtros
- Dropdown período: "7 dias", "30 dias", "90 dias"
- Dropdown severidade: "Todas", "Critical", "High", "Medium", "Low"
- Dropdown status: "Todas", "Abertas", "Resolvidas"

#### Seção 2: Timeline de Vulnerabilidades

```typescript
Recharts <LineChart> com múltiplas séries
- Dados: vulnerability_timeline agrupados por dia e severidade
- Eixo X: Data (formatada como "06 Jan")
- Eixo Y: Count
- 4 linhas (uma por severidade):
  - Critical (vermelho forte, espessura 3px)
  - High (laranja, espessura 2px)
  - Medium (amarelo, espessura 2px)
  - Low (azul, espessura 1px)
- Área preenchida abaixo de cada linha (gradient)
- Pontos interativos: Clique para ver detalhes
- Animação: Linhas desenham da esquerda para direita
```

#### Seção 3: Gráfico - Tentativas de Login (Success vs Failed)

```typescript
Recharts <ComposedChart>
- Dados: login_attempts agrupados por hora
- Barras empilhadas:
  - Success (verde)
  - Failed (vermelho)
- Linha: Taxa de falha % (eixo Y secundário, laranja)
- Tooltip: Hora, Success count, Failed count, Failure rate %
```

#### Seção 4: Lista de Vulnerabilidades (Tabela Expansível)

- Dados: `vulnerability_timeline`
- Colunas principais:
  - Severidade (badge colorido + ícone)
  - Tipo (chip)
  - Descrição (truncada)
  - Componente afetado
  - IP/Usuário (se disponível)
  - Status (badge: Aberta/Em investigação/Resolvida)
  - Data de detecção (relativa)
  - Ações: Botão "Investigar" / "Resolver" / "Marcar como falso positivo"

- Expansível: Clique na linha para ver:
  - Descrição completa
  - affected_id
  - Timeline de status (se houver mudanças)
  - Botão "Ver no Audit Log"

- Filtros inline: Por severidade, tipo, status
- Ordenação padrão: detected_at desc
- Paginação: 20 por página

#### Seção 5: Top IPs com Falhas (Card List)

- Dados: `top_failed_ips`
- Cards (um por IP):
  - IP Address (grande, fonte mono)
  - Badge: Failure count (vermelho se >= 10)
  - Primeira tentativa
  - Última tentativa (com countdown se recente)
  - Botão: "Bloquear IP" (abre modal de confirmação)
  - Botão: "Ver Histórico Completo"

---

## 📊 DASHBOARD 4: Sessões Ativas

### Rota
`/admin/security/sessions`

### API
```typescript
GET /admin-security-dashboard/sessions

Response:
{
  active_sessions: [
    {
      id: string,
      user_id: string,
      session_token: string, // Truncado no backend
      ip_address: string,
      user_agent: string,
      device_type: string,
      location_country: string,
      location_city: string,
      created_at: timestamp,
      last_activity_at: timestamp,
      expires_at: timestamp,
      is_active: boolean,
      user: {
        id: string,
        email: string,
        full_name: string,
        role: string
      }
    }
  ],
  device_distribution: [
    { device_type: string, count: number }
  ],
  geo_distribution: [
    { location_country: string, count: number }
  ]
}
```

### Layout

#### Seção 1: Cards de Resumo (Grid 3 colunas)

**Card 1: Sessões Ativas Totais**
- Valor: `active_sessions.length`
- Ícone: Users
- Animação: CountUp

**Card 2: Usuários Únicos**
- Valor: `unique user_ids de active_sessions`
- Ícone: User
- Animação: CountUp

**Card 3: Tempo Médio de Sessão**
- Valor: Média de `(last_activity_at - created_at)`
- Formato: "2h 34min"
- Ícone: Clock

#### Seção 2: Gráficos (Grid 2 colunas)

**Gráfico 1: Distribuição de Dispositivos (Pie Chart)**
```typescript
Recharts <PieChart>
- Dados: device_distribution
- Labels: Desktop, Mobile, Tablet, API
- Cores customizadas:
  - Desktop: #3B82F6 (azul)
  - Mobile: #10B981 (verde)
  - Tablet: #F59E0B (amarelo)
  - API: #8B5CF6 (roxo)
- Porcentagem dentro das fatias
- Legenda com ícones
- Animação: Expansão radial
```

**Gráfico 2: Distribuição Geográfica (Bar Chart Horizontal)**
```typescript
Recharts <BarChart layout="vertical">
- Dados: geo_distribution (top 10 países)
- Eixo X: count
- Eixo Y: location_country (com bandeira emoji 🇧🇷🇺🇸)
- Barras coloridas em gradient
- Tooltip: País + count + % do total
```

#### Seção 3: Mapa de Calor (Heatmap - Opcional)

**Se implementar (biblioteca react-simple-maps):**
- Mapa mundial
- Intensidade de cor baseada em geo_distribution
- Tooltip ao hover: País + count
- Zoom interativo

#### Seção 4: Tabela de Sessões Ativas

- Dados: `active_sessions`
- Colunas:
  - Usuário (avatar + nome + email)
  - Role (badge)
  - Dispositivo (ícone + device_type)
  - Localização (bandeira + cidade, país)
  - IP Address (mono font)
  - Criada há (relativo: "há 2h")
  - Última atividade (relativo: "há 5min")
  - Expira em (countdown)
  - Ação: Botão "Encerrar Sessão" (vermelho)

- Filtros:
  - Por usuário (autocomplete)
  - Por role
  - Por device_type
  - Por país

- Ordenação padrão: last_activity_at desc
- Paginação: 20 por página
- Refresh automático a cada 30s (com indicador visual)

---

## 📊 DASHBOARD 5: Banco de Dados

### Rota
`/admin/security/database`

### API
```typescript
GET /admin-security-dashboard/database?hours=24

Response:
{
  metrics_timeline: [
    {
      id: string,
      metric_name: string,
      metric_value: number,
      metric_unit: string,
      context: object,
      recorded_at: timestamp
    }
  ],
  table_sizes: [
    {
      schemaname: string,
      tablename: string,
      size: string, // human-readable
      size_bytes: number
    }
  ],
  unused_indexes: [
    {
      schemaname: string,
      tablename: string,
      indexname: string,
      size: string
    }
  ],
  slow_queries: [
    {
      query: string,
      avg_time_ms: number,
      calls: number
    }
  ]
}
```

### Layout

#### Seção 1: Cards de Métricas (Grid 4 colunas)

**Card 1: Conexões Ativas**
- Valor: Último `metric_value` de `active_connections`
- Gauge circular (0-100 range)
- Cor: Verde se < 50, Amarelo se < 75, Vermelho se >= 75

**Card 2: Tamanho do Banco**
- Valor: Último `metric_value` de `database_size` em MB/GB
- Tendência: Crescimento últimas 24h
- Ícone: Database

**Card 3: Contagem de Tabelas**
- Valor: `table_count`
- Ícone: Table
- Animação: CountUp

**Card 4: Índices Não Utilizados**
- Valor: `unused_indexes.length`
- Alerta: Badge laranja se > 0
- Ícone: AlertCircle

#### Seção 2: Gráfico - Métricas ao Longo do Tempo

```typescript
Recharts <LineChart> com múltiplas séries
- Dados: metrics_timeline
- Séries (filtráveis):
  - Conexões ativas (azul)
  - DB size (verde)
  - Query avg time (se disponível, laranja)
- Eixo X: recorded_at
- Eixos Y múltiplos (normalizado)
- Tooltip rico com todos os valores
- Seletor de métricas (checkboxes)
- Zoom e pan (via RechartsBrush)
```

#### Seção 3: Tabela - Top Tabelas por Tamanho

- Dados: `table_sizes`
- Colunas:
  - Nome da tabela
  - Tamanho (human-readable)
  - Tamanho (bytes - hidden, para ordenação)
  - Barra de progresso (% do total)
- Ordenação: Por size_bytes desc
- Highlight: Top 3 em cores diferentes
- Ação: Botão "Ver Estrutura" (abre modal com DESCRIBE)

#### Seção 4: Alerta - Índices Não Utilizados

**Se `unused_indexes.length > 0`:**
- Card de alerta (fundo laranja claro)
- Título: "⚠️ Índices Não Utilizados Detectados"
- Descrição: "Os seguintes índices não estão sendo usados e podem ser removidos para economizar espaço:"
- Lista:
  - Cada índice com: Tabela, Nome do índice, Tamanho
  - Botão: "Gerar SQL DROP" (copia para clipboard)

**Se `unused_indexes.length === 0`:**
- Card de sucesso (fundo verde claro)
- "✅ Todos os índices estão sendo utilizados!"

#### Seção 5: Queries Lentas (Se disponível)

- Tabela:
  - Query (truncada, mono font)
  - Tempo médio (ms)
  - Calls
  - % do tempo total
- Expansível: Clique para ver query completa
- Ação: Botão "Analisar" (mostra EXPLAIN ANALYZE)

---

## 📊 DASHBOARD 6: Backups

### Rota
`/admin/security/backups`

### API
```typescript
GET /admin-security-dashboard/backups

Response:
{
  backups: [
    {
      id: string,
      backup_type: 'full' | 'incremental' | 'snapshot',
      status: 'running' | 'completed' | 'failed',
      size_mb: number,
      duration_seconds: number,
      backup_location: string,
      error_message: string,
      started_at: timestamp,
      completed_at: timestamp
    }
  ],
  stats: [
    {
      backup_type: string,
      total_backups: number,
      successful: number,
      failed: number,
      avg_duration_seconds: number,
      avg_size_mb: number
    }
  ]
}
```

### Layout

#### Seção 1: Cards de Resumo (Grid 4 colunas)

**Card 1: Último Backup**
- Status: Badge (verde/vermelho)
- Tipo: Full/Incremental/Snapshot
- Data: "há X horas"
- Botão: "Executar Backup Agora"

**Card 2: Taxa de Sucesso**
- Valor: `(successful / total) * 100` %
- Gauge circular
- Cor: Verde se >= 95%, Amarelo se >= 90%, Vermelho se < 90%

**Card 3: Tamanho Médio**
- Valor: Média de `avg_size_mb` em MB/GB
- Ícone: HardDrive

**Card 4: Duração Média**
- Valor: Média de `avg_duration_seconds` em min/s
- Ícone: Clock

#### Seção 2: Gráfico - Timeline de Backups

```typescript
Recharts <ScatterChart> ou Timeline customizado
- Dados: backups
- Eixo X: started_at
- Eixo Y: backup_type (categórico)
- Pontos:
  - Cor: Verde (completed), Vermelho (failed), Azul (running)
  - Tamanho: Proporcional a size_mb
- Tooltip:
  - Tipo, Status, Duração, Tamanho
  - Error message (se failed)
- Linha de tempo vertical interativa
```

#### Seção 3: Tabela de Backups Recentes

- Dados: `backups` (últimos 50)
- Colunas:
  - Status (ícone + badge)
  - Tipo (chip)
  - Iniciado em
  - Concluído em (ou "Em andamento")
  - Duração (formatada: "2min 34s")
  - Tamanho (MB/GB)
  - Localização (truncada, com tooltip)
  - Ações:
    - Se completed: Botão "Restaurar" (abre modal)
    - Se failed: Botão "Ver Erro" (abre modal com error_message)

- Filtros:
  - Por tipo
  - Por status
- Ordenação: started_at desc
- Paginação: 20 por página

#### Seção 4: Estatísticas por Tipo

- Dados: `stats`
- Cards (um por backup_type):
  - Título: Tipo de backup
  - Total: X backups
  - Success rate: X%
  - Duração média: Xmin
  - Tamanho médio: XMB
  - Mini gráfico: Últimos 10 backups (success/failed)

---

## 🎨 Componentes Reutilizáveis

### 1. SecurityCard
```typescript
interface SecurityCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  color: 'green' | 'yellow' | 'red' | 'blue';
  trend?: {
    value: number; // % change
    isPositive: boolean;
  };
  sparkline?: number[]; // Mini gráfico
}

// Uso:
<SecurityCard
  title="Usuários Ativos"
  value={42}
  subtitle="Últimas 24h"
  icon={Users}
  color="green"
  trend={{ value: 12.5, isPositive: true }}
  sparkline={[10, 12, 15, 20, 25, 30, 35, 42]}
/>
```

### 2. VulnerabilityBadge
```typescript
interface VulnerabilityBadgeProps {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  count?: number;
}

// Cores:
// critical: bg-red-500
// high: bg-orange-500
// medium: bg-yellow-400
// low: bg-blue-500
// info: bg-gray-400
```

### 3. MetricChart
```typescript
interface MetricChartProps {
  type: 'line' | 'area' | 'bar' | 'pie';
  data: any[];
  config: {
    xKey: string;
    yKeys: string[];
    colors: string[];
    animate?: boolean;
    showGrid?: boolean;
    showLegend?: boolean;
  };
}
```

### 4. RefreshButton
```typescript
interface RefreshButtonProps {
  onRefresh: () => void;
  autoRefresh?: boolean;
  interval?: number; // segundos
}

// Mostra ícone de refresh
// Se autoRefresh=true, mostra countdown circular
// Animação de rotação ao refresh
```

### 5. AlertCard
```typescript
interface AlertCardProps {
  severity: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  actions?: ReactNode;
}

// Cores de fundo e ícone conforme severity
```

---

## 🎨 Paleta de Cores (Segurança)

```css
/* Severidades */
--critical: #EF4444;     /* red-500 */
--high: #F97316;         /* orange-500 */
--medium: #FBBF24;       /* yellow-400 */
--low: #3B82F6;          /* blue-500 */
--info: #6B7280;         /* gray-500 */

/* Status */
--success: #10B981;      /* green-500 */
--warning: #F59E0B;      /* yellow-500 */
--error: #EF4444;        /* red-500 */
--running: #3B82F6;      /* blue-500 */

/* Fundos */
--bg-critical: #FEE2E2;  /* red-100 */
--bg-high: #FFEDD5;      /* orange-100 */
--bg-medium: #FEF3C7;    /* yellow-100 */
--bg-low: #DBEAFE;       /* blue-100 */
--bg-success: #D1FAE5;   /* green-100 */
```

---

## ⚡ Animações (Framer Motion)

### Entrada de Cards
```typescript
const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' }
  }
};

<motion.div
  variants={cardVariants}
  initial="hidden"
  animate="visible"
>
  {/* Card content */}
</motion.div>
```

### Entrada de Gráficos
```typescript
const chartVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
};
```

### Números CountUp
```typescript
import { motion, useSpring, useTransform } from 'framer-motion';

function AnimatedNumber({ value }) {
  const spring = useSpring(0, { stiffness: 100, damping: 30 });
  const display = useTransform(spring, (current) =>
    Math.round(current).toLocaleString()
  );

  useEffect(() => {
    spring.set(value);
  }, [spring, value]);

  return <motion.span>{display}</motion.span>;
}
```

### Alertas Pulsando
```typescript
const pulseVariants = {
  pulse: {
    scale: [1, 1.05, 1],
    transition: { repeat: Infinity, duration: 2 }
  }
};

<motion.div variants={pulseVariants} animate="pulse">
  {/* Alert content */}
</motion.div>
```

---

## 🔄 Auto-Refresh e Real-Time

### Implementação com SWR
```typescript
import useSWR from 'swr';

function SecurityDashboard() {
  const { data, error, mutate } = useSWR(
    '/admin-security-dashboard/overview',
    fetcher,
    {
      refreshInterval: 30000, // 30 segundos
      revalidateOnFocus: true,
    }
  );

  return (
    <div>
      <RefreshButton onRefresh={() => mutate()} />
      {/* Dashboard content */}
    </div>
  );
}
```

### Implementação com React Query
```typescript
import { useQuery } from '@tanstack/react-query';

function SecurityDashboard() {
  const { data, refetch } = useQuery({
    queryKey: ['security', 'overview'],
    queryFn: fetchOverview,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
}
```

---

## 📱 Responsividade

### Breakpoints
```typescript
const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
};
```

### Grid Responsivo
```css
/* Desktop: 4 colunas */
@screen lg {
  .metrics-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Tablet: 2 colunas */
@screen md {
  .metrics-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Mobile: 1 coluna */
.metrics-grid {
  grid-template-columns: 1fr;
}
```

---

## 🧪 Dados Mock (Para Desenvolvimento)

```typescript
// mock-data/security.ts
export const mockOverview = {
  active_users: [
    {
      id: '1',
      email: 'admin@example.com',
      full_name: 'Admin User',
      role: 'admin',
      active_sessions: 2,
      last_activity: new Date().toISOString(),
      unique_ips: 1,
    },
  ],
  vulnerability_count: {
    critical: 2,
    high: 5,
    medium: 10,
    low: 3,
  },
  active_sessions_count: 42,
  database_health: [
    {
      metric_name: 'active_connections',
      avg_value: 15,
      min_value: 10,
      max_value: 20,
      metric_unit: 'count',
      last_recorded: new Date().toISOString(),
    },
  ],
  // ... mais dados
};
```

---

## ✅ Checklist de Implementação

### Setup Inicial
- [ ] Instalar dependências (Recharts, Framer Motion, SWR, etc.)
- [ ] Criar estrutura de rotas `/admin/security/*`
- [ ] Configurar proteção de rotas (apenas admin)
- [ ] Setup de fetch com autenticação (JWT)

### Dashboard 1: Overview
- [ ] Layout com grid responsivo
- [ ] 4 cards de métricas principais
- [ ] Gráfico de donut (vulnerabilidades)
- [ ] Gráfico gauge (saúde do banco)
- [ ] Tabela de usuários ativos
- [ ] Tabela de logins falhados
- [ ] Auto-refresh a cada 30s

### Dashboard 2: Traffic
- [ ] Filtros de período
- [ ] 4 cards de métricas
- [ ] Gráfico de área (tráfego ao longo do tempo)
- [ ] Gráfico de barras (latência por endpoint)
- [ ] Tabela de top endpoints

### Dashboard 3: Security
- [ ] Filtros (período, severidade, status)
- [ ] Timeline de vulnerabilidades (line chart)
- [ ] Gráfico de tentativas de login (composed chart)
- [ ] Tabela expansível de vulnerabilidades
- [ ] Cards de IPs suspeitos

### Dashboard 4: Sessions
- [ ] 3 cards de resumo
- [ ] Gráfico de pizza (dispositivos)
- [ ] Gráfico de barras horizontal (países)
- [ ] Tabela de sessões ativas
- [ ] Botão "Encerrar Sessão"

### Dashboard 5: Database
- [ ] 4 cards de métricas
- [ ] Gráfico multi-série (métricas ao longo do tempo)
- [ ] Tabela de tamanho das tabelas
- [ ] Alerta de índices não utilizados

### Dashboard 6: Backups
- [ ] 4 cards de resumo
- [ ] Timeline de backups (scatter chart)
- [ ] Tabela de backups recentes
- [ ] Cards de estatísticas por tipo

### Componentes Reutilizáveis
- [ ] SecurityCard
- [ ] VulnerabilityBadge
- [ ] MetricChart
- [ ] RefreshButton
- [ ] AlertCard

### Animações
- [ ] Entrada de cards (Framer Motion)
- [ ] Entrada de gráficos
- [ ] CountUp em números
- [ ] Pulse em alertas

### Responsividade
- [ ] Grid responsivo em todos os dashboards
- [ ] Tabelas responsivas (scroll horizontal em mobile)
- [ ] Gráficos responsivos

### Testes
- [ ] Testes unitários (componentes)
- [ ] Testes de integração (fetch APIs)
- [ ] Testes E2E (Playwright/Cypress)

---

## 🚀 Próximos Passos Após Implementação

1. **Integrar NPM Audit:**
   - Criar job que roda `npm audit --json`
   - Salvar resultados em tabela `npm_vulnerabilities`
   - Exibir no dashboard de Segurança

2. **Adicionar Notificações:**
   - WebSocket ou SSE para alertas em tempo real
   - Toasts quando vulnerabilidade crítica é detectada

3. **Exportação:**
   - Botão "Exportar PDF" em cada dashboard
   - Envio de relatórios por email (agendado)

4. **Compliance:**
   - Dashboard adicional para LGPD/GDPR
   - Checklist de conformidade

---

**Pronto para implementação!** 🎨

Todos os endpoints estão deployados e funcionando. Basta criar os componentes React seguindo esta especificação.
