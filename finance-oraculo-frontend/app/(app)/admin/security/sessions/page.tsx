"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";
import {
  getAdminSecuritySessions,
  type AdminSecuritySessionsResponse,
  type AdminSecuritySession
} from "@/lib/api";

const chartSeries: GrafanaSeriesConfig[] = [
  { dataKey: "active", label: "Ativas", stroke: "#22c55e", fill: "#22c55e", type: "area", yAxisId: "left" },
  { dataKey: "failed", label: "Falhas", stroke: "#f97316", type: "line", yAxisId: "right" }
];

export default function AdminSecuritySessionsPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const query = useQuery<AdminSecuritySessionsResponse>({
    queryKey: ["admin-security-sessions"],
    queryFn: () => getAdminSecuritySessions()
  });

  const chartData = useMemo(() => {
    if (!query.data) return [];
    return query.data.sessions.map((session, index) => ({
      label: `#${index + 1}`,
      active: session.status === "active" ? 1 : 0,
      failed: session.status !== "active" ? 1 : 0
    }));
  }, [query.data]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Sessões ativas</CardTitle>
            <p className="text-[11px] text-muted-foreground">Total: {query.data?.sessions.length ?? 0}</p>
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
            <GrafanaLineChart data={chartData} series={chartSeries} height={320} />
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <CardTitle className="text-sm">Sessões recentes</CardTitle>
          <Badge variant="outline">{query.data?.sessions.length ?? 0} registros</Badge>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <table className="min-w-full text-xs">
            <thead className="bg-[#0b0c12] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Usuário</th>
                <th>IP</th>
                <th>Dispositivo</th>
                <th>Local</th>
                <th>Status</th>
                <th>Última atividade</th>
              </tr>
            </thead>
            <tbody>
              {(query.data?.sessions ?? []).map((session: AdminSecuritySession) => (
                <tr key={`${session.user}-${session.ip}`} className="border-t border-border/40 hover:bg-secondary/20 text-foreground">
                  <td className="px-3 py-2">{session.user}</td>
                  <td className="px-3 py-2">{session.ip}</td>
                  <td className="px-3 py-2">{session.device}</td>
                  <td className="px-3 py-2">{session.location}</td>
                  <td className="px-3 py-2">
                    <Badge variant={session.status === "active" ? "success" : "destructive"}>{session.status}</Badge>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{session.last_activity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function Skeleton() {
  return <div className="h-[320px] rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#07090f] to-[#0f111c]" />;
}

function ErrorPlaceholder() {
  return (
    <div className="flex h-[320px] items-center justify-center rounded-3xl border border-dashed border-destructive/40 bg-[#110b12] text-sm text-destructive">
      Falha ao carregar as sessões.
    </div>
  );
}
