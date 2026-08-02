import { Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { statusDotClasses } from "@/features/task-manager/lib/task-visuals";
import { STATUS_LABELS, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskDependencyPicker({
  tasks,
  projectId,
  taskId,
  dependencyIds,
  onChange,
}: {
  tasks: Task[];
  projectId: string;
  taskId?: string;
  dependencyIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const candidates = tasks.filter(
    (candidate) =>
      !candidate.parentId &&
      !candidate.archived &&
      candidate.projectId === projectId &&
      candidate.id !== taskId,
  );

  return (
    <div className="col-span-full grid min-w-0 gap-1.5">
      <Label className="text-[9px] font-semibold text-[var(--text-soft)]">
        Хамаарал · эхлүүлэхийн өмнө дууссан байх таск
      </Label>
      <div className="grid max-h-[190px] grid-cols-2 gap-[7px] overflow-y-auto max-mobile:grid-cols-1">
        {candidates.map((candidate) => {
          const selected = dependencyIds.includes(candidate.id);
          return (
            <button
              type="button"
              className={cn(
                "grid grid-cols-[9px_1fr_16px] items-center gap-2 rounded-[9px] border border-border bg-surface-soft px-[9px] py-2 text-left hover:border-[color-mix(in_srgb,var(--brand)_45%,var(--border))]",
                selected &&
                  "border-[color-mix(in_srgb,var(--brand)_45%,var(--border))] bg-brand-subtle",
              )}
              onClick={() =>
                onChange(
                  selected
                    ? dependencyIds.filter((id) => id !== candidate.id)
                    : [...dependencyIds, candidate.id],
                )
              }
              aria-pressed={selected}
              key={candidate.id}
            >
              <span
                className={cn(
                  "size-2 rounded-full",
                  statusDotClasses[candidate.status],
                )}
              />
              <span className="flex min-w-0 flex-col">
                <strong className="truncate text-[9px]">
                  {candidate.title}
                </strong>
                <small className="mt-0.5 text-[8px] text-muted-foreground">
                  {STATUS_LABELS[candidate.status]} · {candidate.dueDate}
                </small>
              </span>
              <i className="flex size-4 items-center justify-center rounded-full bg-brand text-brand-foreground">
                {selected && <Check size={12} />}
              </i>
            </button>
          );
        })}
        {!candidates.length && (
          <small className="text-[8px] text-muted-foreground">
            Хамаарал сонгох өөр таск одоогоор алга.
          </small>
        )}
      </div>
    </div>
  );
}
