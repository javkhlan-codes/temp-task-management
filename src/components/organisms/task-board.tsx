"use client";

import { CalendarDays, MoreHorizontal, Plus } from "lucide-react";
import { useState } from "react";
import { PriorityBadge } from "@/components/atoms/priority-badge";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { TaskProgress } from "@/components/molecules/task-progress";
import {
  statusDotClasses,
} from "@/features/task-manager/lib/task-visuals";
import { formatDueDate, isOverdue } from "@/lib/format";
import {
  STATUSES,
  STATUS_LABELS,
  type Task,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskBoard({
  tasks,
  onEdit,
  onUpdate,
  onAdd,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onAdd: () => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div
      className="grid min-h-[520px] auto-cols-[minmax(235px,1fr)] grid-flow-col gap-3 overflow-x-auto p-[15px]"
      data-ui="task-board"
    >
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <section
            className="min-w-[235px] rounded-[11px] border border-border bg-surface-soft"
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggingId) {
                onUpdate(
                  draggingId,
                  status === "Done" ? { status, progress: 100 } : { status },
                );
              }
              setDraggingId(null);
            }}
          >
            <div className="flex h-[46px] items-center px-3">
              <span
                className={cn(
                  "mr-[7px] size-2 rounded-full",
                  statusDotClasses[status],
                )}
              />
              <strong className="text-[11px]">{STATUS_LABELS[status]}</strong>
              <small className="ml-[7px] flex h-[19px] min-w-[19px] items-center justify-center rounded-[5px] bg-surface-hover text-[8px] text-muted-foreground">
                {columnTasks.length}
              </small>
              <button
                className="ml-auto flex bg-transparent p-1 text-muted-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                onClick={onAdd}
                aria-label={`Add task to ${status}`}
              >
                <Plus size={16} />
              </button>
            </div>
            <div className="px-[9px] pb-2.5">
              {columnTasks.map((task) => (
                <article
                  className={cn(
                    "mb-[9px] cursor-grab rounded-[9px] border border-border bg-surface p-3 shadow-[0_3px_8px_rgba(30,26,55,0.025)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] hover:shadow-panel",
                    draggingId === task.id && "rotate-2 opacity-45",
                  )}
                  draggable
                  key={task.id}
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => onEdit(task)}
                >
                  <div className="flex items-center justify-between [&>svg]:text-muted-foreground">
                    <PriorityBadge
                      priority={task.priority}
                      showDot={false}
                      className="px-1.5 py-1 text-[8px]"
                    />
                    <MoreHorizontal size={17} />
                  </div>
                  <h3 className="mt-2.5 mb-[5px] text-[11px] leading-[1.45]">
                    {task.title}
                  </h3>
                  <p className="mb-[9px] line-clamp-2 text-[8.5px] leading-[1.45] text-muted-foreground">
                    {task.description}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {task.tags.map((tag) => (
                      <span
                        className="rounded-sm bg-brand-subtle px-[5px] py-[3px] text-[7.5px] text-brand"
                        key={tag}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <TaskProgress value={task.progress} className="mt-3" />
                  <div className="mt-2.5 flex items-center justify-between">
                    <UserAvatar user={task.assignee} size="sm" />
                    <span
                      className={cn(
                        "flex items-center gap-[5px] text-[9px] text-muted-foreground",
                        isOverdue(task.dueDate, task.status) && "text-danger",
                      )}
                    >
                      <CalendarDays size={14} />
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </article>
              ))}
              {!columnTasks.length && (
                <div className="mb-[9px] flex h-[68px] items-center justify-center rounded-lg border border-dashed border-input text-[9px] text-muted-foreground">
                  <span>Таскийг энд чирж оруулна уу</span>
                </div>
              )}
              <button
                className="flex w-full items-center justify-center gap-[5px] rounded-[7px] bg-transparent p-2 text-[9px] text-muted-foreground hover:bg-surface-hover hover:text-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                onClick={onAdd}
              >
                <Plus size={15} />
                Add task
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
