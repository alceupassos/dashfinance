"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCompaniesList } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";

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
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((company) => {
      const displayName = (company.nome ?? company.nomeFantasia ?? company.razaoSocial ?? "").toLowerCase();
      const matches =
        displayName.includes(search.toLowerCase()) || company.cnpj.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === "all" || company.status === status;
      return matches && matchesStatus;
    });
  }, [data, search, status]);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Empresas monitoradas</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Integrações F360 e OMIE com status de sincronização.
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap gap-2 text-xs">
          <Input
            placeholder="Buscar por nome ou CNPJ"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-56"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativa</SelectItem>
              <SelectItem value="inactive">Inativa</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>CNPJ</th>
                <th>Empresa</th>
                <th>Integrações</th>
                <th>Última sync</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => (
                <tr
                  key={company.cnpj}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-mono">{company.cnpj}</td>
                  <td className="font-medium">
                    {company.nome ?? company.nomeFantasia ?? company.razaoSocial ?? "—"}
                  </td>
                  <td className="flex flex-wrap gap-2">
                    {(company.integrations ?? []).map((integration) => {
                      const label = typeof integration === "string" ? integration : integration.type;
                      const variant =
                        label?.toUpperCase() === "F360" ? "success" : label?.toUpperCase() === "OMIE" ? "warning" : "outline";
                      return (
                        <Badge key={label} variant={variant}>
                          {label}
                        </Badge>
                      );
                    })}
                  </td>
                  <td>{company.lastSync ? new Date(company.lastSync).toLocaleString("pt-BR") : "--"}</td>
                  <td>
                    <Badge variant={company.status === "active" ? "success" : "outline"}>
                      {company.status === "active" ? "Ativa" : "Inativa"}
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
      </CardContent>
    </Card>
  );
}
