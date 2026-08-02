"use client";

import { ColumnTypeIcon } from "@/features/task-manager/components/custom-cell";
import { Checkbox } from "@/components/ui/checkbox";
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
import type {
  CustomColumn,
  CustomFieldValue,
  WorkspaceUser,
} from "@/lib/types";

const controlClass =
  "h-[39px] w-full rounded-lg border-input bg-surface-soft px-2.5 text-[11px]";

function CustomFieldControl({
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
  if (column.type === "checkbox") {
    const checked = value === true;
    return (
      <label className="flex h-[39px] items-center gap-2 rounded-lg border border-input bg-surface-soft px-2.5 text-[10px] text-muted-foreground">
        <Checkbox
          checked={checked}
          onCheckedChange={(next) => onChange(next === true)}
          className="size-[18px] rounded-[5px] data-checked:border-success data-checked:bg-success"
        />
        {checked ? "Сонгосон" : "Сонгоогүй"}
      </label>
    );
  }

  if (column.type === "progress") {
    const progress = typeof value === "number" ? value : 0;
    return (
      <div className="flex h-[39px] items-center gap-2.5 rounded-lg border border-input bg-surface-soft px-2.5">
        <Slider
          min={0}
          max={100}
          step={5}
          value={progress}
          onValueChange={(next) =>
            onChange(
              Array.isArray(next)
                ? Number(next[0] ?? 0)
                : Number(next ?? 0),
            )
          }
          className="flex-1"
        />
        <strong className="min-w-[30px] text-[9px] text-brand">
          {progress}%
        </strong>
      </div>
    );
  }

  if (
    column.type === "person" ||
    column.type === "dropdown" ||
    column.type === "status"
  ) {
    const options =
      column.type === "person"
        ? users
            .filter((person) => person.active && person.id !== "unassigned")
            .map((person) => person.name)
        : column.options.length
          ? column.options
          : ["Not started", "Working on it", "In review", "Done"];
    return (
      <Select
        value={typeof value === "string" && value ? value : null}
        onValueChange={(next) => onChange(next || null)}
      >
        <SelectTrigger className={controlClass}>
          <SelectValue placeholder="Сонгох..." />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem value={option} key={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (column.type === "tags") {
    return (
      <Input
        className={controlClass}
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        placeholder="Таг нэг, Таг хоёр"
      />
    );
  }

  return (
    <Input
      className={controlClass}
      type={
        column.type === "number"
          ? "number"
          : column.type === "date"
            ? "date"
            : "text"
      }
      value={
        typeof value === "string" || typeof value === "number"
          ? String(value)
          : ""
      }
      onChange={(event) =>
        onChange(
          column.type === "number"
            ? event.target.value === ""
              ? null
              : Number(event.target.value)
            : event.target.value,
        )
      }
      placeholder="Утга нэмэх"
    />
  );
}

export function TaskCustomFields({
  columns,
  users,
  values,
  onChange,
}: {
  columns: CustomColumn[];
  users: WorkspaceUser[];
  values: Record<string, CustomFieldValue>;
  onChange: (columnId: string, value: CustomFieldValue) => void;
}) {
  if (!columns.length) return null;

  return (
    <section className="col-span-full mt-0.5 border-t border-border pt-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-bold">Нэмэлт талбар</span>
        <small className="text-[8px] text-muted-foreground">
          {columns.length} багана
        </small>
      </div>
      <div className="grid grid-cols-2 gap-x-[15px] gap-y-[13px] max-mobile:grid-cols-1">
        {columns.map((column) => (
          <div className="grid min-w-0 gap-1.5" key={column.id}>
            <Label className="flex items-center gap-1.5 text-[9px] text-[var(--text-soft)]">
              <ColumnTypeIcon type={column.type} />
              {column.name}
            </Label>
            <CustomFieldControl
              column={column}
              users={users}
              value={values[column.id] ?? null}
              onChange={(value) => onChange(column.id, value)}
            />
          </div>
        ))}
      </div>
    </section>
  );
}
