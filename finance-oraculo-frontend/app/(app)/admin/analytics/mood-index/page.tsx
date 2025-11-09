"use client";

// Endpoints utilizados:
// - GET /analytics/mood-index
// - GET /targets

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  CalendarDays,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Sparkles,
  CircleDot
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchAnalyticsMoodIndex,
  getTargets,
  type AnalyticsMoodDriver,
  type AnalyticsMoodIndexParams,
  type AnalyticsMoodIndexPoint
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

type TargetSelectValue = "all" | `alias:${string}` | `cnpj:${string}`;

type TrendDirection = "up" | "down" | "flat";

type SummaryPayload = {
  average_score: number;
  variation_percentage?: number;
  alerts_open?: number;
  trend?: string;
  updated_at?: string;
};

export default function MoodIndexPage() {
  const [from, setFrom] = useState<string>(toISO(defaultFrom));
  const [to, setTo] = useState<string>(toISO(today));
  const [granularity, setGranularity] = useState<"daily" | "weekly" | "monthly">("daily");
  const [selectedTarget, setSelectedTarget] = useState<TargetSelectValue>("all");

  const targetsQuery = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 5 * 60 * 1000
  });

  const moodQuery = useMoodIndexQuery({ from, to, granularity, selectedTarget });

  const summary = moodQuery.data?.summary;
  const timeline = moodQuery.data?.timeline ?? [];
  const drivers = moodQuery.data?.drivers ?? [];

  const targetOptions = useMemo(() => buildTargetOptions(targetsQuery.data), [targetsQuery.data]);

  const updatedAt = summary?.updated_at;
  const trend: TrendDirection = normalizeTrend(summary?.trend, summary?.variation_percentage);

  return (
    <div className="space-y-6 p-6">
      <header className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-2">
          <h1 className="flex items-center gap-2 text-3xl font-semibold">
            <TrendingUp className="h-8 w-8 text-primary" />
            Índice de Humor Operacional
          </h1>
          <p className="text-sm text-muted-foreground">
            Combine alias, empresas e períodos para entender a jornada emocional dos clientes e agir com antecedência.
          </p>
        </div>
        <Badge variant="outline" className="h-8 gap-2 text-xs font-medium">
          <CalendarDays className="h-3.5 w-3.5" />
          Última atualização: {updatedAt ? new Date(updatedAt).toLocaleString("pt-BR") : "—"}
        </Badge>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Filtros dinâmicos</CardTitle>
          <CardDescription>Defina de forma granular o recorte para os indicadores e drivers automáticos.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex flex-1 flex-col gap-4 md:flex-row md:items-end">
              <SelectField
                label="Alias / Cliente"
                value={selectedTarget}
                onValueChange={(value) => setSelectedTarget(value as TargetSelectValue)}
                options={targetOptions}
              />
              <div className="flex flex-col gap-3 sm:flex-row">
                <DateField label="Data inicial" value={from} max={to} onChange={setFrom} />
                <DateField label="Data final" value={to} min={from} max={toISO(new Date())} onChange={setTo} />
              </div>
              <SelectField
                label="Granularidade"
                value={granularity}
                onValueChange={(value) => setGranularity(value as typeof granularity)}
                options={[
                  { value: "daily", label: "Diário" },
                  { value: "weekly", label: "Semanal" },
                  { value: "monthly", label: "Mensal" }
                ]}
              />
            </div>
            <Button
              variant="outline"
              className="w-full md:w-auto"
              disabled={moodQuery.isFetching}
              onClick={() => moodQuery.refetch()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${moodQuery.isFetching ? "animate-spin" : ""}`} />
              Atualizar painel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            <Sparkles className="mr-1 inline h-3.5 w-3.5 text-primary" /> Os resultados são cacheados por tempo curto para
            manter o painel responsivo mesmo com filtros consecutivos.
          </p>
        </CardContent>
      </Card>

      {moodQuery.isLoading ? (
        <DashboardSkeleton />
      ) : moodQuery.isError ? (
        <ErrorState onRetry={() => moodQuery.refetch()} />
      ) : timeline.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <SummaryCards summary={summary} trend={trend} />
          <SentimentLine timeline={timeline} />
          <DriversGrid drivers={drivers} />
          <DailyBreakdown timeline={timeline} />
        </>
      )}
    </div>
  );
}

function useMoodIndexQuery({
  from,
  to,
  granularity,
  selectedTarget
}: {
  from: string;
  to: string;
  granularity: "daily" | "weekly" | "monthly";
  selectedTarget: TargetSelectValue;
}) {
  const params = useMemo<AnalyticsMoodIndexParams>(() => {
    const base: AnalyticsMoodIndexParams = { from, to, granularity };
    if (selectedTarget.startsWith("alias:")) {
      base.alias = selectedTarget.replace("alias:", "");
    } else if (selectedTarget.startsWith("cnpj:")) {
      base.company_cnpj = selectedTarget.replace("cnpj:", "");
    }
    return base;
  }, [from, to, granularity, selectedTarget]);

  return useQuery({
    queryKey: ["analytics", "mood-index", params.from, params.to, params.granularity, params.alias ?? null, params.company_cnpj ?? null],
    queryFn: () => fetchAnalyticsMoodIndex(params),
    enabled: Boolean(params.from && params.to),
    staleTime: 60_000,
    refetchOnWindowFocus: false
  });
}

function SummaryCards({ summary, trend }: { summary?: SummaryPayload; trend: TrendDirection }) {
  const avg = summary?.average_score ?? 0;
  const variation = summary?.variation_percentage ?? 0;
  const alerts = summary?.alerts_open ?? 0;

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card>
        <CardHeader className="flex items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Humor médio no período</CardTitle>
            <CardDescription>Média simples dos scores diários</CardDescription>
          </div>
          <Badge variant={scoreBadgeVariant(avg)}>{scoreBadgeLabel(avg)}</Badge>
        </CardHeader>
        <CardContent className="flex items-end justify-between">
          <p className={`text-3xl font-semibold ${scoreTextClass(avg)}`}>{avg.toFixed(2)}</p>
          <Badge variant="outline" className="rounded-full text-[11px]">
            {scoreStatusDescription(avg)}
          </Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Variação vs. período anterior</CardTitle>
            <CardDescription>Comparação com a janela equivalente anterior</CardDescription>
          </div>
          <TrendIcon direction={trend} />
        </CardHeader>
        <CardContent>
          <p className={variation >= 0 ? "text-emerald-500 text-3xl font-semibold" : "text-destructive text-3xl font-semibold"}>
            {variation.toFixed(1)}%
          </p>
          <p className="mt-2 text-xs text-muted-foreground">{trendNarrative(trend)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between pb-2">
          <div>
            <CardTitle className="text-sm font-medium">Alertas críticos abertos</CardTitle>
            <CardDescription>Eventos aguardando follow-up imediato</CardDescription>
          </div>
          <Badge variant={alerts > 0 ? "destructive" : "outline"}>{alerts > 0 ? "Ação necessária" : "Sem pendências"}</Badge>
        </CardHeader>
        <CardContent>
          <p className={alerts > 0 ? "text-destructive text-3xl font-semibold" : "text-foreground text-3xl font-semibold"}>{alerts}</p>
          <p className="mt-2 text-xs text-muted-foreground">
            {alerts > 0 ? "Analise os drivers destacados abaixo e direcione o time responsável." : "Continue monitorando para garantir estabilidade."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function SentimentLine({ timeline }: { timeline: AnalyticsMoodIndexPoint[] }) {
  const chartData = useMemo(() =>
    timeline.map((point) => ({
      ...point,
      label: formatDate(point.date),
      tooltip: point.justification ? `${formatDate(point.date)} • ${point.justification}` : formatDate(point.date)
    })),
  [timeline]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Humor diário</CardTitle>
        <CardDescription>Score médio por dia com destaque para pontos críticos e recuperações.</CardDescription>
      </CardHeader>
      <CardContent className="h-[320px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.2} />
            <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickFormatter={(value) => `${value.toFixed(1)} pts`}
              domain={["auto", "auto"]}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.5rem",
                fontSize: "12px"
              }}
              formatter={(value: number, _name, payload) => [`${value.toFixed(2)} pts`, payload.payload?.status ?? "Humor"]}
              labelFormatter={(_, payload) => payload[0]?.payload?.tooltip ?? ""}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<ScoreDot />}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function DriversGrid({ drivers }: { drivers: AnalyticsMoodDriver[] }) {
  const positive = drivers.filter((driver) => !driver.severity || driver.severity === "positive");
  const negative = drivers.filter((driver) => driver.severity === "negative" || driver.severity === "critical");

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <CardTitle>Drivers do humor</CardTitle>
          <CardDescription>Contextos que puxaram o sentimento para cima ou para baixo.</CardDescription>
        </div>
        <Button variant="ghost" className="h-auto px-0 text-xs text-primary underline" asChild>
          <a href="/financeiro/alertas" className="inline-flex items-center gap-2">
            Ver alertas financeiros
            <CircleDot className="h-3.5 w-3.5" />
          </a>
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <DriverList title="Highlights positivos" items={positive} emptyLabel="Sem destaques positivos neste período." />
        <DriverList title="Pontos de atenção" items={negative} emptyLabel="Nenhuma queda relevante registrada." isNegative />
      </CardContent>
    </Card>
  );
}

function DriverList({
  title,
  items,
  emptyLabel,
  isNegative
}: {
  title: string;
  items: AnalyticsMoodDriver[];
  emptyLabel: string;
  isNegative?: boolean;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="space-y-3 text-sm">
          {items.slice(0, 5).map((driver) => (
            <li key={`${driver.date}-${driver.event}`} className="rounded-lg border border-border/50 bg-muted/10 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{driver.event ?? "Evento sem título"}</span>
                <Badge variant={isNegative ? "destructive" : "default"}>{driver.impact ?? "—"}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatDate(driver.date)} • {driver.comment ?? "Sem observações adicionais."}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DailyBreakdown({ timeline }: { timeline: AnalyticsMoodIndexPoint[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Detalhamento diário</CardTitle>
        <CardDescription>Score, status e nota explicativa para cada dia do período.</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Comentário</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {timeline.map((point) => (
              <TableRow key={point.date}>
                <TableCell>{formatDate(point.date)}</TableCell>
                <TableCell className="font-medium">{point.score.toFixed(2)}</TableCell>
                <TableCell>
                  <Badge variant={impactVariant(point.status)}>{point.status ?? scoreBadgeLabel(point.score)}</Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{point.justification ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
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
  options: Array<{ value: string; label: string }>;
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
      <CardContent className="flex flex-col items-start gap-3 p-6 text-sm text-destructive">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          <span>Não foi possível carregar o índice de humor.</span>
        </div>
        <p className="text-xs text-destructive/80">Tente novamente ou ajuste os filtros. Os demais cards permanecem ativos.</p>
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
        <TrendingUp className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm font-medium">Sem dados para o período informado</p>
        <p className="text-xs text-muted-foreground">Ajuste o intervalo ou selecione outro alvo para visualizar o humor operacional.</p>
      </CardContent>
    </Card>
  );
}

function ScoreDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: AnalyticsMoodIndexPoint }) {
  if (typeof cx !== "number" || typeof cy !== "number") return null;
  const score = payload?.score ?? 0;
  return <circle cx={cx} cy={cy} r={4} fill={scoreColor(score)} stroke="hsl(var(--background))" strokeWidth={1.5} />;
}

function buildTargetOptions(data?: Awaited<ReturnType<typeof getTargets>>) {
  const options: Array<{ value: TargetSelectValue; label: string }> = [{ value: "all", label: "Todos os clientes" }];

  data?.aliases?.forEach((alias) => {
    const members = Array.isArray(alias.members) ? alias.members.length : 0;
    options.push({ value: `alias:${alias.id}`, label: `${alias.label} · ${members} empresas` });
  });

  data?.cnpjs?.forEach((company) => {
    options.push({ value: `cnpj:${company.value}`, label: company.label });
  });

  return options;
}

function normalizeTrend(trend?: string, variation?: number): TrendDirection {
  if (trend === "up" || trend === "down" || trend === "flat") return trend;
  if (variation === undefined || Math.abs(variation) < 0.1) return "flat";
  return variation > 0 ? "up" : "down";
}

function scoreBadgeLabel(score: number) {
  if (score >= 0.6) return "Excelente";
  if (score >= 0.2) return "Positivo";
  if (score >= -0.2) return "Atenção";
  return "Crítico";
}

function scoreBadgeVariant(score: number): "success" | "default" | "warning" | "destructive" {
  if (score >= 0.6) return "success";
  if (score >= 0.2) return "default";
  if (score >= -0.2) return "warning";
  return "destructive";
}

function scoreTextClass(score: number) {
  if (score >= 0.6) return "text-emerald-500";
  if (score >= 0.2) return "text-primary";
  if (score >= -0.2) return "text-amber-500";
  return "text-destructive";
}

function scoreStatusDescription(score: number) {
  if (score >= 0.6) return "Zona confortável";
  if (score >= 0.2) return "Tendência saudável";
  if (score >= -0.2) return "Monitorar sinais";
  return "Acionar relacionamento";
}

function scoreColor(score: number) {
  if (score >= 0.6) return "#22c55e";
  if (score >= 0.2) return "#6366f1";
  if (score >= -0.2) return "#f59e0b";
  return "#ef4444";
}

function impactVariant(severity?: string): "destructive" | "warning" | "success" | "outline" {
  const normalized = severity?.toLowerCase() ?? "";
  if (["critical", "critico", "crítico", "negative"].includes(normalized)) return "destructive";
  if (["warning", "atencao", "attention"].includes(normalized)) return "warning";
  if (["positive", "up", "opportunity"].includes(normalized)) return "success";
  return "outline";
}

function formatDate(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === "up") return <ArrowUpRight className="h-5 w-5 text-emerald-500" />;
  if (direction === "down") return <ArrowDownRight className="h-5 w-5 text-destructive" />;
  return <Minus className="h-5 w-5 text-muted-foreground" />;
}

function trendNarrative(trend: TrendDirection) {
  if (trend === "up") return "Melhora consistente em relação ao período anterior.";
  if (trend === "down") return "Queda relevante – recomende ações imediatas junto ao time de CX.";
  return "Oscilações dentro da normalidade. Continue monitorando semanalmente.";
}


