import { ListTree, Plus } from "lucide-react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";
import { STATUS_LABELS, type Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function SubtaskEditor({
  task,
  subtasks,
  readOnly,
  title,
  onTitleChange,
  onCreate,
  onUpdate,
}: {
  task: Task;
  subtasks: Task[];
  readOnly: boolean;
  title: string;
  onTitleChange: (title: string) => void;
  onCreate: (task: Task, title: string) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
}) {
  const create = () => {
    if (!title.trim()) return;
    onCreate(task, title);
    onTitleChange("");
  };

  return (
    <section className="col-span-full overflow-hidden rounded-[10px] border border-border">
      <header className="flex items-center justify-between border-b border-border bg-surface-soft px-3 py-2.5">
        <span className="flex items-center gap-[7px] text-[9px] font-bold">
          <ListTree size={15} />
          Дэд таск
        </span>
        <small className="text-[8px] text-muted-foreground">
          {subtasks.filter((subtask) => subtask.status === "Done").length}/
          {subtasks.length} дууссан
        </small>
      </header>
      <div className="bg-surface">
        {subtasks.map((subtask) => (
          <div
            className="grid min-h-11 grid-cols-[23px_minmax(0,1fr)_auto] items-center gap-[9px] border-b border-border px-[11px] py-1.5"
            key={subtask.id}
          >
            <Checkbox
              checked={subtask.status === "Done"}
              onCheckedChange={() =>
                onUpdate(subtask.id, {
                  status:
                    subtask.status === "Done" ? "Not started" : "Done",
                  progress: subtask.status === "Done" ? 0 : 100,
                })
              }
              aria-label={`${subtask.title} дууссан`}
            />
            <span>
              <strong
                className={cn(
                  "block text-[9px]",
                  subtask.status === "Done" &&
                    "text-muted-foreground line-through",
                )}
              >
                {subtask.title}
              </strong>
              <small className="mt-0.5 block text-[7px] text-muted-foreground">
                {STATUS_LABELS[subtask.status]}
              </small>
            </span>
            <span className="flex">
              {taskAssignees(subtask)
                .slice(0, 2)
                .map((person, index) => (
                  <UserAvatar
                    user={person}
                    size="sm"
                    className={cn(index > 0 && "-ml-1.5")}
                    key={person.id}
                  />
                ))}
            </span>
          </div>
        ))}
        {!subtasks.length && (
          <p className="m-0 px-3 py-3.5 text-[9px] text-muted-foreground">
            Энэ таскийг жижиг, хуваарилах боломжтой алхмуудад задлаарай.
          </p>
        )}
      </div>
      {!readOnly && (
        <div className="grid grid-cols-[16px_1fr_auto] items-center gap-[7px] bg-surface px-[11px] py-2 text-muted-foreground">
          <Plus size={15} />
          <Input
            className="h-7 border-0 bg-transparent px-0 text-[9px] shadow-none focus-visible:ring-0"
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && title.trim()) {
                event.preventDefault();
                create();
              }
            }}
            placeholder="Дэд таск бичээд Enter дарна уу"
          />
          <Button
            type="button"
            variant="secondary"
            className="h-[27px] bg-brand-subtle px-2.5 text-[8px] font-bold text-brand"
            disabled={!title.trim()}
            onClick={create}
          >
            Нэмэх
          </Button>
        </div>
      )}
    </section>
  );
}
