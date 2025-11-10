"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { useOracleConfigStore } from "@/store/use-oracle-config-store";
import { useUserStore } from "@/store/use-user-store";
import { formatCurrency } from "@/lib/formatters";

const MODEL_LABELS: Record<string, string> = {
  "chatgpt-5-thinking": "ChatGPT 5 Thinking",
  "gpt-4o-mini": "GPT-4o Mini",
  "claude-sonnet-4-5-20250929": "Claude Sonnet 4.5"
};

function formatModelLabel(modelId: string) {
  return MODEL_LABELS[modelId] ?? modelId;
}

export function DashboardOracle() {
  const { selectedTarget, period } = useDashboardStore();
  const { profile } = useUserStore();
  const getSettingsForUser = useOracleConfigStore((state) => state.getSettingsForUser);

  const settings = useMemo(() => getSettingsForUser(profile?.id ?? null), [getSettingsForUser, profile?.id]);

  const insights = useMemo(() => {
    const targetLabel =
      selectedTarget.type === "alias"
        ? `Alias ${selectedTarget.value}`
        : `CNPJ ${selectedTarget.value}`;
    const horizon = `${period.from} → ${period.to}`;
    const sentiment = period.to ? "em alta" : "estável";
    const revenue = formatCurrency((selectedTarget as any).revenue ?? 0);
    return [
      `Cliente monitorado: ${targetLabel}`,
      `Período analisado: ${horizon}`,
      `Receita recente estimada: ${revenue} (${sentiment})`,
      "Próximas ações recomendadas: revisar recebíveis em atraso e validar alertas críticos."
    ];
  }, [selectedTarget, period.from, period.to]);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Oráculo Inteligente</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Respostas rápidas sobre o cliente atribuído. Modelos configurados no menu Admin.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px]">
          <Badge variant="outline">{formatModelLabel(settings.webModel)} (web)</Badge>
          <Badge variant="outline">{formatModelLabel(settings.whatsappModel)} (WhatsApp)</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-xs text-muted-foreground">
        {insights.map((line) => (
          <p key={line} className="text-foreground/80">
            {line}
          </p>
        ))}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button size="sm" variant="outline">
            Atualizar análise
          </Button>
          <Button size="sm">
            Enviar insight por WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
