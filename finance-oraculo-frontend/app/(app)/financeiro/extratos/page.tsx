"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import type { BankStatementRow } from "@/lib/conciliation";
import { fetchBankStatements } from "@/lib/api";

export default function ExtratosPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [search, setSearch] = useState("");
  const { data: statements = [], isLoading } = useQuery({
    queryKey: ["bank-statements"],
    queryFn: () => fetchBankStatements()
  });
  const filtered = useMemo(() => {
    return statements.filter((row) => row.descricao.toLowerCase().includes(search.toLowerCase()));
  }, [statements, search]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-wrap items-center justify-between gap-3 border-none p-4">
          <div>
            <CardTitle className="text-sm">Extratos bancários</CardTitle>
            <p className="text-xs text-muted-foreground">Importe arquivos e acompanhe conciliações manuais.</p>
          </div>
          <Button variant="secondary">Importar extrato</Button>
        </CardHeader>
        <CardContent className="grid gap-3 border-t border-border/50 p-4">
          <Input
            placeholder="Buscar por descrição"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#0c0e18]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Conciliação manual</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {isLoading && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/40 bg-[#0b0c12]/70 p-6 text-center text-sm text-muted-foreground">
              Carregando extratos bancários...
            </div>
          )}
          {filtered.map((row) => (
            <StatementRow key={row.id} row={row} />
          ))}
          {!isLoading && filtered.length === 0 && (
            <div className="col-span-full rounded-2xl border border-dashed border-border/40 bg-[#0b0c12]/70 p-6 text-center text-sm text-muted-foreground">
              Nenhum lançamento encontrado com os filtros aplicados.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex items-center justify-between border-none p-4">
          <div>
            <CardTitle className="text-sm">Conciliação manual</CardTitle>
            <p className="text-xs text-muted-foreground">Crie lançamentos e vincule aos extratos sem confirmação automática.</p>
          </div>
          <Button size="sm" variant="outline">
            Nova conciliação
          </Button>
        </CardHeader>
        <CardContent className="grid gap-3 border-t border-border/40 p-4">
          <Input placeholder="ID do extrato" />
          <Input placeholder="Valor" />
          <Button variant="secondary">Vincular manualmente</Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StatementRow({ row }: { row: BankStatementRow }) {
  return (
    <div className="rounded-2xl border border-border/40 bg-[#0b0c12]/80 p-4 text-sm text-muted-foreground">
      <div className="flex items-center justify-between">
        <p className="text-foreground font-semibold">{row.descricao}</p>
        <Badge variant={row.conciliado ? "success" : "warning"}>{row.conciliado ? "Conciliado" : "Pendente"}</Badge>
      </div>
      <p className="text-[11px]">{row.data_movimento}</p>
      <p className="text-lg font-semibold text-foreground">R$ {row.valor.toLocaleString()}</p>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{row.tipo}</span>
        <Button size="icon" variant="ghost">
          ...
        </Button>
      </div>
    </div>
  );
}
