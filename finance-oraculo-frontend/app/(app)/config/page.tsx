"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { getAdminUsers, getAdminLlmModels } from "@/lib/api";
import { mockAutomations } from "@/lib/api";
import { useOracleConfigStore } from "@/store/use-oracle-config-store";

interface AutomationState {
  id: string;
  active: boolean;
  template: string;
}

export default function ConfigPage() {
  return (
    <RoleGuard allow="admin">
      <ConfigContent />
    </RoleGuard>
  );
}

function ConfigContent() {
  const [automations, setAutomations] = useState<AutomationState[]>(
    mockAutomations.map((automation) => ({
      id: automation.id,
      active: automation.active,
      template: automation.template
    }))
  );
  const { data: users } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => getAdminUsers({ limit: 200 })
  });
  const { data: llmModels } = useQuery({
    queryKey: ["admin-llm-models"],
    queryFn: getAdminLlmModels
  });
  const { defaults, setDefaults, setUserSettings, getSettingsForUser } = useOracleConfigStore(
    (state) => ({
      defaults: state.defaults,
      setDefaults: state.setDefaults,
      setUserSettings: state.setUserSettings,
      getSettingsForUser: state.getSettingsForUser
    })
  );
  const [selectedUserId, setSelectedUserId] = useState<string | null>(() => users?.[0]?.id ?? null);
  const [webModel, setWebModel] = useState(defaults.webModel);
  const [whatsappModel, setWhatsappModel] = useState(defaults.whatsappModel);

  useEffect(() => {
    if (users?.length && !selectedUserId) {
      setSelectedUserId(users[0].id);
    }
  }, [users, selectedUserId]);

  useEffect(() => {
    setWebModel(defaults.webModel);
    setWhatsappModel(defaults.whatsappModel);
  }, [defaults]);

  useEffect(() => {
    if (selectedUserId) {
      const settings = getSettingsForUser(selectedUserId);
      setWebModel(settings.webModel);
      setWhatsappModel(settings.whatsappModel);
    }
  }, [selectedUserId, getSettingsForUser]);

  const modelOptions = useMemo(() => {
    const base = [
      { value: "chatgpt-5-thinking", label: "ChatGPT 5 Thinking" },
      { value: "gpt-4o-mini", label: "GPT-4o Mini" }
    ];
    const fetched =
      llmModels?.map((model) => ({
        value: model.model_name,
        label: model.display_name ?? model.model_name
      })) ?? [];
    const merged = [...base, ...fetched];
    const unique = new Map<string, typeof merged[number]>();
    merged.forEach((option) => unique.set(option.value, option));
    return Array.from(unique.values());
  }, [llmModels]);

  const currentUserLabel =
    users?.find((user) => user.id === selectedUserId)?.email ?? "Selecione um usuário";

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

  const handleSaveUserSettings = () => {
    if (!selectedUserId) return;
    setUserSettings(selectedUserId, { webModel, whatsappModel });
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

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Oráculo por usuário</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Escolha quais modelos o Oráculo Web e o WhatsApp devem usar para cada usuário.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Usuário</label>
              <Select
                value={selectedUserId ?? ""}
                onValueChange={(value) => setSelectedUserId(value || null)}
              >
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um usuário" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">
                Atual: {currentUserLabel} • Web {webModel} • WhatsApp {whatsappModel}
              </p>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Modelo web</label>
              <Select value={webModel} onValueChange={(value) => setWebModel(value)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione modelo web" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={`web-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Modelo WhatsApp</label>
              <Select value={whatsappModel} onValueChange={(value) => setWhatsappModel(value)}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione modelo WhatsApp" />
                </SelectTrigger>
                <SelectContent>
                  {modelOptions.map((option) => (
                    <SelectItem key={`wa-${option.value}`} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2 text-xs">
            <Button size="sm" onClick={handleSaveUserSettings}>
              Salvar preferências do usuário
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setDefaults({ webModel, whatsappModel })}
            >
              Definir como padrão global
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
