"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { groupLabel } from "@/lib/types";
import { cn } from "@/lib/utils";

const groupBorderClasses: Record<string, string> = {
  "This week": "border-l-brand",
  Upcoming: "border-l-info",
  Completed: "border-l-success",
};

export function InlineTaskCreateRow({
  group,
  gridStyle,
  focusRequest,
  shouldFocus,
  onCreate,
}: {
  group: string;
  gridStyle: CSSProperties;
  focusRequest: number;
  shouldFocus: boolean;
  onCreate: (title: string, group: string) => void;
}) {
  const [title, setTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (shouldFocus && focusRequest > 0) inputRef.current?.focus();
  }, [focusRequest, shouldFocus]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTitle = title.trim();
    if (!nextTitle) return;
    onCreate(nextTitle, group);
    setTitle("");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    if (title) setTitle("");
    else inputRef.current?.blur();
  };

  return (
    <form
      className={cn(
        "grid h-9 grid-cols-[var(--task-grid)] items-center gap-2.5 border-b border-l-[3px] border-border bg-surface px-[18px] max-nav:grid-cols-[24px_minmax(0,1fr)_94px] max-nav:gap-2 max-nav:px-[13px]",
        groupBorderClasses[group] ?? "border-l-brand",
      )}
      style={gridStyle}
      onSubmit={submit}
      data-ui="inline-task-create-row"
      data-group={group}
    >
      <span
        className="size-[14px] rounded-[3px] border border-input bg-background"
        aria-hidden="true"
      />
      <Input
        ref={inputRef}
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={handleKeyDown}
        className="h-[27px] rounded-[4px] border-input bg-background px-3 py-0 text-[10px] shadow-none placeholder:text-muted-foreground focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand/25 dark:bg-background"
        placeholder="+ Таск нэмэх"
        aria-label={`${groupLabel(group)} бүлэгт таск нэмэх`}
        data-ui="inline-task-title"
      />
    </form>
  );
}
