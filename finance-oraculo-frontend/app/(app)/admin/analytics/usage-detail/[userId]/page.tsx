"use client";

// Endpoints utilizados:
// - GET /analytics/user-usage/{id}

import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ActivitySquare,
  Timer,
  Server,
  MessageCircle,
  ShieldCheck,
  Clock3,
  AlertTriangle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  fetchAnalyticsUserUsageDetail,
  type AnalyticsUserUsageDetailResponse,
  type AnalyticsUsageTimelinePoint,
  type AnalyticsUserEvent
} from "@/lib/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from "recharts";

const today = new Date();
const defaultFrom = new Date(today);
defaultFrom.setDate(today.getDate() - 29);

const toISO = (date: Date) => date.toISOString().slice(0, 10);

type RangeValue = "7d" | "30d" | "90d" | "custom";
type DetailSummary = AnalyticsUserUsageDetailResponse["summary"];

type AlertItem = NonNullable<AnalyticsUserUsageDetailResponse["alerts"]>[number];

type DetailRange = { from: string; to: string };

const ranges: Array<{ value: RangeValue; label: string }> = [
  { value: "7d", label: "7 dias" },
  { value: "30d", label: "30 dias" },
  { value: "90d", label: "90 dias" },
  { value: "custom", label: "Personalizado" }
];

