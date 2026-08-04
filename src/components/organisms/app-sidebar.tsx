"use client";

import {
  Archive,
  Bell,
  CircleHelp,
  Grid2X2,
  Inbox,
  MessageSquareText,
  Plus,
  Users,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/atoms/brand-logo";
import { IconButton } from "@/components/atoms/icon-button";
import { ProjectMark } from "@/components/atoms/project-mark";
import { ProjectActionsMenu } from "@/components/molecules/project-actions-menu";
import { WorkspaceSwitcher } from "@/components/molecules/workspace-switcher";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";
import type {
  Project,
  Task,
  WorkspaceSummary,
  WorkspaceUser,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const navItemClass =
  "relative my-0.5 grid h-[38px] w-full grid-cols-[18px_1fr_auto] items-center gap-[11px] rounded-lg bg-transparent px-2.5 text-left text-xs text-sidebar-foreground transition-colors hover:bg-sidebar-hover hover:text-[var(--sidebar-strong)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring";
const activeNavItemClass =
  "bg-sidebar-active text-brand before:absolute before:left-[-14px] before:h-[25px] before:w-[3px] before:rounded-r before:bg-brand before:content-['']";

function NavItem({
  active = false,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      className={cn(
        navItemClass,
        active && activeNavItemClass,
        className,
      )}
      {...props}
    />
  );
}

function SectionLabel({
  children,
  onAdd,
  addLabel,
}: {
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
}) {
  return (
    <div className="mx-[9px] mb-[7px] flex items-center justify-between text-[10px] font-bold tracking-[0.75px] text-[var(--sidebar-label)] uppercase">
      <span>{children}</span>
      {onAdd && (
        <button
          className="flex bg-transparent p-0.5 text-sidebar-foreground hover:text-[var(--sidebar-strong)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-brand-ring"
          onClick={onAdd}
          aria-label={addLabel}
        >
          <Plus size={15} />
        </button>
      )}
    </div>
  );
}

type AppSidebarProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string;
  workspaceMenuOpen: boolean;
  onWorkspaceMenuOpenChange: (open: boolean) => void;
  newWorkspaceName: string;
  creatingWorkspace: boolean;
  onWorkspaceChange: (workspaceId: string) => void;
  onNewWorkspaceNameChange: (name: string) => void;
  onCreateWorkspace: () => void;
  onDeleteWorkspace: (workspaceId: string) => void;
  tasks: Task[];
  projects: Project[];
  currentUser: WorkspaceUser;
  activeProject: string;
  onProjectChange: (projectId: string) => void;
  onOpenTeam: () => void;
  onCreateProject: () => void;
  onEditProject: (project: Project) => void;
  onArchiveProject: (project: Project) => void;
  onOpenArchivedProject: (project: Project) => void;
  canEditProject: boolean;
  canArchiveProject: boolean;
};

function SidebarContent({
  mobile = false,
  open,
  onOpenChange,
  workspaces,
  activeWorkspaceId,
  workspaceMenuOpen,
  onWorkspaceMenuOpenChange,
  newWorkspaceName,
  creatingWorkspace,
  onWorkspaceChange,
  onNewWorkspaceNameChange,
  onCreateWorkspace,
  onDeleteWorkspace,
  tasks,
  projects,
  currentUser,
  activeProject,
  onProjectChange,
  onOpenTeam,
  onCreateProject,
  onEditProject,
  onArchiveProject,
  onOpenArchivedProject,
  canEditProject,
  canArchiveProject,
}: AppSidebarProps & { mobile?: boolean }) {
  const closeAfter = (callback: () => void) => {
    callback();
    if (mobile) onOpenChange(false);
  };

  return (
    <ScrollArea className="h-full">
      <div className="flex min-h-full flex-col px-3.5 pt-5 pb-3.5">
        <div className="flex h-9 items-center px-2 pr-2 pl-[5px]">
          <BrandLogo />
          <span className="ml-2.5 font-heading text-[19px] font-extrabold tracking-[-0.7px] text-[var(--sidebar-strong)]">
            Pro Team
          </span>
          {mobile && (
            <IconButton
              className="ml-auto size-9 text-sidebar-foreground"
              onClick={() => onOpenChange(false)}
              aria-label="Хажуу цэс хаах"
            >
              <X size={19} />
            </IconButton>
          )}
        </div>

        <WorkspaceSwitcher
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          newWorkspaceName={newWorkspaceName}
          creatingWorkspace={creatingWorkspace}
          open={workspaceMenuOpen}
          onOpenChange={onWorkspaceMenuOpenChange}
          onWorkspaceChange={onWorkspaceChange}
          onNewWorkspaceNameChange={onNewWorkspaceNameChange}
          onCreateWorkspace={onCreateWorkspace}
          onDeleteWorkspace={onDeleteWorkspace}
        />

        <nav className="pb-[13px]" aria-label="Үндсэн цэс">
          <NavItem
            active={activeProject === "My work"}
            onClick={() => closeAfter(() => onProjectChange("My work"))}
          >
            <Inbox size={18} />
            <span>Миний ажил</span>
            <span className="text-[10px] text-[var(--sidebar-label)]">
              {
                tasks.filter(
                  (task) =>
                    !task.archived &&
                    !task.parentId &&
                    taskAssignees(task).some(
                      (assignee) => assignee.id === currentUser.id,
                    ),
                ).length
              }
            </span>
          </NavItem>
          <NavItem>
            <Bell size={18} />
            <span>Ирсэн</span>
            <span className="size-1.5 rounded-full bg-brand" />
          </NavItem>
          <NavItem>
            <MessageSquareText size={18} />
            <span>Мессеж</span>
          </NavItem>
        </nav>
        <Separator className="bg-sidebar-border" />

        <div className="pt-[17px]">
          <SectionLabel onAdd={() => {}} addLabel="Workspace зүйл нэмэх">
            Workspace
          </SectionLabel>
          <NavItem
            active={activeProject === "All tasks"}
            onClick={() => closeAfter(() => onProjectChange("All tasks"))}
          >
            <Grid2X2 size={18} />
            <span>Бүх таск</span>
            <span className="text-[10px] text-[var(--sidebar-label)]">
              {tasks.filter((task) => !task.archived && !task.parentId).length}
            </span>
          </NavItem>
          <NavItem onClick={() => closeAfter(onOpenTeam)}>
            <Users size={18} />
            <span>Багийн гишүүд</span>
          </NavItem>
          <NavItem
            active={activeProject === "Archive"}
            onClick={() => closeAfter(() => onProjectChange("Archive"))}
          >
            <Archive size={18} />
            <span>Архив</span>
            <span className="text-[10px] text-[var(--sidebar-label)]">
              {tasks.filter((task) => task.archived).length}
            </span>
          </NavItem>
        </div>

        <div className="pt-[17px]">
          <SectionLabel onAdd={onCreateProject} addLabel="Төсөл үүсгэх">
            Төслүүд
          </SectionLabel>
          {projects
            .filter((project) => !project.archived)
            .map((project) => {
              const active = activeProject === project.id;
              return (
                <div
                  className={cn(
                    navItemClass,
                    "group/project pr-1",
                    active && activeNavItemClass,
                  )}
                  key={project.id}
                >
                  <ProjectMark
                    color={project.color}
                    className="ml-[3px] size-2.5 rounded shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)]"
                  />
                  <button
                    className="min-w-0 overflow-hidden bg-transparent text-left text-ellipsis whitespace-nowrap after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-lg focus-visible:after:outline-3 focus-visible:after:outline-offset-2 focus-visible:after:outline-brand-ring"
                    onClick={() =>
                      closeAfter(() => onProjectChange(project.id))
                    }
                  >
                    {project.name}
                  </button>
                  <div className="relative z-10 flex size-7 items-center justify-center">
                    <ProjectActionsMenu
                      project={project}
                      mobile={mobile}
                      canEdit={canEditProject}
                      canArchive={canArchiveProject}
                      onOpen={() =>
                        closeAfter(() => onProjectChange(project.id))
                      }
                      onEdit={() => closeAfter(() => onEditProject(project))}
                      onArchive={() =>
                        closeAfter(() => onArchiveProject(project))
                      }
                    />
                  </div>
                </div>
              );
            })}
          {projects.some((project) => project.archived) && (
            <NavItem
              className="border border-sidebar-border"
              onClick={() => {
                const archived = projects.find((project) => project.archived);
                if (archived) closeAfter(() => onOpenArchivedProject(archived));
              }}
            >
              <Archive size={16} />
              <span>Архивласан төсөл</span>
              <span className="text-[10px] text-[var(--sidebar-label)]">
                {projects.filter((project) => project.archived).length}
              </span>
            </NavItem>
          )}
        </div>

        <div className="mt-auto pt-6">
          <div className="mb-3 flex flex-col rounded-xl border border-brand/20 bg-brand-subtle p-3.5 dark:border-white/[0.07] dark:bg-none dark:bg-surface-soft">
            <div className="mb-2.5 flex size-[31px] items-center justify-center rounded-lg bg-brand/15 text-brand">
              <Users size={19} />
            </div>
            <strong className="text-xs text-foreground">
              Багаа уриарай
            </strong>
            <span className="my-1 mb-[11px] text-[10px] text-muted-foreground">
              Хамтдаа ажил илүү хурдан урагшилна.
            </span>
            <button className="rounded-[7px] border border-input bg-surface px-2 py-[7px] text-[10px] text-[var(--text-soft)] dark:border-white/[0.08] dark:bg-white/[0.08]">
              Гишүүн урих
            </button>
          </div>
          <NavItem>
            <CircleHelp size={18} />
            <span>Тусламж</span>
          </NavItem>
        </div>
      </div>
    </ScrollArea>
  );
}

export function AppSidebar(props: AppSidebarProps) {
  return (
    <>
      <aside className="sticky top-0 z-40 h-screen border-r border-sidebar-border bg-sidebar text-sidebar-foreground max-tablet:hidden">
        <SidebarContent {...props} />
      </aside>
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="z-50 hidden w-[255px] max-w-[92vw] gap-0 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground shadow-[20px_0_55px_rgba(0,0,0,0.28)] max-tablet:flex"
        >
          <SheetTitle className="sr-only">Үндсэн цэс</SheetTitle>
          <SidebarContent {...props} mobile />
        </SheetContent>
      </Sheet>
    </>
  );
}
