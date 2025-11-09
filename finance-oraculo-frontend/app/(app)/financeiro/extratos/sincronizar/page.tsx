"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RoleGuard } from "@/components/role-guard";
import { syncBankMetadata, getBankStatementsFromERP } from "@/lib/api";

interface SyncResult {
  fonte: "F360" | "OMIE";
  contas_sincronizadas: number;
}

interface SyncStatus {
  loading: boolean;
  success: boolean;
  error: string | null;
  results: SyncResult[];
}

export default function SincronizarExtratosPage() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    loading: false,
    success: false,
    error: null,
    results: [],
  });

  const handleSync = async () => {
    setSyncStatus({ loading: true, success: false, error: null, results: [] });

    try {
      // Sync bank metadata (agência, conta)
      const syncResult = await syncBankMetadata();

      if (syncResult.results) {
        setSyncStatus({
          loading: false,
          success: true,
          error: null,
          results: syncResult.results,
        });
      }
    } catch (error) {
      setSyncStatus({
        loading: false,
        success: false,
        error: error instanceof Error ? error.message : "Erro ao sincronizar",
        results: [],
      });
    }
  };

  return (
    <RoleGuard allow="admin">
      <div className="space-y-6">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle>Sincronizar Extratos Bancários</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Sincronize os extratos de seus bancos integrados com F360 e OMIE. 
              Os dados são consultados em tempo real quando necessário.
            </p>
          </CardHeader>
        </Card>

        {/* Status */}
        {syncStatus.success && (
          <Card className="border-green-500 bg-green-50/50">
            <CardContent className="pt-6">
              <div className="space-y-3">
                <p className="font-semibold text-green-900">✅ Sincronização concluída com sucesso!</p>
                <div className="space-y-2">
                  {syncStatus.results.map((result, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-white rounded border">
                      <span className="font-medium">{result.fonte}</span>
                      <Badge variant="outline">
                        {result.contas_sincronizadas} conta{result.contas_sincronizadas !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {syncStatus.error && (
          <Card className="border-red-500 bg-red-50/50">
            <CardContent className="pt-6">
              <p className="font-semibold text-red-900">❌ Erro na sincronização</p>
              <p className="text-sm text-red-700 mt-2">{syncStatus.error}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Action */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-900">
                  <strong>ℹ️ Como funciona:</strong> Ao sincronizar, o sistema consulta os dados de extratos 
                  que já estão integrados ao F360 e OMIE. Os dados são consultados em tempo real quando você 
                  executar validações ou conciliações.
                </p>
              </div>

              <Button
                onClick={handleSync}
                disabled={syncStatus.loading}
                size="lg"
                className="w-full"
              >
                {syncStatus.loading ? (
                  <>
                    <span className="mr-2">⏳</span>
                    Sincronizando...
                  </>
                ) : (
                  <>
                    <span className="mr-2">🔄</span>
                    Sincronizar Agora
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Info Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">F360</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Status: <Badge variant="outline">Integrado</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Sincroniza automaticamente com seus bancos integrados no F360.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">OMIE</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm">
                Status: <Badge variant="outline">Integrado</Badge>
              </p>
              <p className="text-xs text-muted-foreground">
                Sincroniza automaticamente com seus bancos integrados no OMIE.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Auto-Actions Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Ações Automáticas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Após sincronizar, o sistema executará automaticamente:
            </p>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span><strong>Validação de Taxas:</strong> Verifica se as taxas cobradas pelos bancos estão corretas.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span><strong>Conciliação Bancária:</strong> Matcheia movimentos com lançamentos contábeis.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span><strong>Conciliação de Cartão:</strong> Valida recebimentos de cartão de crédito.</span>
              </li>
              <li className="flex items-start">
                <span className="mr-2">✓</span>
                <span><strong>Alertas Automáticos:</strong> Cria alertas para divergências encontradas.</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Last Sync Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-xs text-muted-foreground space-y-1">
              <p>💾 Os dados são consultados em tempo real quando necessário.</p>
              <p>🔄 Banco de dados mantém apenas metadados (agência, conta).</p>
              <p>⚡ Sincronização ágil sem duplicação de dados.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}