export default function UsageDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const search = useSearchParams();
  const router = useRouter();

  const initialRange: DetailRange = {
    from: search.get("from") ?? toISO(defaultFrom),
    to: search.get("to") ?? toISO(today)
  };

  const [rangeType, setRangeType] = useState<RangeValue>((search.get("range") as RangeValue) ?? "30d");
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);

  const detailQuery = useQuery({
    queryKey: ["analytics", "user-usage-detail", userId, from, to],
    queryFn: () => fetchAnalyticsUserUsageDetail({ userId, from, to }),
    enabled: Boolean(userId && from && to),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });

  const summary = detailQuery.data?.summary;
  const timeline = useMemo(() => detailQuery.data?.timeline ?? [], [detailQuery.data?.timeline]);
  const events = detailQuery.data?.events ?? [];
  const alerts = detailQuery.data?.alerts ?? [];

  const chartData = useMemo(() => buildTimeline(timeline), [timeline]);

  const handleRangeChange = (value: RangeValue) => {
    setRangeType(value);
    if (value === "custom") return;
    const { from: newFrom, to: newTo } = computeRange(value);
    updateFilters(newFrom, newTo, value);
  };

  const updateFilters = (nextFrom: string, nextTo: string, currentRange = rangeType) => {
    setFrom(nextFrom);
    setTo(nextTo);
    const params = new URLSearchParams({ from: nextFrom, to: nextTo, range: currentRange });
    router.replace(`?${params.toString()}`);
    void detailQuery.refetch();
  };

  if (!userId) {
    return (
      <div className="container mx-auto space-y-4 p-6">
        <Button variant="ghost" className="gap-2 px-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <ErrorInline message="Usuário inválido. Informe um identificador válido." />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <Button variant="ghost" className="gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-3xl font-semibold">Detalhes de Uso</h1>
          <p className="text-sm text-muted-foreground">
            Analise engajamento, sessões e alertas vinculados ao usuário selecionado.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-end">
          <Select value={rangeType} onValueChange={(value) => handleRangeChange(value as RangeValue)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {ranges.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={from}
              max={to}
              disabled={rangeType !== "custom"}
              onChange={(event) => updateFilters(event.target.value, to, "custom")}
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={to}
              min={from}
              max={toISO(new Date())}
              disabled={rangeType !== "custom"}
              onChange={(event) => updateFilters(from, event.target.value, "custom")}
            />
          </div>
        </div>
      </header>

      {detailQuery.isLoading ? (
        <DashboardSkeleton />
      ) : detailQuery.isError ? (
        <ErrorInline message="Não foi possível carregar os detalhes. Tente novamente." />
      ) : !detailQuery.data ? (
        <EmptyState />
      ) : (
        <>
          <UserHeader summary={summary} user={detailQuery.data.user} />
          <DetailSummarySection summary={summary} timeline={chartData} />
          <EventsTable events={events} />
          <AlertsList alerts={alerts} />
        </>
      )}
    </div>
  );
}

function computeRange(option: Exclude<RangeValue, "custom">) {
  const now = new Date();
  const end = toISO(now);
  const start = new Date(now);
  const days = option === "7d" ? 6 : option === "30d" ? 29 : 89;
  start.setDate(now.getDate() - days);
  return { from: toISO(start), to: end };
}

function UserHeader({ summary, user }: { summary?: DetailSummary; user: AnalyticsUserUsageDetailResponse["user"] }) {
  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{user.name ?? user.email ?? user.user_id}</CardTitle>
          <CardDescription>{user.email ?? "E-mail não cadastrado"}</CardDescription>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Role: {user.role ?? "—"}</Badge>
            <Badge variant={user.two_factor_enabled ? "default" : "destructive"} className="gap-1">
              <ShieldCheck className="h-3 w-3" />
              {user.two_factor_enabled ? "2FA ativo" : "2FA pendente"}
            </Badge>
            <Badge variant="outline">Último login: {formatDateTime(user.last_login_at)}</Badge>
          </div>
        </div>
        {user.companies?.length ? (
          <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-xs">
            <p className="mb-1 font-semibold text-foreground">Empresas vinculadas</p>
            <ul className="space-y-1">
              {user.companies.map((company) => (
                <li key={company}>{company}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardHeader>
    </Card>
  );
}

function DetailSummarySection({ summary, timeline }: { summary?: DetailSummary; timeline: Array<{ label: string; sessions: number; api: number }> }) {
  const totalActions = summary?.total_actions ?? 0;
  const totalSessions = summary?.total_sessions ?? 0;
  const alertsOpen = summary?.alerts_open ?? 0;
  const moodScore = summary?.mood_score ?? null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <MetricCard
          title="Total de ações"
          description="Cliques, chamadas e eventos monitorados"
          icon={<ActivitySquare className="h-5 w-5 text-primary" />}
          value={totalActions.toLocaleString("pt-BR")}
        />
        <MetricCard
          title="Sessões registradas"
          description="Sessões únicas no período"
          icon={<Timer className="h-5 w-5 text-emerald-500" />}
          value={totalSessions.toLocaleString("pt-BR")}
        />
        <MetricCard
          title="Alertas ativos"
          description="Eventos críticos atribuídos"
          icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
          value={alertsOpen}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline de atividades</CardTitle>
          <CardDescription>Comparativo entre sessões e chamadas de API no período analisado.</CardDescription>
        </CardHeader>
        <CardContent className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timeline}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--background))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.5rem",
                  fontSize: "12px"
                }}
              />
              <Line type="monotone" dataKey="sessions" name="Sessões" stroke="#6366f1" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="api" name="Chamadas API" stroke="#22c55e" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {moodScore !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Humor estimado</CardTitle>
            <CardDescription>Score consolidado com base no comportamento recente.</CardDescription>
          </CardHeader>
          <CardContent>
            <Badge variant={moodScore > 0 ? "default" : "destructive"} className="gap-1 text-sm font-medium">
              <Server className="h-3.5 w-3.5" />
              {moodScore.toFixed(2)} pts
            </Badge>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EventsTable({ events }: { events: AnalyticsUserEvent[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Eventos recentes</CardTitle>
        <CardDescription>Sequência cronológica das ações monitoradas para o usuário.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Ação</TableHead>
              <TableHead>Resultado</TableHead>
              <TableHead>Contexto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.map((event) => (
              <TableRow key={event.id}>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatDateTime(event.timestamp)}
                </TableCell>
                <TableCell className="font-medium text-foreground">{event.action}</TableCell>
                <TableCell>{event.result ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{event.description ?? event.context ?? "—"}</TableCell>
              </TableRow>
            ))}
            {events.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nenhum evento registrado neste período.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AlertsList({ alerts }: { alerts: AnalyticsUserUsageDetailResponse["alerts"] }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Alertas vinculados ao usuário</CardTitle>
        <CardDescription>Registros críticos que demandam follow-up.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {alerts.map((raw) => {
          const alert = raw as AlertItem;
          const id = `${alert.date ?? ""}-${alert.event ?? "alert"}`;
          const timestamp = alert.date ?? null;
          const description = alert.comment ?? alert.impact ?? "Sem descrição";
          return (
            <div key={id} className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
              <p className="font-medium text-destructive">
                {timestamp ? formatDateTime(timestamp) : "Sem data"} • {alert.event ?? "Alerta"}
              </p>
              <p className="text-xs text-destructive/80">{description}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function MetricCard({ title, description, value, icon }: { title: string; description: string; value: string | number; icon: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard height={320} />
      <SkeletonCard height={220} />
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
        <div className="h-3 w-3/4 rounded bg-muted/20" />
      </div>
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

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="flex min-h-[220px] flex-col items-center justify-center gap-2 text-center">
        <MessageCircle className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Nenhuma atividade registrada</p>
        <p className="text-xs text-muted-foreground">Altere o período para visualizar as interações do usuário.</p>
      </CardContent>
    </Card>
  );
}

function buildTimeline(points: AnalyticsUsageTimelinePoint[]) {
  return points.map((point) => ({
    label: formatDate(point.date),
    sessions: point.sessions ?? 0,
    api: point.actions ?? 0
  }));
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}


