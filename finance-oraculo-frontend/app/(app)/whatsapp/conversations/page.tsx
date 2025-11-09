"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getWhatsappConversations } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { formatShortDate } from "@/lib/formatters";

export default function WhatsappConversationsPage() {
  return (
    <RoleGuard allow={["admin", "executivo_conta"]}>
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const { data } = useQuery<any[]>({
    queryKey: ["whatsapp-conversations"],
    queryFn: () => getWhatsappConversations({})
  });
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(data?.[0]?.id ?? null);

  const filtered = data?.filter(
    (conversation) =>
      conversation.company.toLowerCase().includes(search.toLowerCase()) ||
      conversation.contact.includes(search)
  );
  const active = filtered?.find((conversation) => conversation.id === selectedId) ?? filtered?.[0];

  return (
    <Card className="border-border/60 bg-[#11111a]/80">
      <CardHeader className="border-none p-4">
        <CardTitle className="text-sm">Conversas WhatsApp</CardTitle>
        <p className="text-[11px] text-muted-foreground">
          Histórico com status de leitura e mensagens trocadas com clientes.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-4 md:flex-row">
        <div className="flex w-full flex-col gap-2 md:w-80">
          <Input placeholder="Buscar por empresa/telefone" value={search} onChange={(event) => setSearch(event.target.value)} />
          <div className="flex-1 overflow-y-auto rounded-md border border-border/60">
            {filtered?.map((conversation) => (
              <button
                type="button"
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className={`w-full border-b border-border/60 px-3 py-3 text-left text-xs transition-colors hover:bg-secondary/30 ${
                  active?.id === conversation.id ? "bg-primary/10" : ""
                }`}
              >
                <p className="font-semibold text-foreground">{conversation.company}</p>
                <p className="text-[11px] text-muted-foreground">{conversation.contact}</p>
                <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span className="line-clamp-1">{conversation.lastMessage ?? "Sem mensagens"}</span>
                  <Badge variant={conversation.status === "active" ? "success" : "outline"}>{conversation.status}</Badge>
                </div>
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 rounded-md border border-border/60 bg-secondary/10 p-4 text-xs">
          {active ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">{active.company}</p>
                  <p className="text-[11px] text-muted-foreground">{active.contact}</p>
                </div>
                <Badge variant="outline">{active.status}</Badge>
              </div>
              <div className="space-y-2">
                {active.messages?.length ? (
                  active.messages.map((message: any, index: number) => (
                    <div
                      key={`${message.timestamp}-${index}`}
                      className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-md rounded-md px-3 py-2 ${
                          message.direction === "outbound"
                            ? "bg-primary/30 text-foreground"
                            : "bg-[#0d0d15] text-muted-foreground"
                        }`}
                      >
                        <p>{message.content}</p>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatShortDate(message.timestamp)} • {message.status}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-md border border-border/60 bg-secondary/20 px-3 py-4 text-center text-muted-foreground">
                    Nenhuma mensagem encontrada.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Selecione uma conversa para visualizar.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
