"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getReceivablesReport } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetSelector } from "@/components/alias-selector";
import { PeriodPicker } from "@/components/period-picker";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { useEffectiveTarget } from "@/hooks/useEffectiveTarget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function ReceivablesPage() {
  const { period } = useDashboardStore();
  const { effectiveCnpj } = useEffectiveTarget();
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "received" | "overdue">("all");
  const [clientSearch, setClientSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-receivables", effectiveCnpj, period.from, period.to],
    queryFn: () =>
      getReceivablesReport({
        cnpj: effectiveCnpj ?? undefined,
        from: period.from,
        to: period.to
      }),
    enabled: Boolean(effectiveCnpj)
  });

  const filteredRows = useMemo(() => {
    if (!data) return [];
    return data.filter((row) => {
      const normalizedStatus = row.status.toLowerCase();
      if (statusFilter === "open" && normalizedStatus !== "open") return false;
      if (statusFilter === "received" && normalizedStatus !== "received") return false;
      if (statusFilter === "overdue" && !normalizedStatus.includes("overdue")) return false;
      if (clientSearch.trim()) {
        const target = `${row.client} ${row.category}`.toLowerCase();
        if (!target.includes(clientSearch.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [data, statusFilter, clientSearch]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.total += row.value;
        if (row.status.toLowerCase().includes("overdue")) {
          acc.overdue += row.value;
        }
        if (row.status.toLowerCase() === "received") {
          acc.received += row.value;
        }
        return acc;
      },
      { total: 0, overdue: 0, received: 0 }
    );
  }, [filteredRows]);

  const statusVariant = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "open") return "outline";
    if (normalized.includes("overdue")) return "destructive";
    return "success";
  };

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Contas a Receber</CardTitle>
          <p className="text-[11px] text-muted-foreground">Cobranças por cliente com status operacional.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TargetSelector />
          <PeriodPicker />
          <Input
            placeholder="Filtrar cliente"
            value={clientSearch}
            onChange={(event) => setClientSearch(event.target.value)}
            className="w-48 text-xs"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="open">Em aberto</SelectItem>
              <SelectItem value="received">Recebidos</SelectItem>
              <SelectItem value="overdue">Atrasados</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-3 p-4 pb-0 text-xs text-muted-foreground sm:grid-cols-3">
          <div className="rounded-md border border-border/60 bg-[#11111a]/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.3em]">Total filtrado</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.total)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-[#11111a]/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.3em]">Recebidos</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.received)}</p>
          </div>
          <div className="rounded-md border border-border/60 bg-[#11111a]/80 p-3">
            <p className="text-[11px] uppercase tracking-[0.3em]">Atrasados</p>
            <p className="text-sm font-semibold text-foreground text-destructive">{formatCurrency(summary.overdue)}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Vencimento</th>
                <th>Cliente</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                    Carregando contas a receber...
                  </td>
                </tr>
              )}
              {!isLoading && filteredRows.map((row) => (
                <tr
                  key={`${row.dueDate}-${row.client}`}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td>{new Date(row.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td>{row.client}</td>
                  <td>{row.category}</td>
                  <td>{formatCurrency(row.value)}</td>
                  <td>
                    <Badge variant={statusVariant(row.status)}>{row.status}</Badge>
                  </td>
                </tr>
              ))}
              {!isLoading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                    Nenhuma conta a receber encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
