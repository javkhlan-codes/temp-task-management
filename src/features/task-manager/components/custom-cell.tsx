"use client";

import {
  CalendarDays,
  CheckCircle2,
  Hash,
  ListChecks,
  Target,
  Type,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import type {
  CustomColumn,
  CustomColumnType,
  CustomFieldValue,
  WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function ColumnTypeIcon({ type }: { type: CustomColumnType }) {
  if (type === "text") return <Type size={12} />;
  if (type === "number") return <Hash size={12} />;
  if (type === "date") return <CalendarDays size={12} />;
  if (type === "person") return <Users size={12} />;
  if (type === "checkbox") return <CheckCircle2 size={12} />;
  if (type === "progress") return <Target size={12} />;
  return <ListChecks size={12} />;
}

const cellClass = "min-w-0 overflow-hidden px-1.5";
const controlClass =
  "h-[31px] w-full rounded-[6px] border border-transparent bg-transparent px-[7px] text-[8px] shadow-none outline-none hover:border-border hover:bg-surface-soft focus-visible:border-brand focus-visible:ring-0 dark:bg-transparent";
const selectControlClass =
  "w-full rounded-[6px] border-transparent bg-transparent px-[7px] py-0 text-[8px] shadow-none hover:border-border hover:bg-surface-soft focus-visible:ring-0 data-[size=default]:h-[31px] dark:bg-transparent";
const UNASSIGNED_VALUE = "__unassigned__";
const EMPTY_VALUE = "__empty__";

export function CustomCell({
  column,
  users,
  value,
  onChange,
}: {
  column: CustomColumn;
  users: WorkspaceUser[];
  value: CustomFieldValue;
  onChange: (value: CustomFieldValue) => void;
}) {
  if (column.type === "text") {
    return (
      <InlineCellInput
        value={typeof value === "string" ? value : ""}
        placeholder="Текст нэмэх"
        onCommit={onChange}
      />
    );
  }

  if (column.type === "number") {
    return (
      <InlineCellInput
        value={typeof value === "number" ? String(value) : ""}
        type="number"
        placeholder="—"
        onCommit={(nextValue) =>
          onChange(nextValue === "" ? null : Number(nextValue))
        }
      />
    );
  }

  if (column.type === "date") {
    return (
      <div className={cellClass}>
        <Input
          className={controlClass}
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
          aria-label={column.name}
        />
      </div>
    );
  }

  if (column.type === "checkbox") {
    return (
      <div className={cn(cellClass, "flex justify-center")}>
        <Checkbox
          className="size-[18px] rounded-[5px] data-checked:border-success data-checked:bg-success"
          checked={value === true}
          onCheckedChange={(checked) => onChange(checked === true)}
          aria-label={`${column.name}: ${value === true ? "checked" : "unchecked"}`}
        />
      </div>
    );
  }

  if (column.type === "progress") {
    const progressValue = typeof value === "number" ? value : 0;
    return (
      <div
        className={cn(
          cellClass,
          "grid grid-cols-[1fr_27px] items-center gap-1.5",
        )}
      >
        <Slider
          className="[&_[data-slot=slider-thumb]]:size-2.5 [&_[data-slot=slider-track]]:h-1.5"
          min={0}
          max={100}
          step={5}
          value={progressValue}
          onValueChange={(nextValue) =>
            onChange(
              Array.isArray(nextValue)
                ? Number(nextValue[0] ?? 0)
                : Number(nextValue),
            )
          }
          aria-label={column.name}
        />
        <small className="text-right text-[7px] text-muted-foreground">
          {progressValue}%
        </small>
      </div>
    );
  }

  if (column.type === "person") {
    const selectedPerson =
      typeof value === "string" && value ? value : UNASSIGNED_VALUE;

    return (
      <div className={cellClass}>
        <Select
          value={selectedPerson}
          onValueChange={(nextValue) =>
            onChange(nextValue === UNASSIGNED_VALUE ? null : nextValue)
          }
        >
          <SelectTrigger
            className={selectControlClass}
            aria-label={column.name}
          >
            <SelectValue>
              {selectedPerson === UNASSIGNED_VALUE
                ? "Хуваарилаагүй"
                : selectedPerson}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="start">
            <SelectItem className="min-h-7 text-[9px]" value={UNASSIGNED_VALUE}>
              Хуваарилаагүй
            </SelectItem>
            {users
              .filter((person) => person.active && person.id !== "unassigned")
              .map((person) => (
                <SelectItem
                  className="min-h-7 text-[9px]"
                  value={person.name}
                  key={person.name}
                >
                  {person.name}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (column.type === "tags") {
    return (
      <InlineCellInput
        value={Array.isArray(value) ? value.join(", ") : ""}
        placeholder="Таг нэмэх"
        onCommit={(nextValue) =>
          onChange(
            nextValue
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
      />
    );
  }

  const options =
    column.options.length > 0
      ? column.options
      : column.type === "status"
        ? ["Not started", "Working on it", "In review", "Done"]
        : [];
  const selectedOption =
    typeof value === "string" && value ? value : EMPTY_VALUE;

  return (
    <div className={cellClass}>
      <Select
        value={selectedOption}
        onValueChange={(nextValue) =>
          onChange(nextValue === EMPTY_VALUE ? null : nextValue)
        }
      >
        <SelectTrigger
          className={cn(selectControlClass, "bg-surface-soft")}
          aria-label={column.name}
        >
          <SelectValue>
            {selectedOption === EMPTY_VALUE ? "Сонгох..." : selectedOption}
          </SelectValue>
        </SelectTrigger>
        <SelectContent align="start">
          <SelectItem className="min-h-7 text-[9px]" value={EMPTY_VALUE}>
            Сонгох...
          </SelectItem>
          {options.map((option) => (
            <SelectItem
              className="min-h-7 text-[9px]"
              value={option}
              key={option}
            >
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function InlineCellInput({
  value,
  onCommit,
  placeholder,
  type = "text",
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <div className={cellClass}>
      <Input
        className={controlClass}
        type={type}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
      />
    </div>
  );
}
