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
import { UserAvatar } from "@/components/atoms/user-avatar";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { hasPermission } from "@/lib/permissions";
import type {
  ActivityEntry,
  TaskAttachment,
  TaskComment,
  WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

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

  const emptyClass =
    "flex min-h-[100px] items-center justify-center gap-[7px] rounded-lg border border-dashed border-border p-4 text-center text-[9px] leading-[1.5] text-muted-foreground";

  return (
    <section
      className="border-t border-border px-[23px] pb-5"
      aria-label="Task collaboration"
    >
      <Tabs
        value={tab}
        onValueChange={(value) => setTab(value as CollaborationTab)}
        className="gap-0"
      >
        <TabsList
          variant="line"
          className="h-11 w-full justify-start gap-1 border-b border-border p-0"
        >
          <TabsTrigger
            value="comments"
            className="h-full flex-none gap-1.5 px-2.5 text-[9px] after:bottom-0 after:bg-brand"
          >
            <MessageSquareText size={15} />
            Сэтгэгдэл
            <span className="rounded-full bg-surface-soft px-1.5 py-0.5 text-[7px]">
              {comments.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="files"
            className="h-full flex-none gap-1.5 px-2.5 text-[9px] after:bottom-0 after:bg-brand"
          >
            <Paperclip size={15} />
            Файл
            <span className="rounded-full bg-surface-soft px-1.5 py-0.5 text-[7px]">
              {attachments.length}
            </span>
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="h-full flex-none gap-1.5 px-2.5 text-[9px] after:bottom-0 after:bg-brand"
          >
            <Activity size={15} />
            Түүх
          </TabsTrigger>
        </TabsList>

        {mode !== "database" ? (
          <div className={cn(emptyClass, "mt-3")}>
            Хамтын ажиллагааны мэдээлэл Neon database холбогдсон үед
            хадгалагдана.
          </div>
        ) : loading ? (
          <div className={cn(emptyClass, "mt-3")}>
            <LoaderCircle className="animate-spin" size={18} /> Мэдээлэл ачаалж
            байна…
          </div>
        ) : (
          <>
            {error && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 px-[11px] py-[9px] text-[10px] text-danger">
                {error}
              </div>
            )}

            <TabsContent value="comments" className="pt-3">
              <div className="flex max-h-[280px] flex-col gap-3 overflow-y-auto pr-1">
                {comments.map((comment) => (
                  <article
                    className="flex items-start gap-2.5"
                    key={comment.id}
                  >
                    <UserAvatar user={comment.author} size="sm" />
                    <div className="min-w-0 flex-1 rounded-[4px_11px_11px] border border-border bg-surface-soft px-[11px] py-[9px]">
                      <header className="flex items-center gap-2">
                        <strong className="text-[10px]">
                          {comment.author.name}
                        </strong>
                        <time className="text-[8px] text-muted-foreground">
                          {formatTimestamp(comment.createdAt)}
                        </time>
                      </header>
                      <p className="mt-1.5 mb-0 whitespace-pre-wrap text-[10px] leading-[1.55] break-words text-[var(--text-soft)]">
                        {comment.body}
                      </p>
                    </div>
                  </article>
                ))}
                {!comments.length && (
                  <div className={emptyClass}>
                    Анхны сэтгэгдлийг бичиж, багийн гишүүнээ @mention
                    хийгээрэй.
                  </div>
                )}
              </div>

              {canComment && (
                <div className="mt-3.5 border-t border-border pt-[13px]">
                  <Textarea
                    className="min-h-[74px] resize-y rounded-[9px] bg-surface-soft p-2.5 text-[10px] leading-[1.5]"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    placeholder="Шинэчлэл эсвэл сэтгэгдэл бичих…"
                    rows={3}
                    maxLength={5000}
                    onKeyDown={(event) => {
                      if (
                        (event.metaKey || event.ctrlKey) &&
                        event.key === "Enter"
                      ) {
                        event.preventDefault();
                        void submitComment();
                      }
                    }}
                  />
                  <div className="flex items-center gap-1 overflow-x-auto px-px py-2">
                    <span className="inline-flex items-center gap-[3px] text-[8px] whitespace-nowrap text-muted-foreground">
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
                          className={cn(
                            "rounded-full border border-border bg-surface-soft px-[7px] py-1 text-[8px] whitespace-nowrap text-[var(--text-soft)]",
                            mentionIds.includes(user.id) &&
                              "border-[color-mix(in_srgb,var(--brand)_38%,var(--border))] bg-brand-subtle text-brand",
                          )}
                          onClick={() => addMention(user)}
                          aria-pressed={mentionIds.includes(user.id)}
                          key={user.id}
                        >
                          {user.name}
                        </button>
                      ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <small className="text-[8px] text-muted-foreground">
                      ⌘ + Enter дарж илгээнэ
                    </small>
                    <Button
                      type="button"
                      className="h-8 bg-brand text-[9px] text-brand-foreground hover:bg-brand-hover"
                      disabled={!body.trim() || submitting}
                      onClick={() => void submitComment()}
                    >
                      {submitting ? (
                        <LoaderCircle className="animate-spin" size={15} />
                      ) : (
                        <Send size={15} />
                      )}
                      Илгээх
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="files" className="pt-3">
              {canUpload && (
                <button
                  type="button"
                  className={cn(
                    "flex w-full items-center justify-center gap-[11px] rounded-[11px] border border-dashed border-input bg-surface-soft p-4 text-brand hover:border-brand hover:bg-brand-subtle",
                    dragging && "border-brand bg-brand-subtle",
                  )}
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
                  <span className="flex flex-col text-left">
                    <strong className="text-[10px] text-foreground">
                      Файлаа энд чирж оруулна уу
                    </strong>
                    <small className="mt-0.5 text-[8px] text-muted-foreground">
                      эсвэл дарж сонгоно · хамгийн ихдээ 3 MB
                    </small>
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
              <div className="mt-2.5 flex flex-col gap-[7px]">
                {attachments.map((attachment) => (
                  <div
                    className="flex items-center gap-[9px] rounded-[9px] border border-border px-[9px] py-2"
                    key={attachment.id}
                  >
                    <span className="flex size-[31px] items-center justify-center rounded-[7px] bg-brand-subtle text-brand">
                      <FileText size={18} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col">
                      <strong className="truncate text-[10px]">
                        {attachment.fileName}
                      </strong>
                      <small className="mt-0.5 text-[8px] text-muted-foreground">
                        {formatFileSize(attachment.fileSize)} ·{" "}
                        {attachment.uploader.name} ·{" "}
                        {formatTimestamp(attachment.createdAt)}
                      </small>
                    </div>
                    <a
                      className="flex size-[30px] items-center justify-center rounded-[7px] text-muted-foreground hover:bg-surface-hover hover:text-brand"
                      href={`/api/attachments/${attachment.id}`}
                      aria-label={`${attachment.fileName} татах`}
                    >
                      <Download size={16} />
                    </a>
                  </div>
                ))}
                {!attachments.length && (
                  <div className={emptyClass}>
                    Одоогоор хавсаргасан файл алга.
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent
              value="activity"
              className="flex max-h-[300px] flex-col gap-[11px] overflow-y-auto pt-3"
            >
              {activity.map((entry) => (
                <div className="flex items-start gap-2.5" key={entry.id}>
                  <UserAvatar
                    user={
                      entry.actor ?? {
                        name: "System",
                        initials: "—",
                        tone: "slate",
                      }
                    }
                    size="sm"
                  />
                  <p className="m-0 flex flex-1 flex-wrap gap-x-1 text-[9px] leading-[1.45] text-[var(--text-soft)]">
                    <strong className="text-foreground">
                      {entry.actor?.name ?? "System"}
                    </strong>{" "}
                    {activityText(entry)}
                    <time className="basis-full text-[8px] text-muted-foreground">
                      {formatTimestamp(entry.createdAt)}
                    </time>
                  </p>
                </div>
              ))}
              {!activity.length && (
                <div className={emptyClass}>
                  Үйлдлийн түүх хараахан алга.
                </div>
              )}
            </TabsContent>
          </>
        )}
      </Tabs>
    </section>
  );
}
