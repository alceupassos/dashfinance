"use client";

import { useDashboardStore } from "@/store/use-dashboard-store";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

export function AnalysisStyleToggle() {
  const { analysisStyle, toggleAnalysisStyle } = useDashboardStore();

  return (
    <div className="flex items-center gap-2 rounded-md border border-border/70 bg-secondary/30 px-3 py-2">
      <Badge variant={analysisStyle === "creative" ? "success" : "outline"}>Criativo (GPT-5)</Badge>
      <Switch checked={analysisStyle === "technical"} onCheckedChange={toggleAnalysisStyle} />
      <Badge variant={analysisStyle === "technical" ? "success" : "outline"}>Técnico (Claude)</Badge>
    </div>
  );
}
