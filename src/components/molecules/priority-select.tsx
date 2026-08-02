import {
  priorityDotClasses,
  priorityTextClasses,
} from "@/features/task-manager/lib/task-visuals";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  type TaskPriority,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function PrioritySelect({
  value,
  onValueChange,
  ariaLabel,
  className,
}: {
  value: TaskPriority;
  onValueChange: (value: TaskPriority) => void;
  ariaLabel: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-1.5 flex h-[26px] max-w-full items-center rounded-full bg-surface-soft px-2",
        priorityTextClasses[value],
        className,
      )}
    >
      <span
        className={cn(
          "mr-[5px] size-1.5 shrink-0 rounded-full",
          priorityDotClasses[value],
        )}
      />
      <Select
        value={value}
        onValueChange={(nextValue) =>
          onValueChange(nextValue as TaskPriority)
        }
      >
        <SelectTrigger
          className="w-[66px] border-0 bg-transparent p-0 text-[8.5px] shadow-none hover:bg-transparent focus-visible:border-0 focus-visible:ring-0 data-[size=default]:h-auto dark:bg-transparent dark:hover:bg-transparent [&_svg]:size-3"
          aria-label={ariaLabel}
        >
          <SelectValue>{PRIORITY_LABELS[value]}</SelectValue>
        </SelectTrigger>
        <SelectContent align="start" className="min-w-[132px]">
          {PRIORITIES.map((priority) => (
            <SelectItem
              className="min-h-7 text-[9px]"
              value={priority}
              key={priority}
            >
              {PRIORITY_LABELS[priority]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
