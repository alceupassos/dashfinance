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
    () => sessions.find((session) => session.id === selectedSessionId) ?? null,
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
      timeline.map((entry) => ({
        label: new Date(entry.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        value: entry.sessions ?? 0
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
