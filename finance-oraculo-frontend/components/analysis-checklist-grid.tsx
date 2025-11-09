"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChecklistSection } from "@/lib/analysis-builder";

interface AnalysisChecklistGridProps {
  sections: ChecklistSection[];
}

export function AnalysisChecklistGrid({ sections }: AnalysisChecklistGridProps) {
  if (!sections.length) return null;
  return (
    <div className="space-y-3">
      {sections.map((section) => (
        <Card key={section.timeframe} className="border-border/60 bg-[#0d0f16]">
          <CardHeader className="space-y-1 border-none p-5">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{section.title}</CardTitle>
              <span className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">{section.timeframe}</span>
            </div>
            <p className="text-sm text-muted-foreground">{section.subtitle}</p>
          </CardHeader>
          <CardContent className="space-y-2 border-t border-border/40 px-5 py-4 text-sm text-foreground">
            {section.items.length ? (
              <ol className="space-y-2 list-decimal list-inside">
                {section.items.map((item, index) => (
                  <li key={`${section.timeframe}-${index}`}>{item}</li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">Sem tarefas específicas para este período.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
