"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import type { FinancialAlert } from "@/lib/conciliation";
import { fetchFinancialAlerts, patchFinancialAlertResolution, getFinancialAlert } from "@/lib/api";
import { useUserStore } from "@/store/use-user-store";

const statusLabel = {
  pendente: "Pendente",
  em_analise: "Em análise",
  resolvido: "Resolvido",
  ignorado: "Ignorado"
};

const priorityColor: Record<string, "destructive" | "warning" | "success"> = {
  critica: "destructive",
  alta: "destructive",
  media: "warning",
  baixa: "success"
};

export default function AlertasPage() {
  const { data: alerts = [], isLoading, error } = useQuery({
    queryKey: ["financial-alerts"],
    queryFn: () => fetchFinancialAlerts()
  });

  const grouped = useMemo(() => {
    return alerts.reduce((acc: Record<string, FinancialAlert[]>, alert) => {
      acc[alert.status] = acc[alert.status] ?? [];
      acc[alert.status].push(alert);
      return acc;
    }, {} as Record<string, FinancialAlert[]>);
  }, [alerts]);

  if (isLoading) {
    return (
      <RoleGuard allow="admin">
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Carregando alertas financeiros...
          </CardContent>
        </Card>
      </RoleGuard>
    );
  }

  if (error) {
    return (
      <RoleGuard allow="admin">
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardContent className="p-8 text-center text-sm text-red-400">
            Erro ao carregar alertas. Tente novamente.
          </CardContent>
        </Card>
      </RoleGuard>
    );
  }

  return (
    <RoleGuard allow="admin">
      <div className="space-y-4">
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardHeader className="flex items-center justify-between border-none p-4">
            <div>
              <CardTitle className="text-sm">Alertas financeiros</CardTitle>
              <p className="text-[11px] text-muted-foreground">Acompanhe divergências críticas e ações em aberto.</p>
            </div>
          </CardHeader>
        </Card>
        {Object.entries(grouped).map(([status, alerts]) => (
          <section key={status} className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {statusLabel[status as keyof typeof statusLabel]}
            </h3>
            <div className="grid gap-3 lg:grid-cols-2">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          </section>
        ))}
        {alerts.length === 0 && (
          <div className="rounded-lg border border-dashed border-border/60 bg-[#0e0f15]/80 p-6 text-center text-sm text-muted-foreground">
            Nenhum alerta encontrado.
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

function AlertCard({ alert }: { alert: FinancialAlert }) {
  const queryClient = useQueryClient();
  const [isResolveOpen, setIsResolveOpen] = useState(false);
  const [observacoes, setObservacoes] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detail, setDetail] = useState<FinancialAlert | null>(null);
  const { profile } = useUserStore((state) => ({ profile: state.profile }));

  const resolveMutation = useMutation({
    mutationFn: (tipo: "corrigir" | "falso_positivo" | "ignorar") =>
      patchFinancialAlertResolution(alert.id, {
        resolucao_tipo: tipo,
        resolucao_observacoes: observacoes || undefined,
        resolvido_por: profile?.name ?? undefined,
        resolvido_em: new Date().toISOString()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-alerts"] });
      setIsResolveOpen(false);
      setObservacoes("");
    }
  });

  const openDetails = async () => {
    setIsDetailOpen(true);
    try {
      const data = await getFinancialAlert(alert.id);
      setDetail(data);
    } catch {
      setDetail(alert);
    }
  };

  return (
    <Card className="border-border/60 bg-[#0d0f16]/90">
      <CardContent className="space-y-3 p-4 text-xs">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">{alert.titulo}</p>
          <Badge variant={priorityColor[alert.prioridade] ?? "default"} className="text-[10px]">
            {alert.prioridade}
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground">{alert.mensagem}</p>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <span>{alert.company_cnpj}</span>
          <span>{new Date(alert.created_at).toLocaleDateString()}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={openDetails}>
            Ver detalhes
          </Button>
        </div>
        {alert.status === "pendente" && (
          <Dialog open={isResolveOpen} onOpenChange={setIsResolveOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="w-full">
                Resolver alerta
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Resolver alerta</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Observações (opcional)
                  </label>
                  <Textarea
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                    placeholder="Descreva a ação tomada ou motivo..."
                  />
                </div>
                {resolveMutation.isError && (
                  <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-[11px] text-red-400">
                    Erro ao resolver alerta. Tente novamente.
                  </div>
                )}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsResolveOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={() => resolveMutation.mutate("corrigir")} disabled={resolveMutation.isPending}>
                    {resolveMutation.isPending ? "Salvando..." : "Corrigir"}
                  </Button>
                  <Button variant="secondary" onClick={() => resolveMutation.mutate("falso_positivo")} disabled={resolveMutation.isPending}>
                    {resolveMutation.isPending ? "Salvando..." : "Falso positivo"}
                  </Button>
                  <Button variant="destructive" onClick={() => resolveMutation.mutate("ignorar")} disabled={resolveMutation.isPending}>
                    {resolveMutation.isPending ? "Salvando..." : "Ignorar"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
        {alert.status !== "pendente" && (
          <div className="rounded-md border border-border/60 bg-secondary/20 p-2 text-[10px] text-muted-foreground">
            <p className="font-medium">Status: {statusLabel[alert.status as keyof typeof statusLabel]}</p>
            {alert.resolucao_observacoes && <p className="mt-1">{alert.resolucao_observacoes}</p>}
          </div>
        )}
        <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
          {/* Invisible trigger; opened programmatically */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Detalhes do alerta</DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto rounded-md border border-border/60 bg-[#0e0f15]/80 p-3">
              <pre className="whitespace-pre-wrap text-[11px] leading-relaxed text-muted-foreground">
                {JSON.stringify(detail ?? alert, null, 2)}
              </pre>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
