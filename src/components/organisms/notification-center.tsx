"use client";

import { Bell, CheckCheck, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { IconButton } from "@/components/atoms/icon-button";
import { UserAvatar } from "@/components/atoms/user-avatar";
import {
  Popover,
  PopoverContent,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { WorkspaceNotification, WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}

export function NotificationCenter({
  currentUser,
  mode,
  onOpenTask,
  workspaceId,
}: {
  currentUser: WorkspaceUser;
  mode: "loading" | "local" | "database";
  onOpenTask: (taskId: string) => void;
  workspaceId: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>(
    [],
  );
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  const load = useCallback(async () => {
    if (mode !== "database") return;
    setLoading(true);
    try {
      const response = await fetch("/api/notifications", {
        cache: "no-store",
        headers: {
          "x-workspace-user-id": currentUser.id,
          "x-workspace-id": workspaceId,
        },
      });
      if (!response.ok) return;
      const payload = (await response.json()) as {
        notifications: WorkspaceNotification[];
      };
      setNotifications(payload.notifications);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, mode, workspaceId]);

  useEffect(() => {
    void load();
    if (mode !== "database") return;
    const timer = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(timer);
  }, [load, mode]);

  const markRead = async (ids?: string[]) => {
    if (mode !== "database") return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "x-workspace-user-id": currentUser.id,
        "x-workspace-id": workspaceId,
      },
      body: JSON.stringify(ids ? { ids } : { all: true }),
    });
    const markedAt = new Date().toISOString();
    setNotifications((current) =>
      current.map((item) =>
        !ids || ids.includes(item.id)
          ? { ...item, readAt: item.readAt ?? markedAt }
          : item,
      ),
    );
  };

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) void load();
      }}
    >
      <PopoverTrigger
        render={
          <IconButton
            className={cn(
              "relative",
              open && "bg-surface-hover text-foreground",
            )}
            aria-label={`Мэдэгдэл${unreadCount ? `, ${unreadCount} уншаагүй` : ""}`}
          />
        }
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span className="absolute -top-px right-px flex h-[17px] min-w-[17px] items-center justify-center rounded-full border-2 border-surface bg-danger px-[3px] text-[8px] font-extrabold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="z-90 w-[min(390px,calc(100vw-24px))] gap-0 overflow-hidden rounded-[14px] bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border"
      >
        <header className="flex items-center justify-between border-b border-border px-4 pt-[15px] pb-3">
          <div>
            <small className="text-[9px] text-muted-foreground">
              Таны workspace
            </small>
            <PopoverTitle className="mt-0.5 font-heading text-base font-bold">
              Мэдэгдэл
            </PopoverTitle>
          </div>
          <IconButton
            className="size-7 rounded-[7px] bg-surface-soft text-muted-foreground"
            onClick={() => setOpen(false)}
            aria-label="Хаах"
          >
            <X size={16} />
          </IconButton>
        </header>
        <div className="flex items-center justify-between border-b border-border bg-surface-soft px-[13px] py-2 text-[9px] text-muted-foreground">
          <span>{unreadCount} уншаагүй</span>
          <button
            className="inline-flex items-center gap-1.5 bg-transparent text-[9px] text-brand disabled:text-muted-foreground"
            type="button"
            disabled={!unreadCount}
            onClick={() => void markRead()}
          >
            <CheckCheck size={14} />
            Бүгдийг уншсан
          </button>
        </div>
        <div className="max-h-[min(480px,65vh)] overflow-y-auto">
          {loading && !notifications.length ? (
            <div className="flex min-h-[100px] items-center justify-center gap-[7px] p-5 text-[10px] text-muted-foreground">
              <LoaderCircle className="animate-spin" size={18} /> Ачаалж байна…
            </div>
          ) : notifications.length ? (
            notifications.map((notification) => (
              <button
                type="button"
                className={cn(
                  "flex w-full items-start gap-2.5 border-b border-border bg-surface px-3.5 py-3 text-left hover:bg-surface-hover",
                  !notification.readAt &&
                    "bg-[color-mix(in_srgb,var(--brand-subtle)_45%,var(--surface))]",
                )}
                key={notification.id}
                onClick={() => {
                  if (!notification.readAt) void markRead([notification.id]);
                  if (notification.taskId) onOpenTask(notification.taskId);
                  setOpen(false);
                }}
              >
                <UserAvatar
                  user={
                    notification.actor ?? {
                      name: "Notification",
                      initials: "N",
                      tone: "slate",
                    }
                  }
                  size="sm"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <strong className="text-[11px]">
                    {notification.title}
                  </strong>
                  <small className="mt-0.5 line-clamp-2 text-[9px] leading-[1.45] text-[var(--text-soft)]">
                    {notification.body}
                  </small>
                  <time className="mt-1 text-[8px] text-muted-foreground">
                    {formatTimestamp(notification.createdAt)}
                  </time>
                </span>
              </button>
            ))
          ) : (
            <div className="flex min-h-[100px] items-center justify-center p-5 text-[10px] text-muted-foreground">
              Шинэ мэдэгдэл алга.
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
