"use client";

import { Archive, Check, RotateCcw, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import type { Project, WorkspaceUser } from "@/lib/types";

const PROJECT_COLORS = [
  "#7c5cff",
  "#4a8df6",
  "#21c8a8",
  "#ffb547",
  "#ed5a70",
  "#d66bf0",
];

type ProjectDraft = Omit<
  Project,
  "id" | "workspaceId" | "taskCount" | "createdAt" | "updatedAt"
>;

export function ProjectModal({
  project,
  users,
  readOnly,
  canArchive,
  canDelete,
  onClose,
  onSave,
  onDelete,
}: {
  project: Project | null;
  users: WorkspaceUser[];
  readOnly: boolean;
  canArchive: boolean;
  canDelete: boolean;
  onClose: () => void;
  onSave: (draft: ProjectDraft, id?: string) => void;
  onDelete: (project: Project) => void;
}) {
  const activeUsers = useMemo(
    () => users.filter((user) => user.active && user.id !== "unassigned"),
    [users],
  );
  const [name, setName] = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [color, setColor] = useState(project?.color ?? PROJECT_COLORS[0]);
  const [ownerId, setOwnerId] = useState(
    project?.ownerId ?? activeUsers[0]?.id ?? "",
  );
  const [memberIds, setMemberIds] = useState<string[]>(
    project?.memberIds ?? activeUsers.map((user) => user.id),
  );
  const [archived, setArchived] = useState(project?.archived ?? false);

  const toggleMember = (userId: string) => {
    setMemberIds((items) =>
      items.includes(userId)
        ? items.filter((item) => item !== userId)
        : [...items, userId],
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="task-modal project-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (readOnly || !name.trim() || !ownerId) return;
          onSave(
            {
              name: name.trim(),
              description: description.trim(),
              color,
              ownerId,
              memberIds: Array.from(new Set([ownerId, ...memberIds])),
              archived,
              archivedAt: archived ? project?.archivedAt ?? new Date().toISOString() : null,
            },
            project?.id,
          );
        }}
      >
        <div className="modal-header">
          <div>
            <span className="panel-kicker">
              {project ? "Project settings" : "Workspace project"}
            </span>
            <h2>
              {project
                ? readOnly
                  ? "Project details"
                  : "Edit project"
                : "Create project"}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>

        <fieldset className="project-modal-content" disabled={readOnly}>
          <label className="form-field">
            <span>Project name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Website redesign"
              autoFocus
              required
            />
          </label>
          <label className="form-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What outcome does this project own?"
              rows={3}
            />
          </label>
          <div className="form-field">
            <span>Color</span>
            <div className="project-color-grid">
              {PROJECT_COLORS.map((item) => (
                <button
                  type="button"
                  className={color === item ? "selected" : ""}
                  style={{ backgroundColor: item }}
                  onClick={() => setColor(item)}
                  aria-label={`Select ${item}`}
                  key={item}
                >
                  {color === item && <Check size={14} />}
                </button>
              ))}
            </div>
          </div>
          <label className="form-field">
            <span>Project owner</span>
            <select
              value={ownerId}
              onChange={(event) => setOwnerId(event.target.value)}
            >
              {activeUsers.map((user) => (
                <option value={user.id} key={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>
          <div className="form-field">
            <span>Project members</span>
            <div className="project-member-grid">
              {activeUsers.map((user) => {
                const selected = memberIds.includes(user.id) || ownerId === user.id;
                return (
                  <button
                    type="button"
                    className={selected ? "selected" : ""}
                    onClick={() => toggleMember(user.id)}
                    disabled={ownerId === user.id}
                    key={user.id}
                  >
                    <span className={`avatar avatar-${user.tone}`}>
                      {user.initials}
                    </span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                    <i>{selected && <Check size={12} />}</i>
                  </button>
                );
              })}
            </div>
          </div>
        </fieldset>

        <div className="modal-footer">
          <div className="modal-danger-actions">
            {project && canArchive && (
              <button
                type="button"
                className="archive-button"
                onClick={() => setArchived((value) => !value)}
              >
                {archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                {archived ? "Restore project" : "Archive project"}
              </button>
            )}
            {project && canDelete && project.archived && project.taskCount === 0 && (
              <button
                type="button"
                className="delete-button"
                onClick={() => {
                  if (window.confirm(`Permanently delete “${project.name}”?`)) {
                    onDelete(project);
                  }
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button type="submit" className="primary-button">
                {project ? "Save project" : "Create project"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
