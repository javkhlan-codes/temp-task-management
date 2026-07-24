"use client";

import {
  Activity,
  AtSign,
  Download,
  FileText,
  LoaderCircle,
  MessageSquareText,
  Paperclip,
  Send,
  UploadCloud,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { hasPermission } from "@/lib/permissions";
import type {
  ActivityEntry,
  TaskAttachment,
  TaskComment,
  WorkspaceUser,
} from "@/lib/types";

type CollaborationTab = "comments" | "files" | "activity";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("mn-MN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Ulaanbaatar",
  }).format(new Date(value));
}

function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function activityText(entry: ActivityEntry) {
  const labels: Record<string, string> = {
    "task.created": "даалгаврыг үүсгэсэн",
    "task.updated": "даалгаврыг шинэчилсэн",
    "task.archived": "даалгаврыг архивласан",
    "task.commented": "сэтгэгдэл нэмсэн",
    "task.attachment_added": "файл хавсаргасан",
  };
  return labels[entry.eventType] ?? entry.eventType.replaceAll(".", " ");
}

export function TaskCollaboration({
  taskId,
  currentUser,
  users,
  mode,
  workspaceId,
}: {
  taskId: string;
  currentUser: WorkspaceUser;
  users: WorkspaceUser[];
  mode: "loading" | "local" | "database";
  workspaceId: string;
}) {
  const [tab, setTab] = useState<CollaborationTab>("comments");
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [attachments, setAttachments] = useState<TaskAttachment[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [body, setBody] = useState("");
  const [mentionIds, setMentionIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(mode === "database");
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const canComment = hasPermission(currentUser, "commentTask");
  const canUpload = hasPermission(currentUser, "uploadAttachment");

  const load = useCallback(async () => {
    if (mode !== "database") {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks/${taskId}/collaboration`, {
        cache: "no-store",
        headers: {
          "x-workspace-user-id": currentUser.id,
          "x-workspace-id": workspaceId,
        },
      });
      const payload = (await response.json()) as {
        comments?: TaskComment[];
        attachments?: TaskAttachment[];
        activity?: ActivityEntry[];
        error?: string;
      };
      if (!response.ok) throw new Error(payload.error ?? "Unable to load updates");
      setComments(payload.comments ?? []);
      setAttachments(payload.attachments ?? []);
      setActivity(payload.activity ?? []);
      setError("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to load updates",
      );
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, mode, taskId, workspaceId]);

  useEffect(() => {
    void load();
  }, [load]);

  const addMention = (user: WorkspaceUser) => {
    setMentionIds((current) =>
      current.includes(user.id) ? current : [...current, user.id],
    );
    setBody((current) => `${current}${current && !current.endsWith(" ") ? " " : ""}@${user.name} `);
  };

  const submitComment = async () => {
    if (!body.trim() || submitting || !canComment) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await fetch(`/api/tasks/${taskId}/collaboration`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-user-id": currentUser.id,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({ body, mentionIds }),
      });
      const payload = (await response.json()) as {
        comment?: TaskComment;
        error?: string;
      };
      if (!response.ok || !payload.comment) {
        throw new Error(payload.error ?? "Unable to add comment");
      }
      setComments((current) => [...current, payload.comment as TaskComment]);
      setBody("");
      setMentionIds([]);
      void load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to add comment",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const uploadFile = async (file: File) => {
    if (!canUpload || submitting) return;
    if (file.size > 3 * 1024 * 1024) {
      setError("Файлын хэмжээ 3 MB-аас бага байх ёстой.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Unable to read file"));
        reader.readAsDataURL(file);
      });
      const data = dataUrl.slice(dataUrl.indexOf(",") + 1);
      const response = await fetch(`/api/tasks/${taskId}/attachments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-workspace-user-id": currentUser.id,
          "x-workspace-id": workspaceId,
        },
        body: JSON.stringify({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          data,
        }),
      });
      const payload = (await response.json()) as {
        attachment?: TaskAttachment;
        error?: string;
      };
      if (!response.ok || !payload.attachment) {
        throw new Error(payload.error ?? "Unable to attach file");
      }
      setAttachments((current) => [
        payload.attachment as TaskAttachment,
        ...current,
      ]);
      setTab("files");
      void load();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to attach file",
      );
    } finally {
      setSubmitting(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  return (
    <section className="task-collaboration" aria-label="Task collaboration">
      <div className="collaboration-tabs">
        <button
          type="button"
          className={tab === "comments" ? "active" : ""}
          onClick={() => setTab("comments")}
        >
          <MessageSquareText size={15} />
          Сэтгэгдэл
          <span>{comments.length}</span>
        </button>
        <button
          type="button"
          className={tab === "files" ? "active" : ""}
          onClick={() => setTab("files")}
        >
          <Paperclip size={15} />
          Файл
          <span>{attachments.length}</span>
        </button>
        <button
          type="button"
          className={tab === "activity" ? "active" : ""}
          onClick={() => setTab("activity")}
        >
          <Activity size={15} />
          Түүх
        </button>
      </div>

      {mode !== "database" ? (
        <div className="collaboration-empty">
          Хамтын ажиллагааны мэдээлэл Neon database холбогдсон үед хадгалагдана.
        </div>
      ) : loading ? (
        <div className="collaboration-empty">
          <LoaderCircle className="spin" size={18} /> Мэдээлэл ачаалж байна…
        </div>
      ) : (
        <>
          {error && <div className="collaboration-error">{error}</div>}

          {tab === "comments" && (
            <div className="comment-panel">
              <div className="comment-list">
                {comments.map((comment) => (
                  <article className="comment-item" key={comment.id}>
                    <span className={`avatar avatar-${comment.author.tone}`}>
                      {comment.author.initials}
                    </span>
                    <div>
                      <header>
                        <strong>{comment.author.name}</strong>
                        <time>{formatTimestamp(comment.createdAt)}</time>
                      </header>
                      <p>{comment.body}</p>
                    </div>
                  </article>
                ))}
                {!comments.length && (
                  <div className="collaboration-empty">
                    Анхны сэтгэгдлийг бичиж, багийн гишүүнээ @mention хийгээрэй.
                  </div>
                )}
              </div>

              {canComment && (
                <div className="comment-composer">
                  <textarea
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Шинэчлэл эсвэл сэтгэгдэл бичих…"
                    rows={3}
                    maxLength={5000}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        void submitComment();
                      }
                    }}
                  />
                  <div className="mention-row">
                    <span>
                      <AtSign size={14} /> Mention:
                    </span>
                    {users
                      .filter(
                        (user) =>
                          user.active &&
                          user.id !== currentUser.id &&
                          user.id !== "unassigned",
                      )
                      .slice(0, 8)
                      .map((user) => (
                        <button
                          type="button"
                          className={mentionIds.includes(user.id) ? "selected" : ""}
                          onClick={() => addMention(user)}
                          key={user.id}
                        >
                          {user.name}
                        </button>
                      ))}
                  </div>
                  <div className="comment-actions">
                    <small>⌘ + Enter дарж илгээнэ</small>
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!body.trim() || submitting}
                      onClick={() => void submitComment()}
                    >
                      {submitting ? (
                        <LoaderCircle className="spin" size={15} />
                      ) : (
                        <Send size={15} />
                      )}
                      Илгээх
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "files" && (
            <div className="attachment-panel">
              {canUpload && (
                <button
                  type="button"
                  className={`attachment-dropzone ${dragging ? "dragging" : ""}`}
                  onClick={() => fileInput.current?.click()}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    const file = event.dataTransfer.files[0];
                    if (file) void uploadFile(file);
                  }}
                >
                  <UploadCloud size={21} />
                  <span>
                    <strong>Файлаа энд чирж оруулна уу</strong>
                    <small>эсвэл дарж сонгоно · хамгийн ихдээ 3 MB</small>
                  </span>
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                hidden
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void uploadFile(file);
                }}
              />
              <div className="attachment-list">
                {attachments.map((attachment) => (
                  <div className="attachment-item" key={attachment.id}>
                    <span>
                      <FileText size={18} />
                    </span>
                    <div>
                      <strong>{attachment.fileName}</strong>
                      <small>
                        {formatFileSize(attachment.fileSize)} ·{" "}
                        {attachment.uploader.name} ·{" "}
                        {formatTimestamp(attachment.createdAt)}
                      </small>
                    </div>
                    <a
                      href={`/api/attachments/${attachment.id}`}
                      aria-label={`${attachment.fileName} татах`}
                    >
                      <Download size={16} />
                    </a>
                  </div>
                ))}
                {!attachments.length && (
                  <div className="collaboration-empty">Одоогоор хавсаргасан файл алга.</div>
                )}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="task-activity-list">
              {activity.map((entry) => (
                <div className="task-activity-item" key={entry.id}>
                  <span className={`avatar avatar-${entry.actor?.tone ?? "slate"}`}>
                    {entry.actor?.initials ?? "—"}
                  </span>
                  <p>
                    <strong>{entry.actor?.name ?? "System"}</strong>{" "}
                    {activityText(entry)}
                    <time>{formatTimestamp(entry.createdAt)}</time>
                  </p>
                </div>
              ))}
              {!activity.length && (
                <div className="collaboration-empty">Үйлдлийн түүх хараахан алга.</div>
              )}
            </div>
          )}
        </>
      )}
    </section>
  );
}
