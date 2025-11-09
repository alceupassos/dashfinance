"use client";

import { useQuery } from "@tanstack/react-query";
import { getPayablesReport } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { mockTargets } from "@/lib/api";
import { formatCurrency } from "@/lib/formatters";
import { Badge } from "@/components/ui/badge";

export default function PayablesPage() {
  const { selectedTarget, setTarget } = useDashboardStore();
  const cnpjOptions = mockTargets.cnpjs;
  const currentCnpj = selectedTarget.type === "cnpj" ? selectedTarget.value : cnpjOptions[0]?.value ?? "";

  const { data, isLoading } = useQuery({
    queryKey: ["report-payables", currentCnpj],
    queryFn: () => getPayablesReport({ cnpj: currentCnpj }),
    enabled: Boolean(currentCnpj)
  });

  const statusVariant = (status: string) => {
    if (status === "Paid") return "success";
    if (status === "Overdue") return "destructive";
    return "warning";
  };

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Contas a Pagar</CardTitle>
          <p className="text-[11px] text-muted-foreground">Previsão de pagamentos com status e vencimentos.</p>
        </div>
        <Select value={currentCnpj} onValueChange={(value) => setTarget({ type: "cnpj", value })}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Selecionar empresa" />
          </SelectTrigger>
          <SelectContent>
            {cnpjOptions.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.value} — {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="p-0">
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
              {!isLoading && data?.map((row) => (
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
              {!isLoading && (!data || data.length === 0) && (
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
