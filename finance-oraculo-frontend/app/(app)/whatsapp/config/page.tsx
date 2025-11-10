"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { CheckCircle2, AlertCircle } from "lucide-react";

export default function WhatsappConfigPage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [copied, setCopied] = useState(false);

  const wasenderConfig = {
    phone: "+55 11 95891 4464",
    apiKey: "09cfee8bccee1f9319b3eae0cfec5b07a41b0819eb5fddffd73df2ff599df979",
    secret: "a28f76b28012e51b75f2c72d0f8b4a2a",
    provider: "WaSender",
    status: "Ativo"
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Configurações WhatsApp - WaSender</CardTitle>
              <p className="text-[11px] text-muted-foreground mt-1">
                Integração com WaSender para envio de mensagens via WhatsApp.
              </p>
            </div>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {wasenderConfig.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <section className="space-y-3 rounded-md border border-border/60 bg-secondary/20 p-4">
            <h2 className="text-sm font-semibold text-foreground">Credenciais WaSender</h2>
            
            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Número WhatsApp</label>
              <div className="flex gap-2">
                <Input value={wasenderConfig.phone} readOnly className="bg-secondary/50" />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopy(wasenderConfig.phone)}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">API Key</label>
              <div className="flex gap-2">
                <Input 
                  value={wasenderConfig.apiKey} 
                  readOnly 
                  className="bg-secondary/50 font-mono text-[10px]"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopy(wasenderConfig.apiKey)}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-medium text-muted-foreground">Secret</label>
              <div className="flex gap-2">
                <Input 
                  value={wasenderConfig.secret} 
                  readOnly 
                  className="bg-secondary/50 font-mono text-[10px]"
                />
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleCopy(wasenderConfig.secret)}
                >
                  {copied ? "Copiado!" : "Copiar"}
                </Button>
              </div>
            </div>

            <div className="rounded-md bg-blue-500/10 border border-blue-500/20 p-3 text-[11px] text-blue-400 flex gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Provider: <strong>{wasenderConfig.provider}</strong> - Integração ativa e pronta para envio de mensagens.
              </p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}
