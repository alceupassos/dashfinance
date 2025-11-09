"use client";

import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatPercent } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { DashboardCard } from "@/lib/api";

interface DashboardCardsGridProps {
  cards?: DashboardCard[];
  loading?: boolean;
}

const skeletonCount = 12;

export function DashboardCardsGrid({ cards = [], loading }: DashboardCardsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: skeletonCount }).map((_, index) => (
          <Card key={`skeleton-${index}`} className="border-border/60 bg-[#13131f]/80">
            <CardContent className="space-y-3 p-4">
              <div className="h-3 w-3/4 animate-pulse rounded-full bg-border"></div>
              <div className="h-6 w-full animate-pulse rounded-xl bg-border" />
              <div className="h-2 w-1/2 animate-pulse rounded-full bg-border" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.id} className="border-border/60 bg-[#0e0f16]/80">
          <CardContent className="space-y-2 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{card.label}</p>
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-lg font-semibold text-foreground">
                  {formatCardValue(card)}
                </p>
                {card.caption && <p className="text-[11px] text-muted-foreground">{card.caption}</p>}
              </div>
              {card.delta !== undefined && (
                <Badge
                  variant={card.delta >= 0 ? "success" : "destructive"}
                  className="flex items-center gap-1 text-[10px] font-semibold"
                >
                  {card.delta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {formatPercent(card.delta)}
                </Badge>
              )}
            </div>
            {card.trend && (
              <p
                className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  card.trend === "up" && "text-emerald-300",
                  card.trend === "down" && "text-rose-300",
                  card.trend === "flat" && "text-muted-foreground"
                )}
              >
                {card.trend === "up" && <ArrowUpRight className="h-3 w-3" />}
                {card.trend === "down" && <ArrowDownRight className="h-3 w-3" />}
                {card.trend === "flat" && <span className="h-3 w-3 rounded-full border border-muted-foreground/60" />}
                Sinal {card.trend}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function formatCardValue(card: DashboardCard) {
  const isPercent = /margem|dso|dpo|variação/i.test(card.label) || (card.suffix ?? "").includes("%");
  if (isPercent) {
    return formatPercent(card.value);
  }
  if (card.suffix) {
    return `${formatNumber(card.value)} ${card.suffix}`;
  }
  return formatCurrency(card.value);
}

function formatNumber(value: number) {
  return String(value.toFixed(value % 1 === 0 ? 0 : 2));
}
