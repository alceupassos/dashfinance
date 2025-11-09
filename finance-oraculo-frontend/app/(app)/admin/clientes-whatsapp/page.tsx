"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";

const clients = [
  { name: "João Silva", whatsapp: "+55 11 99999-0000", empresas: 3, last: "há 5min", status: "online" },
  { name: "Maria Costa", whatsapp: "+55 11 88888-1111", empresas: 1, last: "há 2h", status: "away" }
];

export default function ClientesWhatsappPage() {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => clients.filter((client) => client.name.toLowerCase().includes(search.toLowerCase())), [search]);

  return (
    <RoleGuard allow="admin">
      <div className="space-y-4">
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardHeader className="flex items-center justify-between border-none p-4">
            <div>
              <CardTitle className="text-lg">Clientes WhatsApp</CardTitle>
              <p className="text-xs text-muted-foreground">17 clientes cadastrados, tokens de 5 caracteres.</p>
            </div>
            <Button variant="secondary">Gerar token</Button>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Input placeholder="Buscar cliente" value={search} onChange={(event) => setSearch(event.target.value)} />
            <Button size="sm" variant="outline">Ver tokens</Button>
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-[#0c0d14]/80">
          <CardHeader className="border-none p-4">
            <CardTitle className="text-sm">Lista de clientes</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {filtered.map((client) => (
              <div key={client.whatsapp} className="flex items-center justify-between rounded-2xl border border-border/40 bg-[#101118]/80 p-3">
                <div>
                  <p className="text-sm text-foreground">{client.name}</p>
                  <p className="text-[11px] text-muted-foreground">{client.whatsapp} · Empresas: {client.empresas}</p>
                </div>
                <div className="text-right">
                  <p className="text-[11px]">{client.last}</p>
                  <Badge variant={client.status === "online" ? "success" : "warning"}>{client.status}</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card className="border-border/60 bg-[#11111a]/80">
          <CardHeader className="border-none p-4">
            <CardTitle className="text-sm">Gráfico de ativações</CardTitle>
          </CardHeader>
          <CardContent className="h-56 p-4">
            <div className="h-full rounded-3xl border border-dashed border-border/40 bg-gradient-to-r from-[#07090f] to-[#0f111c]" />
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
