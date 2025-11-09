"use client";

import { useMemo, useState, useEffect } from "react";
import { Plus, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { mockClients, fetchGroupAliases, createGroupAlias, updateGroupAlias, type GroupAlias } from "@/lib/api";

interface DraftGroup {
  nome: string;
  alias: string;
  membros: string[];
}

export default function GruposPage() {
  const queryClient = useQueryClient();
  const { data: fetchedAliases = [], isLoading, error } = useQuery({
    queryKey: ["group-aliases"],
    queryFn: fetchGroupAliases
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const companies = useMemo(() => mockClients.map((client) => client.cnpj), []);
  const [draft, setDraft] = useState<DraftGroup>({
    nome: "",
    alias: "",
    membros: []
  });

  const handleToggleMember = (cnpj: string) => {
    setDraft((prev) => {
      const exists = prev.membros.includes(cnpj);
      return {
        ...prev,
        membros: exists ? prev.membros.filter((item) => item !== cnpj) : [...prev.membros, cnpj]
      };
    });
  };

  const createMutation = useMutation({
    mutationFn: (payload: { label: string; description?: string; members: string[] }) =>
      createGroupAlias(payload),
    onSuccess(data) {
      queryClient.invalidateQueries({ queryKey: ["group-aliases"] });
      setFeedback(`Grupo ${data.label} criado com sucesso.`);
      setDraft({
        nome: "",
        alias: "",
        membros: []
      });
      setTimeout(() => setFeedback(null), 3000);
    }
  });

  const handleCreate = () => {
    if (!draft.nome || !draft.membros.length) return;
    createMutation.mutate({ label: draft.nome, members: draft.membros });
  };

  if (isLoading) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Carregando grupos...
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardContent className="p-8 text-center text-sm text-red-400">
          Erro ao carregar grupos. Tente novamente.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[380px,1fr]">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Criar grupo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4 text-xs text-muted-foreground">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Nome do grupo</label>
            <Input
              placeholder="Ex: Holding Norte"
              value={draft.nome}
              onChange={(event) => setDraft({ ...draft, nome: event.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Descrição (opcional)</label>
            <Input
              placeholder="Ex: Empresas do grupo Norte"
              value={draft.alias}
              onChange={(event) => setDraft({ ...draft, alias: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <p className="text-[11px] font-medium text-muted-foreground">Empresas</p>
            <div className="grid gap-2">
              {companies.map((cnpj) => (
                <button
                  key={cnpj}
                  onClick={() => handleToggleMember(cnpj)}
                  className={cn(
                    "flex items-center justify-between rounded-md border border-border/60 px-3 py-2 text-left transition-colors",
                    draft.membros.includes(cnpj)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary/30 hover:text-foreground"
                  )}
                  type="button"
                >
                  <span className="text-xs font-medium">{cnpj}</span>
                  {draft.membros.includes(cnpj) && <Badge variant="success">Incluída</Badge>}
                </button>
              ))}
            </div>
          </div>
          <Button size="sm" className="w-full" onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            {createMutation.isPending ? "Salvando..." : "Salvar grupo"}
          </Button>
          {feedback && <p className="text-[11px] text-green-400">{feedback}</p>}
          {createMutation.isError && (
            <p className="text-[11px] text-red-400">Erro ao criar grupo. Tente novamente.</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Grupos existentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {!fetchedAliases || fetchedAliases.length === 0 ? (
            <div className="rounded-md border border-border/60 bg-secondary/20 p-8 text-center text-sm text-muted-foreground">
              Nenhum grupo criado ainda.
            </div>
          ) : (
            fetchedAliases.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GroupCard({ group }: { group: GroupAlias }) {
  const queryClient = useQueryClient();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editLabel, setEditLabel] = useState(group.label);
  const [editDescription, setEditDescription] = useState(group.description || "");
  const totalEmpresas = group.members?.length ?? 0;
  const f360Count = group.members?.filter((m) => m.integracao_f360).length ?? 0;
  const omieCount = group.members?.filter((m) => m.integracao_omie).length ?? 0;
  const wppCount = group.members?.filter((m) => m.whatsapp_ativo).length ?? 0;

  const updateMutation = useMutation({
    mutationFn: (payload: { label?: string; description?: string }) =>
      updateGroupAlias(group.id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-aliases"] });
      setIsEditOpen(false);
    }
  });

  const handleUpdate = () => {
    updateMutation.mutate({
      label: editLabel !== group.label ? editLabel : undefined,
      description: editDescription !== (group.description || "") ? editDescription : undefined
    });
  };

  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-semibold">{group.label}</span>
        </div>
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost">
              Editar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar grupo</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Nome do grupo</label>
                <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
                <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
              </div>
              {updateMutation.isError && (
                <div className="rounded-md border border-red-500/50 bg-red-500/10 p-2 text-[11px] text-red-400">
                  Erro ao atualizar grupo. Tente novamente.
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
                  {updateMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <p className="mt-1 text-[11px]">
        {group.description ?? "Sem descrição"} • {totalEmpresas} empresas • F360: {f360Count} • OMIE: {omieCount} • WhatsApp: {wppCount}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {group.members?.map((member) => (
          <div key={member.id} className="flex items-center gap-2 rounded-md border border-border/60 px-2 py-1">
            <span className="text-foreground">
              {member.company_name ?? member.company_cnpj}
            </span>
            <div className="flex items-center gap-1">
              {member.integracao_f360 && <Badge variant="outline">F360</Badge>}
              {member.integracao_omie && <Badge variant="outline">OMIE</Badge>}
              {member.whatsapp_ativo && <Badge variant="outline">Wpp</Badge>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
