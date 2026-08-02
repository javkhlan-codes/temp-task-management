import { Check } from "lucide-react";
import { UserAvatar } from "@/components/atoms/user-avatar";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/permissions";
import type { WorkspaceUser } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskAssigneeField({
  users,
  assigneeIds,
  onChange,
  canAssign,
}: {
  users: WorkspaceUser[];
  assigneeIds: string[];
  onChange: (ids: string[]) => void;
  canAssign: boolean;
}) {
  return (
    <div className="col-span-full grid min-w-0 gap-1.5">
      <Label className="text-[9px] font-semibold text-[var(--text-soft)]">
        Хариуцагчид
      </Label>
      <div className="grid grid-cols-4 gap-[7px] max-tablet:grid-cols-2 max-mobile:grid-cols-1">
        {users
          .filter((person) => person.active && person.id !== "unassigned")
          .map((person) => {
            const selected = assigneeIds.includes(person.id);
            return (
              <button
                type="button"
                className={cn(
                  "grid min-w-0 grid-cols-[29px_minmax(0,1fr)_17px] items-center gap-[7px] rounded-lg border border-border bg-surface-soft p-[7px] text-left",
                  selected &&
                    "border-[color-mix(in_srgb,var(--brand)_38%,var(--border))] bg-brand-subtle",
                )}
                disabled={!canAssign}
                onClick={() => {
                  if (selected) {
                    onChange(
                      assigneeIds.length === 1
                        ? assigneeIds
                        : assigneeIds.filter((id) => id !== person.id),
                    );
                  } else {
                    onChange([...assigneeIds, person.id]);
                  }
                }}
                aria-pressed={selected}
                key={person.id}
              >
                <UserAvatar user={person} size="sm" />
                <span className="min-w-0">
                  <strong className="block truncate text-[8px]">
                    {person.name}
                  </strong>
                  <small className="mt-0.5 block truncate text-[7px] text-muted-foreground">
                    {ROLE_LABELS[person.role]}
                  </small>
                </span>
                <i className="flex size-[17px] items-center justify-center rounded-full bg-brand text-brand-foreground">
                  {selected && <Check size={12} strokeWidth={3} />}
                </i>
              </button>
            );
          })}
      </div>
      {!canAssign && (
        <small className="text-[8px] text-muted-foreground">
          Таны эрх таскийн хариуцагчийг өөрчлөх боломжгүй.
        </small>
      )}
    </div>
  );
}
