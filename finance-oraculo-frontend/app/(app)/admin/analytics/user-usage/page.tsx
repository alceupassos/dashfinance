"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AreaChart, BarList } from "@tremor/react";
import {
  Activity,
  AlertTriangle,
  Clock,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users
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
  fetchAnalyticsUserUsage,
  type AnalyticsUsageTimelinePoint,
  type AnalyticsUserUsageResponse
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
  const from = fromDate.toISOString().slice(0, 10);
  return { from, to };
}

function formatDateLabel(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR");
}

function formatDateTime(value?: string): string {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("pt-BR");
}

function valueFormatter(value: number) {
  return value.toLocaleString("pt-BR");
}

function buildChartData(timeline: AnalyticsUsageTimelinePoint[]) {
  return timeline.map((point) => ({
    date: formatDateLabel(point.date),
    "Sessões": point.sessions ?? 0,
    "Ações": point.actions ?? 0
  }));
}

function sortByActions(response?: AnalyticsUserUsageResponse) {
  if (!response) return [];
  return [...response.users]
    .sort((a, b) => (b.total_actions ?? 0) - (a.total_actions ?? 0))
    .map((user) => ({
      name: user.name || user.email || user.user_id,
      value: user.total_actions ?? 0
    }))
    .slice(0, 8);
}

export default function UserUsageAnalyticsPage() {
  const defaultRange = computeRange("30d");
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [customRange, setCustomRange] = useState<DateRange>(defaultRange);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  const activeRange: DateRange =
    timeframe === "custom" ? customRange : timeframe ? computeRange(timeframe) : defaultRange;

  const isRangeValid = useMemo(() => {
    if (!activeRange.from || !activeRange.to) return false;
    const fromDate = new Date(activeRange.from);
    const toDate = new Date(activeRange.to);
    return !Number.isNaN(fromDate.getTime()) && !Number.isNaN(toDate.getTime()) && fromDate <= toDate;
  }, [activeRange.from, activeRange.to]);

  const usageQuery = useQuery({
    queryKey: ["analytics-user-usage", activeRange.from, activeRange.to, roleFilter],
    queryFn: () =>
      fetchAnalyticsUserUsage({
        from: activeRange.from,
        to: activeRange.to,
        role: roleFilter === "all" ? undefined : roleFilter
      }),
    enabled: isRangeValid
  });

  const summary = usageQuery.data?.summary;
  const users = usageQuery.data?.users ?? [];
  const timeline = usageQuery.data?.timeline ?? [];

  const roleOptions = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((user) => {
      if (user.role) roles.add(user.role);
    });
    return Array.from(roles).sort();
  }, [users]);

  const filteredUsers = useMemo(() => {
    if (!searchTerm) return users;
    const term = searchTerm.toLowerCase();
    return users.filter((user) => {
      const label = `${user.name ?? ""} ${user.email ?? ""} ${user.user_id}`.toLowerCase();
      return label.includes(term);
    });
  }, [users, searchTerm]);

  const chartData = useMemo(() => buildChartData(timeline), [timeline]);
  const barListData = useMemo(() => sortByActions(usageQuery.data), [usageQuery.data]);

  const lastUpdated = summary?.updated_at ? formatDateTime(summary.updated_at) : "";
  const hasInvalidRange = timeframe === "custom" && !isRangeValid;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Users className="h-8 w-8" />
            Uso do Sistema por Usuário
          </h1>
            <p className="text-muted-foreground">
              Monitore sessões, ações registradas pelo time interno e tendências de engajamento.
            </p>
          <p className="text-xs text-muted-foreground">
            Período aplicado: {formatDateLabel(activeRange.from)} — {formatDateLabel(activeRange.to)}
          </p>
          {lastUpdated ? (
            <p className="text-xs text-muted-foreground">Última atualização: {lastUpdated}</p>
          ) : null}
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
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
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Função" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as funções</SelectItem>
              {roleOptions.map((role) => (
                <SelectItem key={role} value={role}>
                  {role}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <div className="flex items-center gap-2">
            <Input
              type="date"
              value={activeRange.from}
              max={activeRange.to}
              onChange={(event) => {
                setTimeframe("custom");
                setCustomRange((prev) => ({ ...prev, from: event.target.value }));
              }}
              aria-label="Data inicial"
            />
            <span className="text-sm text-muted-foreground">até</span>
            <Input
              type="date"
              value={activeRange.to}
              min={activeRange.from}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => {
                setTimeframe("custom");
                setCustomRange((prev) => ({ ...prev, to: event.target.value }));
              }}
              aria-label="Data final"
            />
          </div>
          <Input
            className="md:w-64"
            placeholder="Buscar por nome ou e-mail"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            aria-label="Buscar usuário"
          />
        </div>
        <Button
          className="gap-2 self-start md:self-auto"
          variant="outline"
          onClick={() => usageQuery.refetch()}
          disabled={usageQuery.isFetching || !isRangeValid}
        >
          {usageQuery.isFetching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Atualizar
        </Button>
      </div>

      {hasInvalidRange ? (
        <Alert variant="destructive">
          <AlertTitle>Período inválido</AlertTitle>
          <AlertDescription>Ajuste as datas para continuar.</AlertDescription>
        </Alert>
      ) : null}

      {usageQuery.isError ? (
        <Alert variant="destructive">
          <AlertTitle>Falha ao carregar dados</AlertTitle>
          <AlertDescription>
            Não foi possível carregar as métricas de uso. Verifique sua conexão e tente novamente.
          </AlertDescription>
        </Alert>
      ) : null}

      {usageQuery.isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : usageQuery.data ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuários ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{summary?.active_users ?? users.length}</div>
                <CardDescription>Com atividade no período</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de sessões</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(summary?.total_sessions ?? 0).toLocaleString("pt-BR")}
                </div>
                <CardDescription>Ações monitoradas: {(summary?.actions_per_minute ?? 0).toFixed(1)} por minuto</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Feature destaque</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summary?.top_feature ? summary.top_feature : "—"}
                </div>
                <CardDescription>Feature com maior engajamento</CardDescription>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Última atividade</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lastUpdated || "—"}</div>
                <CardDescription>Atualização do painel</CardDescription>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Evolução diária</CardTitle>
                <CardDescription>Comparativo de sessões e ações registradas</CardDescription>
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
                <CardTitle>Top usuários por ações</CardTitle>
                <CardDescription>Ranking do período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                {barListData.length > 0 ? (
                  <BarList data={barListData} className="mt-2" />
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma ação registrada.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por usuário</CardTitle>
              <CardDescription>Utilize a busca para filtrar por nome ou e-mail.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Função</TableHead>
                    <TableHead>Ações</TableHead>
                    <TableHead>Sessões</TableHead>
                    <TableHead>Ações / sessão</TableHead>
                    <TableHead>Média ações / min</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Nenhum usuário encontrado para os filtros selecionados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.name || user.email || user.user_id}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.role ?? "—"}</Badge>
                        </TableCell>
                        <TableCell>{(user.total_actions ?? 0).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>{(user.total_sessions ?? 0).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          {(user.avg_actions_per_session ?? 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1
                          })}
                        </TableCell>
                        <TableCell>
                          {(user.actions_per_minute ?? 0).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </TableCell>
                        <TableCell>{formatDateTime(user.last_access_at) || "—"}</TableCell>
                        <TableCell className="text-right">
                          <Link
                            href={`/admin/analytics/usage-detail/${encodeURIComponent(user.user_id)}`}
                            className="text-sm font-medium text-primary underline-offset-2 hover:underline"
                          >
                            Ver detalhes
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}


