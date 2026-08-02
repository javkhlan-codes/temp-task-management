"use client";

import {
  BarChart3,
  CalendarDays,
  Columns3,
  FileDown,
  Filter,
  GanttChart,
  LayoutList,
  Plus,
  Search,
  X,
} from "lucide-react";
import { FilterSelect } from "@/components/molecules/filter-select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  PRIORITIES,
  PRIORITY_LABELS,
  STATUSES,
  STATUS_LABELS,
  type TaskPriority,
  type TaskStatus,
  type ViewMode,
  type WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const filterClass =
  "flex h-[34px] items-center gap-[5px] rounded-lg border border-border bg-surface-soft px-[9px] text-muted-foreground";
const viewTabClass =
  "h-full flex-none gap-[7px] rounded-none px-[13px] text-[11px] font-medium text-muted-foreground after:bottom-0 after:bg-brand data-active:text-foreground max-nav:mr-4 max-nav:px-0";

export function TaskToolbar({
  view,
  onViewChange,
  query,
  onQueryChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  assigneeFilter,
  onAssigneeFilterChange,
  dueFilter,
  onDueFilterChange,
  tagFilter,
  onTagFilterChange,
  users,
  availableTags,
  onClearFilters,
  onExport,
  onAddColumn,
  canAddColumn,
  resultCount,
}: {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  query: string;
  onQueryChange: (value: string) => void;
  statusFilter: TaskStatus | "All";
  onStatusFilterChange: (value: TaskStatus | "All") => void;
  priorityFilter: TaskPriority | "All";
  onPriorityFilterChange: (value: TaskPriority | "All") => void;
  assigneeFilter: string;
  onAssigneeFilterChange: (value: string) => void;
  dueFilter: "All" | "overdue" | "today" | "week";
  onDueFilterChange: (value: "All" | "overdue" | "today" | "week") => void;
  tagFilter: string;
  onTagFilterChange: (value: string) => void;
  users: WorkspaceUser[];
  availableTags: string[];
  onClearFilters: () => void;
  onExport: () => void;
  onAddColumn: () => void;
  canAddColumn: boolean;
  resultCount: number;
}) {
  const filtered =
    statusFilter !== "All" ||
    priorityFilter !== "All" ||
    assigneeFilter !== "All" ||
    dueFilter !== "All" ||
    tagFilter !== "All";

  return (
    <>
      <Tabs
        className="block gap-0"
        value={view}
        onValueChange={(value) => onViewChange(value as ViewMode)}
      >
        <TabsList
          variant="line"
          className="flex h-[54px] w-full items-end justify-start gap-[5px] border-b border-border bg-transparent px-2.5 py-0 max-nav:h-[50px] max-nav:overflow-x-auto max-nav:px-3"
        >
          <TabsTrigger
            className={viewTabClass}
            value="list"
          >
            <LayoutList size={17} />
            Жагсаалт
          </TabsTrigger>
          <TabsTrigger
            className={viewTabClass}
            value="board"
          >
            <Columns3 size={17} />
            Самбар
          </TabsTrigger>
          <TabsTrigger
            className={viewTabClass}
            value="calendar"
          >
            <CalendarDays size={17} />
            Календарь
          </TabsTrigger>
          <TabsTrigger
            className={viewTabClass}
            value="timeline"
          >
            <GanttChart size={17} />
            Timeline
          </TabsTrigger>
          <TabsTrigger
            className={viewTabClass}
            value="dashboard"
          >
            <BarChart3 size={17} />
            Дашбоард
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex min-h-14 items-center gap-2 border-b border-border px-[17px] py-2.5 max-shell:flex-wrap max-nav:flex-wrap max-nav:px-3 max-nav:py-[9px]">
        <div className="flex h-[34px] w-[210px] items-center rounded-lg border border-border bg-surface-soft px-2.5 text-muted-foreground max-nav:w-full">
          <Search size={16} />
          <Input
            className="h-full min-w-0 border-0 bg-transparent px-2 text-[10px] shadow-none focus-visible:border-0 focus-visible:ring-0"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Энэ төслөөс хайх"
            aria-label="Энэ төслөөс хайх"
          />
          {query && (
            <button
              className="flex bg-transparent p-0 text-muted-foreground"
              onClick={() => onQueryChange("")}
              aria-label="Хайлт арилгах"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <div className={filterClass}>
          <Filter size={15} />
          <FilterSelect
            value={statusFilter}
            onValueChange={(value) =>
              onStatusFilterChange(value as TaskStatus | "All")
            }
            options={[
              { value: "All", label: "Бүх төлөв" },
              ...STATUSES.map((status) => ({
                value: status,
                label: STATUS_LABELS[status],
              })),
            ]}
            ariaLabel="Төлвөөр шүүх"
            triggerClassName="w-[95px]"
          />
        </div>
        <div className={cn(filterClass, "max-nav:hidden")}>
          <FilterSelect
            value={priorityFilter}
            onValueChange={(value) =>
              onPriorityFilterChange(
                value as TaskPriority | "All",
              )
            }
            options={[
              { value: "All", label: "Бүх ач холбогдол" },
              ...PRIORITIES.map((priority) => ({
                value: priority,
                label: PRIORITY_LABELS[priority],
              })),
            ]}
            ariaLabel="Ач холбогдлоор шүүх"
            triggerClassName="w-[110px]"
          />
        </div>
        <div className={filterClass}>
          <FilterSelect
            value={assigneeFilter}
            onValueChange={onAssigneeFilterChange}
            options={[
              { value: "All", label: "Бүх хариуцагч" },
              ...users
              .filter((user) => user.active && user.id !== "unassigned")
              .map((user) => ({
                value: user.id,
                label: user.name,
              })),
            ]}
            ariaLabel="Хариуцагчаар шүүх"
            triggerClassName="w-[113px]"
          />
        </div>
        <div className={filterClass}>
          <FilterSelect
            value={dueFilter}
            onValueChange={(value) =>
              onDueFilterChange(
                value as "All" | "overdue" | "today" | "week",
              )
            }
            options={[
              { value: "All", label: "Бүх хугацаа" },
              { value: "overdue", label: "Хугацаа хэтэрсэн" },
              { value: "today", label: "Өнөөдөр дуусах" },
              { value: "week", label: "Дараагийн 7 хоног" },
            ]}
            ariaLabel="Эцсийн хугацаагаар шүүх"
            triggerClassName="w-[118px]"
          />
        </div>
        <div className={filterClass}>
          <FilterSelect
            value={tagFilter}
            onValueChange={onTagFilterChange}
            options={[
              { value: "All", label: "Бүх таг" },
              ...availableTags.map((tag) => ({ value: tag, label: tag })),
            ]}
            ariaLabel="Тагаар шүүх"
            triggerClassName="w-[59px]"
          />
        </div>
        {filtered && (
          <Button
            variant="ghost"
            size="sm"
            className="h-[34px] gap-[5px] text-[9.5px] text-muted-foreground"
            onClick={onClearFilters}
          >
            <X size={14} />
            Арилгах
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="h-[34px] gap-[5px] border-border bg-surface-soft text-[9.5px] text-muted-foreground"
          onClick={onExport}
        >
          <FileDown size={14} />
          CSV
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-[34px] gap-[5px] border-[color-mix(in_srgb,var(--brand)_18%,transparent)] bg-brand-subtle text-[9.5px] font-semibold text-brand hover:bg-[color-mix(in_srgb,var(--brand)_18%,transparent)]"
          onClick={onAddColumn}
          disabled={!canAddColumn}
        >
          <Plus size={15} />
          <span className="max-nav:hidden">Багана нэмэх</span>
        </Button>
        <span className="ml-auto text-[10px] text-muted-foreground max-shell:ml-0 max-nav:w-full max-nav:ml-0">
          {resultCount} таск
        </span>
      </div>
    </>
  );
}
