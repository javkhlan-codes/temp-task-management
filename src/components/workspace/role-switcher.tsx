"use client";

import { Check, ChevronDown, ShieldCheck, Users, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceUser } from "@/lib/types";

function UserAvatar({ user }: { user: WorkspaceUser }) {
  return (
    <span className={`avatar avatar-${user.tone}`} title={user.name}>
      {user.initials}
    </span>
  );
}

export function RoleSwitcher({
  currentUser,
  users,
  onChange,
  onManageTeam,
}: {
  currentUser: WorkspaceUser;
  users: WorkspaceUser[];
  onChange: (user: WorkspaceUser) => void;
  onManageTeam: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div className="role-switcher" ref={rootRef}>
      <button
        className="role-switcher-trigger"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        <UserAvatar user={currentUser} />
        <span className="role-trigger-copy">
          <strong>{currentUser.name}</strong>
          <small>{ROLE_LABELS[currentUser.role]}</small>
        </span>
        <ChevronDown size={13} />
      </button>
      {open && (
        <div className="role-menu">
          <div className="role-menu-header">
            <div>
              <span>Demo identity</span>
              <strong>Switch workspace role</strong>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close user menu">
              <X size={15} />
            </button>
          </div>
          <div className="role-user-list">
            {users
              .filter((user) => user.active && user.id !== "unassigned")
              .map((user) => (
                <button
                  className={currentUser.id === user.id ? "active" : ""}
                  onClick={() => {
                    onChange(user);
                    setOpen(false);
                  }}
                  key={user.id}
                >
                  <UserAvatar user={user} />
                  <span>
                    <strong>{user.name}</strong>
                    <small>
                      <ShieldCheck size={11} />
                      {ROLE_LABELS[user.role]}
                    </small>
                  </span>
                  {currentUser.id === user.id && <Check size={15} />}
                </button>
              ))}
          </div>
          <button
            className="manage-team-link"
            onClick={() => {
              onManageTeam();
              setOpen(false);
            }}
          >
            <Users size={15} />
            Manage team & roles
          </button>
        </div>
      )}
    </div>
  );
}
