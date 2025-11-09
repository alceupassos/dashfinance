"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";
import { getAdminSecurityDatabase, type AdminSecurityDatabaseResponse } from "@/lib/api";

const ranges: Array<{ label: string; value: "past_24h" | "past_7d" }> = [
  { label: "Últimas 24h", value: "past_24h" },
  { label: "Últimos 7 dias", value: "past_7d" }
];

export default function AdminSecurityDatabasePage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [range, setRange] = useState<"past_24h" | "past_7d">("past_24h");
  const query = useQuery<AdminSecurityDatabaseResponse>({
    queryKey: ["admin-security-database", range],
    queryFn: () => getAdminSecurityDatabase(range)
  });

  const chartData = useMemo(() => {
    if (!query.data) return [];
    return query.data.time_series.map((point) => ({
      label: new Date(point.timestamp).toLocaleString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      connections: point.active_connections,
      queryTime: point.avg_query_time_ms
    }));
  }, [query.data]);

  const gaugeList = query.data?.gauges ? Object.entries(query.data.gauges) : [];

  const latest = query.data?.time_series.at(-1);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Dashboard Segurança · Banco</CardTitle>
            <p className="text-[11px] text-muted-foreground">Monitoramento de conexões, latência e uso de recursos.</p>
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
          <MetricCard label="Conexões" value={latest?.active_connections} suffix="atual" />
          <MetricCard label="Tempo médio" value={latest?.avg_query_time_ms} suffix="ms" />
          <MetricCard label="CPU" value={latest?.cpu_percent} suffix="%" />
          <MetricCard label="Memória" value={latest?.memory_percent} suffix="%" />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Métricas do banco</CardTitle>
            <p className="text-xs text-muted-foreground">Atividade hora a hora com CPUs/latência e status dos recursos.</p>
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
              Não foi possível carregar as métricas do banco. Tente novamente.
            </div>
          ) : (
            <GrafanaLineChart
              data={chartData as Array<Record<string, unknown>>}
              series={databaseSeries}
              height={360}
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        {gaugeList.map(([key, value]) => (
          <Card key={key} className="border-border/60 bg-[#0b0c12]/80">
            <CardHeader className="border-none px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{key}</p>
              <p className="text-lg font-semibold text-foreground">{(value as any).value ?? "–"}%</p>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0 text-xs text-muted-foreground">
              Status: <span className="text-sm text-foreground">{(value as any).status}</span>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

const databaseSeries: GrafanaSeriesConfig[] = [
  { dataKey: "connections", label: "Conexões", stroke: "#22c55e", type: "area", fill: "#22c55e", yAxisId: "left" },
  { dataKey: "queryTime", label: "Tempo médio (ms)", stroke: "#38bdf8", type: "line", yAxisId: "right", unit: "ms" }
];

function MetricCard({ label, value, suffix }: { label: string; value?: number; suffix?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">
        {value ?? "–"} {suffix && <span className="text-[11px] text-muted-foreground">{suffix}</span>}
      </p>
    </div>
  );
}
