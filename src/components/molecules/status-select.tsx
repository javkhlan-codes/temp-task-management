import { Check, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";
import {
  Popover,
  PopoverArrow,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  statusDotClasses,
  statusSolidClasses,
  statusSurfaceClasses,
} from "@/features/task-manager/lib/task-visuals";
import {
  STATUSES,
  STATUS_LABELS,
  type TaskStatus,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusSelect({
  value,
  onValueChange,
  ariaLabel,
  className,
  variant = "compact",
  disabled = false,
}: {
  value: TaskStatus;
  onValueChange: (value: TaskStatus) => void;
  ariaLabel: string;
  className?: string;
  variant?: "compact" | "field";
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const optionRefs = useRef<Partial<Record<TaskStatus, HTMLButtonElement | null>>>(
    {},
  );

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
  };

  const moveFocus = (status: TaskStatus, direction: number) => {
    const currentIndex = STATUSES.indexOf(status);
    const nextIndex =
      (currentIndex + direction + STATUSES.length) % STATUSES.length;
    optionRefs.current[STATUSES[nextIndex]]?.focus();
  };

  return (
    <Popover
      open={open}
      onOpenChange={handleOpenChange}
    >
      <PopoverTrigger
        className={cn(
          "group/status flex items-center text-left outline-none transition-[background-color,border-color,box-shadow] focus-visible:ring-3 focus-visible:ring-brand-ring/45 disabled:cursor-not-allowed disabled:opacity-60",
          variant === "compact" &&
            "mx-1.5 h-[26px] w-[116px] rounded-full px-2 text-[8.5px]",
          variant === "field" &&
            "h-[39px] w-full rounded-lg border border-input bg-surface-soft px-2.5 text-[11px] hover:bg-surface-hover",
          variant === "compact" && statusSurfaceClasses[value],
          className,
        )}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        onKeyDown={(event) => {
          if (!open) return;
          if (event.key === "ArrowRight") {
            event.preventDefault();
            moveFocus(value, 1);
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            moveFocus(value, -1);
          } else if (event.key === "ArrowDown") {
            event.preventDefault();
            moveFocus(value, 2);
          } else if (event.key === "ArrowUp") {
            event.preventDefault();
            moveFocus(value, -2);
          }
        }}
      >
        <span
          className={cn(
            "mr-[7px] size-1.5 shrink-0 rounded-full",
            statusDotClasses[value],
          )}
        />
        <span className="min-w-0 flex-1 truncate">
          {STATUS_LABELS[value]}
        </span>
        <ChevronDown
          className={cn(
            "ml-1 size-3 shrink-0 text-current opacity-55 transition-transform",
            open && "rotate-180",
          )}
        />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={9}
        initialFocus={(openType) =>
          openType === "keyboard" ? optionRefs.current[value] ?? null : false
        }
        className="z-90 w-[284px] gap-0 rounded-[10px] border border-border bg-surface-raised p-3 shadow-overlay ring-0"
      >
        <PopoverArrow />
        <div
          className="grid grid-cols-2 gap-2"
          role="listbox"
          aria-label={ariaLabel}
        >
          {STATUSES.map((status) => {
            const selected = status === value;
            return (
              <button
                ref={(node) => {
                  optionRefs.current[status] = node;
                }}
                type="button"
                role="option"
                aria-selected={selected}
                className={cn(
                  "relative flex h-8 items-center justify-center rounded-[5px] border py-1 pr-7 pl-2.5 text-[9px] font-semibold transition-[filter,transform,box-shadow] hover:brightness-110 active:scale-[0.98] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring",
                  statusSolidClasses[status],
                  selected && "focus-visible:outline-none",
                )}
                onClick={() => {
                  onValueChange(status);
                  setOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onValueChange(status);
                    setOpen(false);
                  } else if (event.key === "ArrowRight") {
                    event.preventDefault();
                    moveFocus(status, 1);
                  } else if (event.key === "ArrowLeft") {
                    event.preventDefault();
                    moveFocus(status, -1);
                  } else if (event.key === "ArrowDown") {
                    event.preventDefault();
                    moveFocus(status, 2);
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    moveFocus(status, -2);
                  }
                }}
                key={status}
              >
                <span className="truncate">{STATUS_LABELS[status]}</span>
                {selected && (
                  <Check
                    className="absolute right-2.5 size-3.5"
                    strokeWidth={3}
                  />
                )}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
