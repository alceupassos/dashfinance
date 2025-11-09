"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";
import {
  getAdminSecurityBackups,
  type AdminSecurityBackupsResponse,
  type AdminSecurityBackup
} from "@/lib/api";

const backupSeries: GrafanaSeriesConfig[] = [
  { dataKey: "duration", label: "Duração", stroke: "#38bdf8", type: "area", fill: "#38bdf8", yAxisId: "left", unit: "min" },
  { dataKey: "size", label: "Tamanho (MB)", stroke: "#8b5cf6", type: "line", yAxisId: "right" }
];

export default function AdminSecurityBackupsPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const query = useQuery<AdminSecurityBackupsResponse>({
    queryKey: ["admin-security-backups"],
    queryFn: () => getAdminSecurityBackups()
  });

  const chartData = useMemo(() => {
    if (!query.data) return [];
    return query.data.backups.map((backup) => ({
      label: backup.date,
      duration: backup.duration_seconds / 60,
      size: backup.size_mb
    }));
  }, [query.data]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Backups</CardTitle>
            <p className="text-[11px] text-muted-foreground">Histórico e indicadores de sucesso.</p>
          </div>
          <Badge variant="outline">{query.data?.stats.success_rate}% sucesso</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Sucesso" value={`${query.data?.stats.success_rate ?? "–"}%`} />
          <MetricCard label="Duração média" value={`${query.data?.stats.avg_duration_min ?? "–"} min`} />
          <MetricCard label="Último" value={query.data?.backups[0].status ?? "–"} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Histórico de duração</CardTitle>
            <p className="text-xs text-muted-foreground">Comparativo diário de tempo e tamanho.</p>
          </div>
          <Badge variant={query.isError ? "destructive" : query.isLoading ? "warning" : "success"}>
            {query.isError ? "Erro" : query.isLoading ? "Carregando" : "OK"}
          </Badge>
        </CardHeader>
        <CardContent className="p-4">
          {query.isLoading ? (
            <Skeleton />
          ) : query.isError ? (
            <ErrorPlaceholder />
          ) : (
            <GrafanaLineChart data={chartData} series={backupSeries} height={320} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Logs de backup</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-xs">
            <thead className="bg-[#0b0c12] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Data</th>
                <th>Status</th>
                <th>Duração</th>
                <th>Tamanho</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.backups ?? []).map((backup: AdminSecurityBackup) => (
                <tr key={backup.date} className="border-t border-border/40 hover:bg-secondary/20 text-foreground">
                  <td className="px-3 py-2">{backup.date}</td>
                  <td className="px-3 py-2">
                    <Badge variant={backup.status === "success" ? "success" : "destructive"}>{backup.status}</Badge>
                  </td>
                  <td className="px-3 py-2">{Math.round(backup.duration_seconds / 60)} min</td>
                  <td className="px-3 py-2">{backup.size_mb} MB</td>
                  <td className="px-3 py-2 text-muted-foreground">{backup.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 text-sm text-muted-foreground">
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold text-foreground">{value}</p>
    </div>
  );
}

function Skeleton() {
  return <div className="h-[320px] rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#07090f] to-[#0f111c]" />;
}

function ErrorPlaceholder() {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-destructive/40 bg-[#110b12] text-sm text-destructive">
      Falha ao carregar os backups.
    </div>
  );
}
