import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const dotVariants = cva("size-1.5 rounded-full bg-muted-foreground", {
  variants: {
    mode: {
      database:
        "bg-success shadow-[0_0_0_3px_color-mix(in_srgb,var(--success)_16%,transparent)]",
      local: "bg-muted-foreground",
      loading: "animate-pulse bg-warning",
    },
  },
  defaultVariants: {
    mode: "loading",
  },
});

export function SyncIndicator({
  mode,
}: {
  mode: "loading" | "local" | "database";
}) {
  return (
    <span className="mr-[5px] flex items-center gap-1.5 rounded-full border border-border px-2 py-[5px] text-[10px] text-muted-foreground max-shell:hidden">
      <span className={cn(dotVariants({ mode }))} />
      {mode === "database"
        ? "Neon холбогдсон"
        : mode === "local"
          ? "Demo горим"
          : "Холбож байна"}
    </span>
  );
}
