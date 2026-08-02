"use client";

import { ChevronDown, LogOut, ShieldCheck, Users } from "lucide-react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceUser } from "@/lib/types";

export function RoleSwitcher({
  currentUser,
  onManageTeam,
  onLogout,
}: {
  currentUser: WorkspaceUser;
  onManageTeam: () => void;
  onLogout: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex min-h-10 items-center gap-[7px] rounded-[9px] bg-transparent px-[5px] py-[3px] hover:bg-surface-hover focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
        aria-label="Хэрэглэгчийн цэс"
      >
        <UserAvatar user={currentUser} />
        <span className="flex min-w-[70px] flex-col text-left max-nav:hidden">
          <strong className="text-[9px]">{currentUser.name}</strong>
          <small className="mt-px text-[7px] text-muted-foreground">
            {ROLE_LABELS[currentUser.role]}
          </small>
        </span>
        <ChevronDown
          className="text-muted-foreground max-nav:hidden"
          size={13}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="z-80 w-[275px] overflow-hidden rounded-xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border"
      >
        <div className="border-b border-border px-3.5 py-[13px]">
          <span className="block text-[7px] font-bold tracking-[0.7px] text-brand uppercase">
            Acme Studio-д нэвтэрсэн
          </span>
          <strong className="mt-0.5 block text-[11px]">
            {currentUser.email}
          </strong>
        </div>
        <div className="grid grid-cols-[38px_1fr] items-center gap-2.5 px-3.5 py-[13px]">
          <UserAvatar user={currentUser} size="lg" />
          <span>
            <strong className="flex text-[10px]">{currentUser.name}</strong>
            <small className="mt-[3px] flex items-center gap-1 text-[8px] text-muted-foreground">
              <ShieldCheck size={11} />
              {ROLE_LABELS[currentUser.role]} эрх
            </small>
          </span>
        </div>
        <DropdownMenuSeparator className="m-0" />
        <DropdownMenuItem
          className="h-auto rounded-none bg-surface-soft px-3.5 py-[11px] text-[9px] text-[var(--text-soft)] focus:bg-surface-hover focus:text-brand"
          onClick={onManageTeam}
        >
          <Users size={15} />
          Баг ба эрх удирдах
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          className="h-auto rounded-none border-t border-border bg-surface-soft px-3.5 py-[11px] text-[9px]"
          onClick={onLogout}
        >
          <LogOut size={15} />
          Гарах
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
