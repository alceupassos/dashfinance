import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/formatters";

export interface HealthItem {
  cnpj: string;
  empresa: string;
  status: "GREEN" | "YELLOW" | "RED";
  dreLinhas: number;
  fluxoLinhas: number;
  ultimoSync: string;
}

const statusConfig: Record<HealthItem["status"], { label: string; badge: "success" | "warning" | "destructive" }> = {
  GREEN: { label: "OK", badge: "success" },
  YELLOW: { label: "Atenção", badge: "warning" },
  RED: { label: "Crítico", badge: "destructive" }
};

export function HealthGrid({ items }: { items: HealthItem[] }) {
  return (
    <div className="grid gap-3 lg:grid-cols-3">
      {items.map((item) => {
        const status = statusConfig[item.status];
        return (
          <Card key={item.cnpj} className="border-border/60 bg-[#11111a]/80">
            <CardHeader className="flex flex-row items-center justify-between gap-2 border-none p-3">
              <CardTitle className="text-sm">{item.empresa}</CardTitle>
              <Badge variant={status.badge}>{status.label}</Badge>
            </CardHeader>
            <CardContent className="space-y-2 p-3 text-xs text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>CNPJ</span>
                <span className="text-foreground">{item.cnpj}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 rounded-md border border-border/50 bg-secondary/20 p-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Linhas DRE (120d)</p>
                  <p className="font-semibold text-foreground">{item.dreLinhas}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Linhas Fluxo</p>
                  <p className="font-semibold text-foreground">{item.fluxoLinhas}</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span>Último sync</span>
                <span>{formatShortDate(item.ultimoSync)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
