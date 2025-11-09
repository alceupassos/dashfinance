"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getWhatsappScheduled, scheduleWhatsappMessage, cancelWhatsappScheduled } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/role-guard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatShortDate } from "@/lib/formatters";

const types = [
  { value: "snapshot_diario", label: "Snapshot Diário" },
  { value: "alerta_vencimento", label: "Alertas Vencidos" },
  { value: "pagamentos_7d", label: "Pagamentos 7 dias" },
  { value: "kpis_semanais", label: "KPIs Semanais" },
  { value: "cobranca", label: "Cobrança" },
  { value: "confirmacao", label: "Confirmação" }
];

export default function WhatsappScheduledPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["whatsapp-scheduled"],
    queryFn: () => getWhatsappScheduled()
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const items = data?.data ?? [];
  const filtered = items.filter((item: any) => {
    const matchesType = typeFilter === "all" || item.tipo === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesType && matchesStatus;
  });

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Carregando mensagens agendadas...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-red-400">
          Erro ao carregar mensagens agendadas. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Mensagens Agendadas</CardTitle>
          <p className="text-[11px] text-muted-foreground">Automatizações n8n com status de envio.</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setIsModalOpen(true)}>Agendar nova mensagem</Button>
          </DialogTrigger>
          <ScheduleModal onClose={() => setIsModalOpen(false)} />
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {types.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-md border border-border/60">
          {!filtered || filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Nenhuma mensagem agendada encontrada.
            </div>
          ) : (
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>Alias / Telefone</th>
                  <th>Tipo</th>
                  <th>Agendado para</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <ScheduledRow key={item.id} item={item} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduledRow({ item }: { item: any }) {
  const queryClient = useQueryClient();
  const cancelMutation = useMutation({
    mutationFn: (id: string) => cancelWhatsappScheduled(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
    }
  });

  const statusVariant = 
    item.status === "pendente" ? "default" :
    item.status === "enviada" ? "success" :
    item.status === "cancelada" ? "outline" : "destructive";

  return (
    <tr className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2">
      <td className="font-medium">
        <div className="text-xs">{item.groupAlias || "—"}</div>
        <div className="text-[11px] text-muted-foreground">{item.telefones?.join(", ") || "—"}</div>
      </td>
      <td>{types.find((type) => type.value === item.tipo)?.label ?? item.tipo}</td>
      <td>{formatShortDate(item.agendadoPara)}</td>
      <td>
        <Badge variant={statusVariant} className="text-[10px]">
          {item.status}
        </Badge>
      </td>
      <td className="text-right">
        {item.status === "pendente" && (
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => cancelMutation.mutate(item.id)}
            disabled={cancelMutation.isPending}
          >
            {cancelMutation.isPending ? "Cancelando..." : "Cancelar"}
          </Button>
        )}
      </td>
    </tr>
  );
}

function ScheduleModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [empresaCnpj, setEmpresaCnpj] = useState("");
  const [telefone, setTelefone] = useState("");
  const [agendadoPara, setAgendadoPara] = useState("");
  const [mensagem, setMensagem] = useState("");

  const scheduleMutation = useMutation({
    mutationFn: scheduleWhatsappMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-scheduled"] });
      onClose();
    }
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = {
      empresa_cnpj: empresaCnpj,
      contato_phone: telefone,
      mensagem,
      dataAgendada: agendadoPara
    };

    scheduleMutation.mutate(payload);
  }

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            CNPJ da empresa
          </label>
          <Input 
            value={empresaCnpj} 
            onChange={(e) => setEmpresaCnpj(e.target.value)} 
            placeholder="00.000.000/0000-00" 
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Telefone do contato
          </label>
          <Input 
            value={telefone} 
            onChange={(e) => setTelefone(e.target.value)} 
            placeholder="+5511900000000" 
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Agendar para</label>
          <Input 
            type="datetime-local" 
            value={agendadoPara} 
            onChange={(e) => setAgendadoPara(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">
            Mensagem
          </label>
          <textarea 
            className="min-h-[80px] w-full rounded-md border border-input bg-background px-2 py-2 text-xs text-foreground shadow-sm" 
            placeholder="Digite a mensagem a ser enviada..." 
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            required
          />
        </div>
        <div className="rounded-md border border-border/60 bg-secondary/20 p-3 text-[11px]">
          <p className="mb-1 font-medium text-muted-foreground">Informação:</p>
          <p className="text-muted-foreground">
            A mensagem será processada pelo n8n no horário agendado e enviada via Wasender.
          </p>
        </div>
        {scheduleMutation.isError && (
          <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-[11px] text-red-400">
            Erro ao agendar mensagem. Tente novamente.
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={scheduleMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" disabled={scheduleMutation.isPending}>
            {scheduleMutation.isPending ? "Agendando..." : "Agendar"}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
