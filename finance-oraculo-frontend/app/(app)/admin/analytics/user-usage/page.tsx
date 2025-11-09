"use client";

// Endpoints utilizados:
// - GET /analytics/user-usage
// - GET /targets (para nomes de alias, se necessário)
// - POST /analytics/user-usage/export (download CSV)

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Activity,
  MousePointerClick,
  Zap,
  RefreshCw,
  Download,
  AlertTriangle,
  ShieldCheck,
  Clock3,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchAnalyticsUserUsage,
  exportAnalyticsUserUsage,
  type AnalyticsUserUsageParams,
  type AnalyticsUserUsageResponse,
  type AnalyticsUsageTimelinePoint
} from "@/lib/api";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip
} from "recharts";

const roles = [
  { label: "Todos", value: "all" },
  { label: "Admin", value: "admin" },
  { label: "Executivo Financeiro", value: "executivo_financeiro" },
  { label: "Consultor", value: "consultor" },
  { label: "Operacional", value: "operacional" }
] as const;

type RoleOption = (typeof roles)[number]["value"];

const today = new Date();
const defaultFrom = new Date(today);
defaultFrom.setDate(today.getDate() - 29);

const toISO = (date: Date) => date.toISOString().slice(0, 10);

export default function UserUsagePage() {
  const router = useRouter();
  const [from, setFrom] = useState<string>(toISO(defaultFrom));
  const [to, setTo] = useState<string>(toISO(today));
  const [role, setRole] = useState<RoleOption>("all");
  const [isExporting, setIsExporting] = useState(false);

  const usageQuery = useQuery({
    queryKey: ["analytics", "user-usage", from, to, role],
    queryFn: () => fetchAnalyticsUserUsage(buildUsageParams({ from, to, role })),
    enabled: Boolean(from && to),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const summary = usageQuery.data?.summary;
  const timeline = useMemo(() => usageQuery.data?.timeline ?? [], [usageQuery.data?.timeline]);
  const users = usageQuery.data?.users ?? [];

  const chartData = useMemo(() => buildChartData(timeline), [timeline]);
  const topFeature = summary?.top_feature ?? "—";

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAnalyticsUserUsage(buildUsageParams({ from, to, role }));
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `user-usage_${from}_${to}.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[analytics/user-usage] export error", error);
      alert("Não foi possível exportar o CSV. Tente novamente mais tarde.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            <Users className="h-8 w-8 text-primary" />
            Uso do Sistema por Usuário
          </h1>
          <p className="text-sm text-muted-foreground">
            Entenda comportamentos, sessões e engajamento de cada perfil para direcionar novas ativações e treinamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Clock3 className="h-4 w-4" />
          Período analisado:
          <span className="font-medium text-foreground">{formatDate(from)} → {formatDate(to)}</span>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filtros e ações</CardTitle>
          <CardDescription>Selecione período e perfil para recalcular os indicadores de adoção.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-col gap-4 lg:flex-row lg:items-end">
              <DateField label="Data inicial" value={from} max={to} onChange={setFrom} />
              <DateField label="Data final" value={to} min={from} max={toISO(new Date())} onChange={setTo} />
              <SelectField label="Perfil" value={role} onValueChange={(value) => setRole(value as RoleOption)} options={roles} />
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => usageQuery.refetch()}
                disabled={usageQuery.isFetching}
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${usageQuery.isFetching ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
              <Button
                variant="default"
                className="w-full sm:w-auto"
                onClick={handleExport}
                disabled={isExporting || usageQuery.isLoading}
              >
                <Download className={`mr-2 h-4 w-4 ${isExporting ? "animate-pulse" : ""}`} />
                Exportar CSV
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Os filtros recalculam as métricas em tempo real. Exporte o recorte atual para compartilhar com o time.
          </p>
        </CardContent>
      </Card>

      {usageQuery.isLoading ? (
        <DashboardSkeleton />
      ) : usageQuery.isError ? (
        <ErrorState onRetry={() => usageQuery.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCards summary={summary} topFeature={topFeature} />
          <UsageChart data={chartData} />
          <UsersTable users={users} from={from} to={to} onNavigate={(id) => pushToDetail(router, id, from, to)} />
        </>
      )}
    </div>
  );
}

function buildUsageParams({ from, to, role }: { from: string; to: string; role: RoleOption }): AnalyticsUserUsageParams {
  return {
    from,
    to,
    role: role === "all" ? undefined : role
  };
}

function SummaryCards({ summary, topFeature }: { summary?: AnalyticsUserUsageResponse["summary"]; topFeature: string }) {
  const activeUsers = summary?.active_users ?? 0;
  const totalSessions = summary?.total_sessions ?? 0;
  const actionsPerMinute = summary?.actions_per_minute ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <MetricCard
        title="Usuários ativos"
        description="Contagem única no período"
        icon={<Users className="h-5 w-5 text-primary" />}
        value={activeUsers.toLocaleString("pt-BR")}
      />
      <MetricCard
        title="Total de sessões"
        description="Sessões registradas em todas as plataformas"
        icon={<Activity className="h-5 w-5 text-emerald-500" />}
        value={totalSessions.toLocaleString("pt-BR")}
      />
      <MetricCard
        title="Ações por minuto"
        description={`Feature destaque: ${topFeature}`}
        icon={<Zap className="h-5 w-5 text-amber-500" />}
        value={actionsPerMinute.toFixed(1)}
      />
    </div>
  );
}

function MetricCard({
  title,
  description,
  value,
  icon
}: {
  title: string;
  description: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <span>{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function UsageChart({ data }: { data: Array<{ date: string; sessions: number; actions: number }> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Uso diário</CardTitle>
        <CardDescription>Sessões e ações registradas por dia no período selecionado.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
            <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px"
              }}
            />
            <Bar dataKey="sessions" fill="#6366f1" name="Sessões" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actions" fill="#22c55e" name="Ações" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function UsersTable({
  users,
  from,
  to,
  onNavigate
}: {
  users: NonNullable<AnalyticsUserUsageResponse["users"]>;
  from: string;
  to: string;
  onNavigate: (userId: string) => void;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Detalhamento por usuário</CardTitle>
          <CardDescription>Navegue para o histórico completo incluindo timeline e alertas específicos.</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Último acesso</TableHead>
              <TableHead>Ações</TableHead>
              <TableHead>2FA</TableHead>
              <TableHead className="text-right">Detalhes</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.user_id} className="hover:bg-muted/40">
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{user.name ?? "Usuário sem nome"}</span>
                    <span className="text-xs text-muted-foreground">{user.email ?? "—"}</span>
                  </div>
                </TableCell>
                <TableCell>{user.role ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatDateTime(user.last_access_at)}</TableCell>
                <TableCell className="text-sm">
                  {user.total_actions?.toLocaleString("pt-BR") ?? "—"}
                  <span className="text-xs text-muted-foreground"> ações</span>
                </TableCell>
                <TableCell>
                  <Badge variant={user.two_factor_enabled ? "default" : "outline"} className="gap-1">
                    <ShieldCheck className="h-3 w-3" />
                    {user.two_factor_enabled ? "Ativo" : "Pendente"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 text-sm text-primary"
                    onClick={() => onNavigate(user.user_id)}
                  >
                    Ver detalhe
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard height={280} />
      <SkeletonCard height={320} />
    </div>
  );
}

function SkeletonCard({ height = 180 }: { height?: number }) {
  return (
    <div className="animate-pulse rounded-lg border border-border/40 bg-muted/10">
      <div className="space-y-3 p-6" style={{ minHeight: height }}>
        <div className="h-4 w-1/3 rounded bg-muted/40" />
        <div className="h-4 w-1/2 rounded bg-muted/20" />
        <div className="h-3 w-full rounded bg-muted/20" />
        <div className="h-3 w-5/6 rounded bg-muted/20" />
      </div>
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card className="border-destructive/40 bg-destructive/10">
      <CardContent className="flex flex-col gap-3 p-6 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Não foi possível carregar os dados de uso.</span>
        </div>
        <p className="text-xs text-destructive/80">Ajuste os filtros ou tente novamente. Os demais módulos permanecem disponíveis.</p>
        <Button variant="outline" size="sm" onClick={onRetry}>
          Tentar novamente
        </Button>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
        <MousePointerClick className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhum registro encontrado</p>
        <p className="text-xs text-muted-foreground">Altere os filtros para visualizar usuários ativos no período.</p>
      </CardContent>
    </Card>
  );
}

function DateField({ label, value, min, max, onChange }: { label: string; value: string; min?: string; max?: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <Input type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onValueChange,
  options
}: {
  label: string;
  value: T;
  onValueChange: (value: T) => void;
  options: ReadonlyArray<{ label: string; value: string }>;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={(val) => onValueChange(val as T)}>
        <SelectTrigger>
          <SelectValue placeholder="Selecionar" />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}

function buildChartData(timeline: AnalyticsUsageTimelinePoint[]) {
  return timeline.map((point) => ({
    date: formatDate(point.date),
    sessions: point.sessions ?? 0,
    actions: point.actions ?? 0
  }));
}

function pushToDetail(router: ReturnType<typeof useRouter>, userId: string, from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  router.push(`/admin/analytics/usage-detail/${userId}?${params.toString()}`);
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}


