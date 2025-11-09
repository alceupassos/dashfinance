"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import {
  getAdminSecurityTraffic,
  type AdminSecurityTrafficPoint,
  type AdminSecurityTrafficResponse
} from "@/lib/api";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";

const ranges: Array<{ label: string; value: "past_24h" | "past_7d" }> = [
  { label: "Últimas 24h", value: "past_24h" },
  { label: "Últimos 7 dias", value: "past_7d" }
];

export default function AdminSecurityTrafficPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [range, setRange] = useState<"past_24h" | "past_7d">("past_24h");
  const query = useQuery<AdminSecurityTrafficResponse>({
    queryKey: ["admin-security-traffic", range],
    queryFn: () => getAdminSecurityTraffic(range)
  });

  const chartData = useMemo(() => {
    if (!query.data) return [];
    return query.data.hourly.map((point) => toChartPoint(point));
  }, [query.data]);

  const totals = query.data?.totals;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Dashboard Segurança · Tráfego</CardTitle>
            <p className="text-[11px] text-muted-foreground">Fontes: Edge Functions, APIs internas e monitoramento de rede.</p>
          </div>
          <div className="flex gap-2">
            {ranges.map((item) => (
              <Button
                key={item.value}
                size="sm"
                variant={item.value === range ? "outline" : "ghost"}
                onClick={() => setRange(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4">
          <SummaryBadge label="Requests" value={totals?.requests?.toLocaleString?.() ?? totals?.requests} className="text-foreground" />
          <SummaryBadge label="Bandwidth In" value={totals?.bandwidth_in_mb} suffix="MB" />
          <SummaryBadge label="Bandwidth Out" value={totals?.bandwidth_out_mb} suffix="MB" />
          <SummaryBadge label="Error Rate" value={totals?.error_rate} suffix="%" />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Tráfego de funções</CardTitle>
            <p className="text-xs text-muted-foreground">Contagem de requests, erros e latência média hora a hora.</p>
          </div>
          <Badge variant={query.isError ? "destructive" : query.isLoading ? "warning" : "success"}>
            {query.isError ? "Erro" : query.isLoading ? "Carregando" : "Sincronizado"}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          {query.isLoading || !chartData.length ? (
            <div className="h-[360px] rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#07090f] to-[#0f111c]" />
          ) : query.isError ? (
            <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-destructive/40 bg-[#110b12] text-sm text-destructive">
              Não foi possível carregar o tráfego. Tente novamente.
            </div>
          ) : (
            <GrafanaLineChart
              data={chartData as Array<Record<string, unknown>>}
              series={chartSeries}
              height={360}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

const chartSeries: GrafanaSeriesConfig[] = [
  { dataKey: "requests", label: "Requests", stroke: "#8b5cf6", type: "area", fill: "#8b5cf6", yAxisId: "left" },
  { dataKey: "errors", label: "Erros", stroke: "#f97316", type: "area", fill: "#f97316", yAxisId: "left" },
  { dataKey: "latency", label: "Latência (ms)", stroke: "#22d3ee", type: "line", yAxisId: "right", unit: "ms" }
];

function toChartPoint(point: AdminSecurityTrafficPoint) {
  const date = new Date(point.timestamp);
  return {
    label: date.toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
    requests: point.request_count,
    errors: point.error_count,
    latency: Math.round(point.avg_latency_ms)
  };
}

function SummaryBadge({ label, value, suffix, className }: { label: string; value?: number | string; suffix?: string; className?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className={cn("text-lg font-semibold", className)}>
        {value ?? "–"} {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
