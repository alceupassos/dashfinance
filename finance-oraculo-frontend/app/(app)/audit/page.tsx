"use client";

import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthGrid, HealthItem } from "@/components/health-grid";
import { getAuditHealth } from "@/lib/api";
import { formatShortDate } from "@/lib/formatters";

export default function AuditPage() {
  const { data } = useQuery({
    queryKey: ["audit-health"],
    queryFn: () => getAuditHealth()
  });

  if (!data) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-6 text-xs text-muted-foreground">
          Carregando métricas de auditoria...
        </CardContent>
      </Card>
    );
  }

  const summaryItems = [
    {
      label: "Último sync",
      value: formatShortDate(data.summary.lastSync),
      icon: Clock,
      variant: "outline" as const
    },
    {
      label: "CNPJs OK",
      value: data.summary.cnpjsOk,
      icon: CheckCircle2,
      variant: "success" as const
    },
    {
      label: "Em alerta",
      value: data.summary.cnpjsAlert,
      icon: AlertTriangle,
      variant: "warning" as const
    }
  ];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Health Check consolidado</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between rounded-md border border-border/60 bg-secondary/20 px-3 py-3 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-primary" />
                <span>{item.label}</span>
              </div>
              <Badge variant={item.variant}>{item.value}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Status por CNPJ (semáforo)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <HealthGrid items={data.status as HealthItem[]} />
        </CardContent>
      </Card>
    </div>
  );
}
