"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GrafanaLineChart, type GrafanaSeriesConfig } from "@/components/admin-security/grafana-line-chart";
import type { DivergenceReport } from "@/lib/conciliation";
import { fetchDivergenceReports } from "@/lib/api";

const chartSeries: GrafanaSeriesConfig[] = [
  { dataKey: "diferencia", label: "Diferença", stroke: "#f97316", type: "area", fill: "#f97316", yAxisId: "left" },
  { dataKey: "percentual", label: "% Divergente", stroke: "#8b5cf6", type: "line", yAxisId: "right", unit: "%" }
];

const statusColors: Record<string, "destructive" | "warning" | "success"> = {
  pendente: "warning",
  alerta: "destructive",
  resolvido: "success"
};

export default function DivergenciasPage() {
  const [search, setSearch] = useState("");
  const { data: divergences = [], isLoading } = useQuery({
    queryKey: ["divergence-reports"],
    queryFn: () => fetchDivergenceReports()
  });
  const filtered = useMemo(() => {
    return divergences.filter((item) =>
      item.company_cnpj.includes(search) || item.banco_codigo.includes(search) || item.tipo.includes(search)
    );
  }, [divergences, search]);

  const summary = {
    total: divergences.length,
    pendentes: divergences.filter((item) => item.status === "pendente").length,
    alertas: divergences.filter((item) => item.status === "alerta").length,
    resolvidas: divergences.filter((item) => item.status === "resolvido").length
  };

  const chartData = useMemo(() =>
    divergences.map((item, index) => ({
      label: `${index + 1}`,
      diferencia: item.diferenca,
      percentual: item.percentual
    }))
  , [divergences]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-wrap items-center gap-4 border-none p-4">
          <div>
            <CardTitle className="text-lg">Relatório de Divergências</CardTitle>
            <p className="text-xs text-muted-foreground">Taxas divergentes, saldos e conciliações com diferença.</p>
          </div>
          <Button variant="secondary">Exportar CSV</Button>
        </CardHeader>
        <CardContent className="grid gap-3 border-t border-border/40 p-4">
          <div className="grid gap-3 sm:grid-cols-4 text-sm text-muted-foreground">
            <Metric label="Total" value={summary.total} />
            <Metric label="Pendentes" value={summary.pendentes} />
            <Metric label="Alertas" value={summary.alertas} />
            <Metric label="Resolvidas" value={summary.resolvidas} />
          </div>
          <div className="flex gap-3">
            <Input placeholder="Pesquisar tipo, CNPJ ou banco" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button variant="outline">Filtrar</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Tendência diária</CardTitle>
            <p className="text-xs text-muted-foreground">Diferencial em reais vs porcentagem dos últimos relatos.</p>
          </div>
          <Badge variant="outline">{chartData.length} pontos</Badge>
        </CardHeader>
        <CardContent className="p-4">
          <GrafanaLineChart data={chartData} series={chartSeries} height={320} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#0c0d14]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Divergências em detalhe</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {isLoading && (
            <div className="rounded-2xl border border-dashed border-border/40 bg-[#101117]/70 p-6 text-center text-sm text-muted-foreground">
              Carregando divergências...
            </div>
          )}
          {filtered.map((item) => (
            <DivergenceRow key={item.id} item={item} />
          ))}
          {!isLoading && filtered.length === 0 && (
            <p className="text-center text-sm text-muted-foreground">Sem divergências para os filtros aplicados.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}

function DivergenceRow({ item }: { item: DivergenceReport }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-[#101117]/80 p-4 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-lg font-semibold text-foreground">{item.tipo.replace(/_/g, " ")}</p>
          <p className="text-[11px]">Empresa {item.company_cnpj} · Banco {item.banco_codigo}</p>
        </div>
        <Badge variant={statusColors[item.status]}> {item.status} </Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-3 pt-3 text-[13px]">
        <p>Esperado: {item.esperado}</p>
        <p>Cobrado: {item.cobrado}</p>
        <p>Diferença: {item.diferenca.toFixed(2)} ({item.percentual}%)</p>
      </div>
      <div className="flex gap-3 pt-3 text-[11px]">
        <Button size="sm" variant="outline">Detalhes</Button>
        <Button size="sm" variant="ghost">Criar alerta</Button>
        <Button size="sm" variant="outline">Marcar resolvido</Button>
      </div>
    </div>
  );
}
