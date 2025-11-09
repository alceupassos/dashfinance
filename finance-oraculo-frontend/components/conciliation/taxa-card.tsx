"use client";

import { Badge } from "@/components/ui/badge";
import { feeStatusBadge, feeTypeLabels } from "@/lib/conciliation";

interface TaxaCardProps {
  id: string;
  banco_codigo: string;
  tipo: string;
  percentual?: number;
  fixa?: number;
  vigencia: string;
  ativo: boolean;
  observacoes?: string;
}

export function TaxaCard({ banco_codigo, tipo, percentual, fixa, vigencia, ativo, observacoes }: TaxaCardProps) {
  return (
    <div className="rounded-2xl border border-border/40 bg-[#0c0d14]/80 p-4 shadow-xl shadow-primary/10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Banco {banco_codigo}</p>
          <p className="text-lg font-semibold text-foreground">{feeTypeLabels[tipo as keyof typeof feeTypeLabels]}</p>
        </div>
        <Badge variant={feeStatusBadge(ativo)}> {ativo ? "Ativa" : "Inativa"} </Badge>
      </div>
      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        {percentual !== undefined && <p>Taxa percentual: {(percentual * 100).toFixed(2)}%</p>}
        {fixa !== undefined && <p>Taxa fixa: R${fixa.toFixed(2)}</p>}
        <p>Vigência desde {vigencia}</p>
        {observacoes && <p className="text-[11px] text-muted-foreground/90">{observacoes}</p>}
      </div>
    </div>
  );
}
