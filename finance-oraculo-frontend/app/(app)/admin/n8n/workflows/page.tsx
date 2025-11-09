"use client"

import { useEffect, useState } from "react"
import MetricsCard from "@/components/metrics-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Wrench, Play, Pause, Plus, FileText } from "lucide-react"

interface Workflow {
  id: string
  name: string
  status: "active" | "inactive"
  last_run_at: string | null
  runs_count: number
  error_count: number
  description: string | null
}

export default function N8NWorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ name: "", description: "" })

  useEffect(() => {
    fetchWorkflows()
  }, [])

  const fetchWorkflows = async () => {
    const { data } = await supabase.from("n8n_workflows").select("*").order("name")
    setWorkflows((data as Workflow[]) || [])
  }

  const activateWorkflow = async (workflow: Workflow, active: boolean) => {
    await supabase.from("n8n_workflows").update({ status: active ? "active" : "inactive" }).eq("id", workflow.id)
    fetchWorkflows()
  }

  const createWorkflow = async () => {
    await supabase.from("n8n_workflows").insert({
      name: form.name,
      description: form.description,
      status: "inactive",
    })
    setDialogOpen(false)
    setForm({ name: "", description: "" })
    fetchWorkflows()
  }

  const activeCount = workflows.filter((wf) => wf.status === "active").length
  const failingCount = workflows.filter((wf) => wf.error_count > 0).length

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows N8N</h1>
          <p className="text-muted-foreground">Crie, ative ou pause automações do oráculo financeiro.</p>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Criar workflow
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <MetricsCard title="Workflows ativos" value={activeCount} icon={<Play className="h-4 w-4 text-muted-foreground" />} />
        <MetricsCard
          title="Com alertas"
          value={failingCount}
          status={failingCount > 0 ? "warning" : "success"}
          icon={<Wrench className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricsCard
          title="Executados hoje"
          value={workflows.reduce((acc, wf) => acc + (wf.runs_count || 0), 0)}
          icon={<FileText className="h-4 w-4 text-muted-foreground" />}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de workflows</CardTitle>
          <CardDescription>Status, últimas execuções e ações rápidas</CardDescription>
        </CardHeader>
        <CardContent className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última execução</TableHead>
                <TableHead>Execuções</TableHead>
                <TableHead>Erros</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {workflows.map((wf) => (
                <TableRow key={wf.id}>
                  <TableCell>
                    <div className="font-medium">{wf.name}</div>
                    <p className="text-xs text-muted-foreground">{wf.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={wf.status === "active" ? "default" : "secondary"}>
                      {wf.status === "active" ? "Ativo" : "Pausado"}
                    </Badge>
                  </TableCell>
                  <TableCell>{wf.last_run_at ? new Date(wf.last_run_at).toLocaleString("pt-BR") : "—"}</TableCell>
                  <TableCell>{wf.runs_count}</TableCell>
                  <TableCell className={wf.error_count > 0 ? "text-red-500" : "text-muted-foreground"}>
                    {wf.error_count}
                  </TableCell>
                  <TableCell className="space-x-2 whitespace-nowrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => activateWorkflow(wf, wf.status !== "active")}
                    >
                      {wf.status === "active" ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          Pausar
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Ativar
                        </>
                      )}
                    </Button>
                    <Button variant="ghost" size="sm">
                      Logs
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {workflows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum workflow cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo workflow</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              />
            </div>
            <Button onClick={createWorkflow} disabled={!form.name}>
              Criar workflow
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
