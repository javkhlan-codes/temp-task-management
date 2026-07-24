"use client";

import { Bell, CheckCheck, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WorkspaceNotification, WorkspaceUser } from "@/lib/types";

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
  const [notifications, setNotifications] = useState<WorkspaceNotification[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

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
    <div className="notification-center" ref={rootRef}>
      <button
        className={`icon-button notification-button ${open ? "button-active" : ""}`}
        aria-label={`Мэдэгдэл${unreadCount ? `, ${unreadCount} уншаагүй` : ""}`}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void load();
        }}
      >
        <Bell size={19} />
        {unreadCount > 0 && <span>{unreadCount > 9 ? "9+" : unreadCount}</span>}
      </button>
      {open && (
        <div className="notification-popover">
          <header>
            <div>
              <small>Таны workspace</small>
              <h3>Мэдэгдэл</h3>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Хаах">
              <X size={16} />
            </button>
          </header>
          <div className="notification-toolbar">
            <span>{unreadCount} уншаагүй</span>
            <button
              type="button"
              disabled={!unreadCount}
              onClick={() => void markRead()}
            >
              <CheckCheck size={14} />
              Бүгдийг уншсан
            </button>
          </div>
          <div className="notification-list">
            {loading && !notifications.length ? (
              <div className="notification-empty">
                <LoaderCircle className="spin" size={18} /> Ачаалж байна…
              </div>
            ) : notifications.length ? (
              notifications.map((notification) => (
                <button
                  type="button"
                  className={`notification-item ${notification.readAt ? "" : "unread"}`}
                  key={notification.id}
                  onClick={() => {
                    if (!notification.readAt) void markRead([notification.id]);
                    if (notification.taskId) onOpenTask(notification.taskId);
                    setOpen(false);
                  }}
                >
                  <span
                    className={`avatar avatar-${notification.actor?.tone ?? "slate"}`}
                  >
                    {notification.actor?.initials ?? "N"}
                  </span>
                  <span>
                    <strong>{notification.title}</strong>
                    <small>{notification.body}</small>
                    <time>{formatTimestamp(notification.createdAt)}</time>
                  </span>
                </button>
              ))
            ) : (
              <div className="notification-empty">Шинэ мэдэгдэл алга.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
