import { EmptyState } from "@/components/molecules/empty-state";
import {
  statusSurfaceClasses,
} from "@/features/task-manager/lib/task-visuals";
import { STATUS_LABELS, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskTimeline({
  tasks,
  onEdit,
  onAdd,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onAdd: () => void;
}) {
  if (!tasks.length) return <EmptyState onAdd={onAdd} />;
  const starts = tasks.map((task) =>
    new Date(task.createdAt).setHours(0, 0, 0, 0),
  );
  const ends = tasks.map((task) =>
    new Date(`${task.dueDate}T23:59:59+08:00`).getTime(),
  );
  const rangeStart = Math.min(...starts);
  const rangeEnd = Math.max(...ends, rangeStart + 86_400_000);
  const range = Math.max(rangeEnd - rangeStart, 86_400_000);
  const markers = Array.from({ length: 5 }, (_, index) => {
    const value = new Date(rangeStart + (range * index) / 4);
    return {
      position: `${(index / 4) * 100}%`,
      label: new Intl.DateTimeFormat("mn-MN", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Ulaanbaatar",
      }).format(value),
    };
  });

  return (
    <div
      className="min-w-[760px] px-[18px] pt-4 pb-6"
      data-ui="task-timeline"
    >
      <div className="grid h-8 grid-cols-[220px_minmax(420px,1fr)] gap-3.5 border-b border-border">
        <span />
        <div className="relative">
          {markers.map((marker) => (
            <span
              className="absolute top-0 -translate-x-1/2 text-[8px] whitespace-nowrap text-muted-foreground"
              style={{ left: marker.position }}
              key={marker.position}
            >
              {marker.label}
            </span>
          ))}
        </div>
      </div>
      {tasks.map((task) => {
        const start = new Date(task.createdAt).setHours(0, 0, 0, 0);
        const end = new Date(`${task.dueDate}T23:59:59+08:00`).getTime();
        const left = Math.max(0, ((start - rangeStart) / range) * 100);
        const width = Math.max(
          2.5,
          ((Math.max(end, start) - start) / range) * 100,
        );
        return (
          <button
            className="grid min-h-[54px] w-full grid-cols-[220px_minmax(420px,1fr)] items-center gap-3.5 border-b border-border bg-transparent py-[7px] text-left hover:bg-surface-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
            onClick={() => onEdit(task)}
            key={task.id}
          >
            <span className="flex min-w-0 flex-col pl-[7px]">
              <strong className="overflow-hidden text-[10px] text-ellipsis whitespace-nowrap">
                {task.title}
              </strong>
              <small className="mt-[3px] text-[8px] text-muted-foreground">
                {STATUS_LABELS[task.status]} · {task.dueDate}
              </small>
            </span>
            <span className="relative h-7">
              {markers.map((marker) => (
                <i
                  className="absolute -top-3.5 -bottom-3.5 border-l border-dashed border-border"
                  style={{ left: marker.position }}
                  key={marker.position}
                />
              ))}
              <b
                className={cn(
                  "absolute top-[5px] h-[18px] min-w-[7px] overflow-hidden rounded-full",
                  statusSurfaceClasses[task.status],
                )}
                style={{
                  left: `${left}%`,
                  width: `${Math.min(width, 100 - left)}%`,
                }}
              >
                <em
                  className="absolute inset-y-0 left-0 bg-white/25"
                  style={{ width: `${task.progress}%` }}
                />
              </b>
            </span>
          </button>
        );
      })}
    </div>
  );
}
