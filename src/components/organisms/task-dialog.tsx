"use client";

import { Archive, ListTree, RotateCcw, Trash2 } from "lucide-react";
import { useState } from "react";
import { TaskAssigneeField } from "@/components/molecules/task-assignee-field";
import { TaskDependencyPicker } from "@/components/molecules/task-dependency-picker";
import { StatusSelect } from "@/components/molecules/status-select";
import { SubtaskEditor } from "@/components/organisms/subtask-editor";
import { TaskCollaboration } from "@/components/organisms/task-collaboration";
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
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { TaskCustomFields } from "@/features/task-manager/components/task-custom-fields";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  groupLabel,
  type CustomColumn,
  type CustomFieldValue,
  type Project,
  type Task,
  type TaskDraft,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

type PersistenceMode = "loading" | "local" | "database";

const fieldClass = "grid min-w-0 gap-1.5";
const fullFieldClass = "col-span-full grid min-w-0 gap-1.5";
const labelClass = "text-[9px] font-semibold text-[var(--text-soft)]";
const controlClass =
  "h-[39px] w-full rounded-lg border-input bg-surface-soft px-2.5 text-[11px]";

function TaskSelect({
  value,
  onValueChange,
  children,
  disabled,
  ariaLabel,
  displayValue,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  disabled?: boolean;
  ariaLabel: string;
  displayValue: string;
}) {
  return (
    <Select
      value={value}
      disabled={disabled}
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
    >
      <SelectTrigger className={controlClass} aria-label={ariaLabel}>
        <SelectValue>{displayValue}</SelectValue>
      </SelectTrigger>
      <SelectContent>{children}</SelectContent>
    </Select>
  );
}

