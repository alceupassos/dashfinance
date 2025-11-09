"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaxaCard } from "@/components/conciliation/taxa-card";
import { FeeType, feeTypeLabels, mockFees } from "@/lib/conciliation";

const banks = ["001", "033", "104"];
const statuses = ["Todas", "Ativas", "Inativas"];
const feeTypes: FeeType[] = ["pix", "ted", "boleto_recebimento", "cartao_credito", "tarifa_manutencao"];

export default function TaxasConfigPage() {
  const [filterBank, setFilterBank] = useState<string>("Todas");
  const [filterStatus, setFilterStatus] = useState<string>("Todas");
  const [filterType, setFilterType] = useState<FeeType | "">("");
  const [search, setSearch] = useState("");
  const [formVisible, setFormVisible] = useState(false);

  const filtered = useMemo(() => {
    return mockFees.filter((fee) => {
      const matchesBank = filterBank === "Todas" || fee.banco_codigo === filterBank;
      const matchesStatus =
        filterStatus === "Todas" || (filterStatus === "Ativas" ? fee.ativo : !fee.ativo);
      const matchesType = filterType === "" || fee.tipo === filterType;
      const matchesSearch =
        fee.company_cnpj.includes(search) || fee.observacoes?.toLowerCase().includes(search.toLowerCase());
      return matchesBank && matchesStatus && matchesType && matchesSearch;
    });
  }, [filterBank, filterStatus, filterType, search]);

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-wrap items-start justify-between gap-3 border-none p-4">
          <div>
            <CardTitle className="text-lg text-foreground">Taxas Contratuais</CardTitle>
            <p className="text-sm text-muted-foreground">Gerencie taxas por banco, tipo e histórico.</p>
          </div>
          <Button variant="secondary" onClick={() => setFormVisible((prev) => !prev)}>
            {formVisible ? "Ocultar formulário" : "+ Nova taxa"}
          </Button>
        </CardHeader>
        {formVisible && (
          <CardContent className="grid gap-3 border-t border-border/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="CNPJ da empresa" />
              <Select value={filterBank} onValueChange={setFilterBank}>
                <SelectTrigger>
                  <SelectValue placeholder="Banco" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Todas">Todas</SelectItem>
                  {banks.map((bank) => (
                    <SelectItem key={bank} value={bank}>
                      {bank}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Select value={filterType} onValueChange={(value) => setFilterType(value as FeeType | "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Tipo de taxa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  {feeTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {feeTypeLabels[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Taxa percentual (%)" />
              <Input placeholder="Taxa fixa (R$)" />
            </div>
            <Input placeholder="Observações" />
            <div className="flex justify-end">
              <Button variant="outline">Cancelar</Button>
              <Button className="ml-2" variant="secondary">
                Salvar taxa
              </Button>
            </div>
          </CardContent>
        )}
        <CardContent className="grid gap-3 border-t border-border/50 p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select value={filterBank} onValueChange={setFilterBank}>
              <SelectTrigger>
                <SelectValue placeholder="Banco" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Todas">Todos os bancos</SelectItem>
                {banks.map((bank) => (
                  <SelectItem key={bank} value={bank}>
                    Banco {bank}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={(value) => setFilterType(value as FeeType | "")}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {feeTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {feeTypeLabels[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            placeholder="Buscar por CNPJ ou observação"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((fee) => (
          <TaxaCard
            key={fee.id}
            banco_codigo={fee.banco_codigo}
            tipo={fee.tipo}
            percentual={fee.taxa_percentual}
            fixa={fee.taxa_fixa}
            vigencia={fee.vigencia_inicio}
            ativo={fee.ativo}
            observacoes={fee.observacoes}
            id={fee.id}
          />
        ))}
        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-border/40 bg-[#0b0c12]/70 p-6 text-center text-sm text-muted-foreground">
            Nenhuma taxa encontrada com os filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}
