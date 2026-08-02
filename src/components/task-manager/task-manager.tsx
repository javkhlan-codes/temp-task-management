"use client";

import { Check } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PEOPLE } from "@/lib/demo-data";
import { canEditTask, hasPermission } from "@/lib/permissions";
import { RoleSwitcher } from "@/components/workspace/role-switcher";
import { ProjectDialog } from "@/components/organisms/project-dialog";
import { TeamDialog } from "@/components/organisms/team-dialog";
import { LoginScreen } from "@/components/auth/login-screen";
import { NotificationCenter } from "@/components/organisms/notification-center";
import { BrandLogo } from "@/components/atoms/brand-logo";
import { WorkspaceShell } from "@/components/templates/workspace-shell";
import { AppSidebar } from "@/components/organisms/app-sidebar";
import { AppTopbar } from "@/components/organisms/app-topbar";
import { ActivityPanel } from "@/components/organisms/activity-panel";
import { ColumnDialog } from "@/components/organisms/column-dialog";
import { TaskDialog } from "@/components/organisms/task-dialog";
import { WorkspaceView } from "@/features/task-manager/components/workspace-view";
import { useTaskManagerController } from "@/features/task-manager/hooks/use-task-manager-controller";

export function TaskManager() {
  const {
    tasks,
    projects,
    users,
    currentUser,
    workspaces,
    activeWorkspaceId,
    workspaceMenuOpen,
    newWorkspaceName,
    creatingWorkspace,
    sessionReady,
    signedIn,
    mode,
    theme,
    view,
    activeProject,
    query,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    tagFilter,
    dueFilter,
    sidebarOpen,
    activityOpen,
    newTaskOpen,
    editingTask,
    subtaskParent,
    editingColumn,
    teamModalOpen,
    editingProject,
    toast,
    month,
    setWorkspaceMenuOpen,
    setNewWorkspaceName,
    setActiveProject,
    setQuery,
    setSidebarOpen,
    setActivityOpen,
    setEditingTask,
    setView,
    setStatusFilter,
    setPriorityFilter,
    setAssigneeFilter,
    setTagFilter,
    setDueFilter,
    setSubtaskParent,
    setNewTaskOpen,
    setEditingColumn,
    setTeamModalOpen,
    setEditingProject,
    setToast,
    setMonth,
    switchWorkspace,
    createWorkspace,
    saveTask,
    updateTask,
    createSubtask,
    deleteTask,
    saveColumn,
    deleteColumn,
    updateCustomField,
    archiveTask,
    saveWorkspaceUser,
    deactivateWorkspaceUser,
    authenticated,
    logout,
    saveProject,
    deleteProject,
    openNewTask,
    toggleTheme,
    exportTasksCsv,
    visibleTasks,
    availableTags,
    summaryTasks,
    doneCount,
    activeCount,
    overdueCount,
    completion,
    activeProjectRecord,
    projectName,
    projectColumns,
  } = useTaskManagerController();

  if (!sessionReady) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-3 bg-background text-foreground">
        <BrandLogo size="auth" />
        <strong>Pro Team нээж байна…</strong>
      </div>
    );
  }

  if (!signedIn) {
    return (
      <LoginScreen
        users={users}
        theme={theme}
        onToggleTheme={toggleTheme}
        onAuthenticated={authenticated}
      />
    );
  }

  return (
    <WorkspaceShell>
      <AppSidebar
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        workspaceMenuOpen={workspaceMenuOpen}
        onWorkspaceMenuOpenChange={setWorkspaceMenuOpen}
        newWorkspaceName={newWorkspaceName}
        creatingWorkspace={creatingWorkspace}
        onWorkspaceChange={(workspaceId) => void switchWorkspace(workspaceId)}
        onNewWorkspaceNameChange={setNewWorkspaceName}
        onCreateWorkspace={() => void createWorkspace()}
        tasks={tasks}
        projects={projects}
        currentUser={currentUser}
        activeProject={activeProject}
        onProjectChange={setActiveProject}
        onOpenTeam={() => setTeamModalOpen(true)}
        onCreateProject={() => {
          if (hasPermission(currentUser, "createProject")) {
            setEditingProject("new");
          } else {
            setToast("Таны эрх төсөл үүсгэх боломжгүй");
          }
        }}
        onEditProject={(project) => {
          if (hasPermission(currentUser, "editProject")) {
            setEditingProject(project);
          } else {
            setToast("Таны эрх төсөл засах боломжгүй");
          }
        }}
        onArchiveProject={(project) => {
          if (!hasPermission(currentUser, "archiveProject")) {
            setToast("Таны эрх төсөл архивлах боломжгүй");
            return;
          }
          void saveProject(
            {
              name: project.name,
              color: project.color,
              description: project.description,
              ownerId: project.ownerId,
              memberIds: project.memberIds,
              archived: true,
              archivedAt: new Date().toISOString(),
            },
            project.id,
          );
        }}
        onOpenArchivedProject={setEditingProject}
        canEditProject={hasPermission(currentUser, "editProject")}
        canArchiveProject={hasPermission(currentUser, "archiveProject")}
      />

      <main className="min-w-0">
        <AppTopbar
          query={query}
          onQueryChange={(value) => {
            setQuery(value);
            if (value.trim()) setActiveProject("All tasks");
          }}
          mode={mode}
          theme={theme}
          onToggleTheme={toggleTheme}
          activityOpen={activityOpen}
          onToggleActivity={() => setActivityOpen((current) => !current)}
          onOpenSidebar={() => setSidebarOpen(true)}
          notification={
            <NotificationCenter
              currentUser={currentUser}
              mode={mode}
              workspaceId={activeWorkspaceId}
              onOpenTask={(taskId) => {
                const task = tasks.find((item) => item.id === taskId);
                if (task) setEditingTask(task);
              }}
            />
          }
          account={
            <RoleSwitcher
              currentUser={currentUser}
              onManageTeam={() => setTeamModalOpen(true)}
              onLogout={logout}
            />
          }
        />
        <WorkspaceView
          projectName={projectName}
          project={activeProjectRecord}
          users={users}
          projects={projects}
          summaryCount={summaryTasks.length}
          doneCount={doneCount}
          activeCount={activeCount}
          overdueCount={overdueCount}
          completion={completion}
          view={view}
          onViewChange={setView}
          query={query}
          onQueryChange={setQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          assigneeFilter={assigneeFilter}
          onAssigneeFilterChange={setAssigneeFilter}
          dueFilter={dueFilter}
          onDueFilterChange={setDueFilter}
          tagFilter={tagFilter}
          onTagFilterChange={setTagFilter}
          availableTags={availableTags}
          onClearFilters={() => {
            setStatusFilter("All");
            setPriorityFilter("All");
            setAssigneeFilter("All");
            setDueFilter("All");
            setTagFilter("All");
          }}
          onExport={exportTasksCsv}
          onAddColumn={() => {
            if (hasPermission(currentUser, "manageColumns")) {
              setEditingColumn("new");
            } else {
              setToast("Таны эрх багана удирдах боломжгүй");
            }
          }}
          canAddColumn={
            Boolean(activeProjectRecord) &&
            hasPermission(currentUser, "manageColumns")
          }
          visibleTasks={visibleTasks}
          columns={projectColumns}
          onEditTask={setEditingTask}
          onUpdateTask={updateTask}
          onEditColumn={(column) => {
            if (hasPermission(currentUser, "manageColumns")) {
              setEditingColumn(column);
            } else {
              setToast("Таны эрх багана тохируулах боломжгүй");
            }
          }}
          onCellUpdate={updateCustomField}
          onAddTask={openNewTask}
          onAddSubtask={(parent) => {
            setSubtaskParent(parent);
            setNewTaskOpen(true);
          }}
          canAssign={hasPermission(currentUser, "assignTasks")}
          canCreate={hasPermission(currentUser, "createTask")}
          month={month}
          onMonthChange={setMonth}
          onEditProject={() => {
            if (activeProjectRecord) setEditingProject(activeProjectRecord);
          }}
        />
      </main>

      <ActivityPanel
        open={activityOpen}
        onOpenChange={setActivityOpen}
        people={PEOPLE}
      />

      {(newTaskOpen || editingTask) && (
        <TaskDialog
          task={editingTask}
          parentTask={subtaskParent}
          subtasks={
            editingTask
              ? tasks.filter(
                  (task) =>
                    task.parentId === editingTask.id && !task.archived,
                )
              : []
          }
          defaultProject={
            (subtaskParent
              ? projects.find(
                  (project) => project.id === subtaskParent.projectId,
                )
              : activeProjectRecord) ??
            projects.find((project) => !project.archived)
          }
          projects={projects.filter((project) => !project.archived)}
          allTasks={tasks}
          defaultAssignee={currentUser}
          users={users}
          onClose={() => {
            setNewTaskOpen(false);
            setEditingTask(null);
            setSubtaskParent(null);
          }}
          onSave={saveTask}
          onCreateSubtask={createSubtask}
          onUpdateSubtask={updateTask}
          onDelete={
            editingTask && hasPermission(currentUser, "deleteTask")
              ? deleteTask
              : undefined
          }
          onArchive={
            editingTask && hasPermission(currentUser, "archiveTask")
              ? (task) => archiveTask(task, !task.archived)
              : undefined
          }
          readOnly={editingTask ? !canEditTask(currentUser, editingTask) : false}
          canAssign={hasPermission(currentUser, "assignTasks")}
          columns={projectColumns}
          currentUser={currentUser}
          mode={mode}
          workspaceId={activeWorkspaceId}
        />
      )}

      {editingColumn && (
        <ColumnDialog
          column={editingColumn === "new" ? null : editingColumn}
          onClose={() => setEditingColumn(null)}
          onSave={saveColumn}
          onDelete={editingColumn === "new" ? undefined : deleteColumn}
        />
      )}

      {teamModalOpen && (
        <TeamDialog
          currentUser={currentUser}
          users={users}
          onClose={() => setTeamModalOpen(false)}
          onSave={(user, isNew) => {
            void saveWorkspaceUser(user, isNew);
          }}
          onDeactivate={(user) => {
            void deactivateWorkspaceUser(user);
          }}
        />
      )}

      {editingProject && (
        <ProjectDialog
          project={editingProject === "new" ? null : editingProject}
          users={users}
          readOnly={!hasPermission(currentUser, editingProject === "new" ? "createProject" : "editProject")}
          canArchive={hasPermission(currentUser, "archiveProject")}
          canDelete={hasPermission(currentUser, "deleteProject")}
          onClose={() => setEditingProject(null)}
          onSave={(draft, id) => {
            void saveProject(draft, id);
          }}
          onDelete={(project) => {
            void deleteProject(project);
          }}
        />
      )}

      {toast && (
        <Alert
          className="fixed right-6 bottom-6 z-100 flex min-h-11 w-auto items-center gap-2.5 rounded-[10px] border-0 bg-foreground px-4 py-2.5 text-[10px] font-semibold text-background shadow-[var(--shadow-lg)] motion-safe:animate-in motion-safe:slide-in-from-bottom-2 max-mobile:right-3 max-mobile:bottom-3"
          role="status"
        >
          <span className="flex size-5 items-center justify-center rounded-full bg-success text-white">
            <Check size={14} strokeWidth={3} />
          </span>
          <AlertDescription className="text-[10px] font-semibold text-background">
            {toast}
          </AlertDescription>
        </Alert>
      )}
    </WorkspaceShell>
  );
}
