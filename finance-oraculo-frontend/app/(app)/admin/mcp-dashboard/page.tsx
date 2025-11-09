/**
 * MCP Servers Dashboard - Control Panel
 * Gerenciar todos os MCP servers com on/off toggle
 * 
 * Componentes:
 * - Status real-time de cada server
 * - Botões de toggle (on/off)
 * - Health checks
 * - Logs e métricas
 * - Integração com Federated MCP
 */

'use client';

import { useMemo, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, ArrowUpRight, Database, Network, RefreshCw } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  getAdminSecurityDatabase,
  getAdminSecurityTraffic,
  getAutomationRuns,
  getN8nStatus,
  type AdminSecurityDatabaseResponse,
  type AdminSecurityTrafficResponse,
  type AutomationRun,
  type N8nStatusResponse
} from "@/lib/api";

type PeriodKey = "past_24h" | "past_7d";

const periodOptions: Array<{ label: string; value: PeriodKey }> = [
  { label: "Últimas 24h", value: "past_24h" },
  { label: "Últimos 7 dias", value: "past_7d" }
];

type ServerStatusVariant = "online" | "degraded" | "offline" | "unknown";

export default function MCPDashboard() {
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("past_24h");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fromIso = useMemo(() => {
    const now = new Date();
    const offset = selectedPeriod === "past_24h" ? 1 : 7;
    const from = new Date(now);
    from.setDate(now.getDate() - offset);
    return from.toISOString();
  }, [selectedPeriod]);

  const statusQuery = useQuery<N8nStatusResponse>({
    queryKey: ["n8n-status"],
    queryFn: getN8nStatus,
    staleTime: 60_000
  });

  const trafficQuery = useQuery<AdminSecurityTrafficResponse>({
    queryKey: ["admin-security-traffic", selectedPeriod],
    queryFn: () => getAdminSecurityTraffic(selectedPeriod),
    staleTime: 60_000
  });

  const databaseQuery = useQuery<AdminSecurityDatabaseResponse>({
    queryKey: ["admin-security-database", selectedPeriod],
    queryFn: () => getAdminSecurityDatabase(selectedPeriod),
    staleTime: 60_000
  });

  const runsQuery = useQuery<AutomationRun[]>({
    queryKey: ["automation-runs", selectedPeriod],
    queryFn: () => getAutomationRuns({ from: fromIso, limit: 40 }),
    staleTime: 30_000
  });

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      await Promise.all([
        statusQuery.refetch(),
        trafficQuery.refetch(),
        databaseQuery.refetch(),
        runsQuery.refetch()
      ]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const supabaseStatus: ServerStatusVariant = useMemo(() => {
    const gauges = databaseQuery.data?.gauges;
    if (!gauges) return "unknown";
    const statuses = [gauges.cpu?.status, gauges.memory?.status, gauges.disk?.status]
      .filter(Boolean)
      .map((status) => String(status).toLowerCase());
    if (statuses.some((status) => ["critical", "error"].includes(status))) {
      return "offline";
    }
    if (statuses.some((status) => status === "warning")) {
      return "degraded";
    }
    return "online";
  }, [databaseQuery.data]);

  const n8nStatus: ServerStatusVariant = useMemo(() => {
    const status = statusQuery.data?.health.status;
    if (!status) return "unknown";
    if (status === "healthy") return "online";
    if (status === "degraded") return "degraded";
    if (status === "error") return "offline";
    return "unknown";
  }, [statusQuery.data]);

  const serverCards = useMemo(
    () => [
      {
        id: "federated",
        name: "Federated MCP (N8N)",
        description: "Orquestração das automações MCP",
        status: n8nStatus,
        icon: Network,
        metrics: [
          {
            label: "Workflows ativos",
            value: statusQuery.data?.summary.active_workflows ?? "—"
          },
          {
            label: "Execuções 24h",
            value: statusQuery.data?.summary.executions_24h ?? "—"
          },
          {
            label: "Taxa sucesso",
            value: statusQuery.data
              ? `${Number(statusQuery.data.summary.success_rate ?? 0).toFixed(1)}%`
              : "—"
          }
        ],
        lastCheck: statusQuery.data?.health.last_check
      },
      {
        id: "supabase",
        name: "Supabase Infra",
        description: "Funções, banco e logs",
        status: supabaseStatus,
        icon: Database,
        metrics: [
          {
            label: "CPU",
            value: databaseQuery.data?.gauges.cpu.value
              ? `${databaseQuery.data.gauges.cpu.value}%`
              : "—"
          },
          {
            label: "Memória",
            value: databaseQuery.data?.gauges.memory.value
              ? `${databaseQuery.data.gauges.memory.value}%`
              : "—"
          },
          {
            label: "Disco",
            value: databaseQuery.data?.gauges.disk.value
              ? `${databaseQuery.data.gauges.disk.value}%`
              : "—"
          }
        ],
        lastCheck: databaseQuery.data?.time_series?.[0]?.timestamp
      }
    ],
    [databaseQuery.data, n8nStatus, statusQuery.data, supabaseStatus]
  );

  const usageSummary = useMemo(() => {
    const hourly = trafficQuery.data?.hourly ?? [];
    const aggregated = new Map<
      string,
      { function_name: string; requests: number; error_count: number; latency_acc: number; samples: number }
    >();

    hourly.forEach((point) => {
      const current = aggregated.get(point.function_name) ?? {
        function_name: point.function_name,
        requests: 0,
        error_count: 0,
        latency_acc: 0,
        samples: 0
      };
      current.requests += point.request_count;
      current.error_count += point.error_count;
      current.latency_acc += point.avg_latency_ms;
      current.samples += 1;
      aggregated.set(point.function_name, current);
    });

    return Array.from(aggregated.values())
      .map((entry) => ({
        function_name: entry.function_name,
        requests: entry.requests,
        errorRate: entry.requests > 0 ? (entry.error_count / entry.requests) * 100 : 0,
        avgLatency: entry.samples > 0 ? entry.latency_acc / entry.samples : 0
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 8);
  }, [trafficQuery.data]);

  const automationRuns = runsQuery.data ?? [];

  const hasAnyError = statusQuery.isError || trafficQuery.isError || databaseQuery.isError || runsQuery.isError;

  return (
    <div className="space-y-8 p-8">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">MCP Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Saúde da federação, consumo das funções e logs recentes para diagnóstico rápido.
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Select value={selectedPeriod} onValueChange={(value) => setSelectedPeriod(value as PeriodKey)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periodOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing || statusQuery.isLoading || trafficQuery.isLoading || databaseQuery.isLoading}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {isRefreshing ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>
      </div>

      {hasAnyError && (
        <Alert variant="destructive" className="border-destructive/40 bg-destructive/10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar todos os dados no momento. Tente novamente ou valide as credenciais no Supabase.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full max-w-xl grid-cols-3">
          <TabsTrigger value="overview">Saúde</TabsTrigger>
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {serverCards.map((server) => (
              <Card key={server.id} className="border-border/70 bg-[#10121b]/80 backdrop-blur">
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div>
                    <CardTitle className="text-base font-medium">{server.name}</CardTitle>
                    <CardDescription>{server.description}</CardDescription>
                  </div>
                  <Badge className={statusBadgeClass(server.status)}>{statusLabel(server.status)}</Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {server.metrics.map((metric) => (
                      <div key={metric.label} className="rounded-md border border-border/60 bg-background/40 p-3">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                        <p className="text-lg font-semibold text-foreground">{metric.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <server.icon className="h-4 w-4 opacity-60" />
                      <span>Monitorado pelo Supabase Functions</span>
                    </div>
                    <span>
                      {server.lastCheck
                        ? `Atualizado ${formatDistanceToNow(new Date(server.lastCheck), {
                            addSuffix: true,
                            locale: ptBR
                          })}`
                        : "Sem registro"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/70 bg-[#10121b]/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle className="text-base font-medium">Links rápidos</CardTitle>
                <CardDescription>Diagnóstico e ajustes nos módulos MCP críticos</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group flex flex-col justify-between rounded-lg border border-border/60 bg-background/40 p-4 transition hover:border-primary/60 hover:bg-primary/5"
                >
                  <div>
                    <p className="font-medium text-foreground">{link.label}</p>
                    <p className="text-xs text-muted-foreground">{link.description}</p>
                  </div>
                  <span className="mt-4 flex items-center text-xs font-medium text-primary">
                    Abrir módulo
                    <ArrowUpRight className="ml-1 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="mt-6 space-y-6">
          <Card className="border-border/70 bg-[#10121b]/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">Uso das funções (Supabase Functions)</CardTitle>
                <CardDescription>Consolidado no período selecionado</CardDescription>
              </div>
              <Badge variant="outline">
                {trafficQuery.data?.totals.requests ?? 0} requisições •{" "}
                {trafficQuery.data?.totals.error_rate ?? 0}% erros
              </Badge>
            </CardHeader>
            <CardContent>
              {trafficQuery.isLoading ? (
                <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  Carregando métricas de tráfego...
                </div>
              ) : usageSummary.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  Nenhum dado disponível para o período selecionado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Função</TableHead>
                      <TableHead className="text-right">Requisições</TableHead>
                      <TableHead className="text-right">Erro (%)</TableHead>
                      <TableHead className="text-right">Latência média (ms)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageSummary.map((row) => (
                      <TableRow key={row.function_name}>
                        <TableCell className="font-medium">{row.function_name}</TableCell>
                        <TableCell className="text-right">{row.requests}</TableCell>
                        <TableCell className="text-right">
                          {row.errorRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right">
                          {row.avgLatency.toFixed(0)} ms
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="mt-6 space-y-6">
          <Card className="border-border/70 bg-[#10121b]/80 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base font-medium">Execuções recentes (automation_runs)</CardTitle>
                <CardDescription>Últimos 40 registros filtrados pelo período selecionado</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {runsQuery.isLoading ? (
                <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  Carregando logs de automação...
                </div>
              ) : automationRuns.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border/50 p-6 text-center text-sm text-muted-foreground">
                  Nenhuma execução registrada no período.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Início</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead className="w-1/3">Mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {automationRuns.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="font-medium">{run.workflow_name}</TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClass(runStatusVariant(run.status))}>
                            {runStatusLabel(run.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(run.started_at).toLocaleString("pt-BR")}
                        </TableCell>
                        <TableCell>{formatDuration(run)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {run.erro ? truncate(run.erro, 120) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const quickLinks = [
  {
    label: "WhatsApp",
    description: "Status dos clientes e templates",
    href: "/admin/clientes-whatsapp"
  },
  {
    label: "Alertas",
    description: "Investigar alertas financeiros recentes",
    href: "/alertas/dashboard"
  },
  {
    label: "Tokens",
    description: "Gerenciar tokens de onboarding e admin",
    href: "/admin/tokens"
  }
];

function statusBadgeClass(status: ServerStatusVariant) {
  switch (status) {
    case "online":
      return "border-emerald-500/30 bg-emerald-500/10 text-emerald-300";
    case "degraded":
      return "border-amber-500/30 bg-amber-500/10 text-amber-300";
    case "offline":
      return "border-red-500/30 bg-red-500/10 text-red-300";
    default:
      return "border-border/50 bg-background/40 text-muted-foreground";
  }
}

function statusLabel(status: ServerStatusVariant) {
  switch (status) {
    case "online":
      return "Online";
    case "degraded":
      return "Degradado";
    case "offline":
      return "Offline";
    default:
      return "Indefinido";
  }
}

function runStatusVariant(status: AutomationRun["status"]): ServerStatusVariant {
  const normalized = String(status).toLowerCase();
  if (["success", "ok", "completed"].includes(normalized)) return "online";
  if (["partial", "running"].includes(normalized)) return "degraded";
  if (["failed", "error", "timeout"].includes(normalized)) return "offline";
  return "unknown";
}

function runStatusLabel(status: AutomationRun["status"]) {
  const normalized = String(status).toLowerCase();
  if (normalized === "success") return "Sucesso";
  if (normalized === "failed") return "Falha";
  if (normalized === "running") return "Em execução";
  if (normalized === "partial") return "Parcial";
  return status;
}

function formatDuration(run: AutomationRun) {
  if (typeof run.latencia_ms === "number" && run.latencia_ms > 0) {
    return `${(run.latencia_ms / 1000).toFixed(1)}s`;
  }
  if (run.ended_at) {
    const end = new Date(run.ended_at).getTime();
    const start = new Date(run.started_at).getTime();
    if (end > start) {
      return `${((end - start) / 1000).toFixed(1)}s`;
    }
  }
  return "—";
}

function truncate(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}…`;
}