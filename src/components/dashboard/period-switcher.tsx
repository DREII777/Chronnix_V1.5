"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Mode = "month" | "quarter";

type Option = {
  value: string;
  label: string;
};

type Props = {
  mode: Mode;
  value: string;
  monthOptions: Option[];
  quarterOptions: Option[];
  onChange?: (mode: Mode, value: string) => void;
  className?: string;
};

export function PeriodSwitcher({ mode, value, monthOptions, quarterOptions, onChange, className }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (nextMode: Mode, nextValue: string) => {
      if (onChange) {
        onChange(nextMode, nextValue);
        return;
      }
      const search = new URLSearchParams(params.toString());
      search.set("period", nextMode);
      search.set("value", nextValue);
      router.push(`${pathname}?${search.toString()}`);
    },
    [onChange, params, pathname, router],
  );

  const handleModeChange = useCallback(
    (next: Mode) => {
      if (next === mode) return;
      const fallback =
        next === "month"
          ? monthOptions[0]?.value ?? value
          : quarterOptions[0]?.value ?? value;
      update(next, fallback);
    },
    [mode, monthOptions, quarterOptions, update, value],
  );

  const options = mode === "month" ? monthOptions : quarterOptions;
  const hasCurrentValue = options.some((option) => option.value === value);
  const selectValue = hasCurrentValue ? value : options[0]?.value ?? "";
  const currentIndex = options.findIndex((option) => option.value === selectValue);
  const prevDisabled = currentIndex === -1 || currentIndex >= options.length - 1;
  const nextDisabled = currentIndex <= 0;
  const changeByOffset = (offset: number) => {
    if (currentIndex === -1) return;
    const nextOption = options[currentIndex + offset];
    if (!nextOption) return;
    update(mode, nextOption.value);
  };

  const showModeToggle = quarterOptions.length > 0 && !onChange;

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-3", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        {showModeToggle ? (
          <Tabs value={mode} onValueChange={(next) => handleModeChange(next as Mode)}>
            <TabsList>
              <TabsTrigger value="month">Mensuel</TabsTrigger>
              <TabsTrigger value="quarter">Trimestriel</TabsTrigger>
            </TabsList>
          </Tabs>
        ) : null}
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-inner">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => changeByOffset(1)}
            disabled={prevDisabled}
            aria-label="Période précédente"
          >
            ‹
          </Button>
          <Select
            value={selectValue}
            onChange={(event) => update(mode, event.target.value)}
            className="h-9 min-w-[170px] border-0 bg-transparent text-sm"
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => changeByOffset(-1)}
            disabled={nextDisabled}
            aria-label="Période suivante"
          >
            ›
          </Button>
        </div>
      </div>
    </div>
  );
}
