"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompaniesList } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";

const INTEGRATIONS = ["F360", "OMIE"] as const;
type IntegrationFilter = typeof INTEGRATIONS[number] | "all";

const normalizeStatus = (status?: string) => {
  if (!status) return "inactive";
  const lower = status.toLowerCase();
  if (lower.includes("ativo") || lower.includes("active")) return "active";
  if (lower.includes("inativo") || lower.includes("inactive")) return "inactive";
  return "inactive";
};

export default function CompaniesPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta", "franqueado"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery({
    queryKey: ["companies-list"],
    queryFn: getCompaniesList
  });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [integrationFilter, setIntegrationFilter] = useState<IntegrationFilter>("all");

  const stats = useMemo(() => {
    const total = data?.length ?? 0;
    const active = data?.filter((company) => normalizeStatus(company.status) === "active").length ?? 0;
    const whatsapp = data?.filter((company) => company.whatsapp_ativo).length ?? 0;
    const f360 = data?.filter((company) => company.integracao_f360).length ?? 0;
    const omie = data?.filter((company) => company.integracao_omie).length ?? 0;
    return { total, active, whatsapp, f360, omie };
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const normalizedSearch = search.trim().toLowerCase();
    return data.filter((company) => {
      if (status !== "all" && normalizeStatus(company.status) !== status) return false;
      if (integrationFilter !== "all") {
        const hasIntegration =
          integrationFilter === "F360" ? company.integracao_f360 : company.integracao_omie;
        if (!hasIntegration) return false;
      }
      if (!normalizedSearch) return true;
      const target = `${company.nome ?? company.nomeFantasia ?? company.razaoSocial ?? ""} ${company.cnpj}`.toLowerCase();
      return target.includes(normalizedSearch);
    });
  }, [data, search, status, integrationFilter]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#0f0f16]/80">
        <CardHeader className="flex flex-col gap-3 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Clientes conectados</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Monitoramos integrações F360, OMIE e notificações WhatsApp com alertas em tempo real.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <Button size="sm" variant="outline">
              Exportar planilha
            </Button>
            <Button size="sm">Sincronizar agora</Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 pt-0 text-foreground sm:grid-cols-4">
          <div className="rounded-lg border border-border/60 bg-[#11111a]/80 p-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Total</p>
            <p className="text-2xl font-semibold">{stats.total}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-[#11111a]/80 p-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Integrac. F360</p>
            <p className="text-2xl font-semibold">{stats.f360}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-[#11111a]/80 p-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Integrac. OMIE</p>
            <p className="text-2xl font-semibold">{stats.omie}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-[#11111a]/80 p-3 text-sm">
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">WhatsApp ativo</p>
            <p className="text-2xl font-semibold">{stats.whatsapp}</p>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#0f0f16]/80">
        <CardHeader className="flex flex-col gap-3 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Empresas</CardTitle>
            <p className="text-[11px] text-muted-foreground">Filtre por status, integração ou busque por CNPJ / nome.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Input
              className="w-56 text-[12px]"
              placeholder="Buscar por nome ou CNPJ"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
              <SelectTrigger className="w-44 text-[12px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativas</SelectItem>
                <SelectItem value="inactive">Inativas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={integrationFilter} onValueChange={(value) => setIntegrationFilter(value as IntegrationFilter)}>
              <SelectTrigger className="w-36 text-[12px]">
                <SelectValue placeholder="Integrações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {INTEGRATIONS.map((integration) => (
                  <SelectItem key={`integration-${integration}`} value={integration}>
                    {integration}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto">
            <table className="min-w-full text-left text-xs">
              <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
                <tr className="[&>th]:px-3 [&>th]:py-2">
                  <th>CNPJ</th>
                  <th>Empresa</th>
                  <th>Integrações</th>
                  <th>WhatsApp</th>
                  <th>Última sync</th>
                  <th>Status</th>
                  <th className="text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((company) => (
                  <tr
                    key={company.cnpj}
                    className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                  >
                    <td className="font-mono text-[11px]">{company.cnpj}</td>
                    <td className="font-medium">
                      {company.nome ?? company.nomeFantasia ?? company.razaoSocial ?? "—"}
                    </td>
                    <td className="flex flex-wrap gap-1">
                      {company.integracao_f360 && <Badge variant="success">F360</Badge>}
                      {company.integracao_omie && <Badge variant="warning">OMIE</Badge>}
                    </td>
                    <td>
                      {company.whatsapp?.phone ? (
                        <Badge variant="success">Conectado</Badge>
                      ) : (
                        <Badge variant="outline">Pendente</Badge>
                      )}
                    </td>
                    <td>{company.lastSync ? new Date(company.lastSync).toLocaleString("pt-BR") : "—"}</td>
                    <td>
                      <Badge variant={normalizeStatus(company.status) === "active" ? "success" : "outline"}>
                        {normalizeStatus(company.status) === "active" ? "Ativa" : "Inativa"}
                      </Badge>
                    </td>
                    <td className="text-right">
                      <Link className="text-primary hover:underline" href={`/empresas/${encodeURIComponent(company.cnpj)}`}>
                        Ver detalhes
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="flex items-center justify-center p-8 text-[11px] text-muted-foreground">
              Nenhuma empresa localizada com os filtros atuais.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
