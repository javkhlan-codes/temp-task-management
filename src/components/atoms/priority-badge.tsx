import { Badge } from "@/components/ui/badge";
import { priorityDotClasses, priorityTextClasses } from "@/features/task-manager/lib/task-visuals";
import { PRIORITY_LABELS, type TaskPriority } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PriorityBadge({
  priority,
  className,
  showDot = true,
}: {
  priority: TaskPriority;
  className?: string;
  showDot?: boolean;
}) {
  return (
    <Badge
      className={cn(
        "gap-[5px] rounded-[5px] border-0 bg-surface-soft px-1.5 py-1 text-[8px] font-medium",
        priorityTextClasses[priority],
        className,
      )}
    >
      {showDot && (
        <span
          className={cn("size-1.5 rounded-full", priorityDotClasses[priority])}
        />
      )}
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
