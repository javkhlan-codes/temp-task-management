import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export function TaskProgress({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <Progress
      value={value}
      className={cn(
        "block [&_[data-slot=progress-track]]:h-[3px] [&_[data-slot=progress-track]]:bg-surface-hover [&_[data-slot=progress-indicator]]:bg-[linear-gradient(90deg,var(--brand),var(--brand-highlight))]",
        className,
      )}
    />
  );
}
