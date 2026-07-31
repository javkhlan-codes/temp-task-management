"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { IconButton } from "@/components/atoms/icon-button";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { Task, WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

const toneClasses = {
  review: "bg-warning",
  done: "bg-success",
  progress: "bg-info",
  neutral: "bg-muted-foreground",
} as const;

function ActivityItem({
  person,
  children,
  time,
  tone,
}: {
  person: Task["assignee"];
  children: ReactNode;
  time: string;
  tone: keyof typeof toneClasses;
}) {
  return (
    <div className="relative grid grid-cols-[30px_1fr] gap-2.5 border-b border-border py-3.5 last:border-b-0">
      <UserAvatar user={person as WorkspaceUser} size="sm" />
      <div>
        <p className="m-0 text-[11px] leading-[1.55] text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          <strong>{person.name}</strong> {children}
        </p>
        <span className="mt-1 block text-[9px] text-muted-foreground">
          {time}
        </span>
      </div>
      <i
        className={cn(
          "absolute top-[19px] right-0 size-1.5 rounded-full",
          toneClasses[tone],
        )}
        aria-hidden="true"
      />
    </div>
  );
}

export function ActivityPanel({
  open,
  onOpenChange,
  people,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Task["assignee"][];
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="z-50 w-[340px] max-w-[92vw] gap-0 border-l border-border bg-surface p-0 shadow-[-20px_0_55px_rgba(0,0,0,0.16)]"
      >
        <header className="flex items-center justify-between border-b border-border px-5 py-[18px]">
          <div>
            <span className="text-[9px] font-bold tracking-[0.9px] text-brand uppercase">
              Шууд шинэчлэл
            </span>
            <SheetTitle className="mt-1 font-heading text-lg font-bold tracking-[-0.35px]">
              Үйлдлийн түүх
            </SheetTitle>
          </div>
          <IconButton
            onClick={() => onOpenChange(false)}
            aria-label="Үйлдлийн түүх хаах"
          >
            <X size={18} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <ActivityItem person={people[2]} time="12 minutes ago" tone="review">
            <strong>Finalize visual design system</strong> таскийг хяналтын
            төлөвт оруулсан
          </ActivityItem>
          <ActivityItem person={people[1]} time="2 hours ago" tone="done">
            <strong>QA responsive navigation</strong> таскийг дуусгасан
          </ActivityItem>
          <ActivityItem person={people[0]} time="Өчигдөр" tone="progress">
            <strong>Research customer onboarding flow</strong> таскт тэмдэглэл
            нэмсэн
          </ActivityItem>
          <div className="border-b border-border py-3 text-[9px] font-semibold tracking-[0.45px] text-muted-foreground uppercase">
            7-р сарын 22, Лхагва
          </div>
          <ActivityItem person={people[3]} time="Өчигдөр" tone="neutral">
            <strong>Set up product event tracking</strong> таск үүсгэсэн
          </ActivityItem>
        </div>

        <div className="mt-auto flex items-center gap-2.5 border-t border-border p-4">
          <UserAvatar user={people[0] as WorkspaceUser} size="sm" />
          <button
            className="h-9 flex-1 rounded-lg border border-input bg-surface-soft px-3 text-left text-[11px] text-muted-foreground hover:bg-surface-hover"
            type="button"
          >
            Шинэчлэл бичих...
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
