"use client";

export default function GlobalLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
      <div className="animate-pulse text-sm tracking-wider text-slate-300">Carregando o Oráculo...</div>
    </div>
  );
}
