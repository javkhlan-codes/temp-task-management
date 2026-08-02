"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type FilterSelectOption = {
  value: string;
  label: string;
};

export function FilterSelect({
  value,
  onValueChange,
  options,
  ariaLabel,
  triggerClassName,
  contentClassName,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: readonly FilterSelectOption[];
  ariaLabel: string;
  triggerClassName?: string;
  contentClassName?: string;
}) {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value;

  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (nextValue !== null) onValueChange(nextValue);
      }}
    >
      <SelectTrigger
        className={cn(
          "border-0 bg-transparent p-0 text-[9.5px] text-[var(--text-soft)] shadow-none hover:bg-transparent focus-visible:border-0 focus-visible:ring-0 data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3.5",
          triggerClassName,
        )}
        aria-label={ariaLabel}
      >
        <SelectValue>{selectedLabel}</SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        className={cn("z-90 min-w-[150px] text-[10px]", contentClassName)}
      >
        {options.map((option) => (
          <SelectItem
            className="min-h-7 text-[10px]"
            value={option.value}
            key={option.value}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
