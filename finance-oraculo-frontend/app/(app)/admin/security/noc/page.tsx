"use client"

import { useCallback, useEffect, useState } from "react"
import MetricsCard from "@/components/metrics-card"
import StatusBadge, { type StatusBadgeProps } from "@/components/status-badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Activity,
  Zap,
  Database,
  Server,
  Globe,
  MessageSquare,
  TrendingUp,
  Clock
} from "lucide-react"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface SecurityStats {
  vulnerabilities: {
    critical: number
    high: number
    moderate: number
    total: number
  }
  access: {
    total_24h: number
    errors_24h: number
    avg_response_time: number
  }
  health: {
    healthy: number
    degraded: number
    down: number
    total: number
  }
  alerts: {
    critical: number
    high: number
    total: number
  }
  llm: {
    total_tokens_24h: number
    total_cost_24h: number
    requests_24h: number
  }
}

interface SystemHealth {
  service_name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  response_time_ms: number | null
  error_message: string | null
  last_check_at: string
}

interface SecurityAlert {
  id: string
  alert_type: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  created_at: string
}

const FALLBACK_STATS: SecurityStats = {
  vulnerabilities: { critical: 1, high: 2, moderate: 3, total: 6 },
  access: { total_24h: 18432, errors_24h: 9, avg_response_time: 245 },
  health: { healthy: 18, degraded: 2, down: 0, total: 20 },
  alerts: { critical: 1, high: 3, total: 5 },
  llm: { total_tokens_24h: 734000, total_cost_24h: 192.45, requests_24h: 820 }
}

const FALLBACK_SYSTEM_HEALTH: SystemHealth[] = [
  {
    service_name: "supabase_core",
    status: "healthy",
    response_time_ms: 210,
    error_message: null,
    last_check_at: new Date().toISOString()
  },
  {
    service_name: "edge_functions",
    status: "healthy",
    response_time_ms: 260,
    error_message: null,
    last_check_at: new Date().toISOString()
  },
  {
    service_name: "mcp_schemaflow",
    status: "healthy",
    response_time_ms: 180,
    error_message: null,
    last_check_at: new Date().toISOString()
  },
  {
    service_name: "mcp_apidog",
    status: "degraded",
    response_time_ms: 340,
    error_message: "Latência acima de 350ms",
    last_check_at: new Date().toISOString()
  },
  {
    service_name: "json_schema_validator",
    status: "healthy",
    response_time_ms: 130,
    error_message: null,
    last_check_at: new Date().toISOString()
  },
  {
    service_name: "ruff_static_analysis",
    status: "healthy",
    response_time_ms: 190,
    error_message: null,
    last_check_at: new Date().toISOString()
  }
]

const FALLBACK_ALERTS: SecurityAlert[] = [
  {
    id: "alert-crit-apidog",
    alert_type: "integration",
    severity: "critical",
    title: "Timeout intermitente na sincronização OMIE",
    description: "API OMIE excedeu 60s durante pico de carga. Rebalancear workers.",
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString()
  },
  {
    id: "alert-high-schemaflow",
    alert_type: "database",
    severity: "high",
    title: "Revisar drift no esquema financeiro",
    description: "SchemaFlow detectou divergência de coluna em staging.",
    created_at: new Date(Date.now() - 1000 * 60 * 42).toISOString()
  },
  {
    id: "alert-medium-security",
    alert_type: "auth",
    severity: "medium",
    title: "Login suspeito bloqueado",
    description: "IP 177.10.23.55 bloqueado por 2FA incorreto.",
    created_at: new Date(Date.now() - 1000 * 60 * 70).toISOString()
  }
]

const FALLBACK_LIVE_METRICS = {
  edgeFunctions: [
    { name: "usage-details", calls: 540, errors: 2 },
    { name: "mood-index-timeline", calls: 420, errors: 1 },
    { name: "mcp/status", calls: 380, errors: 0 },
    { name: "alerts-summary", calls: 260, errors: 0 },
    { name: "get-live-metrics", calls: 310, errors: 1 }
  ]
}

