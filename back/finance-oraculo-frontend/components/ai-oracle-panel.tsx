"use client";

import { FormEvent, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrainCircuit, Send } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAiOracleStore } from "@/store/use-ai-oracle-store";
import { useDashboardStore } from "@/store/use-dashboard-store";
import sampleData from "@/__mocks__/sample.json";

export function AiOraclePanel() {
  const { open, setOpen, history, addMessage } = useAiOracleStore();
  const { analysisStyle, selectedTarget } = useDashboardStore();
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAsk(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) return;

    setLoading(true);

    const template =
      analysisStyle === "creative"
        ? "Resumo criativo focado em oportunidades e storytelling."
        : "Resumo técnico com métricas objetivas e gatilhos de auditoria.";

    const answer = [
      `${analysisStyle === "creative" ? "✨" : "📊"} ${template}`,
      `Alvo: ${selectedTarget.type === "alias" ? "Alias" : "CNPJ"} ${selectedTarget.value}.`,
      "Próximas automações de hoje:",
      ...sampleData.automations
        .filter((automation) => automation.active)
        .slice(0, 2)
        .map((automation) => `• ${automation.name}: ${automation.description}`)
    ].join("\n");

    addMessage({
      id: `${Date.now()}`,
      question,
      answer,
      style: analysisStyle,
      createdAt: new Date()
    });

    setQuestion("");
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/20 text-primary">
            <BrainCircuit className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <DialogTitle>Oráculo IA Finance</DialogTitle>
            <DialogDescription>
              Pergunte sobre indicadores, riscos ou fluxos. Respostas baseadas nos dados consolidados do
              backend.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="flex flex-col gap-4 overflow-hidden text-xs">
          <form onSubmit={handleAsk} className="flex flex-col gap-2 rounded-md border border-border/60 p-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Badge variant="outline">Janela 8h - 17h</Badge>
              <span>Envios automáticos pelo WhatsApp para clientes cadastrados.</span>
            </div>
            <Textarea
              placeholder="Faça sua pergunta ao oráculo..."
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              disabled={loading}
            />
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">
                Senha provisória para novos fluxos: <strong>fluxo-lucro-vela-7</strong>
              </span>
              <Button type="submit" size="sm" disabled={loading}>
                <Send className="mr-2 h-3.5 w-3.5" />
                Perguntar
              </Button>
            </div>
          </form>
          <div className="flex-1 overflow-hidden rounded-md border border-border/60 bg-[#0a0a12]/80">
            <div className="border-b border-border/60 px-3 py-2 text-[11px] uppercase tracking-wide text-muted-foreground">
              Histórico
            </div>
            <div className="custom-scroll flex max-h-[320px] flex-col gap-3 overflow-y-auto p-3">
              <AnimatePresence>
                {history.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.7 }}
                    className="rounded-md border border-dashed border-border/50 px-3 py-4 text-center text-muted-foreground"
                  >
                    Nenhuma conversa ainda. Dispare a primeira pergunta para colher insights.
                  </motion.div>
                )}
                {history.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-2 rounded-md border border-border/40 bg-secondary/20 p-3"
                  >
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{message.createdAt.toLocaleString()}</span>
                      <Badge variant={message.style === "creative" ? "success" : "warning"}>
                        {message.style === "creative" ? "Criativo" : "Técnico"}
                      </Badge>
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Você</p>
                      <p className="whitespace-pre-line text-foreground/80">{message.question}</p>
                    </div>
                    <div>
                      <p className="font-semibold text-primary">Oráculo</p>
                      <p className="whitespace-pre-line text-muted-foreground">{message.answer}</p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
