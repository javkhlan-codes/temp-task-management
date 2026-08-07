import {
  CheckCircle2,
  Clock3,
  MoreHorizontal,
  Plus,
  Settings,
  Target,
  ChevronRight,
} from "lucide-react";
import { ProjectMark } from "@/components/atoms/project-mark";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { MetricCard } from "@/components/molecules/metric-card";
import { TaskBoard } from "@/components/organisms/task-board";
import { TaskCalendar } from "@/components/organisms/task-calendar";
import { TaskDashboard } from "@/components/organisms/task-dashboard";
import { TaskList } from "@/components/organisms/task-list";
import { TaskTimeline } from "@/components/organisms/task-timeline";
import { TaskToolbar } from "@/components/organisms/task-toolbar";
import { Button } from "@/components/ui/button";
import type {
  CustomColumn,
  CustomFieldValue,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  ViewMode,
  WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function WorkspaceView({
  projectName,
  project,
  users,
  projects,
  summaryCount,
  doneCount,
  activeCount,
  overdueCount,
  completion,
  view,
  onViewChange,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  dueFilter,
  onDueFilterChange,
  tagFilter,
  onTagFilterChange,
  availableTags,
  onClearFilters,
  onExport,
  onAddColumn,
  canAddColumn,
  visibleTasks,
  columns,
  onEditTask,
  onUpdateTask,
  onEditColumn,
  onCellUpdate,
  onAddTask,
  onCreateTask,
  inlineTaskFocusRequest,
  onAddSubtask,
  canAssign,
  canCreate,
  month,
  onMonthChange,
  onEditProject,
}: {
  projectName: string;
  project?: Project;
  users: WorkspaceUser[];
  projects: Project[];
  summaryCount: number;
  doneCount: number;
  activeCount: number;
  overdueCount: number;
  completion: number;
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: TaskStatus | "All";
  onStatusFilterChange: (value: TaskStatus | "All") => void;
  priorityFilter: TaskPriority | "All";
  onPriorityFilterChange: (value: TaskPriority | "All") => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  dueFilter: "All" | "overdue" | "today" | "week";
  onDueFilterChange: (value: "All" | "overdue" | "today" | "week") => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  availableTags: string[];
  onClearFilters: () => void;
  onExport: () => void;
  onAddColumn: () => void;
  canAddColumn: boolean;
  visibleTasks: Task[];
  columns: CustomColumn[];
  onEditTask: (task: Task) => void;
  onUpdateTask: (id: string, changes: Partial<Task>) => void;
  onEditColumn: (column: CustomColumn) => void;
  onCellUpdate: (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => void;
  onAddTask: () => void;
  onCreateTask: (title: string, group: string) => void;
  inlineTaskFocusRequest: number;
  onAddSubtask: (task: Task) => void;
  canAssign: boolean;
  canCreate: boolean;
  month: Date;
  onMonthChange: (month: Date) => void;
  onEditProject: () => void;
}) {
  const projectUsers = users
    .filter(
      (user) =>
        user.active &&
        user.id !== "unassigned" &&
        (!project || project.memberIds.includes(user.id)),
    )
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-[1560px] px-[34px] pt-[29px] pb-[50px] max-tablet:px-5 max-tablet:pt-[25px] max-tablet:pb-[45px] max-nav:px-[13px] max-nav:pt-5 max-nav:pb-[35px]">
      <section>
        <div className="mb-3 flex items-center gap-1 text-[10px] text-muted-foreground">
          <span>Workspace</span>
          <ChevronRight size={13} />
          <span>Төслүүд</span>
        </div>
        <div className="flex items-start justify-between max-nav:block">
          <div>
            <div className="flex items-center gap-2.5">
              <ProjectMark
                color={project?.color}
                className="size-3.5 rounded-[5px]"
              />
              <h1 className="m-0 font-heading text-[clamp(24px,3vw,31px)] leading-[1.2] font-bold tracking-[-1.2px] max-compact:text-2xl">
                {projectName}
              </h1>
              <button
                className="flex bg-transparent p-[3px] text-muted-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                aria-label="Төслийн цэс"
              >
                <MoreHorizontal size={20} />
              </button>
            </div>
            <p className="mt-[7px] mb-0 ml-6 text-xs text-muted-foreground max-nav:ml-0">
              {project?.description ||
                "Төлөвлөж, хянаж, үнэ цэнтэй ажлыг хамтдаа гүйцэтгээрэй."}
            </p>
          </div>
          <div className="flex items-center gap-[7px] max-nav:mt-[18px]">
            <div
              className="mr-[5px] flex max-nav:mr-auto"
              aria-label="Төслийн гишүүд"
            >
              {projectUsers.map((person, index) => (
                <UserAvatar
                  user={person}
                  size="sm"
                  className={cn(index > 0 && "-ml-[7px]")}
                  key={person.name}
                />
              ))}
              <button
                className="-ml-[3px] flex size-7 items-center justify-center rounded-full border border-dashed border-input bg-surface text-muted-foreground"
                aria-label="Гишүүн нэмэх"
              >
                <Plus size={15} />
              </button>
            </div>
            <Button
              variant="outline"
              className="h-[38px] gap-[7px] rounded-[9px] border-input bg-surface px-3.5 text-[11px] font-semibold text-[var(--text-soft)] hover:bg-surface-hover hover:text-foreground max-compact:hidden"
              onClick={onEditProject}
              disabled={!project}
            >
              <Settings size={16} />
              <span>Тохируулах</span>
            </Button>
            <Button
              className="h-[38px] gap-[7px] rounded-[9px] bg-[linear-gradient(135deg,var(--brand),var(--brand-hover))] px-3.5 text-[11px] font-semibold text-brand-foreground shadow-[0_8px_20px_color-mix(in_srgb,var(--brand)_22%,transparent)] hover:-translate-y-px hover:bg-brand-hover max-compact:px-3"
              onClick={onAddTask}
              disabled={!canCreate || !projects.some((item) => !item.archived)}
            >
              <Plus size={18} />
              Шинэ таск
            </Button>
          </div>
        </div>
      </section>

      <section
        className="my-5 mt-[27px] grid grid-cols-3 gap-[13px] overflow-x-auto max-tablet:grid-cols-[repeat(3,minmax(145px,1fr))] max-nav:-mx-[13px] max-nav:my-3.5 max-nav:mt-5 max-nav:grid-cols-[repeat(3,minmax(155px,1fr))] max-nav:gap-[9px] max-nav:px-[13px] max-nav:[scrollbar-width:none]"
        aria-label="Төслийн тойм"
      >
        <MetricCard
          icon={<CheckCircle2 size={18} />}
          label="Гүйцэтгэл"
          value={`${completion}%`}
          detail={`${summaryCount} таскаас ${doneCount} дууссан`}
          tone="violet"
          progress={completion}
        />
        <MetricCard
          icon={<Target size={18} />}
          label="Хийгдэж буй"
          value={String(activeCount)}
          detail="Урагшилж буй таскууд"
          tone="blue"
        />
        <MetricCard
          icon={<Clock3 size={18} />}
          label="Хугацаа хэтэрсэн"
          value={String(overdueCount)}
          detail={
            overdueCount
              ? "Анхаарал шаардлагатай"
              : "Бүх ажил төлөвлөгөөний дагуу"
          }
          tone="orange"
        />
      </section>

      <section className="min-h-[430px] overflow-hidden rounded-[14px] border border-border bg-surface">
        <TaskToolbar
          view={view}
          onViewChange={onViewChange}
          query={query}
          onQueryChange={onQueryChange}
          statusFilter={statusFilter}
          onStatusFilterChange={onStatusFilterChange}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={onPriorityFilterChange}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={onAssigneeFilterChange}
          dueFilter={dueFilter}
          onDueFilterChange={onDueFilterChange}
          tagFilter={tagFilter}
          onTagFilterChange={onTagFilterChange}
          users={users}
          availableTags={availableTags}
          onClearFilters={onClearFilters}
          onExport={onExport}
          onAddColumn={onAddColumn}
          canAddColumn={canAddColumn}
          resultCount={visibleTasks.length}
        />
        <div className="overflow-hidden">
          {view === "list" && (
            <TaskList
              tasks={visibleTasks}
              users={users}
              onEdit={onEditTask}
              onUpdate={onUpdateTask}
              columns={columns}
              onEditColumn={onEditColumn}
              onCellUpdate={onCellUpdate}
              onCreate={onCreateTask}
              focusAddRequest={inlineTaskFocusRequest}
              onAddSubtask={onAddSubtask}
              canAssign={canAssign}
              canCreate={canCreate}
            />
          )}
          {view === "board" && (
            <TaskBoard
              tasks={visibleTasks.filter((task) => !task.parentId)}
              onEdit={onEditTask}
              onUpdate={onUpdateTask}
              onAdd={onAddTask}
            />
          )}
          {view === "calendar" && (
            <TaskCalendar
              tasks={visibleTasks.filter((task) => !task.parentId)}
              month={month}
              onMonthChange={onMonthChange}
              onEdit={onEditTask}
            />
          )}
          {view === "timeline" && (
            <TaskTimeline
              tasks={visibleTasks.filter((task) => !task.parentId)}
              onEdit={onEditTask}
              onAdd={onAddTask}
            />
          )}
          {view === "dashboard" && (
            <TaskDashboard
              tasks={visibleTasks.filter((task) => !task.parentId)}
              users={users}
            />
          )}
        </div>
      </section>
    </div>
  );
}
