"use client"

import { useEffect, useMemo, useState } from "react"
import MetricsCard from "@/components/metrics-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Brain, Zap, TrendingDown } from "lucide-react"

interface UsageSlice {
  provider: string
  model: string
  task_type: string | null
  total_tokens: number
  cost_usd: number
}

interface Recommendation {
  id: string
  title: string
  description: string
  potential_saving_usd: number
  enabled: boolean
}

export default function LLMOptimizerPage() {
  const [usage, setUsage] = useState<UsageSlice[]>([])
  const [recommendations, setRecommendations] = useState<Recommendation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsage()
  }, [])

  const fetchUsage = async () => {
    try {
      const { data } = await supabase
        .from("llm_token_usage")
        .select("provider,model,task_type,total_tokens,cost_usd")
        .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      setUsage((data as UsageSlice[]) || [])
    } catch (error) {
      console.error("Error fetching LLM usage:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (usage.length === 0) return
    const grouped = usage.reduce<Record<string, UsageSlice>>((acc, slice) => {
      const key = `${slice.provider}-${slice.task_type}`
      acc[key] = acc[key]
        ? {
            ...acc[key],
            total_tokens: acc[key].total_tokens + slice.total_tokens,
            cost_usd: acc[key].cost_usd + slice.cost_usd,
          }
        : slice
      return acc
    }, {})

    const recs: Recommendation[] = Object.values(grouped).map((slice) => {
      const cheaperModel =
        slice.provider === "openai" && slice.model.includes("gpt-4") ? "gpt-4o-mini" : "gpt-3.5-turbo"
      const saving = slice.cost_usd * 0.35
      return {
        id: `${slice.provider}-${slice.task_type}`,
        title: `Migrar ${slice.task_type || "tarefas"} para ${cheaperModel}`,
        description: `Uso atual de ${slice.model} custa ~$${slice.cost_usd.toFixed(
          2
        )}/mês. Recomendamos uma troca para ${cheaperModel} quando possível.`,
        potential_saving_usd: saving,
        enabled: true,
      }
    })

    setRecommendations(recs)
  }, [usage])

  const totalCost = useMemo(() => usage.reduce((acc, slice) => acc + slice.cost_usd, 0), [usage])
  const potentialSaving = useMemo(
    () => recommendations.filter((rec) => rec.enabled).reduce((acc, rec) => acc + rec.potential_saving_usd, 0),
    [recommendations]
  )

  const toggleRecommendation = (id: string, enabled: boolean) => {
    setRecommendations((prev) => prev.map((rec) => (rec.id === id ? { ...rec, enabled } : rec)))
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Otimizador de Tokens</h1>
        <p className="text-muted-foreground">
          Sugestões automáticas para reduzir o custo com modelos de linguagem.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard
          title="Custo mensal estimado"
          value={`$${totalCost.toFixed(2)}`}
          icon={<Brain className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricsCard
          title="Economia potencial"
          value={`$${potentialSaving.toFixed(2)}`}
          status={potentialSaving > 0 ? "success" : "default"}
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricsCard
          title="Sugestões ativas"
          value={recommendations.filter((rec) => rec.enabled).length}
          icon={<Zap className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Sugestões automáticas</CardTitle>
          <CardDescription>Ative/desative as recomendações antes de aplicá-las no backend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {recommendations.map((rec) => (
            <div key={rec.id} className="rounded-xl border p-4">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{rec.title}</h3>
                  <p className="text-sm text-muted-foreground">{rec.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Potencial de economia</p>
                  <p className="text-xl font-semibold text-green-500">${rec.potential_saving_usd.toFixed(2)}</p>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between border-t pt-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Switch checked={rec.enabled} onCheckedChange={(value) => toggleRecommendation(rec.id, value)} />
                  <Label>Aplicar sugestão</Label>
                </div>
                <Button variant="outline" size="sm">
                  Gerar plano de migração
                </Button>
              </div>
            </div>
          ))}
          {recommendations.length === 0 && (
            <p className="text-center text-muted-foreground">Nenhuma recomendação foi gerada para este período.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