export function TaskDialog({
  task,
  parentTask,
  subtasks,
  defaultProject,
  projects,
  allTasks,
  defaultAssignee,
  users,
  columns,
  onClose,
  onSave,
  onCreateSubtask,
  onUpdateSubtask,
  onDelete,
  onArchive,
  readOnly,
  canAssign,
  currentUser,
  mode,
  workspaceId,
}: {
  task: Task | null;
  parentTask: Task | null;
  subtasks: Task[];
  defaultProject: Project | undefined;
  projects: Project[];
  allTasks: Task[];
  defaultAssignee: WorkspaceUser;
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onClose: () => void;
  onSave: (draft: TaskDraft, id?: string) => void;
  onCreateSubtask: (parent: Task, title: string) => void;
  onUpdateSubtask: (id: string, changes: Partial<Task>) => void;
  onDelete?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  readOnly: boolean;
  canAssign: boolean;
  currentUser: WorkspaceUser;
  mode: PersistenceMode;
  workspaceId: string;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProject?.id ?? projects[0]?.id ?? "",
  );
  const [group, setGroup] = useState(
    task?.group ?? parentTask?.group ?? "This week",
  );
  const [status, setStatus] = useState<TaskStatus>(
    task?.status ?? "Not started",
  );
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? parentTask?.priority ?? "Medium",
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task
      ? taskAssignees(task).map((assignee) => assignee.id)
      : parentTask
        ? taskAssignees(parentTask).map((assignee) => assignee.id)
        : [defaultAssignee.id],
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ??
      parentTask?.dueDate ??
      new Date().toISOString().slice(0, 10),
  );
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    task?.recurrence ?? "none",
  );
  const [dependencyIds, setDependencyIds] = useState<string[]>(
    task?.dependencyIds ?? [],
  );
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [customFields, setCustomFields] = useState<
    Record<string, CustomFieldValue>
  >(task?.customFields ?? {});
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly || !title.trim()) return;
    const assignees = users.filter((person) => assigneeIds.includes(person.id));
    const assignee = assignees[0] ?? defaultAssignee;
    const selectedProject =
      projects.find((project) => project.id === projectId) ?? defaultProject;
    if (!selectedProject) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        projectId: selectedProject.id,
        project: selectedProject.name,
        group,
        status,
        priority,
        assignee,
        assignees: assignees.length ? assignees : [assignee],
        parentId: task?.parentId ?? parentTask?.id ?? null,
        dependencyIds,
        recurrence,
        dueDate,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        progress: status === "Done" ? 100 : progress,
        customFields,
      },
      task?.id,
    );
  };

  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !deleteOpen) onClose();
        }}
      >
        <DialogContent
          initialFocus={() => document.getElementById("task-title")}
          className={cn(
            "max-h-[calc(100vh-40px)] w-[calc(100vw-40px)] max-w-[650px] gap-0 overflow-y-auto rounded-2xl bg-surface-raised p-0 shadow-[var(--shadow-lg)] ring-1 ring-border sm:max-w-[650px] max-mobile:max-h-[calc(100vh-20px)] max-mobile:w-[calc(100vw-20px)]",
            task && "max-w-[760px] sm:max-w-[760px]",
          )}
        >
          <DialogHeader className="gap-0 border-b border-border px-[23px] py-5 pr-14">
            <DialogDescription className="mb-[3px] text-[8px] leading-[normal] font-bold tracking-[0.8px] text-brand uppercase">
              {task
                ? "Таскийн мэдээлэл"
                : parentTask
                  ? "Дэд таск үүсгэх"
                  : "Таск үүсгэх"}
            </DialogDescription>
            <DialogTitle className="font-heading text-lg leading-[normal] font-bold tracking-[-0.4px]">
              {task
                ? readOnly
                  ? "Таск харах"
                  : "Таск засах"
                : parentTask
                  ? `“${parentTask.title}” таскийг задлах`
                  : "Шинэ ажил нэмэх"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit}>
            <fieldset
              className="grid grid-cols-2 gap-[15px] border-0 px-[23px] py-[21px] disabled:opacity-[0.78] max-mobile:grid-cols-1"
              disabled={readOnly}
            >
              {parentTask && (
                <div className="col-span-full flex items-center gap-2.5 rounded-[9px] border border-[color-mix(in_srgb,var(--brand)_22%,var(--border))] bg-brand-subtle px-3 py-2.5 text-brand">
                  <ListTree size={17} />
                  <span>
                    <small className="mb-0.5 block text-[7px] text-muted-foreground">
                      Үндсэн таск
                    </small>
                    <strong className="block text-[9px] text-foreground">
                      {parentTask.title}
                    </strong>
                  </span>
                </div>
              )}
              <div className={fullFieldClass}>
                <Label className={labelClass} htmlFor="task-title">
                  Таскийн нэр
                </Label>
                <Input
                  id="task-title"
                  className={cn(
                    controlClass,
                    "focus:border-brand! focus-visible:ring-brand-ring!",
                  )}
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Юу хийх шаардлагатай вэ?"
                  autoFocus
                  required
                />
              </div>
              <div className={fullFieldClass}>
                <Label className={labelClass} htmlFor="task-description">
                  Тайлбар
                </Label>
                <Textarea
                  id="task-description"
                  className="min-h-[70px] rounded-lg border-input bg-surface-soft px-2.5 py-[9px] text-[11px] leading-[1.55]"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Нөхцөл, товч мэдээлэл эсвэл тэмдэглэл нэмэх..."
                  rows={3}
                />
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Төсөл</Label>
                <TaskSelect
                  value={projectId}
                  disabled={Boolean(parentTask)}
                  onValueChange={(value) => {
                    setProjectId(value);
                    setDependencyIds([]);
                  }}
                  ariaLabel="Төсөл"
                  displayValue={
                    projects.find((project) => project.id === projectId)?.name ??
                    ""
                  }
                >
                  {projects.map((project) => (
                    <SelectItem value={project.id} key={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </TaskSelect>
              </div>
              <div className={fieldClass}>
                <Label className={labelClass} htmlFor="task-group">
                  Бүлэг
                </Label>
                <Input
                  id="task-group"
                  className={controlClass}
                  list="task-group-options"
                  value={group}
                  onChange={(event) => setGroup(event.target.value)}
                  placeholder="Жишээ: Энэ долоо хоног"
                  required
                />
                <datalist id="task-group-options">
                  {["This week", "Upcoming", "Completed"].map((name) => (
                    <option value={name} key={name}>
                      {groupLabel(name)}
                    </option>
                  ))}
                </datalist>
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Төлөв</Label>
                <StatusSelect
                  value={status}
                  onValueChange={(nextStatus) => {
                    setStatus(nextStatus);
                    if (nextStatus === "Done") setProgress(100);
                  }}
                  ariaLabel="Төлөв"
                  variant="field"
                />
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Ач холбогдол</Label>
                <TaskSelect
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as TaskPriority)
                  }
                  ariaLabel="Ач холбогдол"
                  displayValue={PRIORITY_LABELS[priority]}
                >
                  {PRIORITIES.map((name) => (
                    <SelectItem value={name} key={name}>
                      {PRIORITY_LABELS[name]}
                    </SelectItem>
                  ))}
                </TaskSelect>
              </div>
              <TaskAssigneeField
                users={users}
                assigneeIds={assigneeIds}
                onChange={setAssigneeIds}
                canAssign={canAssign}
              />
              <div className={fieldClass}>
                <Label className={labelClass} htmlFor="task-due-date">
                  Эцсийн хугацаа
                </Label>
                <Input
                  id="task-due-date"
                  className={controlClass}
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  required
                />
              </div>
              <div className={fieldClass}>
                <Label className={labelClass}>Давтамж</Label>
                <TaskSelect
                  value={recurrence}
                  onValueChange={(value) =>
                    setRecurrence(value as TaskRecurrence)
                  }
                  ariaLabel="Давтамж"
                  displayValue={
                    {
                      none: "Давтахгүй",
                      daily: "Өдөр бүр",
                      weekly: "Долоо хоног бүр",
                      monthly: "Сар бүр",
                    }[recurrence]
                  }
                >
                  <SelectItem value="none">Давтахгүй</SelectItem>
                  <SelectItem value="daily">Өдөр бүр</SelectItem>
                  <SelectItem value="weekly">Долоо хоног бүр</SelectItem>
                  <SelectItem value="monthly">Сар бүр</SelectItem>
                </TaskSelect>
              </div>
              {!parentTask && (
                <TaskDependencyPicker
                  tasks={allTasks}
                  projectId={projectId}
                  taskId={task?.id}
                  dependencyIds={dependencyIds}
                  onChange={setDependencyIds}
                />
              )}
              <div className={fullFieldClass}>
                <Label className={labelClass} htmlFor="task-tags">
                  Таг
                </Label>
                <Input
                  id="task-tags"
                  className={controlClass}
                  value={tags}
                  onChange={(event) => setTags(event.target.value)}
                  placeholder="Дизайн, Судалгаа, Frontend"
                />
              </div>
              {task && !task.parentId && (
                <SubtaskEditor
                  task={task}
                  subtasks={subtasks}
                  readOnly={readOnly}
                  title={subtaskTitle}
                  onTitleChange={setSubtaskTitle}
                  onCreate={onCreateSubtask}
                  onUpdate={onUpdateSubtask}
                />
              )}
              <TaskCustomFields
                columns={columns}
                users={users}
                values={customFields}
                onChange={(columnId, value) =>
                  setCustomFields((current) => ({
                    ...current,
                    [columnId]: value,
                  }))
                }
              />
              <div className={fullFieldClass}>
                <Label className="flex justify-between text-[9px] font-semibold text-[var(--text-soft)]">
                  Гүйцэтгэл <strong className="text-brand">{progress}%</strong>
                </Label>
                <Slider
                  min={0}
                  max={100}
                  step={5}
                  value={progress}
                  onValueChange={(next) =>
                    setProgress(
                      Array.isArray(next)
                        ? Number(next[0] ?? 0)
                        : Number(next ?? 0),
                    )
                  }
                />
              </div>
            </fieldset>

            {task && (
              <TaskCollaboration
                taskId={task.id}
                currentUser={currentUser}
                users={users}
                mode={mode}
                workspaceId={workspaceId}
              />
            )}

            <footer className="flex items-center justify-between gap-3 border-t border-border px-[23px] py-[15px] max-mobile:flex-col max-mobile:items-stretch">
              <div className="flex gap-2">
                {task && onArchive && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 text-[10px]"
                    onClick={() => onArchive(task)}
                  >
                    {task.archived ? (
                      <RotateCcw size={16} />
                    ) : (
                      <Archive size={16} />
                    )}
                    {task.archived ? "Сэргээх" : "Архивлах"}
                  </Button>
                )}
                {task && onDelete && (
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-9 text-[10px]"
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
                  className="h-9 px-4 text-[10px]"
                  onClick={onClose}
                >
                  {readOnly ? "Хаах" : "Цуцлах"}
                </Button>
                {!readOnly && (
                  <Button
                    type="submit"
                    className="h-9 bg-brand px-4 text-[10px] text-brand-foreground hover:bg-brand-hover"
                  >
                    {task ? "Өөрчлөлт хадгалах" : "Таск үүсгэх"}
                  </Button>
                )}
              </div>
            </footer>
          </form>
        </DialogContent>
      </Dialog>

      {task && onDelete && (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Таскийг бүрмөсөн устгах уу?</AlertDialogTitle>
              <AlertDialogDescription>
                “{task.title}” таск болон холбоотой мэдээлэл сэргээх боломжгүйгээр
                устна.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Цуцлах</AlertDialogCancel>
              <AlertDialogAction
                variant="destructive"
                onClick={() => onDelete(task)}
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
