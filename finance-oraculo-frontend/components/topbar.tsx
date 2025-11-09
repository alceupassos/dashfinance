"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bell, CloudDownload, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TargetSelector } from "@/components/alias-selector";
import { PeriodPicker } from "@/components/period-picker";
import { AnalysisStyleToggle } from "@/components/analysis-style-toggle";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { exportExcel, uploadDre } from "@/lib/api";
import { useUserStore } from "@/store/use-user-store";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function Topbar() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectedTarget } = useDashboardStore();
  const [status, setStatus] = useState<string | null>(null);
  const { profile, role } = useUserStore((state) => ({
    profile: state.profile,
    role: state.role
  }));

  const exportMutation = useMutation({
    mutationFn: () => exportExcel(selectedTarget),
    onSuccess: async (blob) => {
      if (!blob || blob.size === 0) {
        setStatus("Export mock gerado (dados fictícios).");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-${selectedTarget.value}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus("Excel exportado com sucesso.");
    },
    onError: () => setStatus("Falha para exportar. Verifique integrações.")
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDre(file, selectedTarget),
    onSuccess: () => setStatus("Upload DRE enviado ao backend."),
    onError: () => setStatus("Não foi possível enviar o DRE.")
  });

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadMutation.mutate(file);
      event.target.value = "";
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-[#0f0f16]/90 px-6 py-4 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-4">
        <TargetSelector />
        <PeriodPicker />
        <AnalysisStyleToggle />
        <div className="ml-auto flex items-center gap-2">
          <input
            type="file"
            accept=".xlsx"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportMutation.mutate()}
            disabled={exportMutation.isPending}
          >
            <CloudDownload className="mr-2 h-3.5 w-3.5" />
            Exportar Excel
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleUploadClick}
            disabled={uploadMutation.isPending}
          >
            <UploadCloud className="mr-2 h-3.5 w-3.5" />
            Upload DRE
          </Button>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          </Button>
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-secondary/20 px-2 py-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={profile?.name ?? "Usuário"} />
              <AvatarFallback>
                {(profile?.name ?? "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-[11px] leading-tight">
              <p className="font-semibold text-foreground">
                {profile?.name ?? profile?.email?.split("@")[0] ?? "Usuário"}
              </p>
              <p className="text-muted-foreground capitalize">
                {(role ?? "viewer").replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      </div>
      {status && (
        <p className="mt-2 text-[11px] text-muted-foreground">
          {status}
        </p>
      )}
    </header>
  );
}
