"use client"

import { useEffect, useState } from "react"
import TimelineChart from "@/components/timeline-chart"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { supabase } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Clock, AlertTriangle } from "lucide-react"

interface WorkflowRun {
  id: string
  workflow_id: string
  workflow_name: string
  status: "success" | "error" | "running"
  started_at: string
  finished_at: string | null
  duration_ms: number | null
  error_message: string | null
}

export default function N8NMonitorPage() {
  const [runs, setRuns] = useState<WorkflowRun[]>([])

  useEffect(() => {
    fetchRuns()
    const interval = setInterval(fetchRuns, 15000)
    return () => clearInterval(interval)
  }, [])

  const fetchRuns = async () => {
    const { data } = await supabase
      .from("n8n_workflow_runs")
      .select("*")
      .order("started_at", { ascending: false })
      .limit(50)
    setRuns((data as WorkflowRun[]) || [])
  }

  const timelineData = runs
    .slice()
    .reverse()
    .map((run) => ({
      label: new Date(run.started_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      value: run.duration_ms ? Math.round(run.duration_ms / 1000) : 0,
      secondaryValue: run.status === "error" ? 1 : 0,
    }))

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoramento N8N</h1>
        <p className="text-muted-foreground">Execuções em tempo quase real e taxa de sucesso.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Execuções recentes</CardTitle>
          <CardDescription>Tempo de execução x falhas</CardDescription>
        </CardHeader>
        <CardContent>
          <TimelineChart
            data={timelineData}
            labelFormatter={(label) => label}
            valueFormatter={(value) => `${value}s`}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Feed de execuções</CardTitle>
          <CardDescription>Atualizado a cada 15 segundos</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workflow</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Início</TableHead>
                <TableHead>Duração</TableHead>
                <TableHead>Mensagem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>{run.workflow_name}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        run.status === "success" ? "default" : run.status === "running" ? "outline" : "destructive"
                      }
                      className="capitalize"
                    >
                      {run.status === "success" && <CheckCircle className="mr-1 h-3 w-3" />}
                      {run.status === "running" && <Clock className="mr-1 h-3 w-3" />}
                      {run.status === "error" && <AlertTriangle className="mr-1 h-3 w-3" />}
                      {run.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{new Date(run.started_at).toLocaleString("pt-BR")}</TableCell>
                  <TableCell>{run.duration_ms ? `${Math.round(run.duration_ms / 1000)}s` : "—"}</TableCell>
                  <TableCell className="text-sm text-red-500">
                    {run.error_message ? run.error_message.slice(0, 80) : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {runs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Nenhuma execução registrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
