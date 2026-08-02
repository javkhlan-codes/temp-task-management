"use client";

import { Archive, Check, RotateCcw, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Project, WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

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

const fieldClass = "grid gap-1.5";
const labelClass =
  "text-[9px] leading-[normal] font-semibold text-[var(--text-soft)]";
const controlClass =
  "h-[39px] rounded-[9px] border-input bg-surface-soft px-3 text-[11px] data-[size=default]:h-[39px]";

export function ProjectDialog({
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
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toggleMember = (userId: string) => {
    setMemberIds((items) =>
      items.includes(userId)
        ? items.filter((item) => item !== userId)
        : [...items, userId],
    );
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <DialogContent
          showCloseButton
          initialFocus={() => document.getElementById("project-name")}
          className="max-h-[min(88vh,780px)] w-[min(620px,calc(100vw-24px))] max-w-none gap-0 overflow-y-auto rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-none"
        >
          <DialogHeader className="gap-0 border-b border-border px-[23px] py-5 pr-14">
            <DialogDescription className="mb-[3px] text-[8px] leading-[normal] font-bold tracking-[0.8px] text-brand uppercase">
              {project ? "Төслийн тохиргоо" : "Workspace төсөл"}
            </DialogDescription>
            <DialogTitle className="font-heading text-lg leading-[normal] font-bold tracking-[-0.4px]">
              {project
                ? readOnly
                  ? "Төслийн мэдээлэл"
                  : "Төсөл засах"
                : "Төсөл үүсгэх"}
            </DialogTitle>
          </DialogHeader>

          <form
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
                  archivedAt: archived
                    ? project?.archivedAt ?? new Date().toISOString()
                    : null,
                },
                project?.id,
              );
            }}
          >
            <fieldset
              className="grid gap-[15px] px-[23px] py-5 disabled:opacity-70"
              disabled={readOnly}
            >
              <div className={fieldClass}>
                <Label className={labelClass} htmlFor="project-name">
                  Төслийн нэр
                </Label>
                <Input
                  id="project-name"
                  className={cn(
                    controlClass,
                    "focus:border-brand! focus-visible:ring-brand-ring!",
                  )}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Жишээ: Вебсайт шинэчлэл"
                  autoFocus
                  required
                />
              </div>
              <div className={fieldClass}>
                <Label className={labelClass} htmlFor="project-description">
                  Тайлбар
                </Label>
                <Textarea
                  id="project-description"
                  className="h-[72px] min-h-[72px] rounded-[9px] border-input bg-surface-soft px-3 py-[9px] text-[11px] leading-[1.55]"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Энэ төслийн хүрэх үр дүн юу вэ?"
                  rows={3}
                />
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Өнгө</Label>
                <div className="flex flex-wrap gap-2">
                  {PROJECT_COLORS.map((item) => (
                    <button
                      type="button"
                      className={cn(
                        "flex size-7 items-center justify-center rounded-full border-[3px] border-transparent text-white transition-transform hover:scale-105",
                        color === item &&
                          "border-surface shadow-[0_0_0_2px_var(--brand)]",
                      )}
                      style={{ backgroundColor: item }}
                      onClick={() => setColor(item)}
                      aria-label={`${item} өнгө сонгох`}
                      aria-pressed={color === item}
                      key={item}
                    >
                      {color === item && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Төслийн эзэн</Label>
                <Select
                  value={ownerId}
                  onValueChange={(value) => {
                    if (value) setOwnerId(value);
                  }}
                >
                  <SelectTrigger className={cn(controlClass, "w-full")}>
                    <SelectValue>
                      {activeUsers.find((user) => user.id === ownerId)?.name}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {activeUsers.map((user) => (
                      <SelectItem value={user.id} key={user.id}>
                        {user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Төслийн гишүүд</Label>
                <div className="grid grid-cols-2 gap-[7px] max-mobile:grid-cols-1">
                  {activeUsers.map((user) => {
                    const selected =
                      memberIds.includes(user.id) || ownerId === user.id;
                    return (
                      <button
                        type="button"
                        className={cn(
                          "grid min-w-0 grid-cols-[30px_1fr_17px] items-center gap-2 rounded-[9px] border border-border bg-surface-soft p-2 text-left leading-[normal]",
                          selected &&
                            "border-[color-mix(in_srgb,var(--brand)_35%,var(--border))] bg-brand-subtle",
                        )}
                        onClick={() => toggleMember(user.id)}
                        disabled={ownerId === user.id}
                        aria-pressed={selected}
                        key={user.id}
                      >
                        <UserAvatar
                          user={user}
                          size="sm"
                          className="size-[29px]"
                        />
                        <span className="min-w-0">
                          <strong className="block truncate text-[9px]">
                            {user.name}
                          </strong>
                          <small className="mt-0.5 block truncate text-[7px] text-muted-foreground">
                            {user.email}
                          </small>
                        </span>
                        <i className="flex size-[17px] items-center justify-center rounded-full bg-brand text-white">
                          {selected && <Check size={12} />}
                        </i>
                      </button>
                    );
                  })}
                </div>
              </div>
            </fieldset>

            <footer className="flex items-center justify-between gap-3 border-t border-border px-[23px] py-[15px] max-mobile:flex-col max-mobile:items-stretch">
              <div className="flex gap-2">
                {project && canArchive && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-[38px] text-[10px]"
                    onClick={() => setArchived((value) => !value)}
                  >
                    {archived ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                    {archived ? "Төсөл сэргээх" : "Төсөл архивлах"}
                  </Button>
                )}
                {project &&
                  canDelete &&
                  project.archived &&
                  project.taskCount === 0 && (
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-[38px] text-[10px]"
                      onClick={() => setDeleteOpen(true)}
                    >
                      <Trash2 size={16} />
                      Устгах
                    </Button>
                  )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-[38px] px-4 text-[10px]"
                  onClick={onClose}
                >
                  {readOnly ? "Хаах" : "Цуцлах"}
                </Button>
                {!readOnly && (
                  <Button
                    type="submit"
                    className="h-[38px] bg-brand px-4 text-[10px] text-brand-foreground hover:bg-brand-hover"
                  >
                    {project ? "Төсөл хадгалах" : "Төсөл үүсгэх"}
                  </Button>
                )}
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>

      {project && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Төслийг бүрмөсөн устгах уу?</AlertDialogTitle>
              <AlertDialogDescription>
                “{project.name}” төсөл сэргээх боломжгүйгээр устна.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Цуцлах</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(project)}
              >
                Устгах
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}
