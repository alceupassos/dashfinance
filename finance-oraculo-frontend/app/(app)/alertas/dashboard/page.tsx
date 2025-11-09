"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinancialAlert, mockAlerts } from "@/lib/conciliation";

const statusLabel = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  ignorado: "Ignorado"
};

const priorityBadges: Record<string, "destructive" | "warning" | "success"> = {
  critica: "destructive",
  alta: "destructive",
  media: "warning",
  baixa: "success"
};

export default function AlertasDashboardPage() {
  const [activeTab, setActiveTab] = useState<string>("todos");
  const grouped = useMemo(() => {
    return mockAlerts.reduce((acc: Record<string, FinancialAlert[]>, alert) => {
      const key = alert.prioridade;
      acc[key] = acc[key] ?? [];
      acc[key].push(alert);
      return acc;
    }, {} as Record<string, FinancialAlert[]>);
  }, []);

  const filtered = activeTab === "todos" ? mockAlerts : grouped[activeTab] ?? [];
  const stats = (Object.keys(grouped) as Array<keyof typeof grouped>).map((key) => ({ label: key, count: grouped[key].length }));

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-none p-4">
          <div>
            <CardTitle className="text-lg">Central de Alertas</CardTitle>
            <p className="text-xs text-muted-foreground">Dados, notificações WhatsApp e ações em um só lugar.</p>
          </div>
          <Button variant="secondary">Configurar alerta</Button>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button size="sm" variant={activeTab === "todos" ? "secondary" : "outline"} onClick={() => setActiveTab("todos")}>
            Todos ({mockAlerts.length})
          </Button>
          {stats.map((stat) => (
            <Button
              key={stat.label}
              size="sm"
              variant={activeTab === stat.label ? "secondary" : "outline"}
              onClick={() => setActiveTab(stat.label)}
            >
              {stat.label} ({stat.count})
            </Button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((alert) => (
          <Card key={alert.id} className="border-border/60 bg-[#0c0d14]/80">
            <CardHeader className="flex items-center justify-between border-none p-4">
              <div>
                <p className="text-sm font-semibold text-foreground">{alert.titulo}</p>
                <p className="text-[11px] text-muted-foreground">{alert.mensagem}</p>
              </div>
              <Badge variant={priorityBadges[alert.prioridade]}>{alert.prioridade}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Status: {statusLabel[alert.status as keyof typeof statusLabel]}</p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline">
                  Detalhes
                </Button>
                <Button size="sm" variant="ghost">
                  Marcar como lido
                </Button>
                <Button size="sm" variant="secondary">
                  Snooze
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Timeline WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 p-4 text-sm text-muted-foreground">
          {filtered.slice(0, 5).map((alert) => (
            <div key={`msg-${alert.id}`} className="flex items-center justify-between rounded-xl border border-border/30 bg-[#0b0c12]/80 p-3">
              <div>
                <p className="text-foreground">{alert.titulo}</p>
                <p className="text-[11px]">Enviado via WhatsApp · {alert.created_at}</p>
              </div>
              <Badge variant="outline">WhatsApp</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
