"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/role-guard";
import type { FinancialAlert } from "@/lib/conciliation";
import { fetchFinancialAlerts } from "@/lib/api";

const statusLabel = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  ignorado: "Ignorado"
};

const priorityColor: Record<string, "destructive" | "warning" | "success"> = {
  critica: "destructive",
  alta: "destructive",
  media: "warning",
  baixa: "success"
};

export default function AlertasPage() {
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["financial-alerts"],
    queryFn: () => fetchFinancialAlerts()
  });

  const grouped = useMemo(() => {
    return alerts.reduce((acc: Record<string, FinancialAlert[]>, alert) => {
      acc[alert.status] = acc[alert.status] ?? [];
      acc[alert.status].push(alert);
      return acc;
    }, {} as Record<string, FinancialAlert[]>);
  }, [alerts]);

  return (
    <RoleGuard allow="admin">
      <div className="space-y-4">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <div>
              <CardTitle>Alertas financeiros</CardTitle>
              <p className="text-xs text-muted-foreground">Acompanhe divergências críticas e ações em aberto.</p>
            </div>
            <Button variant="secondary">+ Novo alerta</Button>
          </CardHeader>
        </Card>
        {isLoading && (
          <div className="rounded-lg border border-dashed border-border/60 bg-[#0e0f15]/80 p-4 text-sm text-muted-foreground">
            Carregando alertas financeiros...
          </div>
        )}
        {Object.entries(grouped).map(([status, alerts]) => (
          <section key={status} className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.4em] text-muted-foreground">{statusLabel[status as keyof typeof statusLabel]}</h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        ))}
        {!isLoading && alerts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-[#0e0f15]/80 p-6 text-center text-sm text-muted-foreground">
            Nenhum alerta encontrado para os filtros atuais.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

function AlertCard({ alert }: { alert: FinancialAlert }) {
  return (
    <Card className="border-border/60 bg-[#0d0f16]/90">
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{alert.titulo}</p>
          <Badge variant={priorityColor[alert.prioridade] ?? "default"}>{alert.prioridade}</Badge>
        </div>
        <p className="text-xs text-muted-foreground">{alert.mensagem}</p>
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>{alert.company_cnpj}</span>
          <span>{new Date(alert.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline">Ver detalhes</Button>
          <Button size="sm" variant="ghost">Marcar como resolvido</Button>
        </div>
      </CardContent>
    </Card>
  );
}
