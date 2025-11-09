"use client";

import { useQuery } from "@tanstack/react-query";
import { getAdminApiKeys, upsertAdminApiKey, deleteAdminApiKey } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { RoleGuard } from "@/components/role-guard";
import { Shield } from "lucide-react";

const providers = ["openai", "anthropic", "f360", "omie", "evolution"] as const;
const types = ["llm", "erp", "whatsapp", "other"] as const;

export default function AdminApiKeysPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: getAdminApiKeys
  });

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">API Keys Integradas</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Providers de LLM, ERPs e Evolution centralizados com mascaramento seguro.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm">Adicionar nova chave</Button>
          </DialogTrigger>
          <ApiKeyModal />
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-3 p-4">
        <div className="overflow-hidden rounded-md border border-border/60">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Nome</th>
                <th>Provider</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Último uso</th>
                <th>Preview</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data?.map((key) => (
                <tr
                  key={key.id}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td className="font-medium">{key.name}</td>
                  <td className="flex items-center gap-1 capitalize">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    {key.provider}
                  </td>
                  <td>
                    <Badge variant="outline">{key.type.toUpperCase()}</Badge>
                  </td>
                  <td>
                    <Badge variant={key.status === "active" ? "success" : "outline"}>
                      {key.status === "active" ? "Ativa" : "Inativa"}
                    </Badge>
                  </td>
                  <td>{key.lastUsed ? new Date(key.lastUsed).toLocaleString("pt-BR") : "--"}</td>
                  <td className="font-mono text-[11px] text-muted-foreground">{key.masked}</td>
                  <td className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            Editar
                          </Button>
                        </DialogTrigger>
                        <ApiKeyModal initialKey={key} />
                      </Dialog>
                      <Button size="sm" variant="ghost" onClick={() => deleteAdminApiKey(key.id)}>
                        Remover
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

interface ApiKeyModalProps {
  initialKey?: any;
}

function ApiKeyModal({ initialKey }: ApiKeyModalProps) {
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertAdminApiKey();
  }

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{initialKey ? "Editar API Key" : "Nova API Key"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Nome de referência</label>
          <Input defaultValue={initialKey?.name} placeholder="OPENAI_API_KEY" required />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Provider</label>
            <Select defaultValue={initialKey?.provider ?? providers[0]}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider} value={provider}>
                    {provider.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Tipo</label>
            <Select defaultValue={initialKey?.type ?? types[0]}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {types.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Chave (oculta)</label>
          <Input type="password" placeholder="sk-..." required />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Descrição</label>
          <Textarea placeholder="Uso interno, avisos de escopo, etc." defaultValue={initialKey?.description ?? ""} />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Status</label>
          <Select defaultValue={initialKey?.status ?? "active"}>
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
