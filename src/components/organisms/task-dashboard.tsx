import { BarChart3, Target, Users } from "lucide-react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { Card } from "@/components/ui/card";
import {
  priorityTextClasses,
  statusSurfaceClasses,
  taskAssignees,
} from "@/features/task-manager/lib/task-visuals";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type Task,
  type WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskDashboard({
  tasks,
  users,
}: {
  tasks: Task[];
  users: WorkspaceUser[];
}) {
  const total = tasks.length || 1;
  const statusCounts = STATUSES.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));
  const priorityCounts = PRIORITIES.map((priority) => ({
    priority,
    count: tasks.filter((task) => task.priority === priority).length,
  }));
  const workload = users
    .filter((user) => user.active && user.id !== "unassigned")
    .map((user) => ({
      user,
      count: tasks.filter((task) =>
        taskAssignees(task).some((assignee) => assignee.id === user.id),
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  const maxWorkload = Math.max(...workload.map((item) => item.count), 1);

  const cardClass =
    "gap-0 rounded-xl border border-border bg-surface-soft p-[15px] py-[15px] ring-0 shadow-none";
  const headerClass =
    "mb-4 flex items-center justify-between [&>small]:text-[8px] [&>small]:text-muted-foreground";
  const headerTitleClass =
    "inline-flex items-center gap-[7px] font-heading text-[11px] font-bold [&>svg]:text-brand";

  return (
    <div
      className="grid grid-cols-2 gap-3.5 p-[18px] max-mobile:grid-cols-1 max-mobile:p-3"
      data-ui="task-dashboard"
    >
      <Card className={cardClass}>
        <header className={headerClass}>
          <span className={headerTitleClass}>
            <BarChart3 size={16} />
            Төлвийн хуваарилалт
          </span>
          <small>{tasks.length} таск</small>
        </header>
        <div className="flex flex-col gap-[11px]">
          {statusCounts.map(({ status, count }) => (
            <div
              className="grid grid-cols-[88px_1fr_20px] items-center gap-[9px]"
              key={status}
            >
              <span className="text-[9px] text-[var(--text-soft)]">
                {STATUS_LABELS[status]}
              </span>
              <b className="h-2 overflow-hidden rounded-full bg-border">
                <i
                  className={cn(
                    "block h-full min-w-0.5 rounded-[inherit]",
                    statusSurfaceClasses[status],
                  )}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </b>
              <strong className="text-right text-[9px]">{count}</strong>
            </div>
          ))}
        </div>
      </Card>
      <Card className={cardClass}>
        <header className={headerClass}>
          <span className={headerTitleClass}>
            <Target size={16} />
            Ач холбогдол
          </span>
        </header>
        <div className="flex items-center justify-center gap-[22px]">
          <div
            className="relative flex size-[124px] items-center justify-center rounded-full after:absolute after:inset-[21px] after:rounded-full after:bg-surface-soft after:content-['']"
            style={{
              background: `conic-gradient(
                var(--priority-critical) 0 ${(priorityCounts[3].count / total) * 100}%,
                var(--priority-high) ${(priorityCounts[3].count / total) * 100}% ${((priorityCounts[3].count + priorityCounts[2].count) / total) * 100}%,
                var(--priority-medium) ${((priorityCounts[3].count + priorityCounts[2].count) / total) * 100}% ${((priorityCounts[3].count + priorityCounts[2].count + priorityCounts[1].count) / total) * 100}%,
                var(--priority-low) ${((priorityCounts[3].count + priorityCounts[2].count + priorityCounts[1].count) / total) * 100}% 100%
              )`,
            }}
          >
            <span className="relative z-[1] flex flex-col items-center">
              <strong className="font-heading text-[21px]">{tasks.length}</strong>
              <small className="text-[8px] text-muted-foreground">нийт</small>
            </span>
          </div>
          <div className="flex flex-col gap-[7px]">
            {priorityCounts.map(({ priority, count }) => (
              <span
                className={cn(
                  "grid grid-cols-[8px_1fr_15px] items-center gap-1.5 bg-transparent p-0 text-[8px]",
                  priorityTextClasses[priority],
                )}
                key={priority}
              >
                <i className="size-[7px] rounded-full bg-current" />
                {PRIORITY_LABELS[priority]}
                <strong className="text-right text-foreground">{count}</strong>
              </span>
            ))}
          </div>
        </div>
      </Card>
      <Card
        className={cn(
          cardClass,
          "col-span-full max-mobile:col-span-1",
        )}
      >
        <header className={headerClass}>
          <span className={headerTitleClass}>
            <Users size={16} />
            Ажлын ачаалал
          </span>
          <small>Хариуцагчаар</small>
        </header>
        <div className="grid grid-cols-2 gap-x-[18px] gap-y-2.5 max-mobile:grid-cols-1">
          {workload.map(({ user, count }) => (
            <div
              className="grid grid-cols-[28px_1fr_20px] items-center gap-2"
              key={user.id}
            >
              <UserAvatar user={user} size="sm" />
              <span className="flex min-w-0 flex-col">
                <strong className="text-[9px]">{user.name}</strong>
                <b className="mt-1 h-1.5 overflow-hidden rounded-full bg-border">
                  <i
                    className="block h-full rounded-[inherit] bg-[linear-gradient(90deg,var(--brand),var(--brand-highlight))]"
                    style={{ width: `${(count / maxWorkload) * 100}%` }}
                  />
                </b>
              </span>
              <em className="text-right text-[9px] not-italic text-[var(--text-soft)]">
                {count}
              </em>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
