"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { getCompanyDetails } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/role-guard";

export default function CompanyDetailsPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta", "franqueado", "cliente"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const params = useParams<{ cnpj: string }>();
  const cnpj = decodeURIComponent(params.cnpj);

  const { data } = useQuery({
    queryKey: ["company", cnpj],
    queryFn: () => getCompanyDetails(cnpj),
    enabled: Boolean(cnpj)
  });

  if (!data) {
    return (
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Carregando dados da empresa...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  const displayName = data.nomeFantasia ?? data.razaoSocial ?? data.nome ?? cnpj;
  const integrations = (data.integrations ?? []).map((integration) =>
    typeof integration === "string"
      ? { type: integration, status: "connected", lastSync: data.lastSync }
      : integration
  );
  const users = data.users ?? [];
  const whatsapp = data.whatsapp ?? {
    phone: "-",
    preferredHour: "-",
    timezone: "America/Sao_Paulo",
    messages: {}
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">{displayName}</CardTitle>
          <p className="text-[11px] text-muted-foreground">CNPJ {data.cnpj}</p>
        </CardHeader>
        <CardContent className="p-4">
          <Tabs defaultValue="info">
            <TabsList className="flex flex-wrap gap-2 bg-transparent">
              <TabsTrigger value="info">Informações</TabsTrigger>
              <TabsTrigger value="integrations">Integrações</TabsTrigger>
              <TabsTrigger value="users">Usuários</TabsTrigger>
              <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            </TabsList>
            <TabsContent value="info">
              <div className="grid gap-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs sm:grid-cols-2">
                <InfoRow label="Razão Social" value={data.razaoSocial ?? data.nome} />
                <InfoRow label="Nome Fantasia" value={data.nomeFantasia ?? data.nome} />
                <InfoRow label="Endereço" value={data.endereco} />
                <InfoRow label="Telefone" value={data.telefone} />
                <InfoRow label="Email" value={data.email} />
                <InfoRow label="Responsável" value={data.responsavel} />
                <InfoRow label="Cadastro" value={data.cadastro ? new Date(data.cadastro).toLocaleDateString("pt-BR") : "-"} />
              </div>
            </TabsContent>
            <TabsContent value="integrations">
              <div className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
                {integrations.map((integration: any) => (
                  <div
                    key={integration.type}
                    className="flex items-center justify-between rounded-md border border-border/60 bg-[#0d0d15]/60 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">{integration.type}</p>
                      <p className="text-[11px] text-muted-foreground">
                        Última sync: {integration.lastSync ? new Date(integration.lastSync).toLocaleString("pt-BR") : "--"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          integration.status === "connected"
                            ? "success"
                            : integration.status === "inactive"
                              ? "outline"
                              : "destructive"
                        }
                      >
                        {integration.status}
                      </Badge>
                      <Button size="sm" variant="outline">
                        Sincronizar
                      </Button>
                      <Button size="sm" variant="ghost">
                        Configurar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="users">
              <div className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
                {users.map((user: any) => (
                  <div key={user.email} className="rounded-md border border-border/60 bg-[#0d0d15]/60 px-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="text-[11px] text-muted-foreground">{user.email}</p>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                    </div>
                    <p className="mt-2 text-[11px] text-muted-foreground">
                      Permissões: {user.permissions?.join(", ")}
                    </p>
                  </div>
                ))}
                <Button size="sm" variant="outline">
                  Adicionar usuário
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="whatsapp">
              <div className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
                <InfoRow label="Telefone" value={whatsapp.phone ?? "-"} />
                <InfoRow label="Horário preferido" value={whatsapp.preferredHour ?? "-"} />
                <InfoRow label="Fuso horário" value={whatsapp.timezone ?? "-"} />
                <div>
                  <p className="text-[11px] font-semibold uppercase text-muted-foreground">Mensagens automáticas</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {Object.entries(whatsapp.messages ?? {}).map(([key, value]) => (
                      <Badge key={key} variant={value ? "success" : "outline"}>
                        {key}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Atualizar preferências
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase">{label}</p>
      <p className="text-sm text-foreground">{value ?? "--"}</p>
    </div>
  );
}
