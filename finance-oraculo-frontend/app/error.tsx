"use client";

import { useEffect } from "react";

export default function GlobalError({ error, reset }: { error: Error; reset?: () => void }) {
  useEffect(() => {
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-900 px-4 text-white">
      <h1 className="text-3xl font-semibold mb-4">Algo deu errado 😕</h1>
      <p className="max-w-lg text-center text-sm text-slate-300 mb-6">
        {error?.message || "Erro desconhecido. Tente recarregar a página."}
      </p>
      {reset && (
        <button
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
          onClick={() => reset()}
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}
