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

"use client";

// Endpoints utilizados:
// - GET /mcp/status
// - GET /health-check
// - GET /alerts-summary
// - GET /mcp/deployments

import { useMemo, useState } from "react";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  Network,
  RefreshCw,
  AlertTriangle,
  Database,
  CloudLightning,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  getMcpStatus,
  getMcpHealth,
  getMcpAlertsSummary,
  getMcpDeployments,
  type McpStatusResponse,
  type McpServiceStatus,
  type McpAlertsSummaryResponse,
  type McpDeploymentsResponse,
  type McpHealthResponse
} from "@/lib/api";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const environments = [
  { value: "prod", label: "Produção" },
  { value: "staging", label: "Staging" }
] as const;

const periods = [
  { value: "24h", label: "Últimas 24h" },
  { value: "7d", label: "Últimos 7 dias" }
] as const;

type EnvironmentValue = (typeof environments)[number]["value"];

export default function McpDashboardPage() {
  const [environment, setEnvironment] = useState<EnvironmentValue>("prod");
  const [period, setPeriod] = useState<(typeof periods)[number]["value"]>("24h");

  const statusQuery = useQuery<McpStatusResponse>({
    queryKey: ["mcp", "status", environment, period],
    queryFn: () => getMcpStatus({ environment, period }),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const healthQuery = useQuery<McpHealthResponse>({
    queryKey: ["mcp", "health", environment],
    queryFn: () => getMcpHealth({ environment }),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const alertsQuery = useQuery<McpAlertsSummaryResponse>({
    queryKey: ["mcp", "alerts", environment],
    queryFn: () => getMcpAlertsSummary({ environment, limit: 5 }),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const deploymentsQuery = useQuery<McpDeploymentsResponse>({
    queryKey: ["mcp", "deployments", environment],
    queryFn: () => getMcpDeployments({ environment, limit: 5 }),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false
  });

  const serviceChartData = useMemo(() => buildServiceChart(statusQuery.data), [statusQuery.data]);

  const installSummary = useMemo(() => {
    const services = statusQuery.data?.services ?? [];
    const total = services.length;
    const installed = services.filter((service) => service.installed !== false).length;
    const pending = total - installed;
    const vendors = Array.from(new Set(services.map((service) => service.vendor).filter(Boolean)));
    return { total, installed, pending, vendors };
  }, [statusQuery.data?.services]);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            <Network className="h-8 w-8 text-primary" />
            MCP Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitore Supabase, Edge Functions, integrações e alertas críticos sem derrubar o painel quando um card falha.
          </p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Select value={environment} onValueChange={(value) => setEnvironment(value as EnvironmentValue)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ambiente" />
            </SelectTrigger>
            <SelectContent>
              {environments.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={period} onValueChange={(value) => setPeriod(value as (typeof periods)[number]["value"])}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {periods.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              void statusQuery.refetch();
              void healthQuery.refetch();
              void alertsQuery.refetch();
              void deploymentsQuery.refetch();
            }}
            disabled={statusQuery.isFetching || healthQuery.isFetching || alertsQuery.isFetching || deploymentsQuery.isFetching}
          >
            <RefreshCw className={`h-4 w-4 ${statusQuery.isFetching || healthQuery.isFetching || alertsQuery.isFetching || deploymentsQuery.isFetching ? "animate-spin" : ""}`} />
            Atualizar tudo
          </Button>
        </div>
      </header>

      {statusQuery.isLoading ? (
        <SkeletonCard />
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Panorama de Instalação</CardTitle>
              <CardDescription>
                MCP servers provisionados por ambiente ({environment === "prod" ? "Produção" : "Staging"}).
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              <Badge variant="default" className="gap-1">
                {installSummary.installed} instalados
              </Badge>
              <Badge variant={installSummary.pending > 0 ? "warning" : "outline"} className="gap-1">
                {installSummary.pending} pendentes
              </Badge>
              <Badge variant="outline" className="gap-1">
                {installSummary.total} total
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              Fornecedores: {installSummary.vendors.length > 0 ? installSummary.vendors.join(", ") : "—"}
            </p>
            <p className="text-muted-foreground">
              Última atualização:{" "}
              {statusQuery.data?.updated_at
                ? new Date(statusQuery.data.updated_at).toLocaleString("pt-BR")
                : "—"}
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <StatusCard title="Supabase Infra" icon={<Database className="h-5 w-5" />} serviceId="supabase" statusQuery={statusQuery} healthQuery={healthQuery} />
        <StatusCard title="Edge Functions" icon={<CloudLightning className="h-5 w-5" />} serviceId="edge-functions" statusQuery={statusQuery} healthQuery={healthQuery} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Latência vs. Erros</CardTitle>
          <CardDescription>Visão comparativa por serviço monitorado para o recorte selecionado.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          {statusQuery.isLoading ? (
            <SkeletonChart />
          ) : statusQuery.isError || !serviceChartData.length ? (
            <ErrorInline message="Sem dados para gerar o gráfico de latência." />
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={serviceChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} label={{ value: "ms", angle: -90, position: "insideLeft" }} />
                <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} label={{ value: "% erro", angle: -90, position: "insideRight" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                    fontSize: "12px"
                  }}
                />
                <Bar yAxisId="left" dataKey="latency" name="Latência (ms)" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Line yAxisId="right" type="monotone" dataKey="errorRate" name="Erro (%)" stroke="#ef4444" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <AlertsPanel alertsQuery={alertsQuery} />
        <DeploymentsPanel deploymentsQuery={deploymentsQuery} />
      </div>
    </div>
  );
}

function StatusCard({
  title,
  icon,
  serviceId,
  statusQuery,
  healthQuery
}: {
  title: string;
  icon: React.ReactNode;
  serviceId: string;
  statusQuery: UseQueryResult<McpStatusResponse>;
  healthQuery: UseQueryResult<McpHealthResponse>;
}) {
  if (statusQuery.isLoading || healthQuery.isLoading) {
    return <SkeletonCard />;
  }

  if (statusQuery.isError) {
    return (
      <Card className="border-destructive/40 bg-destructive/10">
        <CardHeader className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <div>
            <CardTitle className="text-base">{title}</CardTitle>
            <CardDescription>Não foi possível carregar este card. Os demais módulos permanecem ativos.</CardDescription>
          </div>
        </CardHeader>
      </Card>
    );
  }

  const service = statusQuery.data?.services.find((item) => item.id === serviceId) ?? statusQuery.data?.services[0];
  if (!service) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>Nenhuma informação disponível.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Verifique se o serviço está configurado no backend.</p>
        </CardContent>
      </Card>
    );
  }

  const trend = trendFromHealth(healthQuery.data?.state ?? service.state);
  const installed = service.installed !== false;
  const installedAt = service.installed_at
    ? new Date(service.installed_at).toLocaleString("pt-BR")
    : "Não instalado";

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div className="space-y-1">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
          <CardDescription>{service.detail ?? "Monitoramento contínuo das funções críticas."}</CardDescription>
        </div>
        <div className="flex flex-col items-end gap-2 text-right">
          <Badge variant={statusBadgeVariant(service.state)}>{statusLabel(service.state)}</Badge>
          <Badge variant={installed ? "default" : "outline"}>
            {installed ? "Instalado" : "Pendente"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Latência média</span>
          <span className="font-medium text-foreground">{service.latency_ms ? `${service.latency_ms.toFixed(0)} ms` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Erro (%)</span>
          <span className="font-medium text-foreground">{service.error_rate ? `${service.error_rate.toFixed(2)}%` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Fornecedor</span>
          <span className="font-medium text-foreground">{service.vendor ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Throughput</span>
          <span className="font-medium text-foreground">{service.throughput_per_minute ? `${service.throughput_per_minute.toFixed(1)}/min` : "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Mensagens 24h</span>
          <span className="font-medium text-foreground">{service.messages_24h?.toLocaleString("pt-BR") ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Versão</span>
          <span className="font-medium text-foreground">{service.version ?? "—"}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Instalado em</span>
          <span className="font-medium text-foreground">{installedAt}</span>
        </div>
        <TrendBadge direction={trend} />
      </CardContent>
    </Card>
  );
}

function AlertsPanel({ alertsQuery }: { alertsQuery: UseQueryResult<McpAlertsSummaryResponse> }) {
  if (alertsQuery.isLoading) {
    return <SkeletonCard />;
  }

  if (alertsQuery.isError) {
    return <ErrorInline message="Não foi possível carregar os alertas. Tente novamente mais tarde." />;
  }

  const alerts = alertsQuery.data?.alerts ?? [];

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <div>
          <CardTitle>Alertas críticos</CardTitle>
          <CardDescription>Últimos registros sinalizados pelo MCP.</CardDescription>
        </div>
        <Badge variant={alertsQuery.data?.critical_open ? "destructive" : "outline"}>
          {alertsQuery.data?.critical_open ?? 0} críticos abertos
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {alerts.length === 0 ? (
          <p className="text-muted-foreground">Sem alertas críticos nas últimas {alertsQuery.data?.total ?? 0} ocorrências.</p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="rounded-lg border border-border/50 bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{alert.title}</span>
                <Badge variant={severityVariant(alert.severity)}>{alert.severity.toUpperCase()}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {new Date(alert.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function DeploymentsPanel({ deploymentsQuery }: { deploymentsQuery: UseQueryResult<McpDeploymentsResponse> }) {
  if (deploymentsQuery.isLoading) {
    return <SkeletonCard />;
  }
  if (deploymentsQuery.isError) {
    return <ErrorInline message="Não foi possível carregar os deploys recentes." />;
  }
  const entries = deploymentsQuery.data?.entries ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deploys recentes</CardTitle>
        <CardDescription>Informações extraídas de DEPLOYMENT_VALIDATION.md / logs do ambiente.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Commit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(entry.started_at).toLocaleString("pt-BR")}
                </TableCell>
                <TableCell>
                  <Badge variant={deploymentBadgeVariant(entry.status)}>{deploymentStatusLabel(entry.status)}</Badge>
                </TableCell>
                <TableCell>{entry.author ?? "—"}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">{entry.commit ?? "—"}</TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum deploy registrado no período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function buildServiceChart(status?: McpStatusResponse) {
  if (!status?.services?.length) return [] as Array<{ name: string; latency: number; errorRate: number }>;
  return status.services.map((service) => ({
    name: service.name,
    latency: service.latency_ms ?? 0,
    errorRate: service.error_rate ?? 0
  }));
}

function statusBadgeVariant(state: McpServiceStatus["state"] | string) {
  const normalized = String(state).toLowerCase();
  if (["healthy", "online"].includes(normalized)) return "default";
  if (["warning", "degraded"].includes(normalized)) return "warning";
  return "destructive";
}

function statusLabel(state: McpServiceStatus["state"] | string) {
  const normalized = String(state).toLowerCase();
  if (["healthy", "online"].includes(normalized)) return "Online";
  if (["warning", "degraded"].includes(normalized)) return "Degradado";
  if (["critical", "offline", "error"].includes(normalized)) return "Offline";
  return "Indefinido";
}

function trendFromHealth(state?: string) {
  const normalized = state?.toLowerCase();
  if (normalized === "healthy" || normalized === "online") return "up";
  if (normalized === "warning" || normalized === "degraded") return "flat";
  return "down";
}

function TrendBadge({ direction }: { direction: "up" | "flat" | "down" }) {
  if (direction === "up") {
    return (
      <Badge variant="outline" className="gap-1 text-emerald-500">
        <ArrowUpRight className="h-3.5 w-3.5" /> Saudável
      </Badge>
    );
  }
  if (direction === "down") {
    return (
      <Badge variant="destructive" className="gap-1">
        <ArrowDownRight className="h-3.5 w-3.5" /> Crítico
      </Badge>
    );
  }
  return (
    <Badge variant="warning" className="gap-1 text-muted-foreground">
      <Minus className="h-3.5 w-3.5" /> Estável
    </Badge>
  );
}

function severityVariant(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized === "critical") return "destructive";
  if (normalized === "high") return "default";
  return "warning";
}

function deploymentStatusLabel(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "Sucesso";
  if (normalized === "running") return "Em execução";
  if (normalized === "failed") return "Falha";
  return status;
}

function deploymentBadgeVariant(status: string) {
  const normalized = status.toLowerCase();
  if (normalized === "success") return "default";
  if (normalized === "running") return "warning";
  if (normalized === "failed") return "destructive";
  return "outline";
}

function SkeletonCard() {
  return (
    <Card className="border-border/40 bg-muted/10">
      <CardHeader className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded bg-muted/50" />
        <div className="h-3 w-2/3 rounded bg-muted/30" />
      </CardHeader>
      <CardContent className="animate-pulse space-y-2">
        <div className="h-3 w-full rounded bg-muted/30" />
        <div className="h-3 w-5/6 rounded bg-muted/20" />
        <div className="h-3 w-4/6 rounded bg-muted/20" />
      </CardContent>
    </Card>
  );
}

function SkeletonChart() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="h-24 w-3/4 animate-pulse rounded bg-muted/20" />
    </div>
  );
}

function ErrorInline({ message }: { message: string }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4" />
        <span>{message}</span>
      </div>
    </div>
  );
}