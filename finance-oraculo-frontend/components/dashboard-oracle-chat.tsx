"use client";

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAiOracleStore } from "@/store/use-ai-oracle-store";
import { format } from "date-fns";
import { useUserStore } from "@/store/use-user-store";
import { useDashboardStore } from "@/store/use-dashboard-store";

export function DashboardOracleChat() {
  const { history, addMessage } = useAiOracleStore();
  const { tokens } = useUserStore();
  const { selectedTarget } = useDashboardStore();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestHistory = useMemo(() => history.slice(0, 6), [history]);

  const handleSend = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setErrorMessage(null);
    try {
      const resp = await fetch("/functions/v1/oracle-response", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokens?.accessToken ?? ""}`
        },
        body: JSON.stringify({
          question: text.trim(),
          company_cnpj: selectedTarget.type === "cnpj" ? selectedTarget.value : undefined
        })
      });

      const payload = await resp.json();
      const answerText = payload.answer ?? "Não foi possível gerar resposta.";

      addMessage({
        id: `${Date.now()}`,
        question: text.trim(),
        answer: answerText,
        style: "creative",
        createdAt: new Date()
      });
    } catch (error) {
      console.error("[oracle-chat] send error", error);
      setErrorMessage("Falha ao consultar o Oráculo. Tente novamente.");
    } finally {
      setLoading(false);
      setText("");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Card className="border-border/60 bg-[#080b12]/90">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Oráculo em tempo real</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-h-64 space-y-3 overflow-y-auto pr-2 text-xs">
            {latestHistory.length === 0 && (
              <p className="text-muted-foreground/70">Faça uma pergunta e o Oráculo responde aqui.</p>
            )}
            {latestHistory.map((message) => (
              <div key={message.id} className="space-y-1 rounded-md border border-border/40 p-3">
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Você</span>
                  <span>{format(message.createdAt, "HH:mm")}</span>
                </div>
                <p className="text-[11px] text-foreground/80">{message.question}</p>
                <div className="rounded-lg bg-white/5 p-2 text-[11px] text-[#38bdf8]">
                  {message.answer}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <Input
              placeholder="Pergunte sobre o cliente atribuído..."
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="text-xs"
            />
            <Button size="sm" onClick={handleSend} className="self-end">
              Enviar ao Oráculo
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
