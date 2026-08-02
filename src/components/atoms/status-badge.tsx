import { Badge } from "@/components/ui/badge";
import { statusDotClasses, statusSurfaceClasses } from "@/features/task-manager/lib/task-visuals";
import { STATUS_LABELS, type TaskStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: TaskStatus;
  className?: string;
}) {
  return (
    <Badge
      className={cn(
        "gap-[5px] rounded-full border-0 px-2 py-1 text-[8.5px] font-medium",
        statusSurfaceClasses[status],
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", statusDotClasses[status])} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}
