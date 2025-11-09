"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, AlertTriangle, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import MoodIndicator from "@/components/mood-indicator";
import TimelineChart from "@/components/timeline-chart";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  getCompaniesList,
  getMoodIndexTimeline,
  type CompanyListItem,
  type MoodIndexResponse,
  type MoodIndexTimelineEntry
} from "@/lib/api";

type TimeframeOption = "7d" | "30d" | "90d";
type GranularityOption = "daily" | "weekly" | "monthly";

const TIMEFRAME_LABELS: Record<TimeframeOption, string> = {
  "7d": "Últimos 7 dias",
  "30d": "Últimos 30 dias",
  "90d": "Últimos 90 dias"
};

const GRANULARITY_LABELS: Record<GranularityOption, string> = {
  daily: "Diário",
  weekly: "Semanal",
  monthly: "Mensal"
};

function computeDateRange(timeframe: TimeframeOption) {
  const now = new Date();
  const to = now.toISOString().slice(0, 10);
  const start = new Date(now);
  const days = timeframe === "7d" ? 6 : timeframe === "30d" ? 29 : 89;
  start.setDate(start.getDate() - days);
  const from = start.toISOString().slice(0, 10);
  return { from, to };
}

function getSentimentColor(score: number): string {
  if (score >= 0.5) return "text-green-500 font-semibold";
  if (score >= 0.1) return "text-blue-500";
  if (score >= -0.1) return "text-muted-foreground";
  if (score >= -0.5) return "text-orange-500";
  return "text-red-500 font-semibold";
}

