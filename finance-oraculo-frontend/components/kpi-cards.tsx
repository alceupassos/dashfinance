import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/formatters";

interface KpiItem {
  label: string;
  value: number;
  delta?: number;
  caption?: string;
}

interface KpiCardsProps {
  items: KpiItem[];
}

export function KpiCards({ items }: KpiCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {items.map((item) => {
        const isPercent = item.label.toLowerCase().includes("%") || item.label.toLowerCase().includes("margem");
        const normalizedValue =
          isPercent && Math.abs(item.value) > 1 ? item.value / 100 : item.value;
        const formattedValue = isPercent ? formatPercent(normalizedValue) : formatCurrency(item.value);

        const hasDelta = typeof item.delta === "number";
        const normalizedDelta =
          hasDelta && Math.abs(item.delta!) > 1 ? item.delta! / 100 : item.delta ?? 0;
        const trendPositive = hasDelta ? normalizedDelta >= 0 : undefined;

        return (
          <Card key={item.label} className="border-border/60 bg-[#13131f]/80">
            <CardContent className="space-y-2 p-3">
              <CardTitle className="text-[11px] font-medium text-muted-foreground">{item.label}</CardTitle>
              <div className="text-sm font-semibold text-foreground">{formattedValue}</div>
              {(hasDelta || item.caption) && (
                <div className="flex items-center justify-between text-[11px]">
                  {hasDelta ? (
                    <Badge
                      variant={trendPositive ? "success" : "destructive"}
                      className="gap-1"
                    >
                      {trendPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {formatPercent(normalizedDelta ?? 0, 1)}
                    </Badge>
                  ) : (
                    <span />
                  )}
                  {item.caption && (
                    <CardDescription className="text-right text-[10px] text-muted-foreground">
                      {item.caption}
                    </CardDescription>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
