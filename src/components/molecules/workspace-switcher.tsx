"use client";

import { Check, ChevronsUpDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceSummary } from "@/lib/types";
import { cn } from "@/lib/utils";

function WorkspaceLogo({
  name,
  compact = false,
}: {
  name: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-lg bg-[linear-gradient(145deg,var(--workspace-logo-start),var(--workspace-logo-end))] text-[10px] font-extrabold text-[var(--workspace-logo-foreground)]",
        compact && "size-[29px]",
      )}
    >
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "WS"}
    </span>
  );
}

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
  newWorkspaceName,
  creatingWorkspace,
  open,
  onOpenChange,
  onWorkspaceChange,
  onNewWorkspaceNameChange,
  onCreateWorkspace,
  onDeleteWorkspace,
}: {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
  newWorkspaceName: string;
  creatingWorkspace: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onWorkspaceChange: (workspaceId: string) => void;
  onNewWorkspaceNameChange: (name: string) => void;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspaceId: string) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<WorkspaceSummary | null>(null);
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];

  return (
    <>
      <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger
        className="my-[22px] mb-[15px] grid w-full grid-cols-[32px_1fr_16px] items-center gap-[9px] rounded-[11px] border border-sidebar-border bg-[var(--sidebar-soft)] p-[9px] text-left text-[var(--sidebar-strong)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
        aria-label="Workspace солих"
      >
        <WorkspaceLogo name={activeWorkspace?.name ?? "Workspace"} />
        <span className="min-w-0">
          <strong className="mb-0.5 block overflow-hidden text-xs text-ellipsis whitespace-nowrap">
            {activeWorkspace?.name ?? "Workspace"}
          </strong>
          <small className="block text-[10px] text-[var(--sidebar-label)]">
            {activeWorkspace?.plan === "free"
              ? "Үнэгүй"
              : activeWorkspace?.plan}
          </small>
        </span>
        <ChevronsUpDown size={16} />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={-8}
        className="z-[80] w-(--anchor-width) gap-0 overflow-hidden rounded-xl border border-border bg-surface-raised p-1.5 shadow-overlay ring-0"
      >
        <div className="flex items-center justify-between px-[7px] pt-[7px] pb-1.5 text-[8px] font-bold tracking-[0.5px] text-muted-foreground uppercase">
          <span>Таны workspace</span>
          <small className="flex size-[17px] items-center justify-center rounded-full bg-surface-soft">
            {workspaces.length}
          </small>
        </div>
        {workspaces.map((workspace) => {
          const active = workspace.id === activeWorkspaceId;
          const canDelete =
            workspace.id !== "workspace-acme" && workspace.role === "admin";
          return (
            <div
              className={cn(
                "grid w-full grid-cols-[1fr_auto] items-center rounded-lg bg-transparent text-[var(--text-soft)] hover:bg-surface-soft hover:text-foreground",
                active && "bg-surface-soft text-foreground",
              )}
              key={workspace.id}
            >
              <button
                className="grid min-w-0 grid-cols-[29px_1fr_14px] items-center gap-2 bg-transparent p-[7px] text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                onClick={() => onWorkspaceChange(workspace.id)}
              >
                <WorkspaceLogo name={workspace.name} compact />
                <span className="min-w-0">
                  <strong className="block overflow-hidden text-[10px] text-ellipsis whitespace-nowrap">
                    {workspace.name}
                  </strong>
                  <small className="mt-px block text-[8px] text-muted-foreground">
                    {ROLE_LABELS[workspace.role]}
                  </small>
                </span>
                {active && <Check size={14} className="text-brand" />}
              </button>
              {canDelete && (
                <button
                  type="button"
                  className="mr-1 flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
                  onClick={() => setDeleteTarget(workspace)}
                  aria-label={`${workspace.name} workspace устгах`}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          );
        })}
        <div className="mt-[5px] grid grid-cols-[1fr_31px] gap-[5px] border-t border-border px-[3px] pt-2 pb-0.5">
          <Input
            className="h-[31px] rounded-[7px] border-border bg-surface-soft px-2 text-[9px]"
            value={newWorkspaceName}
            onChange={(event) => onNewWorkspaceNameChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onCreateWorkspace();
              }
            }}
            placeholder="Шинэ workspace нэр"
            maxLength={80}
          />
          <button
            className="flex size-[31px] items-center justify-center rounded-[7px] bg-brand text-brand-foreground disabled:cursor-not-allowed disabled:opacity-45"
            onClick={onCreateWorkspace}
            disabled={newWorkspaceName.trim().length < 2 || creatingWorkspace}
            aria-label="Workspace үүсгэх"
          >
            <Plus size={15} />
          </button>
        </div>
        </PopoverContent>
      </Popover>

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Workspace-ийг бүрмөсөн устгах уу?</AlertDialogTitle>
            <AlertDialogDescription>
              “{deleteTarget?.name}” workspace зөвхөн project-гүй, ганц гишүүнтэй үед
              устна. Энэ үйлдлийг буцаах боломжгүй.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Цуцлах</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) onDeleteWorkspace(deleteTarget.id);
              }}
            >
              Устгах
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
