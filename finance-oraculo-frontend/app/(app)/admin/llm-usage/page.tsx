"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAdminLlmUsage } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RoleGuard } from "@/components/role-guard";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/formatters";

const months = ["2025-01", "2024-12", "2024-11"];

export default function LlmUsagePage() {
  return (
    <RoleGuard allow="admin">
      <Content />
    </RoleGuard>
  );
}

function Content() {
  const [month, setMonth] = useState(months[0]);
  const { data } = useQuery({
    queryKey: ["admin-llm-usage", month],
    queryFn: () => getAdminLlmUsage(month)
  });

  if (!data) return null;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="flex flex-col gap-2 border-none p-4 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-sm">Custos LLM</CardTitle>
            <p className="text-[11px] text-muted-foreground">
              Visão consolidada de consumo por modelo, usuário e provider.
            </p>
          </div>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((item) => (
                <SelectItem key={item} value={item}>
                  {item}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-4">
          <SummaryCard label="Total gasto (USD)" value={`$${data.summary.totalUsd.toFixed(2)}`} />
          <SummaryCard label="Total de requests" value={data.summary.totalRequests.toLocaleString()} />
          <SummaryCard label="Modelo mais usado" value={data.summary.topModel} />
          <SummaryCard label="Usuário destaque" value={data.summary.topUser} />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4 pb-2">
          <CardTitle className="text-sm">Custo por modelo</CardTitle>
        </CardHeader>
        <CardContent className="h-[260px] p-0 pl-2 pr-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.byModel}>
              <CartesianGrid strokeDasharray="1 3" stroke="#1f1f2b" vertical={false} />
              <XAxis dataKey="model" stroke="#666" fontSize={11} />
              <YAxis stroke="#666" fontSize={11} tickFormatter={(value) => `$${value}`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f0f16",
                  border: "1px solid rgba(68,68,88,0.5)",
                  borderRadius: "0.5rem",
                  fontSize: "12px"
                }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Bar dataKey="usd" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-[#11111a]/80">
        <CardHeader className="border-none p-4 pb-2">
          <CardTitle className="text-sm">Uso por usuário</CardTitle>
        </CardHeader>
        <CardContent className="overflow-hidden rounded-md border border-border/60 p-0">
          <table className="min-w-full text-left text-xs">
            <thead className="bg-[#0d0d15] text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr className="[&>th]:px-3 [&>th]:py-2">
                <th>Usuário</th>
                <th>Email</th>
                <th>Provider</th>
                <th>Requests</th>
                <th>Tokens</th>
                <th>Custo</th>
                <th>%</th>
              </tr>
            </thead>
            <tbody>
              {data.byUser.map((row) => (
                <tr
                  key={row.email}
                  className="border-t border-border/60 text-foreground transition-colors hover:bg-secondary/30 [&>td]:px-3 [&>td]:py-2"
                >
                  <td>{row.user}</td>
                  <td className="text-muted-foreground">{row.email}</td>
                  <td>
                    <Badge variant="outline">{row.provider}</Badge>
                  </td>
                  <td>{row.requests.toLocaleString()}</td>
                  <td>{row.tokens.toLocaleString()}</td>
                  <td>{formatCurrency(row.usd * 5)} </td>
                  <td>{row.percentage.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
      <p className="text-[11px] uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
