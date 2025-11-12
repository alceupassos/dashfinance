 "use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getTargets } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useDashboardStore } from "@/store/use-dashboard-store";
import { useUserStore } from "@/store/use-user-store";

interface SearchOption {
  value: string;
  label: string;
  description?: string;
  searchValue: string;
  active?: boolean;
  sources?: string[];
  cnpj?: string;
  aliases?: string[];
}

interface SearchSelectProps {
  options: SearchOption[];
  value?: string;
  placeholder: string;
  selectValue?: string;
  onValueChange: (value: string, option?: SearchOption) => void;
  disabled?: boolean;
  renderOption?: (option: SearchOption, selected: boolean) => React.ReactNode;
  className?: string;
}

function SearchSelect({
  options,
  value,
  placeholder,
  selectValue,
  onValueChange,
  disabled,
  renderOption,
  className
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = useMemo(() => {
    if (selectValue) {
      return options.find((option) => option.value === selectValue);
    }
    return options.find((option) => option.value === value);
  }, [options, value, selectValue]);

  const filteredOptions = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((option) => option.searchValue.includes(term));
  }, [options, search]);

  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn("justify-between gap-2", className)}
        >
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium">
              {selected ? selected.label : <span className="text-muted-foreground">{placeholder}</span>}
            </span>
            {selected?.description ? (
              <span className="text-xs text-muted-foreground">{selected.description}</span>
            ) : null}
          </div>
          <ChevronDown className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <Command>
          <CommandInput
            value={search}
            onValueChange={setSearch}
            placeholder="Digite para filtrar..."
          />
          <CommandEmpty>Nenhuma opção encontrada.</CommandEmpty>
          <CommandList className="max-h-64 overflow-auto">
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.searchValue}
                  onSelect={() => {
                    onValueChange(option.value, option);
                    setOpen(false);
                  }}
                >
                  {renderOption ? (
                    renderOption(option, (selectValue ?? value) === option.value)
                  ) : (
                    <DefaultOption option={option} selected={(selectValue ?? value) === option.value} />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

function DefaultOption({ option, selected }: { option: SearchOption; selected: boolean }) {
  return (
    <div className="flex w-full items-center gap-2">
      <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
      <div className="flex flex-col">
        <span className="text-sm font-medium">{option.label}</span>
        {option.description ? <span className="text-xs text-muted-foreground">{option.description}</span> : null}
      </div>
    </div>
  );
}

function formatCnpj(value?: string) {
  const digits = (value ?? "").replace(/\D/g, "");
  if (digits.length !== 14) return value ?? "";
  return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
}

const DEFAULT_GROUP_CNPJ = "00026888098000";

export function TargetSelector() {
  const { selectedTarget, setTarget } = useDashboardStore();
  const { role, availableCompanies, hasFullAccess } = useUserStore((state) => ({
    role: state.role,
    availableCompanies: state.availableCompanies,
    hasFullAccess: state.hasFullAccess
  }));
  const { data } = useQuery({
    queryKey: ["targets"],
    queryFn: getTargets,
    staleTime: 1000 * 60 * 5,
    retry: 1
  });

  const targets = useMemo(() => data ?? { aliases: [], cnpjs: [] }, [data]);

  const { aliasOptions, cnpjOptions } = useMemo(() => {
    const buildSearchValue = (parts: Array<string | undefined>) =>
      parts
        .flatMap((part) => (part ? [part.toLowerCase()] : []))
        .join(" ");

    const aliasList: SearchOption[] =
      targets.aliases?.map((alias) => {
        const membersCount = Array.isArray(alias.members) ? alias.members.length : 0;
        return {
          value: alias.id,
          label: alias.label,
          description: membersCount > 0 ? `${membersCount} empresa${membersCount > 1 ? "s" : ""}` : undefined,
          searchValue: buildSearchValue([alias.label, ...(alias.members ?? [])]),
          active: alias.active ?? false,
          sources: alias.sources ?? []
        };
      }) ?? [];

    const restrictedRole = role === "cliente" || role === "cliente_multi";
    const baseCompanyList = (targets.cnpjs ?? []).flatMap((company) => {
      const value = company.value ?? company.cnpj;
      if (!value) return [];
      const aliases = company.aliases ?? [];
      const formattedCnpj = formatCnpj(company.cnpj ?? value);
      const option: SearchOption = {
        value,
        label: company.label ?? formattedCnpj ?? value,
        description: formattedCnpj,
        cnpj: company.cnpj ?? value,
        aliases,
        active: company.active ?? false,
        sources: company.sources ?? [],
        searchValue: buildSearchValue([company.label, formattedCnpj, value, ...aliases])
      };
      return [option];
    });

    const companyList = baseCompanyList.filter((item) => {
      if (!restrictedRole || hasFullAccess) return true;
      return availableCompanies.includes(item.value);
    });

    return {
      aliasOptions: aliasList,
      cnpjOptions: companyList
    };
  }, [targets, role, availableCompanies, hasFullAccess]);

  useEffect(() => {
    const restricted = (role === "cliente" || role === "cliente_multi") && !hasFullAccess;
    const preferredOption = cnpjOptions.find((option) => option.value === DEFAULT_GROUP_CNPJ);

    if (restricted) {
      const fallback = preferredOption ?? cnpjOptions[0];
      if (!fallback) return;

      if (selectedTarget.type !== "cnpj") {
        setTarget({ type: "cnpj", value: fallback.value });
        return;
      }

      const allowed = cnpjOptions.some((option) => option.value === selectedTarget.value);
      if (!allowed) {
        setTarget({ type: "cnpj", value: fallback.value });
      }
      return;
    }

    const currentOptions = selectedTarget.type === "alias" ? aliasOptions : cnpjOptions;
    const hasCurrent = currentOptions.some((option) => option.value === selectedTarget.value);

    if (!hasCurrent) {
      if (preferredOption) {
        setTarget({ type: "cnpj", value: preferredOption.value });
      } else if (selectedTarget.type === "alias" && aliasOptions.length > 0) {
        setTarget({ type: "alias", value: aliasOptions[0].value });
      } else if (cnpjOptions.length > 0) {
        setTarget({ type: "cnpj", value: cnpjOptions[0].value });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    aliasOptions,
    availableCompanies,
    cnpjOptions,
    hasFullAccess,
    role,
    selectedTarget.type,
    selectedTarget.value
  ]);

  return (
    <div className="flex w-full min-w-[280px] flex-col gap-1">
      <Label>Alias / Empresa</Label>
      <div className="flex gap-2">
        <Select
          value={selectedTarget.type}
          disabled={(role === "cliente" || role === "cliente_multi") && !hasFullAccess}
          onValueChange={(value) => {
            if (value === selectedTarget.type) return;
            if (value === "alias") {
              const first = aliasOptions[0];
              setTarget({ type: "alias", value: first?.value ?? "" });
            } else {
              const first = cnpjOptions[0];
              setTarget({ type: "cnpj", value: first?.value ?? "" });
            }
          }}
        >
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="alias">Alias</SelectItem>
            <SelectItem value="cnpj">Empresa</SelectItem>
          </SelectContent>
        </Select>

        {selectedTarget.type === "alias" ? (
          <SearchSelect
            options={aliasOptions}
            value={selectedTarget.value}
            selectValue={selectedTarget.type === "alias" ? selectedTarget.value : undefined}
            placeholder="Selecione o alias"
            onValueChange={(value) => {
              setTarget({
                type: "alias",
                value
              });
            }}
            className="flex-1 text-left"
            renderOption={(option, selected) => (
              <div className="flex w-full items-center gap-3">
                <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </div>
                <div className="ml-auto flex items-center gap-2">
                  {option.sources?.map((source) => (
                    <Badge key={source} variant="outline">
                      {source.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          />
        ) : (
          <SearchSelect
            options={cnpjOptions}
            value={selectedTarget.value}
            placeholder="Selecione a empresa"
            onValueChange={(value) =>
              setTarget({
                type: "cnpj",
                value
              })
            }
            className="flex-1 text-left"
            renderOption={(option, selected) => (
              <div className="flex w-full items-center gap-3">
                <Check className={cn("h-4 w-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                  {option.aliases && option.aliases.length > 1 ? (
                    <span className="text-[11px] text-muted-foreground">
                      Também conhecido como: {option.aliases.slice(1).join(", ")}
                    </span>
                  ) : null}
                </div>
                <div className="ml-auto flex flex-col items-end gap-1">
                  <div className="flex items-center gap-1">
                    <Badge variant={option.active ? "success" : "outline"}>
                      {option.active ? "Ativo" : "Inativo"}
                    </Badge>
                    {option.sources?.map((source) => (
                      <Badge key={source} variant="outline">
                        {source.toUpperCase()}
                      </Badge>
                    ))}
                  </div>
                  {option.cnpj ? (
                    <span className="text-[11px] text-muted-foreground">CNPJ: {formatCnpj(option.cnpj)}</span>
                  ) : null}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
