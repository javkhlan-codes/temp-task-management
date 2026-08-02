"use client";

import { Check, Plus } from "lucide-react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";
import { ROLE_LABELS } from "@/lib/permissions";
import type { Task, WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function AssigneePicker({
  task,
  users,
  canAssign,
  onUpdate,
}: {
  task: Task;
  users: WorkspaceUser[];
  canAssign: boolean;
  onUpdate: (id: string, changes: Partial<Task>) => void;
}) {
  const assigned = taskAssignees(task);
  const activeUsers = users.filter(
    (user) => user.active && user.id !== "unassigned",
  );

  const toggle = (user: WorkspaceUser) => {
    const exists = assigned.some((assignee) => assignee.id === user.id);
    if (exists && assigned.length === 1) return;
    const next = exists
      ? assigned.filter((assignee) => assignee.id !== user.id)
      : [...assigned, user];
    onUpdate(task.id, {
      assignee: next[0],
      assignees: next,
    });
  };

  return (
    <Popover>
      <PopoverTrigger
        className="flex w-full min-w-0 items-center gap-[7px] rounded-[7px] bg-transparent px-[5px] py-1 text-left hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring disabled:cursor-default"
        disabled={!canAssign}
        aria-label={`Assign people to ${task.title}`}
      >
        <span className="flex">
          {assigned.slice(0, 3).map((person, index) => (
            <UserAvatar
              user={person}
              size="sm"
              className={cn(index > 0 && "-ml-[7px]")}
              key={person.id}
            />
          ))}
        </span>
        <span className="min-w-0 flex-1 overflow-hidden text-[8px] text-ellipsis whitespace-nowrap">
          {assigned.length === 1
            ? assigned[0].name
            : `${assigned.length} people`}
        </span>
        {canAssign && <Plus size={13} className="text-muted-foreground" />}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={-2}
        className="z-[80] w-[218px] gap-0 rounded-[10px] border border-border bg-surface-raised p-1.5 shadow-overlay ring-0"
      >
        <div className="flex items-center justify-between px-1.5 pt-[5px] pb-2">
          <strong className="text-[9px]">Хариуцагч сонгох</strong>
          <span className="text-[8px] font-bold text-brand">Олон сонголт</span>
        </div>
        {activeUsers.map((user) => {
          const selected = assigned.some(
            (assignee) => assignee.id === user.id,
          );
          return (
            <button
              className={cn(
                "grid w-full grid-cols-[29px_1fr_18px] items-center gap-2 rounded-[7px] bg-transparent p-[7px] text-left hover:bg-surface-soft focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring",
                selected && "bg-surface-soft",
              )}
              onClick={() => toggle(user)}
              key={user.id}
            >
              <UserAvatar user={user} size="sm" />
              <span>
                <strong className="block text-[8px]">{user.name}</strong>
                <small className="mt-0.5 block text-[7px] text-muted-foreground">
                  {ROLE_LABELS[user.role]}
                </small>
              </span>
              <i className="flex size-[17px] items-center justify-center rounded-full bg-brand text-brand-foreground">
                {selected && <Check size={12} strokeWidth={3} />}
              </i>
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
