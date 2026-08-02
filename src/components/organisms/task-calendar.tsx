import { ChevronLeft, ChevronRight } from "lucide-react";
import { IconButton } from "@/components/atoms/icon-button";
import { Button } from "@/components/ui/button";
import {
  statusDotClasses,
} from "@/features/task-manager/lib/task-visuals";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";

export function TaskCalendar({
  tasks,
  month,
  onMonthChange,
  onEdit,
}: {
  tasks: Task[];
  month: Date;
  onMonthChange: (month: Date) => void;
  onEdit: (task: Task) => void;
}) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstWeekday = new Date(year, monthIndex, 1).getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const previousMonthDays = new Date(year, monthIndex, 0).getDate();
  const cells = Array.from({ length: 42 }, (_, index) => {
    const dayOffset = index - firstWeekday + 1;
    if (dayOffset < 1) {
      return {
        date: new Date(year, monthIndex - 1, previousMonthDays + dayOffset),
        muted: true,
      };
    }
    if (dayOffset > daysInMonth) {
      return {
        date: new Date(year, monthIndex + 1, dayOffset - daysInMonth),
        muted: true,
      };
    }
    return { date: new Date(year, monthIndex, dayOffset), muted: false };
  });

  const monthLabel = new Intl.DateTimeFormat("mn-MN", {
    month: "long",
    year: "numeric",
    timeZone: "Asia/Ulaanbaatar",
  }).format(month);
  const todayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return (
    <div
      className="overflow-x-auto px-[18px] pt-[15px] pb-[22px]"
      data-ui="task-calendar"
    >
      <div className="flex h-[47px] items-center justify-between">
        <div className="flex">
          <IconButton
            className="size-[30px]"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
            aria-label="Өмнөх сар"
          >
            <ChevronLeft size={18} />
          </IconButton>
          <IconButton
            className="size-[30px]"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
            aria-label="Дараагийн сар"
          >
            <ChevronRight size={18} />
          </IconButton>
        </div>
        <h3 className="m-0 font-heading text-sm font-bold">{monthLabel}</h3>
        <Button
          variant="outline"
          className="h-[30px] rounded-lg border-input bg-surface px-2.5 text-[10px]"
          onClick={() => onMonthChange(new Date())}
        >
          Өнөөдөр
        </Button>
      </div>
      <div className="grid min-w-[680px] grid-cols-7 border-t border-l border-border">
        {["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"].map((day) => (
          <div
            className="flex h-[27px] items-center justify-center border-r border-b border-border text-[8px] font-bold text-muted-foreground uppercase"
            key={day}
          >
            {day}
          </div>
        ))}
        {cells.map(({ date, muted }) => {
          const dateKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0"),
          ].join("-");
          const dayTasks = tasks.filter((task) => task.dueDate === dateKey);
          const today = dateKey === todayKey;
          return (
            <div
              className={cn(
                "min-h-[92px] border-r border-b border-border p-1.5",
                muted && "bg-surface-soft",
              )}
              key={dateKey}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center text-[9px] text-[var(--text-soft)]",
                  muted && "opacity-35",
                  today &&
                    "rounded-full bg-brand font-bold text-brand-foreground opacity-100",
                )}
              >
                {date.getDate()}
              </span>
              <div className="mt-[3px] flex flex-col gap-[3px]">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    className="flex items-center gap-1 overflow-hidden rounded-sm bg-surface-soft p-1 text-left text-[7.5px] text-ellipsis whitespace-nowrap text-[var(--text-soft)]"
                    key={task.id}
                    onClick={() => onEdit(task)}
                    title={task.title}
                  >
                    <span
                      className={cn(
                        "size-[5px] shrink-0 rounded-full",
                        statusDotClasses[task.status],
                      )}
                    />
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && (
                  <small className="pl-[5px] text-[7px] text-muted-foreground">
                    +{dayTasks.length - 3} бусад
                  </small>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
