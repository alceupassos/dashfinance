"use client";

import { useQuery } from "@tanstack/react-query";
import { getWhatsappScheduled, scheduleWhatsappMessage, cancelWhatsappMessage, mockTargets } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RoleGuard } from "@/components/role-guard";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { formatShortDate, formatCurrency } from "@/lib/formatters";

const types = [
  { value: "snapshot", label: "Snapshot Diário" },
  { value: "overdue_alert", label: "Alertas Vencidos" },
  { value: "payables_7d", label: "Pagamentos 7 dias" },
  { value: "kpis_weekly", label: "KPIs Semanais" }
];

export default function WhatsappScheduledPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery({
    queryKey: ["whatsapp-scheduled"],
    queryFn: () => getWhatsappScheduled()
  });
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = data?.filter((item) => {
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesType && matchesStatus;
  });

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-sm">Mensagens Agendadas</CardTitle>
          <p className="text-[11px] text-muted-foreground">Automatizações n8n com status de envio.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">Agendar nova mensagem</Button>
          </DialogTrigger>
          <ScheduleModal />
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
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="sent">Enviada</SelectItem>
              <SelectItem value="failed">Erro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Empresa</th>
                <th>Telefone</th>
                <th>Tipo</th>
                <th>Agendado para</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered?.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">{item.company}</td>
                  <td>{item.phone}</td>
                  <td>{types.find((type) => type.value === item.type)?.label ?? item.type}</td>
                  <td>{formatShortDate(item.scheduledFor)}</td>
                  <td>{item.status}</td>
                  <td className="text-right">
                    <Button size="sm" variant="outline" onClick={cancelWhatsappMessage}>
                      Cancelar
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function ScheduleModal() {
  const [type, setType] = useState(types[0].value);
  const companies = mockTargets.aliases;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await scheduleWhatsappMessage();
  }

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Novo agendamento</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Alias / Grupo</label>
          <Select defaultValue={companies[0]?.id}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  {company.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Telefone</label>
            <Input placeholder="+55 11 90000-0000" required />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Agendar em</label>
            <Input type="datetime-local" required />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Tipo de mensagem</label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              {types.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Prévia (opcional)</label>
          <textarea className="min-h-[80px] w-full rounded-md border border-input bg-background px-2 py-2 text-xs text-foreground shadow-sm" placeholder="Mensagem customizada ou observações." />
        </div>
        <div className="rounded-md border border-border/60 bg-secondary/20 p-2 text-[11px] text-muted-foreground">
          Exemplo de payload enviado para n8n com valores fictícios. Caixa atual {formatCurrency(205000)}.
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">Agendar</Button>
        </div>
      </form>
    </DialogContent>
  );
}
