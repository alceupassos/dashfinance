"use client";

import Link from "next/link";
import { useState } from "react";
import { recoverPassword } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    await recoverPassword();
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-sm font-semibold text-foreground">Recuperar senha</h1>
        <p className="text-xs text-muted-foreground">
          Informe o email cadastrado para receber o link de redefinição.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Email</label>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="seu.email@ifin.app.br"
            required
          />
        </div>
        {sent && (
          <p className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-emerald-300">
            Enviamos as instruções para o seu email.
          </p>
        )}
        <Button className="w-full" disabled={loading}>
          {loading ? "Enviando..." : "Enviar link"}
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
