"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { postAnalyze } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface AnalysisSection {
  title: string;
  summary: string;
  highlights: string[];
  callouts: Array<{
    title: string;
    variant: "default" | "warning" | "error" | "success";
    message: string;
  }>;
}

const variantMap = {
  default: "default",
  warning: "warning",
  error: "destructive",
  success: "success"
} as const;

export default function AnalisesPage() {
  const { selectedTarget, analysisStyle } = useDashboardStore();

  const { data, isLoading, refetch, isFetching, error } = useQuery({
    queryKey: ["analysis", selectedTarget, analysisStyle],
    queryFn: () => postAnalyze(analysisStyle, selectedTarget),
    refetchOnWindowFocus: false
  });

  const sections = useMemo<AnalysisSection[]>(() => (data?.sections ?? []) as AnalysisSection[], [data]);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-sm font-semibold text-foreground">Análises Assistidas</h1>
        <Badge variant="outline">
          Estilo atual: {analysisStyle === "creative" ? "Criativo GPT-5" : "Técnico Claude"}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto"
          onClick={() => alert("Mock: geração de imagens ainda não configurada.")}
        >
          <Sparkles className="mr-2 h-3.5 w-3.5" />
          Gerar imagens ilustrativas
        </Button>
        <Button variant="secondary" size="sm" onClick={() => refetch()} disabled={isFetching}>
          Reprocessar análise
        </Button>
      </header>

      {(isLoading || (!data && !error)) && (
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardContent className="p-6 text-xs text-muted-foreground">
            Carregando narrativa do oráculo...
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 text-xs text-destructive">
            Não foi possível gerar a análise automaticamente. Tente novamente ou ajuste o período.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {sections.map((section) => (
          <Card key={section.title} className="border-border/60 bg-[#11111a]/80">
            <CardHeader className="border-none p-4">
              <CardTitle className="text-sm">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 text-xs text-muted-foreground">
              <p className="text-foreground">{section.summary}</p>
              <div className="flex flex-wrap gap-2">
                {section.highlights.map((highlight) => (
                  <Badge key={highlight} variant="success">
                    {highlight}
                  </Badge>
                ))}
              </div>
              <div className="space-y-2">
                {section.callouts.map((callout) => (
                  <div
                    key={callout.message}
                    className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-foreground"
                  >
                    <p className="mb-1 text-[11px] uppercase text-muted-foreground">{callout.title}</p>
                    <Badge variant={variantMap[callout.variant]} className="mb-2">
                      {callout.variant.toUpperCase()}
                    </Badge>
                    <p className="text-muted-foreground">{callout.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
