import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/formatters";

export interface DenseTableRow {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  margin_percent: number;
}

export function DenseTable({ rows }: { rows: DenseTableRow[] }) {
  return (
    <Card className="col-span-12 overflow-hidden border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-row items-center justify-between gap-3 border-none p-4">
        <CardTitle className="text-sm">Resumo DRE consolidado</CardTitle>
        <span className="text-[11px] text-muted-foreground">Tabela densa com cabeçalho sticky</span>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[300px] overflow-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Competência</th>
                <th>Receita Líquida</th>
                <th>Despesas</th>
                <th>Lucro</th>
                <th>Margem</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.month}
                  className="border-t border-border/50 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">{row.month}</td>
                  <td>{formatCurrency(row.revenue)}</td>
                  <td>{formatCurrency(row.expenses)}</td>
                  <td>{formatCurrency(row.profit)}</td>
                  <td>{formatPercent(row.margin_percent > 1 ? row.margin_percent / 100 : row.margin_percent, 1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
