"use client";

import { useMutation } from "@tanstack/react-query";
import { FileDown, FileUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { exportExcel, mockReports, uploadDre } from "@/lib/api";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { useRef, useState } from "react";
import { formatShortDate } from "@/lib/formatters";

export default function RelatoriosPage() {
  const { selectedTarget } = useDashboardStore();
  const [status, setStatus] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const exportMutation = useMutation({
    mutationFn: () => exportExcel(selectedTarget),
    onSuccess: () => setStatus("Exportação solicitada. Verifique a pasta de downloads."),
    onError: () => setStatus("Erro ao exportar Excel.")
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDre(file, selectedTarget),
    onSuccess: () => setStatus("Upload de DRE enviado."),
    onError: () => setStatus("Falha no envio do DRE.")
  });

  const handleUpload = () => inputRef.current?.click();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-row items-center justify-between border-none p-4">
          <CardTitle className="text-sm">Ações rápidas</CardTitle>
          <Badge variant="outline">
            Alvo atual: {selectedTarget.type === "alias" ? "Alias" : "CNPJ"} {selectedTarget.value}
          </Badge>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3 p-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <FileDown className="mr-2 h-3.5 w-3.5" />
            Exportar Excel (DRE + Fluxo)
          </Button>
          <Button variant="outline" size="sm" onClick={handleUpload} disabled={uploadMutation.isPending}>
            <FileUp className="mr-2 h-3.5 w-3.5" />
            Upload DRE (XLSX)
          </Button>
          <input type="file" ref={inputRef} className="hidden" accept=".xlsx" onChange={handleFileSelect} />
          {status && <p className="text-[11px] text-muted-foreground">{status}</p>}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4">
          <CardTitle className="text-sm">Histórico de relatórios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>ID</th>
                <th>Alias / CNPJ</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Gerado em</th>
                <th>Autor</th>
              </tr>
            </thead>
            <tbody>
              {mockReports.map((report) => (
                <tr
                  key={report.id}
                  className="border-t border-border/50 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td>{report.id}</td>
                  <td>{report.alias}</td>
                  <td>{report.tipo}</td>
                  <td>{report.periodo}</td>
                  <td>{formatShortDate(report.generatedAt)}</td>
                  <td>{report.autor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