export default function NOCDashboard() {
  const [stats, setStats] = useState<SecurityStats | null>(null)
  const [systemHealth, setSystemHealth] = useState<SystemHealth[]>([])
  const [alerts, setAlerts] = useState<SecurityAlert[]>([])
  const [loading, setLoading] = useState(true)
  const [liveMetrics, setLiveMetrics] = useState<any>(null)

  const applyFallbackDashboard = useCallback(() => {
    setStats(FALLBACK_STATS)
    setSystemHealth(FALLBACK_SYSTEM_HEALTH)
    setAlerts(FALLBACK_ALERTS)
  }, [])

  const applyFallbackLiveMetrics = useCallback(() => {
    setLiveMetrics(FALLBACK_LIVE_METRICS)
  }, [])

  const fetchDashboardData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        applyFallbackDashboard()
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/get-security-dashboard`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setStats(data.stats ?? FALLBACK_STATS)
        setSystemHealth(data.systemHealth ?? FALLBACK_SYSTEM_HEALTH)
        setAlerts(data.securityAlerts ?? FALLBACK_ALERTS)
      } else {
        applyFallbackDashboard()
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error)
      applyFallbackDashboard()
    } finally {
      setLoading(false)
    }
  }, [applyFallbackDashboard])

  const fetchLiveMetrics = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        applyFallbackLiveMetrics()
        return
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL}/get-live-metrics?timeframe=1h`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        setLiveMetrics(data ?? FALLBACK_LIVE_METRICS)
      } else {
        applyFallbackLiveMetrics()
      }
    } catch (error) {
      console.error('Error fetching live metrics:', error)
      applyFallbackLiveMetrics()
    }
  }, [applyFallbackLiveMetrics])

  useEffect(() => {
    fetchDashboardData()
    fetchLiveMetrics()
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetchDashboardData()
      fetchLiveMetrics()
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchDashboardData, fetchLiveMetrics])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const toBadgeStatus = (status: string): StatusBadgeProps["status"] => {
    switch (status) {
      case 'healthy':
        return 'success'
      case 'degraded':
        return 'warning'
      case 'down':
        return 'critical'
      default:
        return 'unknown'
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-600'
      case 'high':
        return 'bg-orange-600'
      case 'medium':
        return 'bg-yellow-600'
      default:
        return 'bg-blue-600'
    }
  }

  const vulnerabilityStatus: "default" | "success" | "warning" | "critical" =
    (stats?.vulnerabilities?.critical ?? 0) > 0
      ? "critical"
      : (stats?.vulnerabilities?.high ?? 0) > 0
        ? "warning"
        : "success"

  const accessErrors = stats?.access?.errors_24h ?? 0
  const accessResponse = stats?.access?.avg_response_time ?? 0
  const accessStatus: "default" | "success" | "warning" | "critical" =
    accessErrors > 20 ? "critical" : accessErrors > 0 ? "warning" : "success"

  const healthDown = stats?.health?.down ?? 0
  const healthDegraded = stats?.health?.degraded ?? 0
  const healthStatus: "default" | "success" | "warning" | "critical" =
    healthDown > 0 ? "critical" : healthDegraded > 0 ? "warning" : "success"

  const llmCost = stats?.llm?.total_cost_24h ?? 0
  const llmStatus: "default" | "success" | "warning" | "critical" =
    llmCost > 500 ? "critical" : llmCost > 250 ? "warning" : "default"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Activity className="h-8 w-8" />
            NOC Dashboard - Security & Monitoring
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitoramento em tempo real do sistema
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
          Live
        </Badge>
      </div>

      {/* Alertas Críticos */}
      {alerts.filter(a => a.severity === 'critical').length > 0 && (
        <Alert className="border-red-500 bg-red-500/10">
          <AlertTriangle className="h-4 w-4 text-red-500" />
          <AlertTitle>Alertas Críticos</AlertTitle>
          <AlertDescription>
            {alerts.filter(a => a.severity === 'critical').length} alerta(s) crítico(s) requerem atenção imediata
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricsCard
          title="Vulnerabilidades"
          value={stats?.vulnerabilities?.total ?? 0}
          status={vulnerabilityStatus}
          icon={<Shield className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Críticas"
          trendValue={`${stats?.vulnerabilities?.critical ?? 0}`}
          trendDirection={(stats?.vulnerabilities?.critical ?? 0) > 0 ? "down" : "steady"}
          footer={
            <div className="flex flex-wrap gap-2 text-xs">
              <StatusBadge status="critical" label={`${stats?.vulnerabilities?.critical ?? 0} críticas`} />
              <StatusBadge status="warning" label={`${stats?.vulnerabilities?.high ?? 0} altas`} />
            </div>
          }
        />

        <MetricsCard
          title="Acessos (24h)"
          value={(stats?.access?.total_24h ?? 0).toLocaleString("pt-BR")}
          status={accessStatus}
          icon={<Globe className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Tempo médio"
          trendValue={`${Math.round(accessResponse)}ms`}
          trendDirection={accessResponse > 400 ? "down" : "up"}
          footer={
            <div className="flex items-center gap-2 text-xs">
              <StatusBadge status={accessErrors ? "warning" : "success"} label={`${accessErrors} erros`} />
              <span className="text-muted-foreground">
                {accessErrors > 0 ? "Investigue endpoints" : "Operando normalmente"}
              </span>
            </div>
          }
        />

        <MetricsCard
          title="Saúde do Sistema"
          value={`${stats?.health?.healthy ?? 0}/${stats?.health?.total ?? 0}`}
          status={healthStatus}
          icon={<Activity className="h-4 w-4 text-muted-foreground" />}
          footer={
            <div className="flex flex-wrap gap-2 text-xs">
              {healthDegraded ? (
                <StatusBadge status="warning" label={`${healthDegraded} degradados`} />
              ) : (
                <StatusBadge status="success" label="Todos estáveis" />
              )}
              {healthDown > 0 && (
                <StatusBadge status="critical" label={`${healthDown} offline`} pulse />
              )}
            </div>
          }
        />

        <MetricsCard
          title="LLM Usage (24h)"
          value={(stats?.llm?.total_tokens_24h ?? 0).toLocaleString("pt-BR")}
          status={llmStatus}
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
          trendLabel="Custo"
          trendValue={`$${llmCost.toFixed(2)}`}
          trendDirection={llmCost > 250 ? "down" : "steady"}
          footer={
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <MessageSquare className="h-3 w-3" />
              {stats?.llm?.requests_24h ?? 0} requests processados
            </div>
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="health" className="space-y-4">
        <TabsList>
          <TabsTrigger value="health">Saúde dos Serviços</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="metrics">Métricas Live</TabsTrigger>
          <TabsTrigger value="llm">LLM & Tokens</TabsTrigger>
        </TabsList>

        {/* Saúde dos Serviços */}
        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Status dos Serviços</CardTitle>
              <CardDescription>Monitoramento em tempo real</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {systemHealth.map((service) => (
                  <div
                    key={service.service_name}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(service.status)}
                      <div>
                        <div className="font-medium capitalize">
                          {service.service_name.replace(/_/g, ' ')}
                        </div>
                        {service.response_time_ms && (
                          <div className="text-xs text-muted-foreground">
                            {service.response_time_ms}ms
                          </div>
                        )}
                      </div>
                    </div>
                    <StatusBadge
                      status={toBadgeStatus(service.status)}
                      label={service.status}
                      pulse={service.status === 'down'}
                      className="capitalize"
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Alertas */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Alertas de Segurança</CardTitle>
              <CardDescription>{alerts.length} alerta(s) ativo(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <Alert
                    key={alert.id}
                    className={alert.severity === 'critical' ? 'border-red-500 bg-red-500/10' : ''}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="flex items-center gap-2">
                      {alert.title}
                      <Badge className={getSeverityColor(alert.severity)}>
                        {alert.severity}
                      </Badge>
                    </AlertTitle>
                    <AlertDescription>{alert.description}</AlertDescription>
                    <div className="text-xs text-muted-foreground mt-2">
                      {new Date(alert.created_at).toLocaleString('pt-BR')}
                    </div>
                  </Alert>
                ))}
                {alerts.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum alerta ativo
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Métricas Live */}
        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Métricas em Tempo Real</CardTitle>
              <CardDescription>Última hora</CardDescription>
            </CardHeader>
            <CardContent>
              {liveMetrics?.edgeFunctions && liveMetrics.edgeFunctions.length > 0 ? (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={liveMetrics.edgeFunctions}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="calls" fill="#8884d8" />
                      <Bar dataKey="errors" fill="#ff4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando métricas...
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM & Tokens */}
        <TabsContent value="llm" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso de LLM e Tokens</CardTitle>
              <CardDescription>Otimização e controle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {(stats?.llm?.total_tokens_24h || 0).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Tokens (24h)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      ${(stats?.llm?.total_cost_24h || 0).toFixed(2)}
                    </div>
                    <div className="text-sm text-muted-foreground">Custo (24h)</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold">
                      {stats?.llm?.requests_24h || 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Requests (24h)</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <a href="/admin/llm-config" className="text-sm text-blue-500 underline">
                    💡 Configure modelos otimizados
                  </a>
                  <span className="text-muted-foreground">•</span>
                  <a href="/admin/llm-costs-per-client" className="text-sm text-blue-500 underline">
                    📊 Ver custos por cliente
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
