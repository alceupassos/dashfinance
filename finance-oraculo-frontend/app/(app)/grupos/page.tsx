"use client";

import { useMemo, useState } from "react";
import { Plus, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { mockClients, mockGroups, mockTargets } from "@/lib/api";
import { cn } from "@/lib/utils";

interface DraftGroup {
  nome: string;
  alias: string;
  membros: string[];
}

export default function GruposPage() {
  const [groups, setGroups] = useState(() => mockGroups);
  const [draft, setDraft] = useState<DraftGroup>({
    nome: "",
    alias: mockTargets.aliases[0]?.id ?? "",
    membros: []
  });

  const companies = useMemo(() => mockClients.map((client) => client.cnpj), []);

  const handleToggleMember = (cnpj: string) => {
    setDraft((prev) => {
      const exists = prev.membros.includes(cnpj);
      return {
        ...prev,
        membros: exists ? prev.membros.filter((item) => item !== cnpj) : [...prev.membros, cnpj]
      };
    });
  };

  const handleCreate = () => {
    if (!draft.nome || !draft.alias) return;

    setGroups((prev) => [
      ...prev,
      {
        id: `draft-${Date.now()}`,
        nome: draft.nome,
        aliases: [draft.alias],
        membros: draft.membros
      }
    ]);
    setDraft({
      nome: "",
      alias: mockTargets.aliases[0]?.id ?? "",
      membros: []
    });
  };

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
            <label className="text-[11px] font-medium text-muted-foreground">Alias principal</label>
            <Select
              value={draft.alias}
              onValueChange={(value) => setDraft({ ...draft, alias: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione alias" />
              </SelectTrigger>
              <SelectContent>
                {mockTargets.aliases.map((alias) => (
                  <SelectItem key={alias.id} value={alias.id}>
                    {alias.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
          <Button size="sm" className="w-full" onClick={handleCreate}>
            <Plus className="mr-2 h-3.5 w-3.5" />
            Salvar grupo
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Grupos existentes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
            >
              <div className="flex items-center gap-2 text-sm text-foreground">
                <Users className="h-4 w-4 text-primary" />
                <span className="font-semibold">{group.nome}</span>
              </div>
              <p className="mt-1 text-[11px]">
                Alias: {group.aliases.join(", ")} • {group.membros.length} empresas
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {group.membros.map((member) => (
                  <Badge variant="outline" key={member}>
                    {member}
                  </Badge>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="mt-3"
                onClick={() => alert("Mock: navegar para dashboard filtrando este grupo.")}
              >
                Ver no dashboard
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
