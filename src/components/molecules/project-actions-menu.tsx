"use client";

import { Archive, FolderOpen, MoreHorizontal, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Project } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ProjectActionsMenu({
  project,
  canEdit,
  canArchive,
  onOpen,
  onEdit,
  onArchive,
  triggerClassName,
  mobile = false,
}: {
  project: Project;
  canEdit: boolean;
  canArchive: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onArchive: () => void;
  triggerClassName?: string;
  mobile?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex size-7 items-center justify-center rounded-md bg-transparent text-sidebar-foreground transition-[background-color,color,opacity] hover:bg-sidebar-hover hover:text-[var(--sidebar-strong)] focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-brand-ring data-popup-open:bg-sidebar-hover data-popup-open:text-[var(--sidebar-strong)]",
          triggerClassName,
        )}
        aria-label={`Төслийн үйлдэл: ${project.name}`}
      >
        <MoreHorizontal size={15} />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side={mobile ? "bottom" : "right"}
        align={mobile ? "end" : "start"}
        sideOffset={8}
        className="z-90 w-[224px] rounded-[10px] bg-surface-raised p-1.5 shadow-overlay ring-1 ring-border"
      >
        <DropdownMenuItem
          className="h-9 gap-2.5 rounded-[7px] px-2.5 text-[10px] text-[var(--text-soft)] focus:bg-surface-hover focus:text-foreground"
          onClick={onOpen}
        >
          <FolderOpen size={15} />
          Төсөл нээх
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="h-9 gap-2.5 rounded-[7px] px-2.5 text-[10px] text-[var(--text-soft)] focus:bg-surface-hover focus:text-foreground"
          disabled={!canEdit}
          onClick={onEdit}
        >
          <Pencil size={15} />
          Нэр ба тохиргоо засах
        </DropdownMenuItem>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          className="h-9 gap-2.5 rounded-[7px] px-2.5 text-[10px] text-[var(--text-soft)] focus:bg-surface-hover focus:text-foreground"
          disabled={!canArchive}
          onClick={onArchive}
        >
          <Archive size={15} />
          Архивлах
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