export default function MoodIndexPage() {
  const [timeframe, setTimeframe] = useState<TimeframeOption>("30d");
  const [granularity, setGranularity] = useState<GranularityOption>("daily");
  const [selectedCompany, setSelectedCompany] = useState<string>("all");

  const companiesQuery = useQuery({
    queryKey: ["analytics-companies"],
    queryFn: getCompaniesList
  });

  const companies: CompanyListItem[] = companiesQuery.data ?? [];

  const { from: dateFrom, to: dateTo } = useMemo(() => computeDateRange(timeframe), [timeframe]);

  const moodQuery = useQuery<MoodIndexResponse>({
    queryKey: ["mood-index", selectedCompany, dateFrom, dateTo, granularity],
    queryFn: () =>
      getMoodIndexTimeline({
        cnpj: selectedCompany === "all" ? undefined : selectedCompany,
        dateFrom,
        dateTo,
        granularity
      }),
    enabled: !!dateFrom && !!dateTo
  });

  const isLoading = moodQuery.isLoading;
  const isError = moodQuery.isError;
  const data = moodQuery.data;

  const timeline = data?.timeline ?? [];

  const distributionTotals = useMemo(() => {
    return timeline.reduce(
      (acc, entry) => {
        acc.veryPositive += entry.very_positive_count ?? 0;
        acc.positive += entry.positive_count ?? 0;
        acc.neutral += entry.neutral_count ?? 0;
        acc.negative += entry.negative_count ?? 0;
        acc.veryNegative += entry.very_negative_count ?? 0;
        acc.totalConversations += entry.conversation_count ?? 0;
        return acc;
      },
      {
        veryPositive: 0,
        positive: 0,
        neutral: 0,
        negative: 0,
        veryNegative: 0,
        totalConversations: 0
      }
    );
  }, [timeline]);

  const chartData = useMemo(
    () =>
      timeline.map((item: MoodIndexTimelineEntry) => ({
        date:
          granularity === "monthly"
            ? item.date
            : new Date(item.date).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
        score: Number(item.avg_mood_index ?? 0),
        positive: Number((item.positive_count ?? 0) + (item.very_positive_count ?? 0)),
        neutral: Number(item.neutral_count ?? 0),
        negative: Number((item.negative_count ?? 0) + (item.very_negative_count ?? 0))
      })),
    [timeline, granularity]
  );

  const averageSentiment =
    timeline.length > 0
      ? timeline.reduce((acc, item) => acc + (item.avg_mood_index ?? 0), 0) / timeline.length
      : 0;

  useEffect(() => {
    if (!companiesQuery.isFetching && companiesQuery.isSuccess && companies.length > 0) {
      setSelectedCompany((current) => (current === "all" ? companies[0].cnpj : current));
    }
  }, [companiesQuery.isFetching, companiesQuery.isSuccess, companies]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <TrendingUp className="h-8 w-8" />
            Índice de Humor dos Clientes
          </h1>
          <p className="text-muted-foreground">
            Acompanhe o sentimento das conversas WhatsApp por empresa e período.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={timeframe} onValueChange={(value: TimeframeOption) => setTimeframe(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(TIMEFRAME_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={granularity} onValueChange={(value: GranularityOption) => setGranularity(value)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Granularidade" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(GRANULARITY_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCompany} onValueChange={setSelectedCompany}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as empresas</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.cnpj} value={company.cnpj}>
                  {company.nome ?? company.nomeFantasia ?? company.cnpj}
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
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="flex items-center gap-3 p-6 text-sm text-destructive-foreground">
            <AlertTriangle className="h-5 w-5" />
            Não foi possível carregar o painel de humor. Tente novamente mais tarde.
          </CardContent>
        </Card>
      ) : data ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Média de sentimento</CardTitle>
                <CardDescription>
                  {new Date(dateFrom).toLocaleDateString("pt-BR")} — {new Date(dateTo).toLocaleDateString("pt-BR")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MoodIndicator score={averageSentiment} />
                <p className="mt-2 text-xs text-muted-foreground">
                  {averageSentiment >= 0.5
                    ? "Cliente satisfeito"
                    : averageSentiment >= 0
                      ? "Tendência positiva"
                      : averageSentiment >= -0.5
                        ? "Atenção aos sinais"
                        : "Humor crítico"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Conversas analisadas</CardTitle>
                <CardDescription>Período selecionado</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">
                  {distributionTotals.totalConversations.toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mensagens positivas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-emerald-500">
                  {(distributionTotals.positive + distributionTotals.veryPositive).toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Mensagens negativas</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-red-500">
                  {(distributionTotals.negative + distributionTotals.veryNegative).toLocaleString("pt-BR")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do sentimento</CardTitle>
              <CardDescription>
                {new Date(dateFrom).toLocaleDateString("pt-BR")} — {new Date(dateTo).toLocaleDateString("pt-BR")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TimelineChart
                data={chartData.map((item) => ({ label: item.date, value: item.score }))}
                variant="area"
                valueFormatter={(value) => `${Number(value).toFixed(2)} pts`}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribuição de sentimentos</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="positive" stackId="sentiment" fill="#22c55e" name="Positivas" />
                  <Bar dataKey="neutral" stackId="sentiment" fill="#94a3b8" name="Neutras" />
                  <Bar dataKey="negative" stackId="sentiment" fill="#ef4444" name="Negativas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {data.alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Alertas recentes</CardTitle>
                <CardDescription>Quedas ou recuperações relevantes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {data.alerts.map((alert) => (
                  <div
                    key={`${alert.type}-${alert.date}-${alert.change_percent}`}
                    className="flex items-start justify-between rounded-md border border-border/60 bg-secondary/20 p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {alert.type === "drop" ? "Queda de humor" : "Recuperação"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(alert.date).toLocaleDateString("pt-BR")} • {alert.message}
                      </p>
                    </div>
                    <Badge variant={alert.type === "drop" ? "destructive" : "default"}>
                      {alert.change_percent.toFixed?.(1) ?? alert.change_percent}%
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por período</CardTitle>
              <CardDescription>Distribuição de sentimentos e total de mensagens</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead>Score médio</TableHead>
                    <TableHead>Positivo</TableHead>
                    <TableHead>Neutro</TableHead>
                    <TableHead>Negativo</TableHead>
                    <TableHead>Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {timeline.map((item) => (
                    <TableRow key={item.date}>
                      <TableCell>
                        {granularity === "monthly"
                          ? item.date
                          : new Date(item.date).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className={getSentimentColor(item.avg_mood_index ?? 0)}>
                        {(item.avg_mood_index ?? 0).toFixed(2)}
                      </TableCell>
                      <TableCell className="text-emerald-500">
                        {(item.positive_count ?? 0) + (item.very_positive_count ?? 0)}
                      </TableCell>
                      <TableCell>{item.neutral_count ?? 0}</TableCell>
                      <TableCell className="text-red-500">
                        {(item.negative_count ?? 0) + (item.very_negative_count ?? 0)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.conversation_count?.toLocaleString("pt-BR") ?? 0}
                      </TableCell>
                    </TableRow>
                  ))}
                  {timeline.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                        Nenhum dado encontrado para o período selecionado.
                      </TableCell>
                    </TableRow>
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
