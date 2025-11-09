"use client";

import Link from "next/link";
import { useState } from "react";
import { firstAccessSetup } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function FirstAccessPage() {
  const [documentId, setDocumentId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirm) return;
    setLoading(true);
    await firstAccessSetup();
    setLoading(false);
    setSuccess(true);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-sm font-semibold text-foreground">Ativar acesso</h1>
        <p className="text-xs text-muted-foreground">
          Informe seu CNPJ ou CPF e defina uma senha temporária enviada pelo suporte.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">CNPJ / CPF</label>
          <Input
            placeholder="12.345.678/0001-90"
            value={documentId}
            onChange={(event) => setDocumentId(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Email corporativo</label>
          <Input
            type="email"
            placeholder="financeiro@suaempresa.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Nova senha</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Confirmar senha</label>
          <Input
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            required
          />
        </div>
        {success && (
          <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-emerald-300">
            Acesso ativado! Você pode entrar com suas credenciais.
          </p>
        )}
        <Button className="w-full" disabled={loading}>
          {loading ? "Ativando..." : "Ativar acesso"}
        </Button>
      </form>
      <div className="text-center text-[11px]">
        <Link className="text-primary hover:underline" href="/login">
          Voltar para login
        </Link>
      </div>
    </div>
  );
}
