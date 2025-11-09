"use client";

import { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AreaChart } from "@tremor/react";
import { Activity, ArrowLeft, Clock, ListTree, Loader2, RefreshCw, TrendingUp, Zap } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MoodIndicator from "@/components/mood-indicator";
import {
  fetchAnalyticsUserUsageDetail,
  getUserUsageSessions,
  type AnalyticsUserEvent,
  type AnalyticsUserUsageDetailResponse,
  type UsageSession
} from "@/lib/api";

type TimeframeOption = "7d" | "30d" | "90d" | "custom";

interface DateRange {
  from: string;
  to: string;
}

const TIMEFRAME_LABELS: Record<Exclude<TimeframeOption, "custom">, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias"
};

function computeRange(option: Exclude<TimeframeOption, "custom">): DateRange {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  const days = option === "7d" ? 6 : option === "30d" ? 29 : 89;
  fromDate.setDate(now.getDate() - days);
  return { from: fromDate.toISOString().slice(0, 10), to };
}

function formatDate(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function valueFormatter(value: number) {
  return value.toLocaleString("pt-BR");
}

function buildTimelineData(detail?: AnalyticsUserUsageDetailResponse) {
  if (!detail) return [];
  return detail.timeline.map((point) => ({
    date: formatDate(point.date),
    "Sessões": point.sessions ?? 0,
    "Ações": point.actions ?? 0
  }));
}

function sessionDuration(minutes?: number | null, seconds?: number | null) {
  if (typeof minutes === "number" && !Number.isNaN(minutes) && minutes > 0) {
    return `${minutes.toFixed(1)} min`;
  }
  if (typeof seconds === "number" && !Number.isNaN(seconds) && seconds > 0) {
    const mins = seconds / 60;
    return `${mins.toFixed(1)} min`;
  }
  return "—";
}

export default function UsageDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  const userId = params?.userId;
  const defaultRange = computeRange("30d");

  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [customRange, setCustomRange] = useState<DateRange>(defaultRange);

  const activeRange = timeframe === "custom" ? customRange : computeRange(timeframe);

  const isRangeValid = useMemo(() => {
    if (!activeRange.from || !activeRange.to) return false;
    const fromDate = new Date(activeRange.from);
    const toDate = new Date(activeRange.to);
    return !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) && fromDate <= toDate;
  }, [activeRange.from, activeRange.to]);

  const detailQuery = useQuery({
    queryKey: ["analytics-user-usage-detail", userId, activeRange.from, activeRange.to],
    queryFn: () =>
      fetchAnalyticsUserUsageDetail({
        userId: userId ?? "",
        from: activeRange.from,
        to: activeRange.to
      }),
    enabled: Boolean(userId && isRangeValid)
  });

  const sessionsQuery = useQuery({
    queryKey: ["analytics-user-usage-sessions", userId, activeRange.from, activeRange.to],
    queryFn: () =>
      getUserUsageSessions({
        userId: userId ?? "",
        dateFrom: activeRange.from,
        dateTo: activeRange.to,
        order: "desc",
        limit: 100
      }),
    enabled: Boolean(userId && isRangeValid)
  });

  const detail = detailQuery.data;
  const summary = detail?.summary;
  const events: AnalyticsUserEvent[] = detail?.events ?? [];
  const sessions: UsageSession[] = sessionsQuery.data ?? [];
  const chartData = useMemo(() => buildTimelineData(detail), [detail]);

  const isLoading = detailQuery.isLoading || sessionsQuery.isLoading;
  const hasError = detailQuery.isError || sessionsQuery.isError;

  if (!userId) {
    return (
      <div className="container mx-auto p-6">
        <Alert variant="destructive">
          <AlertTitle>Usuário não informado</AlertTitle>
          <AlertDescription>Informe um identificador válido para visualizar os detalhes.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
            <TabsList>
              {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                <TabsTrigger key={value} value={value}>
                  {label}
                </TabsTrigger>
              ))}
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={activeRange.from}
              onChange={(event) => {
                setTimeframe("custom");
                setCustomRange((prev) => ({ ...prev, from: event.target.value }));
              }}
              max={activeRange.to}
              aria-label="Data inicial"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={activeRange.to}
              onChange={(event) => {
                setTimeframe("custom");
                setCustomRange((prev) => ({ ...prev, to: event.target.value }));
              })}
              min={activeRange.from}
              max={new Date().toISOString().slice(0, 10)}
              aria-label="Data final"
            />
          </div>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => {
              void detailQuery.refetch();
              void sessionsQuery.refetch();
            }}
            disabled={isLoading || !isRangeValid}
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
        </div>
      </div>

      {timeframe === "custom" && !isRangeValid ? (
        <Alert variant="destructive">
          <AlertTitle>Período inválido</AlertTitle>
          <AlertDescription>A data inicial deve ser anterior ou igual à data final.</AlertDescription>
        </Alert>
      ) : null}

      {hasError ? (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar o detalhamento</AlertTitle>
          <AlertDescription>
            Não foi possível obter os dados do usuário selecionado. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      ) : null}

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : detail ? (
        <>
          <div className="space-y-1">
            <h1 className="text-3xl font-bold">Detalhes de Uso</h1>
            <p className="text-muted-foreground">
              Usuário:{" "}
              <span className="font-medium">
                {detail.user.name || detail.user.email || detail.user.user_id}
              </span>{" "}
              • ID: <span className="font-mono text-sm">{detail.user.user_id}</span>
            </p>
            {detail.user.email ? (
              <p className="text-xs text-muted-foreground">Contato: {detail.user.email}</p>
            ) : null}
            {detail.metadata?.period ? (
              <p className="text-xs text-muted-foreground">
                Período consolidado: {formatDate(detail.metadata.period.from)} —{" "}
                {formatDate(detail.metadata.period.to)}
              </p>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total de ações</CardTitle>
                <CardDescription>Registros no período</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">
                  {(summary?.total_actions ?? 0).toLocaleString("pt-BR")}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ListTree className="h-4 w-4" />
                  Eventos monitorados gerados pela plataforma
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Sessões registradas</CardTitle>
                <CardDescription>Acessos autenticados</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">
                  {(summary?.total_sessions ?? 0).toLocaleString("pt-BR")}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Inclui sessões web e mobile
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Última atividade</CardTitle>
                <CardDescription>Horário do último evento</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <div className="text-2xl font-bold">{formatDateTime(summary?.last_activity_at)}</div>
                {detail.user.status ? (
                  <Badge variant="outline">{detail.user.status}</Badge>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Humor do usuário</CardTitle>
                <CardDescription>Sentimento médio recente</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <MoodIndicator score={summary?.mood_score ?? 0} />
                {summary?.mood_status ? (
                  <p className="text-xs text-muted-foreground">{summary.mood_status}</p>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Evolução de sessões e ações</CardTitle>
                <CardDescription>{formatDate(activeRange.from)} — {formatDate(activeRange.to)}</CardDescription>
              </div>
          <Badge variant="outline" className="gap-2">
            <TrendingUp className="h-3.5 w-3.5" />
            {summary?.total_sessions ?? 0} sessões
              </Badge>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <AreaChart
                  className="h-64"
                  data={chartData}
                  index="date"
                  categories={["Sessões", "Ações"]}
                  colors={["indigo", "emerald"]}
                  valueFormatter={valueFormatter}
                />
              ) : (
                <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                  <p className="text-sm text-muted-foreground">Sem dados suficientes para exibir o gráfico.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Eventos recentes</CardTitle>
              <CardDescription>Principais ações registradas para auditoria</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Contexto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Nenhum evento registrado para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    events.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>{formatDateTime(event.timestamp)}</TableCell>
                        <TableCell>
                          <div className="font-medium">{event.action}</div>
                          {event.description ? (
                            <p className="text-xs text-muted-foreground">{event.description}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          {event.result ? (
                            <Badge variant={event.result === "success" ? "default" : "destructive"}>
                              {event.result}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="max-w-sm text-sm text-muted-foreground">
                          {event.context ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sessões recentes</CardTitle>
              <CardDescription>Histórico de acessos autenticados</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Término</TableHead>
                    <TableHead>Duração</TableHead>
                    <TableHead>API calls</TableHead>
                    <TableHead>LLM</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Empresas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                        Nenhuma sessão encontrada para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sessions.map((session) => {
                      const whatsappTotal =
                        ("whatsapp_messages_sent" in session
                          ? Number((session as Record<string, unknown>).whatsapp_messages_sent) || 0
                          : 0) +
                        ("whatsapp_messages_received" in session
                          ? Number((session as Record<string, unknown>).whatsapp_messages_received) || 0
                          : 0);
                      const llmInteractions =
                        "llm_interactions_count" in session
                          ? Number((session as Record<string, unknown>).llm_interactions_count) || 0
                          : 0;
                      const durationMinutes =
                        typeof session.session_duration_seconds === "number"
                          ? session.session_duration_seconds / 60
                          : undefined;
                      return (
                        <TableRow key={session.id}>
                          <TableCell>{formatDateTime(session.session_start)}</TableCell>
                          <TableCell>{formatDateTime(session.session_end)}</TableCell>
                          <TableCell>
                            {sessionDuration(durationMinutes, session.session_duration_seconds ?? undefined)}
                          </TableCell>
                          <TableCell>{session.api_calls_count ?? 0}</TableCell>
                          <TableCell>{llmInteractions}</TableCell>
                          <TableCell>{whatsappTotal}</TableCell>
                          <TableCell>{session.company_cnpj ?? "—"}</TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {detail.alerts && detail.alerts.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Alertas e recomendações</CardTitle>
                <CardDescription>Insights sobre humor e performance do usuário</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {detail.alerts.map((alert) => (
                  <div
                    key={`${alert.date}-${alert.event}`}
                    className="flex items-start justify-between rounded-lg border border-border/60 bg-secondary/20 p-3"
                  >
                    <div>
                      <p className="font-medium">{alert.event}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(alert.date)} • {alert.comment ?? "Sem descrição adicional"}
                      </p>
                    </div>
                    <Badge variant={alert.severity === "high" ? "destructive" : "outline"}>
                      <Zap className="mr-1 h-3.5 w-3.5" />
                      {alert.severity ?? "info"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ActivitySquare, Timer, Server, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TimelineChart from "@/components/timeline-chart";
import {
  getUsageAnalytics,
  type UsageActivityType,
  type UsageAnalyticsResponse
} from "@/lib/api";

const TIMEFRAME_OPTIONS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90
};

const ACTIVITY_OPTIONS: Array<{ value: string; label: string; activity?: UsageActivityType }> = [
  { value: "all", label: "Tudo" },
  { value: "pages", label: "Páginas navegadas", activity: "pages" },
  { value: "api_calls", label: "Chamadas API", activity: "api_calls" },
  { value: "llm", label: "Interações LLM", activity: "llm" },
  { value: "whatsapp", label: "Mensagens WhatsApp", activity: "whatsapp" }
];

function formatISO(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function subtractDays(days: number): string {
  const base = new Date();
  base.setDate(base.getDate() - (days - 1));
  return formatISO(base);
}

function formatDayLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function getUserLabel(entry: UsageAnalyticsResponse["usage_details"][number]): string {
  if (entry.full_name) return entry.full_name;
  if (entry.email) return entry.email;
  return entry.user_id;
}

export default function UsageDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [dateFrom, setDateFrom] = useState<string>(subtractDays(TIMEFRAME_OPTIONS["30d"]));
  const [dateTo, setDateTo] = useState<string>(formatISO(new Date()));
  const [activity, setActivity] = useState<string>("all");
  const [data, setData] = useState<UsageAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const days = TIMEFRAME_OPTIONS[timeframe] ?? TIMEFRAME_OPTIONS["30d"];
    setDateFrom(subtractDays(days));
    setDateTo(formatISO(new Date()));
  }, [timeframe]);

  useEffect(() => {
    if (!params?.userId) return;
    let mounted = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await getUsageAnalytics({
          userId: params.userId,
          dateFrom,
          dateTo,
          activityType: activity === "all" ? undefined : (activity as UsageActivityType)
        });
        if (!mounted) return;
        setData(response);
      } catch (err) {
        console.error("[usage-detail] error loading data", err);
        if (mounted) {
          setError("Não foi possível carregar os detalhes de uso.");
          setData(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [params?.userId, dateFrom, dateTo, activity]);

  const detail = data?.usage_details?.[0];

  const whatsappTotal =
    (detail?.whatsapp_sent ?? 0) + (detail?.whatsapp_received ?? 0);

  const trendDirection = useMemo(() => {
    const timeline = data?.timeline ?? [];
    if (timeline.length < 2) return "stable";
    const first = timeline[0]?.sessions ?? 0;
    const last = timeline[timeline.length - 1]?.sessions ?? 0;
    const delta = last - first;
    if (Math.abs(delta) < 1) return "stable";
    return delta > 0 ? "up" : "down";
  }, [data]);

  const timelineData = useMemo(() => {
    return (data?.timeline ?? []).map((point) => ({
      label: formatDayLabel(point.date),
      value: point.sessions ?? 0,
      secondaryValue: point.api_calls ?? 0
    }));
  }, [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Button variant="ghost" className="gap-2 px-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <Alert variant="destructive">
          <AlertTitle>Sem dados disponíveis</AlertTitle>
          <AlertDescription>{error ?? "Nenhuma atividade encontrada para este usuário no período selecionado."}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const trendBadge =
    trendDirection === "up" ? "default" : trendDirection === "down" ? "destructive" : "outline";
  const trendLabel =
    trendDirection === "up" ? "Uso em alta" : trendDirection === "down" ? "Uso em queda" : "Uso estável";

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0 text-sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-3xl font-bold">Detalhes de Uso</h1>
          <p className="text-muted-foreground">
            Usuário: <span className="font-mono">{getUserLabel(detail)}</span>
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 dias</SelectItem>
              <SelectItem value="30d">30 dias</SelectItem>
              <SelectItem value="90d">90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activity} onValueChange={setActivity}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Atividade" />
            </SelectTrigger>
            <SelectContent>
              {ACTIVITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            aria-label="Data inicial"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateTo}
            max={formatISO(new Date())}
            onChange={(event) => setDateTo(event.target.value)}
            aria-label="Data final"
          />
        </div>
      </div>

      <Alert>
        <AlertTitle>Resumo rápido</AlertTitle>
        <AlertDescription className="flex flex-wrap gap-4 pt-2 text-sm">
          <span>Sessões: <strong>{detail.sessions}</strong></span>
          <span>Tempo total: <strong>{(detail.total_time_minutes / 60).toFixed(1)} h</strong></span>
          <span>API calls: <strong>{detail.api_calls}</strong></span>
          <span>Interações LLM: <strong>{detail.llm_interactions}</strong></span>
          <span>WhatsApp: <strong>{whatsappTotal}</strong></span>
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Sessões</CardTitle>
            <CardDescription>Período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{detail.sessions ?? 0}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tempo total</CardTitle>
            <CardDescription>Soma das sessões</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {(detail.total_time_minutes / 60).toFixed(1)}
            <span className="text-base font-medium text-muted-foreground">h</span>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chamadas API</CardTitle>
            <CardDescription>Sucesso + falha</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{detail.api_calls ?? 0}</CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">WhatsApp</CardTitle>
            <CardDescription>Enviadas + recebidas</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{whatsappTotal}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Resumo geral</CardTitle>
            <CardDescription>Engajamento do usuário no período</CardDescription>
          </div>
          <Badge
            variant={
              trendDirection === "up"
                ? "default"
                : trendDirection === "down"
                  ? "destructive"
                  : "outline"
            }
          >
            {trendLabel}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Páginas únicas</p>
            <p className="text-lg font-semibold">{(detail.pages_visited ?? []).length}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Média por sessão</p>
            <p className="text-lg font-semibold">
              {detail.avg_session_minutes ?? 0}
              <span className="text-xs font-medium text-muted-foreground"> min</span>
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Tokens LLM</p>
            <p className="text-lg font-semibold">{detail.llm_tokens ?? 0}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs uppercase text-muted-foreground">Interações LLM</p>
            <p className="text-lg font-semibold">{detail.llm_interactions ?? 0}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Timeline de sessões vs API</CardTitle>
          <CardDescription>Evolução diária de sessões e chamadas API</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={timelineData}
            valueFormatter={(value) => `${value} sessões`}
            labelFormatter={(label) => label}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Páginas mais acessadas</CardTitle>
            <CardDescription>Principais destinos no período</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(detail.top_pages ?? []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma página registrada.</p>
            ) : (
              detail.top_pages?.map((page) => (
                <Badge key={page.page} variant="outline">
                  {page.page} ({page.visits})
                </Badge>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo WhatsApp</CardTitle>
            <CardDescription>Mensagens enviadas e recebidas</CardDescription>
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TimelineChart from "@/components/timeline-chart";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Timer, Server, ActivitySquare, MousePointerClick } from "lucide-react";
import {
  getUsageDetails,
  getUserUsageSessions,
  type UsageDetailsResponse,
  type UsageTimelineEntry,
  type UsageSessionRecord
} from "@/lib/api";

type Timeframe = "7d" | "30d" | "90d";

function computeRange(timeframe: Timeframe) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(now);
  const days = timeframe === "7d" ? 6 : timeframe === "30d" ? 29 : 89;
  start.setDate(start.getDate() - days);
  const from = start.toISOString().slice(0, 10);
  return { from, to };
}

function formatMinutes(minutes: number) {
  if (!Number.isFinite(minutes)) return "0 min";
  if (minutes < 60) return `${minutes.toFixed(0)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}

export default function UsageDetailPage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const userId = params?.userId;
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const { from: dateFrom, to: dateTo } = useMemo(() => computeRange(timeframe), [timeframe]);

  const usageQuery = useQuery<UsageDetailsResponse>({
    queryKey: ["usage-detail", userId, dateFrom, dateTo],
    queryFn: () => getUsageDetails({ userId, dateFrom, dateTo }),
    enabled: Boolean(userId)
  });

  const sessionsQuery = useQuery<UsageSessionRecord[]>({
    queryKey: ["usage-sessions", userId, dateFrom, dateTo],
    queryFn: () => getUserUsageSessions(userId!, { dateFrom, dateTo, limit: 50 }),
    enabled: Boolean(userId)
  });

  const userStats = usageQuery.data?.usage_details?.[0];
  const timeline: UsageTimelineEntry[] = usageQuery.data?.timeline ?? [];
  const sessions = sessionsQuery.data ?? [];

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (sessions.length > 0) {
      setSelectedSessionId((current) => current ?? sessions[0].id);
    } else {
      setSelectedSessionId(null);
    }
  }, [sessions]);

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === selectedSessionId) ?? null,
    [sessions, selectedSessionId]
  );

  const totals = useMemo(() => {
    if (!userStats) {
      return { minutes: 0, apiCalls: 0, whatsapp: 0 };
    }
    return {
      minutes: userStats.total_time_minutes ?? 0,
      apiCalls: userStats.api_calls ?? 0,
      whatsapp: (userStats.whatsapp_sent ?? 0) + (userStats.whatsapp_received ?? 0)
    };
  }, [userStats]);

  const chartData = useMemo(
    () =>
      timeline.map((point) => ({
        label: new Date(point.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        value: point.sessions ?? 0
      })),
    [timeline]
  );

  const isLoading = usageQuery.isLoading || sessionsQuery.isLoading;
  const hasError = usageQuery.isError || sessionsQuery.isError;

  if (!userId) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        Usuário não encontrado.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="container mx-auto space-y-4 p-6">
        <Button variant="ghost" className="gap-2 px-0" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="p-6 text-sm text-destructive-foreground">
            Não foi possível carregar o detalhamento de uso. Tente novamente mais tarde.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <Button variant="ghost" className="mb-2 gap-2 px-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <h1 className="text-3xl font-bold">Detalhes de Uso</h1>
          <p className="text-muted-foreground">
            Usuário: <span className="font-mono">{userStats?.email || userStats?.full_name || userId}</span>
          </p>
        </div>
        <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
          <TabsList>
            <TabsTrigger value="7d">7 dias</TabsTrigger>
            <TabsTrigger value="30d">30 dias</TabsTrigger>
            <TabsTrigger value="90d">90 dias</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Duração total</CardTitle>
            <CardDescription>Somatório das sessões</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-semibold">{formatMinutes(totals.minutes)}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Chamadas API</CardTitle>
            <CardDescription>No período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <Server className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-semibold">{totals.apiCalls}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mensagens WhatsApp</CardTitle>
            <CardDescription>Enviadas e recebidas</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <ActivitySquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-2xl font-semibold">{totals.whatsapp}</span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timeline de sessões</CardTitle>
          <CardDescription>
            {new Date(dateFrom).toLocaleDateString("pt-BR")} — {new Date(dateTo).toLocaleDateString("pt-BR")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={chartData}
            variant="area"
            valueFormatter={(value) => `${value} sessões`}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Sessões recentes</CardTitle>
            <CardDescription>Selecione para ver detalhes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma sessão registrada para o período selecionado.
              </p>
            ) : (
              sessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-primary ${
                    session.id === selectedSessionId ? "border-primary bg-primary/5" : "border-border/60"
                  }`}
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">
                      {new Date(session.session_start).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short"
                      })}{" "}
                      {new Date(session.session_start).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </span>
                    <Badge variant="outline">
                      {Math.round((session.session_duration_seconds ?? 0) / 60)} min
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {session.pages_visited?.slice(0, 3).join(", ") || "Sem páginas registradas"}
                    {session.pages_visited && session.pages_visited.length > 3 ? "…" : ""}
                  </div>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Detalhes da sessão</CardTitle>
            <CardDescription>
              {activeSession
                ? `${new Date(activeSession.session_start).toLocaleString("pt-BR")} — ${
                    activeSession.session_end
                      ? new Date(activeSession.session_end).toLocaleTimeString("pt-BR")
                      : "em aberto"
                  }`
                : "Selecione uma sessão para visualizar o resumo."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            {activeSession ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-muted-foreground">Duração</p>
                    <p className="text-xl font-semibold">
                      {Math.round((activeSession.session_duration_seconds ?? 0) / 60)} min
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Chamadas API</p>
                    <p className="text-xl font-semibold">
                      {activeSession.api_calls_count ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Sucesso</p>
                    <p className="text-xl font-semibold text-emerald-500">
                      {activeSession.successful_calls ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Falhas</p>
                    <p className="text-xl font-semibold text-red-500">
                      {activeSession.failed_calls ?? 0}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">Páginas visitadas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeSession.pages_visited?.length ? (
                      activeSession.pages_visited.map((page) => (
                        <Badge key={page} variant="outline">
                          {page}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum registro</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs uppercase text-muted-foreground">Features utilizadas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {activeSession.features_used?.length ? (
                      activeSession.features_used.map((feature) => (
                        <Badge key={feature} variant="outline">
                          {feature}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">Nenhum registro</span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Selecione uma sessão para visualizar detalhes.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {activeSession ? (
        <Card>
          <CardHeader>
            <CardTitle>Eventos e chamadas API</CardTitle>
            <CardDescription>Resumo da sessão selecionada</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tempo</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>Latência média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>
                    {new Date(activeSession.session_start).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </TableCell>
                  <TableCell className="flex items-center gap-2">
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                    Login
                  </TableCell>
                  <TableCell>Início da sessão</TableCell>
                  <TableCell>-</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>≈ sessão</TableCell>
                  <TableCell>
                    <Server className="mr-2 inline h-4 w-4 text-muted-foreground" />
                    Chamadas API
                  </TableCell>
                  <TableCell>
                    {(activeSession.successful_calls ?? 0).toLocaleString("pt-BR")} sucesso / {(activeSession.failed_calls ?? 0).toLocaleString("pt-BR")} falha
                  </TableCell>
                  <TableCell>{Math.round(activeSession.avg_duration_ms ?? 0)} ms</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
