import { Command, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

export function GlobalSearch({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="flex h-[38px] w-[min(390px,36vw)] items-center rounded-[10px] border border-transparent bg-surface-soft px-[11px] text-muted-foreground focus-within:border-[color-mix(in_srgb,var(--brand)_40%,var(--border))] max-tablet:w-[min(390px,45vw)] max-nav:mr-auto max-nav:size-9 max-nav:border-0 max-nav:bg-transparent max-nav:p-0">
      <Search className="shrink-0 max-nav:m-auto" size={17} />
      <Input
        className="h-full min-w-0 border-0 bg-transparent! px-[9px] text-xs shadow-none focus-visible:border-0 focus-visible:ring-0 dark:bg-transparent! max-nav:hidden"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        placeholder="Таск, хүн, төсөл хайх..."
        aria-label="Хайх"
      />
      <kbd className="flex items-center gap-[3px] whitespace-nowrap rounded-[5px] border border-border bg-surface px-[5px] py-[3px] font-sans text-[9px] text-muted-foreground max-nav:hidden">
        <Command size={11} /> K
      </kbd>
    </div>
  );
}
