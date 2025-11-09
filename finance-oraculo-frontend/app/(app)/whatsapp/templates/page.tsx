"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWhatsappTemplates, upsertWhatsappTemplate } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";

export default function WhatsappTemplatesPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: () => getWhatsappTemplates()
  });
  const [selected, setSelected] = useState<any | null>(null);

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-sm">Templates WhatsApp</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Utilize variáveis dinâmicas para personalizar comunicações com clientes.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => setSelected(null)}>
              Criar novo template
            </Button>
          </DialogTrigger>
          <TemplateModal template={selected} />
        </Dialog>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {data?.map((template) => (
          <div key={template.id} className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">{template.name}</p>
                <p className="text-[11px] text-muted-foreground">{template.type}</p>
              </div>
              <Badge variant="outline">Variables: {template.variables.length}</Badge>
            </div>
            <p className="rounded-md border border-border/60 bg-[#0d0d15]/60 px-3 py-2 text-muted-foreground">
              {template.content}
            </p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((variable: string) => (
                <Badge key={variable} variant="success">
                  {"{{" + variable + "}}"}
                </Badge>
              ))}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" onClick={() => setSelected(template)}>
                  Editar
                </Button>
              </DialogTrigger>
              <TemplateModal template={template} />
            </Dialog>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function TemplateModal({ template }: { template: any | null }) {
  const [content, setContent] = useState(template?.content ?? "");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await upsertWhatsappTemplate();
  }

  const variables = template?.variables ?? ["cash_balance", "runway_days", "revenue_today"];

  return (
    <DialogContent className="max-h-[80vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{template ? "Editar template" : "Novo template"}</DialogTitle>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-3 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Nome interno</label>
          <Input defaultValue={template?.name} placeholder="Snapshot diário" required />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Identificador</label>
          <Input defaultValue={template?.id} placeholder="tpl-snapshot" required />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Corpo da mensagem</label>
          <Textarea value={content} onChange={(event) => setContent(event.target.value)} rows={6} />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium text-muted-foreground">Variáveis disponíveis</p>
          <div className="flex flex-wrap gap-2">
            {variables.map((variable: string) => (
              <Badge key={variable} variant="outline">
                {"{{" + variable + "}}"}
              </Badge>
            ))}
          </div>
        </div>
        <div className="rounded-md border border-border/60 bg-secondary/20 p-2 text-[11px] text-muted-foreground">
          Prévia: {content.replace(/{{(\w+)}}/g, (_match: string, key: string) => `<${key}>`)}
        </div>
        <div className="flex justify-end gap-2">
          <Button type="submit">Salvar</Button>
        </div>
      </form>
    </DialogContent>
  );
}
