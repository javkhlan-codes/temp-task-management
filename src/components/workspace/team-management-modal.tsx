"use client";

import { Check, Plus, ShieldCheck, UserX, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  hasPermission,
} from "@/lib/permissions";
import {
  USER_ROLES,
  type UserRole,
  type WorkspaceUser,
} from "@/lib/types";

export function TeamManagementModal({
  currentUser,
  users,
  onClose,
  onSave,
  onDeactivate,
}: {
  currentUser: WorkspaceUser;
  users: WorkspaceUser[];
  onClose: () => void;
  onSave: (user: WorkspaceUser, isNew: boolean) => void;
  onDeactivate: (user: WorkspaceUser) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("member");
  const canManage = hasPermission(currentUser, "manageUsers");
  const activeUsers = useMemo(
    () => users.filter((user) => user.id !== "unassigned"),
    [users],
  );

  const addUser = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim() || !email.trim()) return;
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("");
    onSave(
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        initials: initials || "U",
        tone: ["violet", "cyan", "amber", "rose"][
          activeUsers.length % 4
        ],
        role,
        active: true,
      },
      true,
    );
    setName("");
    setEmail("");
    setRole("member");
    setAdding(false);
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="task-modal team-modal"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="panel-kicker">Workspace хандалт</span>
            <h2>Баг ба эрх</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Хаах">
            <X size={19} />
          </button>
        </div>

        <div className="role-overview">
          {USER_ROLES.map((item) => (
            <div key={item}>
              <span className={`role-badge role-${item}`}>
                <ShieldCheck size={12} />
                {ROLE_LABELS[item]}
              </span>
              <p>{ROLE_DESCRIPTIONS[item]}</p>
            </div>
          ))}
        </div>

        <div className="team-list-header">
          <span>{activeUsers.length} workspace гишүүн</span>
          {canManage && (
            <button className="secondary-button" onClick={() => setAdding(true)}>
              <Plus size={15} />
              Гишүүн нэмэх
            </button>
          )}
        </div>

        {adding && (
          <form className="add-member-form" onSubmit={addUser}>
            <label className="form-field">
              <span>Нэр</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Овог нэр"
                autoFocus
                required
              />
            </label>
            <label className="form-field">
              <span>И-мэйл</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@company.com"
                required
              />
            </label>
            <label className="form-field">
              <span>Эрх</span>
              <select
                value={role}
                onChange={(event) => setRole(event.target.value as UserRole)}
              >
                {USER_ROLES.map((item) => (
                  <option value={item} key={item}>
                    {ROLE_LABELS[item]}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setAdding(false)}
              >
                <X size={17} />
              </button>
              <button type="submit" className="primary-button">
                <Check size={15} />
                Нэмэх
              </button>
            </div>
          </form>
        )}

        <div className="team-user-list">
          {activeUsers.map((user) => (
            <div className={`team-user-row ${!user.active ? "inactive" : ""}`} key={user.id}>
              <span className={`avatar avatar-${user.tone}`}>{user.initials}</span>
              <div className="team-user-copy">
                <strong>
                  {user.name}
                  {user.id === currentUser.id && <small>Та</small>}
                </strong>
                <span>{user.email}</span>
              </div>
              <label className="role-select">
                <select
                  value={user.role}
                  disabled={!canManage || user.id === currentUser.id}
                  onChange={(event) =>
                    onSave(
                      { ...user, role: event.target.value as UserRole },
                      false,
                    )
                  }
                >
                  {USER_ROLES.map((item) => (
                    <option value={item} key={item}>
                      {ROLE_LABELS[item]}
                    </option>
                  ))}
                </select>
              </label>
              {canManage && user.id !== currentUser.id && user.active && (
                <button
                  className="deactivate-user"
                  onClick={() => {
                    if (window.confirm(`${user.name}-г идэвхгүй болгох уу?`)) onDeactivate(user);
                  }}
                  title="Гишүүнийг идэвхгүй болгох"
                >
                  <UserX size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        {!canManage && (
          <div className="read-only-note">
            Таны {ROLE_LABELS[currentUser.role]} эрх багийг харах боломжтой боловч
            хандалтыг өөрчлөх боломжгүй.
          </div>
        )}
      </section>
    </div>
  );
}
