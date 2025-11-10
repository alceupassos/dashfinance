"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPayablesReport } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TargetSelector } from "@/components/alias-selector";
import { PeriodPicker } from "@/components/period-picker";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";
import { useEffectiveTarget } from "@/hooks/useEffectiveTarget";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export default function PayablesPage() {
  const { period } = useDashboardStore();
  const { effectiveCnpj } = useEffectiveTarget();
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "paid" | "overdue">("all");
  const [supplierSearch, setSupplierSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["report-payables", effectiveCnpj, period.from, period.to],
    queryFn: () =>
      getPayablesReport({
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
      if (statusFilter === "pending" && normalizedStatus !== "pending") return false;
      if (statusFilter === "paid" && normalizedStatus !== "paid") return false;
      if (statusFilter === "overdue" && !normalizedStatus.includes("overdue")) return false;
      if (supplierSearch.trim()) {
        const target = `${row.supplier} ${row.category}`.toLowerCase();
        if (!target.includes(supplierSearch.trim().toLowerCase())) return false;
      }
      return true;
    });
  }, [data, statusFilter, supplierSearch]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (acc, row) => {
        acc.total += row.value;
        if (row.status.toLowerCase().includes("overdue")) {
          acc.overdue += row.value;
        }
        if (row.status.toLowerCase() === "paid") {
          acc.paid += row.value;
        }
        return acc;
      },
      { total: 0, overdue: 0, paid: 0 }
    );
  }, [filteredRows]);

  const statusVariant = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === "paid") return "success";
    if (normalized.includes("overdue")) return "destructive";
    return "warning";
  };

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Contas a Pagar</CardTitle>
          <p className="text-[11px] text-muted-foreground">Previsão de pagamentos com status e vencimentos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <TargetSelector />
          <PeriodPicker />
          <Input
            placeholder="Filtrar fornecedor"
            value={supplierSearch}
            onChange={(event) => setSupplierSearch(event.target.value)}
            className="w-48 text-xs"
          />
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
            <SelectTrigger className="w-40 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="paid">Pagos</SelectItem>
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
            <p className="text-[11px] uppercase tracking-[0.3em]">Pagos</p>
            <p className="text-sm font-semibold text-foreground">{formatCurrency(summary.paid)}</p>
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
                <th>Fornecedor</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-[11px] text-muted-foreground">
                    Carregando contas a pagar...
                  </td>
                </tr>
              )}
              {!isLoading && filteredRows.map((row) => (
                <tr
                  key={`${row.dueDate}-${row.supplier}`}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td>{new Date(row.dueDate).toLocaleDateString("pt-BR")}</td>
                  <td>{row.supplier}</td>
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
                    Nenhuma conta a pagar encontrada.
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
