"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWhatsappConversations,
  getWhatsappConversation,
  sendWhatsappMessage,
  type SendWhatsappMessagePayload,
  type WhatsappConversationDetail,
  type WhatsappConversationListResponse,
  type WhatsappConversationSummary
} from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messageDraft, setMessageDraft] = useState("");

  const {
    data: conversationList,
    isLoading: isListLoading,
    isError: isListError,
    error: listError
  } = useQuery<WhatsappConversationListResponse>({
    queryKey: ["whatsapp-conversations"],
    queryFn: () => getWhatsappConversations()
  });

  const items = useMemo(() => conversationList?.data ?? [], [conversationList?.data]);

  useEffect(() => {
    if (!selectedId && items.length > 0) {
      setSelectedId(items[0].id);
    }
  }, [items, selectedId]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return items;
    const term = search.trim().toLowerCase();
    return items.filter((conversation) => {
      const matchesCompany = conversation.empresa_cnpj?.toLowerCase().includes(term);
      const matchesName = conversation.contato_nome?.toLowerCase().includes(term);
      const matchesPhone = conversation.contato_phone?.toLowerCase().includes(term);
      const matchesMessage = conversation.ultimaMensagem?.toLowerCase().includes(term);
      return matchesCompany || matchesName || matchesPhone || matchesMessage;
    });
  }, [items, search]);

  useEffect(() => {
    if (
      filteredItems.length > 0 &&
      !filteredItems.some((conversation) => conversation.id === selectedId)
    ) {
      setSelectedId(filteredItems[0].id);
    }
  }, [filteredItems, selectedId]);

  const activeSummary: WhatsappConversationSummary | undefined =
    filteredItems.find((conversation) => conversation.id === selectedId) ?? filteredItems[0];

  const {
    data: conversationDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
    error: detailError
  } = useQuery<WhatsappConversationDetail>({
    queryKey: ["whatsapp-conversation", selectedId],
    queryFn: () => getWhatsappConversation(selectedId as string),
    enabled: Boolean(selectedId)
  });

  const sendMutation = useMutation({
    mutationFn: (payload: SendWhatsappMessagePayload) => sendWhatsappMessage(payload),
    onSuccess: () => {
      setMessageDraft("");
      queryClient.invalidateQueries({ queryKey: ["whatsapp-conversations"] });
      if (selectedId) {
        queryClient.invalidateQueries({ queryKey: ["whatsapp-conversation", selectedId] });
      }
    }
  });

  const handleSend = () => {
    if (!conversationDetail || !messageDraft.trim()) return;
    if (!conversationDetail.empresa_cnpj || !conversationDetail.contato_phone) return;
    const payload: SendWhatsappMessagePayload = {
      empresa_cnpj: conversationDetail.empresa_cnpj,
      contato_phone: conversationDetail.contato_phone,
      mensagem: messageDraft.trim()
    };
    sendMutation.mutate(payload);
  };

  const renderStatusBadge = (conversation: WhatsappConversationSummary) => {
    const status = conversation.status?.toLowerCase();
    const variant =
      status === "ativo" ? "success" : status === "pausado" ? "default" : "outline";
    return <Badge variant={variant} className="text-[10px]">{conversation.status ?? "—"}</Badge>;
  };

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
          <Input
            placeholder="Buscar por empresa, contato ou telefone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="flex-1 overflow-y-auto rounded-md border border-border/60">
            {isListLoading ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">Carregando conversas...</p>
            ) : isListError ? (
              <p className="px-3 py-3 text-xs text-destructive">
                {listError instanceof Error ? listError.message : "Erro ao carregar conversas."}
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">
                Nenhuma conversa encontrada com o filtro atual.
              </p>
            ) : (
              filteredItems.map((conversation) => {
                const isActive = conversation.id === activeSummary?.id;
                return (
                  <button
                    type="button"
                    key={conversation.id}
                    onClick={() => setSelectedId(conversation.id)}
                    className={`w-full border-b border-border/60 px-3 py-3 text-left text-xs transition-colors hover:bg-secondary/30 ${
                      isActive ? "bg-primary/10" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground">
                          {conversation.contato_nome ?? conversation.contato_phone}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {conversation.empresa_cnpj || "Empresa não informada"}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {conversation.naoLidas && conversation.naoLidas > 0 ? (
                          <Badge variant="destructive">
                            {conversation.naoLidas} não lida{conversation.naoLidas > 1 ? "s" : ""}
                          </Badge>
                        ) : null}
                        {renderStatusBadge(conversation)}
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                      <span className="line-clamp-1">
                        {conversation.ultimaMensagem ?? "Sem mensagens"}
                      </span>
                      {conversation.ultimaMensagemEm ? (
                        <span>{formatShortDate(conversation.ultimaMensagemEm)}</span>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
        <div className="flex-1 rounded-md border border-border/60 bg-secondary/10 p-4 text-xs">
          {!activeSummary ? (
            <p className="text-muted-foreground">Selecione uma conversa para visualizar.</p>
          ) : isDetailLoading ? (
            <p className="text-muted-foreground">Carregando histórico...</p>
          ) : isDetailError ? (
            <p className="text-destructive">
              {detailError instanceof Error ? detailError.message : "Erro ao carregar histórico."}
            </p>
          ) : conversationDetail ? (
            <div className="flex h-full flex-col gap-3">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {conversationDetail.contato_nome ?? conversationDetail.contato_phone}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {conversationDetail.empresa_cnpj}
                  </p>
                </div>
                {renderStatusBadge(conversationDetail)}
              </div>
              <div className="flex-1 space-y-2 overflow-y-auto rounded-md border border-border/60 bg-[#0d0d15]/70 p-3">
                {conversationDetail.mensagens.length === 0 ? (
                  <p className="text-center text-muted-foreground">
                    Nenhuma mensagem encontrada.
                  </p>
                ) : (
                  [...conversationDetail.mensagens]
                    .sort(
                      (a, b) =>
                        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                    )
                    .map((message, index) => {
                      const isOutbound = (message.tipo ?? "").toLowerCase() === "enviada";
                      const text = message.textoEnviado ?? message.textoRecebido ?? "";
                      return (
                        <div
                          key={`${message.id}-${index}`}
                          className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-md rounded-md px-3 py-2 ${
                              isOutbound
                                ? "bg-primary/30 text-foreground"
                                : "bg-[#13131b] text-muted-foreground"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{text}</p>
                            <p className="mt-1 text-[10px] text-muted-foreground">
                              {formatShortDate(message.timestamp)} • {message.status ?? "—"}
                            </p>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
              <div className="space-y-2">
                {sendMutation.isError ? (
                  <p className="text-[11px] text-destructive">
                    {(sendMutation.error as Error)?.message ??
                      "Não foi possível enviar a mensagem."}
                  </p>
                ) : null}
                <Textarea
                  rows={4}
                  placeholder="Escreva sua resposta..."
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  className="text-foreground"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSend}
                    disabled={
                      sendMutation.isPending ||
                      !messageDraft.trim() ||
                      !conversationDetail.contato_phone
                    }
                    size="sm"
                  >
                    {sendMutation.isPending ? "Enviando..." : "Enviar resposta"}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhuma informação disponível.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

