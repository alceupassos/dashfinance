"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminFranchises, upsertFranchise, deleteFranchise, getAdminUsers, getCompaniesList } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";

export default function FranchisesPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data: franchises } = useQuery({
    queryKey: ["admin-franchises"],
    queryFn: getAdminFranchises
  });
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers()
  });
  const { data: companies } = useQuery({
    queryKey: ["companies-list"],
    queryFn: getCompaniesList
  });

  const owners = useMemo(() => users?.filter((user) => user.role === "franqueado") ?? [], [users]);

  const [selected, setSelected] = useState<any | null>(null);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Gestão de Franquias</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Controle de clusters regionais com donos responsáveis por empresas vinculadas.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setSelected(null)}>
              Criar nova franquia
            </Button>
          </DialogTrigger>
          <FranchiseModal owners={owners} companies={companies ?? []} franchise={selected} />
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Nome</th>
                <th>Dono</th>
                <th>Empresas</th>
                <th>Status</th>
                <th>Descrição</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {franchises?.map((franchise) => (
                <tr
                  key={franchise.id}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">{franchise.name}</td>
                  <td>{franchise.owner}</td>
                  <td>{franchise.companies}</td>
                  <td>
                    <Badge variant={franchise.status === "active" ? "success" : "outline"}>
                      {franchise.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td className="text-muted-foreground">{franchise.description}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelected(franchise)}>
                            Editar
                          </Button>
                        </DialogTrigger>
                        <FranchiseModal owners={owners} companies={companies ?? []} franchise={franchise} />
                      </Dialog>
                      <Button size="sm" variant="ghost" onClick={deleteFranchise}>
                        Excluir
                      </Button>
                    </div>
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

interface FranchiseModalProps {
  owners: any[];
  companies: any[];
  franchise: any | null;
}

function FranchiseModal({ owners, companies, franchise }: FranchiseModalProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>(franchise?.companiesIds ?? []);

  const toggleCompany = (cnpj: string) => {
    setSelectedCompanies((prev) => (prev.includes(cnpj) ? prev.filter((item) => item !== cnpj) : [...prev, cnpj]));
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertFranchise();
  }

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{franchise ? "Editar franquia" : "Nova franquia"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Nome da franquia</label>
          <Input defaultValue={franchise?.name} required />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Dono (usuário franqueado)</label>
          <Select defaultValue={owners.find((owner) => owner.name === franchise?.owner)?.id ?? owners[0]?.id}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
          <Textarea defaultValue={franchise?.description} placeholder="Resumo da franquia, segmento, equipe..." />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] font-medium text-muted-foreground">Empresas vinculadas</label>
          <div className="grid max-h-40 gap-2 overflow-y-auto rounded-md border border-border/60 bg-secondary/20 p-2">
            {companies.map((company) => (
              <label key={company.cnpj} className="flex items-center gap-2 text-[11px]">
                <input
                  type="checkbox"
                  className="h-3 w-3 accent-primary"
                  checked={selectedCompanies.includes(company.cnpj)}
                  onChange={() => toggleCompany(company.cnpj)}
                />
                {company.cnpj} — {company.nome}
              </label>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Status</label>
          <Select defaultValue={franchise?.status ?? "active"}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </DialogContent>
  );
}
