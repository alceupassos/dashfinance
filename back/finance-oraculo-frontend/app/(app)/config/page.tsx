"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { mockAutomations } from "@/lib/api";

interface AutomationState {
  id: string;
  active: boolean;
  template: string;
}

export default function ConfigPage() {
  const [automations, setAutomations] = useState<AutomationState[]>(
    mockAutomations.map((automation) => ({
      id: automation.id,
      active: automation.active,
      template: automation.template
    }))
  );

  const toggleAutomation = (id: string, active: boolean) => {
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, active } : item))
    );
  };

  const updateTemplate = (id: string, value: string) => {
    setAutomations((current) =>
      current.map((item) => (item.id === id ? { ...item, template: value } : item))
    );
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Automations n8n • WhatsApp</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {automations.map((automation) => {
            const meta = mockAutomations.find((item) => item.id === automation.id);
            return (
              <div
                key={automation.id}
                className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  <Switch
                    checked={automation.active}
                    onCheckedChange={(checked) => toggleAutomation(automation.id, checked)}
                    aria-label={`Ativar automação ${meta?.name}`}
                  />
                  <div>
                    <p className="text-foreground font-semibold">{meta?.name}</p>
                    <p className="text-[11px]">{meta?.description}</p>
                  </div>
                </div>
                <Badge variant={automation.active ? "success" : "outline"}>
                  {automation.active ? "Ativo" : "Em pausa"}
                </Badge>
                <div className="space-y-1">
                  <p className="text-[11px]">Modelo da mensagem</p>
                  <Textarea
                    value={automation.template}
                    onChange={(event) => updateTemplate(automation.id, event.target.value)}
                    className="min-h-[120px]"
                  />
                  <p className="text-[10px]">Campos dinâmicos: {"{{nome}}"}, {"{{valor}}"}, {"{{data}}"}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
