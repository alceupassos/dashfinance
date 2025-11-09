"use client";

import { BrainCircuit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiOracleStore } from "@/store/use-ai-oracle-store";

export function AiOracleButton() {
  const { setOpen } = useAiOracleStore();

  return (
    <Button
      variant="secondary"
      size="lg"
      className="fixed bottom-6 right-6 z-40 h-12 w-12 rounded-full bg-primary text-foreground shadow-xl hover:bg-primary/80"
      onClick={() => setOpen(true)}
      aria-label="Abrir Oráculo IA"
    >
      <BrainCircuit className="h-6 w-6" />
    </Button>
  );
}
