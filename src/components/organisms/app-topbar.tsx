"use client";

import { Activity, Menu, Moon, Sun } from "lucide-react";
import type { ReactNode } from "react";
import { IconButton } from "@/components/atoms/icon-button";
import { SyncIndicator } from "@/components/atoms/sync-indicator";
import { GlobalSearch } from "@/components/molecules/global-search";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export function AppTopbar({
  query,
  onQueryChange,
  mode,
  theme,
  onToggleTheme,
  activityOpen,
  onToggleActivity,
  onOpenSidebar,
  notification,
  account,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  mode: "loading" | "local" | "database";
  theme: "light" | "dark";
  onToggleTheme: () => void;
  activityOpen: boolean;
  onToggleActivity: () => void;
  onOpenSidebar: () => void;
  notification: ReactNode;
  account: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-25 flex h-[66px] items-center justify-between border-b border-border bg-[color-mix(in_srgb,var(--surface)_90%,transparent)] px-[30px] backdrop-blur-[18px] max-tablet:px-[18px] max-nav:h-[59px] max-nav:px-[13px]">
      <IconButton
        className="mr-[5px] hidden size-9 max-tablet:inline-flex"
        onClick={onOpenSidebar}
        aria-label="Цэс нээх"
      >
        <Menu size={21} />
      </IconButton>
      <GlobalSearch value={query} onValueChange={onQueryChange} />
      <div className="flex items-center gap-[7px] max-nav:gap-0.5">
        <SyncIndicator mode={mode} />
        <Tooltip>
          <TooltipTrigger
            render={
              <IconButton
                onClick={onToggleTheme}
                aria-label={`${theme === "light" ? "Бараан" : "Цайвар"} горимд шилжих`}
              />
            }
          >
            {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
          </TooltipTrigger>
          <TooltipContent>
            {theme === "light" ? "Бараан горим" : "Цайвар горим"}
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger
            render={
              <IconButton
                className={cn(activityOpen && "bg-surface-hover text-foreground")}
                onClick={onToggleActivity}
                aria-label="Үйлдлийн түүх нээх"
              />
            }
          >
            <Activity size={19} />
          </TooltipTrigger>
          <TooltipContent>Үйлдлийн түүх</TooltipContent>
        </Tooltip>
        {notification}
        {account}
      </div>
    </header>
  );
}
