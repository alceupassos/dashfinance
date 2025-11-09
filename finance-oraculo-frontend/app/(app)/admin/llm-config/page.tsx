"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getAdminLlmProviders,
  getAdminLlmModels,
  getAdminLlmContexts,
  updateAdminLlmConfig,
  getAdminApiKeys
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RoleGuard } from "@/components/role-guard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

export default function LlmConfigPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data: providers } = useQuery({
    queryKey: ["admin-llm-providers"],
    queryFn: getAdminLlmProviders
  });
  const { data: models } = useQuery({
    queryKey: ["admin-llm-models"],
    queryFn: getAdminLlmModels
  });
  const { data: contexts } = useQuery({
    queryKey: ["admin-llm-contexts"],
    queryFn: getAdminLlmContexts
  });
  const { data: apiKeys } = useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: getAdminApiKeys
  });

  const groupedModels = models?.reduce<Record<string, typeof models>>((acc, model) => {
    acc[model.provider] = acc[model.provider] ?? [];
    acc[model.provider].push(model);
    return acc;
  }, {}) ?? {};

  const contextEntries = contexts ? Object.entries(contexts as Record<string, any>) : [];

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Providers LLM</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Controle de ativação por provider com vínculo direto à API Key criptografada.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {providers?.map((provider) => {
            const keyName = apiKeys?.find((key) => key.id === provider.apiKeyId)?.name ?? "—";
            return (
              <div
                key={provider.id}
                className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                  <Badge variant={provider.status === "active" ? "success" : "outline"}>
                    {provider.status === "active" ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <p>API Key vinculada: {keyName}</p>
                <Button size="sm" variant="outline">
                  Configurar
                </Button>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Modelos disponíveis</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Custos, status e contexto máximo por provider em uma única visão.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(groupedModels).map(([provider, providerModels]) => (
            <div key={provider} className="space-y-2">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{provider}</h3>
              <div className="grid gap-3 lg:grid-cols-3">
                {providerModels.map((model) => (
                  <div
                    key={model.id}
                    className="space-y-2 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-foreground">{model.name}</span>
                      <Badge variant={model.status === "active" ? "success" : "outline"}>
                        {model.status === "active" ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{model.type}</Badge>
                      <Badge variant="outline">CTX {model.context.toLocaleString()} tokens</Badge>
                    </div>
                    <p>Custo input: ${model.costInput.toFixed(2)} / 1K tokens</p>
                    <p>Custo output: ${model.costOutput.toFixed(2)} / 1K tokens</p>
                    <div className="flex items-center justify-between">
                      <span>Status</span>
                      <Switch defaultChecked={model.status === "active"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Configurações de uso</CardTitle>
          <p className="text-[11px] text-muted-foreground">
            Ajuste modelos primários, fallback e parâmetros para cada contexto operacional.
          </p>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {contextEntries.map(([contextKey, config]) => (
              <div key={contextKey} className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">
                    {contextKey.replace("_", " ").toUpperCase()}
                  </span>
                  <Badge variant="outline">Contexto</Badge>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted-foreground">Modelo principal</label>
                  <Select defaultValue={config.primaryModel ?? ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {models?.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {"fallbackModel" in config && config.fallbackModel && (
                  <div className="space-y-2">
                    <label className="text-[11px] font-medium text-muted-foreground">Modelo fallback</label>
                    <Select defaultValue={config.fallbackModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {models?.map((model) => (
                          <SelectItem key={model.id} value={model.id}>
                            {model.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Max tokens ({config.maxTokens})
                  </label>
                  <Slider defaultValue={[config.maxTokens]} min={200} max={5000} step={100} />
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted-foreground">
                    Temperature ({config.temperature ?? 0})
                  </label>
                  <Slider defaultValue={[Math.round((config.temperature ?? 0) * 10)]} min={0} max={10} />
                </div>
                <Button size="sm" className="w-full" onClick={() => updateAdminLlmConfig()}>
                  Salvar ajustes
                </Button>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
