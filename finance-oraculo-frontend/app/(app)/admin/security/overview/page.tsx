"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/role-guard";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";
import { getAdminSecurityOverview, type AdminSecurityOverviewResponse } from "@/lib/api";

const chartSeries: GrafanaSeriesConfig[] = [
  { dataKey: "incidents", label: "Incidentes", stroke: "#f97316", fill: "#f97316", type: "area", yAxisId: "left" },
  { dataKey: "resolved", label: "Resolvidos", stroke: "#22c55e", type: "line", yAxisId: "right" }
];

export default function AdminSecurityOverviewPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const query = useQuery<AdminSecurityOverviewResponse>({
    queryKey: ["admin-security-overview"],
    queryFn: () => getAdminSecurityOverview()
  });

  const chartData = useMemo(() => {
    if (!query.data) return [];
    return query.data.cards.map((card, index) => ({
      label: `${index + 1}`,
      incidents: card.value,
      resolved: Math.max(card.value - Math.abs(card.trend), 0)
    }));
  }, [query.data]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-col gap-3 border-none p-4">
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="text-sm">Security Overview</CardTitle>
            <Badge variant={query.isError ? "destructive" : query.isLoading ? "warning" : "success"}>
              {query.isError ? "Erro" : query.isLoading ? "Carregando" : "Estável"}
            </Badge>
            <Button size="sm" variant="ghost" className="ml-auto">
              Exportar relatório
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Incidentes, vulnerabilidades e logins recentes consolidados com os dados mais recentes da infraestrutura.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          {(query.data?.cards ?? []).map((card) => (
            <MetricCard key={card.label} label={card.label} value={card.value} trend={card.trend} />
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Incidentes ao longo do tempo</CardTitle>
            <p className="text-xs text-muted-foreground">Série sintetizada baseada nos cards resumidos.</p>
          </div>
          <Badge variant="outline">{chartData.length} pontos</Badge>
        </CardHeader>
        <CardContent className="p-4">
          {query.isLoading ? (
            <SkeletonPlaceholder />
          ) : query.isError ? (
            <ErrorPlaceholder message="Não foi possível carregar o overview." />
          ) : (
            <GrafanaLineChart data={chartData} series={chartSeries} height={360} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Vulnerabilidades críticas</CardTitle>
            <p className="text-xs text-muted-foreground">Lista com título, severidade, status e responsável.</p>
          </div>
          <Button size="sm" variant="outline">
            Ver workflow completo
          </Button>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {(query.data?.vulnerabilities.list ?? []).map((vuln) => (
            <div
              key={vuln.id}
              className="rounded-xl border border-border/40 bg-[#0b0c12]/80 p-3 text-sm text-muted-foreground"
            >
              <div className="flex items-center justify-between">
                <p className="text-foreground font-semibold">{vuln.title}</p>
                <Badge variant={badgeVariantForSeverity(vuln.severity)} className="text-[11px]">
                  {vuln.status}
                </Badge>
              </div>
              <p className="text-xs">Detectado em {vuln.detected_at}</p>
              <p className="text-[11px]">Responsável: {vuln.owner}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Logins recentes</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {(query.data?.recent_logins ?? []).map((login) => (
            <div key={login.user} className="flex items-center justify-between rounded-xl border border-border/40 bg-[#0b0c12]/80 p-3">
              <div>
                <p className="text-sm text-foreground">{login.user}</p>
                <p className="text-[11px] text-muted-foreground">{login.status}</p>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {formatDistanceToNow(new Date(login.timestamp), { addSuffix: true })}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function badgeVariantForSeverity(severity: string) {
  if (severity === "critical") return "destructive";
  if (severity === "high") return "warning";
  return "default";
}

function MetricCard({ label, value, trend }: { label: string; value: number; trend: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
      <p className="text-[11px]">
        {trend >= 0 ? "+" : ""}
        {trend} vs. período anterior
      </p>
    </div>
  );
}

function SkeletonPlaceholder() {
  return <div className="h-[360px] rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#07090f] to-[#0f111c]" />;
}

function ErrorPlaceholder({ message }: { message: string }) {
  return (
    <div className="flex h-[360px] items-center justify-center rounded-3xl border border-dashed border-destructive/40 bg-[#110b12] text-sm text-destructive">
      {message}
    </div>
  );
}
