"use client";

import { addMonths, formatISO } from "date-fns";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useDashboardStore } from "@/store/use-dashboard-store";

const presets = [
  { label: "Últimos 6 meses", value: "6m", months: 6 },
  { label: "Último trimestre", value: "3m", months: 3 },
  { label: "Ano atual", value: "ytd", months: new Date().getMonth() },
  { label: "Custom", value: "custom", months: 0 }
];

export function PeriodPicker() {
  const { period, setPeriod } = useDashboardStore();

  function handlePresetChange(value: string) {
    if (value === "custom") return;

    const months = presets.find((preset) => preset.value === value)?.months ?? 3;
    const to = new Date();
    const from =
      value === "ytd"
        ? new Date(to.getFullYear(), 0, 1)
        : addMonths(new Date(), -months + 1);

    setPeriod({
      from: formatISO(from, { representation: "date" }),
      to: formatISO(to, { representation: "date" })
    });
  }

  return (
    <div className="flex w-full max-w-xs flex-col gap-1">
      <Label>Período</Label>
      <div className="flex items-center gap-2">
        <Select onValueChange={handlePresetChange} defaultValue="6m">
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Preset" />
          </SelectTrigger>
          <SelectContent>
            {presets.map((preset) => (
              <SelectItem key={preset.value} value={preset.value}>
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={period.from}
          onChange={(event) => setPeriod({ ...period, from: event.target.value })}
        />
        <Input
          type="date"
          value={period.to}
          onChange={(event) => setPeriod({ ...period, to: event.target.value })}
        />
      </div>
    </div>
  );
}
