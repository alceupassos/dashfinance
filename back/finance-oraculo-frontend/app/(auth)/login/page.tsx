"use client";

import Link from "next/link";
import Image from "next/image";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUserStore } from "@/store/use-user-store";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-6 text-xs text-muted-foreground">
          <div className="rounded-lg bg-white/5 p-4 text-center">Carregando...</div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = useMemo(() => searchParams?.get("redirect") ?? "/", [searchParams]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login: loginAction, status, tokens } = useUserStore((state) => ({
    login: state.login,
    status: state.status,
    tokens: state.tokens
  }));

  useEffect(() => {
    if (tokens) {
      router.replace(redirectTo === "/login" ? "/" : redirectTo);
    }
  }, [tokens, redirectTo, router]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await loginAction(email, password);
      router.replace(redirectTo === "/login" ? "/" : redirectTo || "/");
    } catch (err) {
      console.error(err);
      setError("Credenciais inválidas ou erro ao contatar o servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <Image src="/logo-ifinance.svg" alt="iFinance" width={160} height={48} priority />
        <h1 className="text-sm font-semibold text-foreground">Bem-vindo ao Oráculo Financeiro</h1>
        <p className="text-xs text-muted-foreground">Acesse com seu email corporativo e senha.</p>
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
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground">Senha</label>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {error && <p className="rounded-md border border-destructive/60 bg-destructive/10 px-3 py-2 text-destructive">{error}</p>}
        <Button className="w-full" disabled={loading || status === "loading" || Boolean(tokens)}>
          {loading ? "Entrando..." : "Entrar"}
        </Button>
      </form>
      <div className="flex flex-col gap-2 text-center text-[11px] text-muted-foreground">
        <Link className="text-primary hover:underline" href="/forgot-password">
          Esqueci minha senha
        </Link>
        <Link className="text-primary hover:underline" href="/first-access">
          Primeiro acesso? Configure aqui
        </Link>
      </div>
    </div>
  );
}
