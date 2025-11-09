"use client";

import { useQuery } from "@tanstack/react-query";
import { getWhatsappConfig, updateWhatsappConfig } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { RoleGuard } from "@/components/role-guard";

export default function WhatsappConfigPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: getWhatsappConfig
  });

  if (!data) return null;

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="border-none p-4">
        <CardTitle className="text-sm">Configurações WhatsApp</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Evolution API, Webhook n8n e parâmetros globais de envio inteligente.
        </p>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <section className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">Evolution API</h2>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">URL</label>
            <Input defaultValue={data.evolution.url} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">API Key (mascarada)</label>
            <Input value={data.evolution.apiKeyMasked} readOnly />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Instância</label>
            <Input value={data.evolution.instanceName} readOnly />
          </div>
          <p>Status: {data.evolution.status}</p>
          <Button size="sm" variant="outline">
            Testar conexão
          </Button>
        </section>
        <section className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
          <h2 className="text-sm font-semibold text-foreground">Webhook n8n & Globais</h2>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">URL Webhook</label>
            <Input value={data.webhook.url} readOnly />
          </div>
          <div className="flex items-center justify-between">
            <span>Mensagens automáticas</span>
            <Switch defaultChecked={data.global.autoMessages} />
          </div>
          <div>
            <p>Intervalo processamento: {data.global.processInterval} minutos</p>
            <Slider defaultValue={[data.global.processInterval]} min={5} max={60} step={5} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-muted-foreground">Horário padrão</label>
            <Input type="time" defaultValue={data.global.defaultHour} />
          </div>
          <Button size="sm" onClick={updateWhatsappConfig}>
            Salvar ajustes
          </Button>
        </section>
      </CardContent>
    </Card>
  );
}
