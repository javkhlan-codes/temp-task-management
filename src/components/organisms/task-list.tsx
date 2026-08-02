"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ListTree,
  MoreHorizontal,
  Plus,
  UserPlus,
} from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import { AssigneePicker } from "@/components/molecules/assignee-picker";
import { EmptyState } from "@/components/molecules/empty-state";
import { PrioritySelect } from "@/components/molecules/priority-select";
import { StatusSelect } from "@/components/molecules/status-select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import {
  ColumnTypeIcon,
  CustomCell,
} from "@/features/task-manager/components/custom-cell";
import { formatDueDate, isOverdue } from "@/lib/format";
import {
  groupLabel,
  type CustomColumn,
  type CustomFieldValue,
  type Task,
  type WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const groupAccentClasses: Record<string, string> = {
  "This week": "bg-brand",
  Upcoming: "bg-info",
  Completed: "bg-success",
};

export function TaskList({
  tasks,
  users,
  columns,
  onEdit,
  onUpdate,
  onEditColumn,
  onCellUpdate,
  onAdd,
  onAddSubtask,
  canAssign,
  canCreate,
}: {
  tasks: Task[];
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onEditColumn: (column: CustomColumn) => void;
  onCellUpdate: (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => void;
  onAdd: () => void;
  onAddSubtask: (parent: Task) => void;
  canAssign: boolean;
  canCreate: boolean;
}) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(["task-001", "task-002"]),
  );
  const rootTasks = tasks.filter((task) => !task.parentId);
  const groups = ["This week", "Upcoming", "Completed"];
  const usedGroups = groups.filter((group) =>
    rootTasks.some((task) => task.group === group),
  );
  const gridStyle = {
    "--task-grid": `27px minmax(240px, 1.6fr) minmax(130px, .8fr) 128px 100px 91px ${columns
      .map(() => "130px")
      .join(" ")} 25px`,
  } as CSSProperties;
  const tableStyle = {
    minWidth: `${790 + columns.length * 130}px`,
  };

  if (!tasks.length) return <EmptyState onAdd={onAdd} />;

  return (
    <div
      className="overflow-x-auto [scrollbar-color:var(--input)_transparent] [scrollbar-width:thin]"
      data-ui="task-list"
    >
      <div className="w-full" style={tableStyle}>
        <div
          className="grid h-9 grid-cols-[var(--task-grid)] items-center gap-2.5 border-b border-border px-[18px] text-[9px] text-muted-foreground max-nav:hidden"
          style={gridStyle}
        >
          <span />
          <span>Таск</span>
          <span>Хариуцагч</span>
          <span>Төлөв</span>
          <span>Ач холбогдол</span>
          <span>Эцсийн хугацаа</span>
          {columns.map((column) => (
            <button
              className="group flex min-w-0 items-center gap-[5px] bg-transparent p-0 text-left text-[9px] text-muted-foreground hover:text-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
              onClick={() => onEditColumn(column)}
              key={column.id}
              title={`Edit ${column.name}`}
            >
              <ColumnTypeIcon type={column.type} />
              <span className="overflow-hidden text-ellipsis whitespace-nowrap">
                {column.name}
              </span>
              <MoreHorizontal
                className="ml-auto opacity-0 group-hover:opacity-100"
                size={13}
              />
            </button>
          ))}
          <span />
        </div>
        {usedGroups.map((group) => {
          const groupTasks = rootTasks.filter((task) => task.group === group);
          return (
            <div key={group}>
              <div className="flex h-[34px] items-center border-b border-border bg-surface-soft px-[18px] text-[10px] text-muted-foreground max-nav:px-[13px]">
                <ChevronDown size={16} />
                <span
                  className={cn(
                    "ml-[5px] size-2 rounded",
                    groupAccentClasses[group] ?? "bg-brand",
                  )}
                />
                <strong className="mr-2 ml-1.5 text-[11px] text-foreground">
                  {groupLabel(group)}
                </strong>
                <span>{groupTasks.length}</span>
              </div>
              {groupTasks.map((task) => {
                const subtasks = tasks.filter(
                  (candidate) => candidate.parentId === task.id,
                );
                const expanded = expandedTasks.has(task.id);
                return (
                  <Collapsible open={expanded} key={task.id}>
                    <TaskRow
                      task={task}
                      subtasks={subtasks}
                      users={users}
                      columns={columns}
                      onEdit={onEdit}
                      onUpdate={onUpdate}
                      onCellUpdate={onCellUpdate}
                      gridStyle={gridStyle}
                      canAssign={canAssign}
                      expanded={expanded}
                      onToggleSubtasks={() =>
                        setExpandedTasks((current) => {
                          const next = new Set(current);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                    />
                    <CollapsibleContent>
                      {subtasks.map((subtask) => (
                        <TaskRow
                          task={subtask}
                          subtasks={[]}
                          users={users}
                          columns={columns}
                          key={subtask.id}
                          onEdit={onEdit}
                          onUpdate={onUpdate}
                          onCellUpdate={onCellUpdate}
                          gridStyle={gridStyle}
                          canAssign={canAssign}
                          isSubtask
                        />
                      ))}
                      {canCreate && (
                        <button
                          className="flex h-8 w-full items-center gap-[7px] border-b border-border bg-surface pl-16 text-[9px] text-muted-foreground hover:bg-surface-hover hover:text-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                          onClick={() => onAddSubtask(task)}
                        >
                          <UserPlus size={14} />
                          Add subtask
                        </button>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {canCreate && (
                <button
                  className="flex h-9 w-full items-center bg-transparent px-14 text-left text-[9.5px] text-muted-foreground hover:bg-surface-soft hover:text-brand focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring max-nav:pl-[45px]"
                  onClick={onAdd}
                >
                  <span className="mr-1.5 flex">
                    <Plus size={14} />
                  </span>
                  Таск нэмэх
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  subtasks,
  users,
  columns,
  onEdit,
  onUpdate,
  onCellUpdate,
  gridStyle,
  canAssign,
  expanded = false,
  onToggleSubtasks,
  isSubtask = false,
}: {
  task: Task;
  subtasks: Task[];
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onCellUpdate: (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => void;
  gridStyle: CSSProperties;
  canAssign: boolean;
  expanded?: boolean;
  onToggleSubtasks?: () => void;
  isSubtask?: boolean;
}) {
  const toggleDone = () =>
    onUpdate(task.id, {
      status: task.status === "Done" ? "Not started" : "Done",
      progress: task.status === "Done" ? 0 : 100,
    });

  return (
    <div
      className={cn(
        "group grid h-[57px] grid-cols-[var(--task-grid)] items-center gap-2.5 border-b border-border px-[18px] transition-colors hover:bg-surface-soft max-nav:h-[69px] max-nav:grid-cols-[24px_minmax(0,1fr)_94px] max-nav:gap-2 max-nav:px-[13px]",
        isSubtask &&
          "bg-[color-mix(in_srgb,var(--brand-subtle)_35%,var(--surface))]",
      )}
      style={gridStyle}
    >
      <Checkbox
        className={cn(
          "size-[17px] rounded-full border-input bg-transparent data-checked:border-brand data-checked:bg-brand",
          isSubtask && "scale-[0.88]",
        )}
        checked={task.status === "Done"}
        onCheckedChange={toggleDone}
        aria-label={
          task.status === "Done" ? "Дуусаагүй болгох" : "Дууссан болгох"
        }
      />
      <div className="grid min-w-0 grid-cols-[20px_minmax(0,1fr)] items-center">
        {subtasks.length > 0 ? (
          <button
            className="flex h-6 w-5 items-center justify-center bg-transparent text-muted-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
            onClick={onToggleSubtasks}
            aria-label={`${subtasks.length} дэд таск ${expanded ? "хураах" : "дэлгэх"}`}
            aria-expanded={expanded}
          >
            <ChevronRight
              className={cn(
                "transition-transform",
                expanded && "rotate-90",
              )}
              size={14}
            />
          </button>
        ) : isSubtask ? (
          <span className="flex h-6 w-5 items-center justify-center text-brand">
            <ListTree size={13} />
          </span>
        ) : (
          <span className="w-5" />
        )}
        <button
          className="min-w-0 bg-transparent p-0 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
          onClick={() => onEdit(task)}
        >
          <span
            className={cn(
              "block overflow-hidden text-[11px] font-semibold text-ellipsis whitespace-nowrap",
              isSubtask && "font-medium",
              task.status === "Done" &&
                "text-muted-foreground line-through",
            )}
          >
            {task.title}
          </span>
          <small className="mt-[3px] block text-[8.5px] text-muted-foreground">
            {subtasks.length
              ? `${subtasks.filter((subtask) => subtask.status === "Done").length}/${subtasks.length} дэд таск · ${task.progress}%`
              : task.tags.join(" · ")}
          </small>
        </button>
      </div>
      <div className="flex min-w-0 items-center overflow-visible max-nav:hidden">
        <AssigneePicker
          task={task}
          users={users}
          canAssign={canAssign}
          onUpdate={onUpdate}
        />
      </div>
      <StatusSelect
        value={task.status}
        onValueChange={(status) =>
          onUpdate(task.id, {
            status,
            progress: status === "Done" ? 100 : task.progress,
          })
        }
        ariaLabel={`Status for ${task.title}`}
      />
      <PrioritySelect
        className="max-nav:hidden"
        value={task.priority}
        onValueChange={(priority) => onUpdate(task.id, { priority })}
        ariaLabel={`Priority for ${task.title}`}
      />
      <span
        className={cn(
          "flex items-center gap-[5px] text-[9px] text-muted-foreground max-nav:hidden",
          isOverdue(task.dueDate, task.status) && "text-danger",
        )}
      >
        <CalendarDays size={14} />
        {formatDueDate(task.dueDate)}
      </span>
      {columns.map((column) => (
        <div className="max-nav:hidden" key={column.id}>
          <CustomCell
            column={column}
            users={users}
            value={task.customFields?.[column.id] ?? null}
            onChange={(value) => onCellUpdate(task.id, column.id, value)}
          />
        </div>
      ))}
      <button
        className="flex size-[26px] items-center justify-center rounded-md bg-transparent text-muted-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring max-nav:hidden"
        onClick={() => onEdit(task)}
        aria-label={`Open ${task.title}`}
      >
        <MoreHorizontal size={17} />
      </button>
    </div>
  );
}
