"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AreaChart, BarList } from "@tremor/react";
import {
  Activity,
  Clock,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  getUsageAnalytics,
  UsageActivityType,
  UsageAnalyticsTimelinePoint,
  UsageAnalyticsUser
} from "@/lib/api";

type TimeframeOption = "7d" | "30d" | "90d" | "custom";

interface DateRange {
  from: string;
  to: string;
}

interface UserOption {
  value: string;
  label: string;
}

const activityFilters: { value: UsageActivityType; label: string }[] = [
  { value: "all", label: "Todas as atividades" },
  { value: "pages", label: "Páginas visitadas" },
  { value: "api_calls", label: "Chamadas de API" },
  { value: "llm", label: "Interações LLM" },
  { value: "whatsapp", label: "Mensagens WhatsApp" }
];

function computeRange(option: Exclude<TimeframeOption, "custom">): DateRange {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const fromDate = new Date(now);
  const days = option === "7d" ? 6 : option === "30d" ? 29 : 89;
  fromDate.setDate(now.getDate() - days);
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

function formatDateLabel(value: string | undefined): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function formatUserLabel(user: UsageAnalyticsUser): string {
  if (user.full_name) return user.full_name;
  if (user.email) return user.email;
  return user.user_id.slice(0, 8);
}

export default function UserUsagePage() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [dateRange, setDateRange] = useState<DateRange>(() => computeRange("30d"));
  const [activityFilter, setActivityFilter] = useState<UsageActivityType>("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [availableUsers, setAvailableUsers] = useState<UserOption[]>([]);

  const [usageData, setUsageData] = useState<UsageAnalyticsUser[]>([]);
  const [timeline, setTimeline] = useState<UsageAnalyticsTimelinePoint[]>([]);
  const [period, setPeriod] = useState<{ from: string; to: string } | null>(null);
  const [lastUpdatedISO, setLastUpdatedISO] = useState<string | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (timeframe === "custom") return;
    setDateRange(computeRange(timeframe));
  }, [timeframe]);

  const fetchData = useCallback(async () => {
    if (!dateRange.from || !dateRange.to) return;

    const fromDate = new Date(dateRange.from);
    const toDate = new Date(dateRange.to);
    if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime()) || fromDate > toDate) {
      setError("Período inválido. Ajuste as datas e tente novamente.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await getUsageAnalytics({
        dateFrom: dateRange.from,
        dateTo: dateRange.to,
        activityType: activityFilter !== "all" ? activityFilter : undefined,
        userId: selectedUserId !== "all" ? selectedUserId : undefined
      });

      const entries = response.usage_details ?? [];
      setUsageData(entries);
      setTimeline(response.timeline ?? []);
      setPeriod(response.period ?? null);
      setLastUpdatedISO(new Date().toISOString());

      if (selectedUserId === "all") {
        const options = entries
          .map((user) => ({
            value: user.user_id,
            label: formatUserLabel(user)
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setAvailableUsers(options);
      } else if (entries[0]) {
        const currentUser = entries[0];
        setAvailableUsers((prev) => {
          if (prev.some((option) => option.value === currentUser.user_id)) {
            return prev;
          }
          const next = [...prev, { value: currentUser.user_id, label: formatUserLabel(currentUser) }];
          return next.sort((a, b) => a.label.localeCompare(b.label));
        });
      }
    } catch (err) {
      console.error("[analytics/user-usage] erro ao carregar dados", err);
      setError("Não foi possível carregar os dados de uso. Tente novamente.");
      setUsageData([]);
      setTimeline([]);
      setPeriod(null);
    } finally {
      setLoading(false);
    }
  }, [activityFilter, dateRange.from, dateRange.to, selectedUserId]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const totals = useMemo(() => {
    return usageData.reduce(
      (acc, user) => {
        acc.totalSessions += user.sessions ?? 0;
        acc.totalDurationMinutes += user.total_time_minutes ?? 0;
        acc.totalApiCalls += user.api_calls ?? 0;
        acc.totalLlmInteractions += user.llm_interactions ?? 0;
        acc.totalLlmTokens += user.llm_tokens ?? 0;
        acc.totalWhatsappMessages += (user.whatsapp_sent ?? 0) + (user.whatsapp_received ?? 0);
        return acc;
      },
      {
        totalSessions: 0,
        totalDurationMinutes: 0,
        totalApiCalls: 0,
        totalLlmInteractions: 0,
        totalLlmTokens: 0,
        totalWhatsappMessages: 0
      }
    );
  }, [usageData]);

  const uniquePages = useMemo(() => {
    const set = new Set<string>();
    usageData.forEach((user) => {
      user.pages_visited?.forEach((page) => set.add(page));
    });
    return set.size;
  }, [usageData]);

  const uniqueFeatures = useMemo(() => {
    const set = new Set<string>();
    usageData.forEach((user) => {
      user.features_used?.forEach((feature) => set.add(feature));
    });
    return set.size;
  }, [usageData]);

  const chartData = useMemo(() => {
    return timeline.map((point) => ({
      date: formatDateLabel(point.date),
      "Chamadas API": point.api_calls ?? 0,
      Sessões: point.sessions ?? 0
    }));
  }, [timeline]);

  const topPagesData = useMemo(() => {
    const counts = new Map<string, number>();
    usageData.forEach((user) => {
      if (Array.isArray(user.top_pages) && user.top_pages.length > 0) {
        user.top_pages.forEach(({ page, visits }) => {
          counts.set(page, (counts.get(page) ?? 0) + visits);
        });
      } else {
        user.pages_visited?.forEach((page) => {
          counts.set(page, (counts.get(page) ?? 0) + 1);
        });
      }
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name || "—", value }));
  }, [usageData]);

  const topFeaturesData = useMemo(() => {
    const counts = new Map<string, number>();
    usageData.forEach((user) => {
      user.features_used?.forEach((feature) => {
        counts.set(feature, (counts.get(feature) ?? 0) + 1);
      });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, value]) => ({ name: name || "—", value }));
  }, [usageData]);

  const totalDurationHours = totals.totalDurationMinutes / 60;
  const lastUpdatedLabel = formatDateTime(lastUpdatedISO);

  const valueFormatter = (value: number) =>
    value.toLocaleString("pt-BR", { maximumFractionDigits: 0 });

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="h-8 w-8" />
            Uso do Sistema por Usuário
          </h1>
          <p className="text-muted-foreground">
            Acompanhe sessões, chamados de API, interações de IA e comunicação por usuário administrativo.
          </p>
          {period && (
            <p className="text-xs text-muted-foreground">
              Período aplicado: {formatDateLabel(period.from)} — {formatDateLabel(period.to)}
            </p>
          )}
          {lastUpdatedLabel && (
            <p className="text-xs text-muted-foreground">Última atualização: {lastUpdatedLabel}</p>
          )}
        </div>
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as TimeframeOption)}>
            <TabsList>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
              <TabsTrigger value="90d">90 dias</TabsTrigger>
              <TabsTrigger value="custom">Personalizado</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={activityFilter}
            onValueChange={(value) => setActivityFilter(value as UsageActivityType)}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Atividade" />
            </SelectTrigger>
            <SelectContent>
              {activityFilters.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {availableUsers.map((option) => (
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
            value={dateRange.from}
            onChange={(event) => {
              setTimeframe("custom");
              setDateRange((prev) => ({ ...prev, from: event.target.value }));
            }}
            aria-label="Data inicial"
          />
          <span className="text-sm text-muted-foreground">até</span>
          <Input
            type="date"
            value={dateRange.to}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(event) => {
              setTimeframe("custom");
              setDateRange((prev) => ({ ...prev, to: event.target.value }));
            }}
            aria-label="Data final"
          />
        </div>
        <Button
          onClick={() => void fetchData()}
          variant="outline"
          className="gap-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Carregando dados...
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários monitorados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usageData.length}</div>
            <CardDescription>{uniquePages} páginas únicas acessadas</CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de sessões</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totals.totalSessions.toLocaleString("pt-BR")}</div>
            <CardDescription>
              {totals.totalApiCalls.toLocaleString("pt-BR")} chamadas de API registradas
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tempo na plataforma</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDurationHours.toFixed(1)} h</div>
            <CardDescription>
              Média de{" "}
              {(totals.totalSessions > 0 ? totals.totalDurationMinutes / totals.totalSessions : 0).toFixed(1)} min por
              sessão
            </CardDescription>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Interações inteligentes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-2xl font-bold">{totals.totalLlmInteractions.toLocaleString("pt-BR")}</div>
            <CardDescription>{totals.totalLlmTokens.toLocaleString("pt-BR")} tokens processados</CardDescription>
            <div className="text-sm text-muted-foreground">
              {totals.totalWhatsappMessages.toLocaleString("pt-BR")} mensagens WhatsApp
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Evolução diária</CardTitle>
            <CardDescription>Comparativo de sessões e chamadas de API por dia</CardDescription>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <AreaChart
                className="h-64"
                data={chartData}
                index="date"
                categories={["Chamadas API", "Sessões"]}
                colors={["indigo", "emerald"]}
                valueFormatter={valueFormatter}
              />
            ) : (
              <div className="flex h-40 items-center justify-center rounded-lg border border-dashed">
                <p className="text-sm text-muted-foreground">
                  Sem dados suficientes para exibir o gráfico.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Páginas mais acessadas</CardTitle>
              <CardDescription>Top rotas visitadas no período</CardDescription>
            </CardHeader>
            <CardContent>
              {topPagesData.length > 0 ? (
                <BarList data={topPagesData} className="mt-2" />
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma navegação registrada.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Features mais utilizadas</CardTitle>
              <CardDescription>{uniqueFeatures} funcionalidades distintas</CardDescription>
            </CardHeader>
            <CardContent>
              {topFeaturesData.length > 0 ? (
                <BarList data={topFeaturesData} className="mt-2" color="cyan" />
              ) : (
                <p className="text-sm text-muted-foreground">Sem registros de features utilizadas.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por usuário</CardTitle>
          <CardDescription>Tráfego, recursos e canais utilizados por usuário</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Tempo médio</TableHead>
                <TableHead>Horas totais</TableHead>
                <TableHead>API Calls</TableHead>
                <TableHead>LLM</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Features</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageData.map((user) => {
                const whatsappTotal = (user.whatsapp_sent ?? 0) + (user.whatsapp_received ?? 0);
                const hoursTotal = (user.total_time_minutes ?? 0) / 60;
                const avgSessionMinutes =
                  typeof user.avg_session_minutes === "string"
                    ? Number(user.avg_session_minutes)
                    : Number(user.avg_session_minutes ?? 0);

                return (
                  <TableRow key={user.user_id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{formatUserLabel(user)}</span>
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{(user.sessions ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{avgSessionMinutes.toFixed(1)} min</Badge>
                    </TableCell>
                    <TableCell>{hoursTotal.toFixed(1)} h</TableCell>
                    <TableCell>{(user.api_calls ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{(user.llm_interactions ?? 0).toLocaleString("pt-BR")}</TableCell>
                    <TableCell>{whatsappTotal.toLocaleString("pt-BR")}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.pages_visited?.length ?? 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{user.features_used?.length ?? 0}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        href={`/admin/analytics/usage-detail/${user.user_id}`}
                        className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                      >
                        Ver detalhes
                      </Link>
                    </TableCell>
                  </TableRow>
                );
              })}
              {usageData.length === 0 && !loading && !error && (
                <TableRow>
                  <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                    Nenhum dado encontrado para o período selecionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import TimelineChart from "@/components/timeline-chart";
import { Loader2, Users, Activity, Zap } from "lucide-react";
import {
  getUsageDetails,
  type UsageDetailsResponse,
  type UsageDetail,
  type UsageTimelineEntry,
  type UsageActivityType
} from "@/lib/api";

const ACTIVITY_OPTIONS: Array<{ value: "all" | UsageActivityType; label: string }> = [
  { value: "all", label: "Todas as atividades" },
  { value: "pages", label: "Páginas visitadas" },
  { value: "api_calls", label: "Chamadas API" },
  { value: "llm", label: "Interações LLM" },
  { value: "whatsapp", label: "Mensagens WhatsApp" }
];

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

function formatMinutes(value: number) {
  if (!Number.isFinite(value)) return "0 min";
  if (value < 60) return `${value.toFixed(0)} min`;
  const hours = value / 60;
  return `${hours.toFixed(1)} h`;
}

export default function UserUsagePage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>("30d");
  const [activityFilter, setActivityFilter] = useState<"all" | UsageActivityType>("all");

  const { from: dateFrom, to: dateTo } = useMemo(() => computeRange(timeframe), [timeframe]);

  const usageQuery = useQuery<UsageDetailsResponse>({
    queryKey: ["usage-details", timeframe, activityFilter, dateFrom, dateTo],
    queryFn: () =>
      getUsageDetails({
        dateFrom,
        dateTo,
        activityType: activityFilter === "all" ? undefined : activityFilter
      })
  });

  const isLoading = usageQuery.isLoading;
  const isError = usageQuery.isError;
  const data = usageQuery.data;
  const usageList: UsageDetail[] = data?.usage_details ?? [];
  const timeline: UsageTimelineEntry[] = data?.timeline ?? [];

  const totals = useMemo(() => {
    return usageList.reduce(
      (acc, user) => {
        acc.sessions += user.sessions ?? 0;
        acc.minutes += user.total_time_minutes ?? 0;
        acc.llm += user.llm_interactions ?? 0;
        return acc;
      },
      { sessions: 0, minutes: 0, llm: 0 }
    );
  }, [usageList]);

  const chartData = useMemo(
    () =>
      timeline.map((entry) => ({
        label: new Date(entry.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        value: entry.sessions
      })),
    [timeline]
  );

  const handleRowClick = (userId: string) => {
    router.push(`/admin/analytics/usage-detail/${userId}`);
  };

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="h-8 w-8" />
            Uso do Sistema por Usuário
          </h1>
          <p className="text-muted-foreground">
            Analise sessões, interações e engajamento por usuário autenticado.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Tabs value={timeframe} onValueChange={(value) => setTimeframe(value as Timeframe)}>
            <TabsList>
              <TabsTrigger value="7d">7 dias</TabsTrigger>
              <TabsTrigger value="30d">30 dias</TabsTrigger>
              <TabsTrigger value="90d">90 dias</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select
            value={activityFilter}
            onValueChange={(value) => setActivityFilter(value as "all" | UsageActivityType)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrar por atividade" />
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

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : isError ? (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="p-6 text-sm text-destructive-foreground">
            Falha ao carregar dados de uso. Verifique sua conexão ou tente novamente.
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Usuários ativos</CardTitle>
                <CardDescription>Com sessões no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{usageList.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total de sessões</CardTitle>
                <CardDescription>Somatório no período</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{totals.sessions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Tempo acompanhado</CardTitle>
                <CardDescription>Tempo médio acumulado</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{formatMinutes(totals.minutes)}</div>
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

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por usuário</CardTitle>
              <CardDescription>Clique em um usuário para abrir a visão detalhada.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Tempo total</TableHead>
                    <TableHead>Páginas</TableHead>
                    <TableHead>API Calls</TableHead>
                    <TableHead>LLM</TableHead>
                    <TableHead>WhatsApp</TableHead>
                    <TableHead>Último acesso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageList.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum dado disponível para o período selecionado.
                      </TableCell>
                    </TableRow>
                  ) : (
                    usageList.map((user) => (
                      <TableRow
                        key={user.user_id}
                        className="cursor-pointer transition hover:bg-secondary/30"
                        onClick={() => handleRowClick(user.user_id)}
                      >
                        <TableCell>
                          <div className="font-medium">{user.email || user.user_id.slice(0, 8)}</div>
                          {user.full_name ? (
                            <p className="text-xs text-muted-foreground">{user.full_name}</p>
                          ) : null}
                        </TableCell>
                        <TableCell>{user.sessions}</TableCell>
                        <TableCell>{formatMinutes(user.total_time_minutes ?? 0)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {user.top_pages?.length ?? user.pages_visited.length}
                          </Badge>
                        </TableCell>
                        <TableCell>{user.api_calls ?? 0}</TableCell>
                        <TableCell>
                          <Badge>{user.llm_interactions ?? 0}</Badge>
                        </TableCell>
                        <TableCell>{(user.whatsapp_sent ?? 0) + (user.whatsapp_received ?? 0)}</TableCell>
                        <TableCell>{new Date(dateTo).toLocaleDateString("pt-BR")}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  MessageSquare,
  RefreshCw,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import TimelineChart from "@/components/timeline-chart";
import {
  getUsageAnalytics,
  type UsageActivityType,
  type UsageAnalyticsResponse,
  type UsageAnalyticsTimelinePoint,
  type UsageAnalyticsUser
} from "@/lib/api";

const TIMEFRAME_OPTIONS: Record<string, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90
};

const ACTIVITY_OPTIONS: Array<{ value: UsageActivityType; label: string }> = [
  { value: "all", label: "Todas as atividades" },
  { value: "pages", label: "Páginas visitadas" },
  { value: "api_calls", label: "Chamadas API" },
  { value: "llm", label: "Interações LLM" },
  { value: "whatsapp", label: "Mensagens WhatsApp" }
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

function getUserLabel(user: UsageAnalyticsUser): string {
  if (user.full_name) return user.full_name;
  if (user.email) return user.email;
  return user.user_id;
}

export default function UserUsagePage() {
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [dateFrom, setDateFrom] = useState<string>(subtractDays(TIMEFRAME_OPTIONS["30d"]));
  const [dateTo, setDateTo] = useState<string>(formatISO(new Date()));
  const [activityFilter, setActivityFilter] = useState<UsageActivityType>("all");
  const [selectedUser, setSelectedUser] = useState<string>("all");

  const [globalData, setGlobalData] = useState<UsageAnalyticsResponse | null>(null);
  const [usageData, setUsageData] = useState<UsageAnalyticsResponse | null>(null);
  const [userOptions, setUserOptions] = useState<Array<{ value: string; label: string }>>([]);
  const [globalLoading, setGlobalLoading] = useState<boolean>(true);
  const [userLoading, setUserLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const days = TIMEFRAME_OPTIONS[timeframe] ?? TIMEFRAME_OPTIONS["30d"];
    setDateFrom(subtractDays(days));
    setDateTo(formatISO(new Date()));
  }, [timeframe]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setGlobalLoading(true);
        const response = await getUsageAnalytics({
          dateFrom,
          dateTo,
          activityType: activityFilter === "all" ? undefined : activityFilter
        });
        if (!mounted) return;
        setError(null);
        setGlobalData(response);
        const options = response.usage_details
          .map((entry) => ({
            value: entry.user_id,
            label: getUserLabel(entry)
          }))
          .sort((a, b) => a.label.localeCompare(b.label));
        setUserOptions(options);
        if (selectedUser !== "all" && !options.some((option) => option.value === selectedUser)) {
          setSelectedUser("all");
        }
        if (selectedUser === "all") {
          setUsageData(response);
        }
      } catch (err) {
        console.error("[user-usage] global fetch error", err);
        if (mounted) {
          setError("Não foi possível carregar os dados de uso.");
          setGlobalData(null);
          setUsageData(null);
        }
      } finally {
        if (mounted) {
          setGlobalLoading(false);
        }
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [dateFrom, dateTo, activityFilter, timeframe, selectedUser]);

  useEffect(() => {
    if (selectedUser === "all") {
      setUsageData(globalData);
      setUserLoading(false);
      return;
    }
    if (!selectedUser) return;

    let mounted = true;
    const loadUser = async () => {
      try {
        setUserLoading(true);
        const response = await getUsageAnalytics({
          userId: selectedUser,
          dateFrom,
          dateTo,
          activityType: activityFilter === "all" ? undefined : activityFilter
        });
        if (!mounted) return;
        setUsageData(response);
      } catch (err) {
        console.error("[user-usage] user fetch error", err);
        if (mounted) {
          setError("Não foi possível carregar o usuário selecionado.");
          setUsageData(null);
        }
      } finally {
        if (mounted) {
          setUserLoading(false);
        }
      }
    };

    loadUser();
    return () => {
      mounted = false;
    };
  }, [selectedUser, dateFrom, dateTo, activityFilter, globalData]);

  const loading = globalLoading || userLoading;
  const usageEntries: UsageAnalyticsUser[] = usageData?.usage_details ?? [];
  const timeline: UsageAnalyticsTimelinePoint[] = usageData?.timeline ?? [];

  const totals = useMemo(() => {
    return usageEntries.reduce(
      (acc, entry) => {
        acc.sessions += entry.sessions ?? 0;
        acc.minutes += entry.total_time_minutes ?? 0;
        acc.llm += entry.llm_interactions ?? 0;
        acc.whatsapp += (entry.whatsapp_sent ?? 0) + (entry.whatsapp_received ?? 0);
        return acc;
      },
      { sessions: 0, minutes: 0, llm: 0, whatsapp: 0 }
    );
  }, [usageEntries]);

  const timelineTrend = useMemo(() => {
    if (timeline.length < 2) return "stable";
    const first = timeline[0]?.sessions ?? 0;
    const last = timeline[timeline.length - 1]?.sessions ?? 0;
    const delta = last - first;
    if (Math.abs(delta) < 1) return "stable";
    return delta > 0 ? "up" : "down";
  }, [timeline]);

  const chartData = useMemo(
    () =>
      timeline.map((entry) => ({
        label: formatDayLabel(entry.date),
        value: entry.sessions ?? 0,
        secondaryValue: entry.api_calls ?? 0
      })),
    [timeline]
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto space-y-6 p-6">
        <Alert variant="destructive">
          <AlertTitle>Erro ao carregar dados</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="h-8 w-8" />
            Uso do Sistema por Usuário
          </h1>
          <p className="text-muted-foreground">
            Monitore sessões, funcionalidades e interações de cada usuário administrador.
          </p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Últimos 7 dias</SelectItem>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activityFilter} onValueChange={(value: UsageActivityType) => setActivityFilter(value)}>
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
          <Select value={selectedUser} onValueChange={setSelectedUser}>
            <SelectTrigger className="w-[260px]">
              <SelectValue placeholder="Usuário" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os usuários</SelectItem>
              {userOptions.map((option) => (
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
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => {
            setGlobalData(null);
            setUsageData(null);
            setGlobalLoading(true);
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Usuários ativos</CardTitle>
            <CardDescription>Período selecionado</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{usageEntries.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Total de sessões</CardTitle>
            <CardDescription>Entradas registradas</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totals.sessions}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tempo total</CardTitle>
            <CardDescription>Minutos somados</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">
            {(totals.minutes / 60).toFixed(1)}
            <span className="text-base font-medium text-muted-foreground"> h</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Mensagens WhatsApp</CardTitle>
            <CardDescription>Enviadas + recebidas</CardDescription>
          </CardHeader>
          <CardContent className="text-3xl font-bold">{totals.whatsapp}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>Evolução de sessões</CardTitle>
            <CardDescription>Sessões contabilizadas por dia</CardDescription>
          </div>
          <Badge
            variant={
              timelineTrend === "up"
                ? "default"
                : timelineTrend === "down"
                  ? "destructive"
                  : "outline"
            }
          >
            {timelineTrend === "up"
              ? "Maior engajamento"
              : timelineTrend === "down"
                ? "Queda de uso"
                : "Uso estável"}
          </Badge>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={chartData}
            valueFormatter={(value) => `${value} sessões`}
            labelFormatter={(label) => label}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumo rápido</CardTitle>
          <CardDescription>Principais métricas do recorte atual</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="rounded-md bg-primary/10 p-2">
              <Activity className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-xs uppercase text-muted-foreground">API calls</p>
              <p className="text-lg font-semibold">
                {usageEntries.reduce((acc, entry) => acc + (entry.api_calls ?? 0), 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="rounded-md bg-primary/10 p-2">
              <TrendingUp className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Interações LLM</p>
              <p className="text-lg font-semibold">{totals.llm}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="rounded-md bg-primary/10 p-2">
              <MessageSquare className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Mensagens enviadas</p>
              <p className="text-lg font-semibold">
                {usageEntries.reduce((acc, entry) => acc + (entry.whatsapp_sent ?? 0), 0)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <span className="rounded-md bg-primary/10 p-2">
              <Zap className="h-5 w-5 text-primary" />
            </span>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Tokens LLM</p>
              <p className="text-lg font-semibold">
                {usageEntries.reduce((acc, entry) => acc + (entry.llm_tokens ?? 0), 0)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalhamento por usuário</CardTitle>
          <CardDescription>Clique para abrir o detalhamento completo</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Usuário</TableHead>
                <TableHead>Sessões</TableHead>
                <TableHead>Tempo</TableHead>
                <TableHead>API</TableHead>
                <TableHead>LLM</TableHead>
                <TableHead>WhatsApp</TableHead>
                <TableHead>Páginas</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usageEntries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-muted-foreground">
                    Nenhum dado encontrado para o filtro aplicado.
                  </TableCell>
                </TableRow>
              ) : (
                usageEntries.map((user) => {
                  const whatsappTotal = (user.whatsapp_sent ?? 0) + (user.whatsapp_received ?? 0);
                  return (
                    <TableRow key={user.user_id}>
                      <TableCell>
                        <div className="font-medium">{getUserLabel(user)}</div>
                        <p className="text-xs text-muted-foreground">
                          {user.email ?? user.user_id}
                        </p>
                      </TableCell>
                      <TableCell>{user.sessions ?? 0}</TableCell>
                      <TableCell>{(user.total_time_minutes ?? 0).toFixed(0)} min</TableCell>
                      <TableCell>{user.api_calls ?? 0}</TableCell>
                      <TableCell>{user.llm_interactions ?? 0}</TableCell>
                      <TableCell>{whatsappTotal}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{user.pages_visited.length}</Badge>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/admin/analytics/usage-detail/${user.user_id}`}
                          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                        >
                          Ver detalhes
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

