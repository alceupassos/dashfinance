"use client";

import { useMemo } from "react";
import { Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockClients } from "@/lib/api";

export default function ClientesPage() {
  const clients = useMemo(() => mockClients, []);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-row items-center justify-between gap-3 border-none p-4">
          <CardTitle className="text-sm">Clientes e integrações</CardTitle>
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou CNPJ" className="w-64" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="min-w-full text-left text-xs">
            <thead className="sticky top-0 bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Cliente</th>
                <th>CNPJ</th>
                <th>Integrações</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.cnpj}
                  className="border-t border-border/50 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">{client.nome}</td>
                  <td>{client.cnpj}</td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      {client.integrations.map((integration) => (
                        <Badge
                          key={integration}
                          variant={integration === "F360" ? "success" : "warning"}
                        >
                          {integration}
                        </Badge>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
