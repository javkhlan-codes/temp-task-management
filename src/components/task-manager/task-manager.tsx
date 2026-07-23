"use client";

import {
  Activity,
  Archive,
  Bell,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CircleHelp,
  Clock3,
  Columns3,
  Command,
  Filter,
  FolderKanban,
  Grid2X2,
  Hash,
  Inbox,
  LayoutList,
  ListChecks,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sun,
  Target,
  Trash2,
  Type,
  Users,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DEMO_COLUMNS,
  DEMO_PROJECTS,
  DEMO_TASKS,
  PEOPLE,
  WORKSPACE_USERS,
} from "@/lib/demo-data";
import { formatDueDate, isOverdue } from "@/lib/format";
import {
  ROLE_LABELS,
  canEditTask,
  hasPermission,
} from "@/lib/permissions";
import {
  CUSTOM_COLUMN_TYPES,
  PRIORITIES,
  STATUSES,
  type CustomColumn,
  type CustomColumnType,
  type CustomFieldValue,
  type Project,
  type Task,
  type TaskDraft,
  type TaskPriority,
  type TaskStatus,
  type ViewMode,
  type WorkspaceUser,
} from "@/lib/types";
import { RoleSwitcher } from "@/components/workspace/role-switcher";
import { TeamManagementModal } from "@/components/workspace/team-management-modal";
import { ProjectModal } from "@/components/workspace/project-modal";

const STORAGE_KEY = "nimbus-tasks-v1";
const COLUMNS_STORAGE_KEY = "nimbus-columns-v1";
const USERS_STORAGE_KEY = "nimbus-users-v1";
const PROJECTS_STORAGE_KEY = "nimbus-projects-v1";
const CURRENT_USER_KEY = "nimbus-current-user";

const statusClass: Record<TaskStatus, string> = {
  "Not started": "status-neutral",
  "Working on it": "status-progress",
  "In review": "status-review",
  Done: "status-done",
};

const priorityClass: Record<TaskPriority, string> = {
  Low: "priority-low",
  Medium: "priority-medium",
  High: "priority-high",
  Critical: "priority-critical",
};

const projectColors: Record<string, string> = {
  "Product launch": "#7c5cff",
  "Website v2": "#21c8a8",
  "Mobile app": "#ffb547",
};

type PersistenceMode = "loading" | "local" | "database";

function Avatar({
  person,
  small = false,
}: {
  person: Task["assignee"];
  small?: boolean;
}) {
  return (
    <span
      className={`avatar avatar-${person.tone}${small ? " avatar-small" : ""}`}
      title={person.name}
    >
      {person.initials}
    </span>
  );
}

function ProjectMark({ name, color }: { name: string; color?: string }) {
  return (
    <span
      className="project-mark"
      style={{ backgroundColor: color ?? projectColors[name] ?? "#7c5cff" }}
    />
  );
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [columns, setColumns] = useState<CustomColumn[]>(DEMO_COLUMNS);
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [users, setUsers] = useState<WorkspaceUser[]>(WORKSPACE_USERS);
  const [currentUser, setCurrentUser] = useState<WorkspaceUser>(
    WORKSPACE_USERS[0],
  );
  const [mode, setMode] = useState<PersistenceMode>("loading");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<ViewMode>("list");
  const [activeProject, setActiveProject] = useState(DEMO_PROJECTS[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | "new" | null>(
    null,
  );
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | "new" | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [month, setMonth] = useState(() => new Date(2026, 6, 1));

  useEffect(() => {
    const savedTheme = localStorage.getItem("nimbus-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const nextTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : prefersDark
          ? "dark"
          : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    const load = async () => {
      const savedActorId = localStorage.getItem(CURRENT_USER_KEY);
      const actorId = savedActorId || WORKSPACE_USERS[0].id;
      const requestOptions: RequestInit = {
        cache: "no-store",
        headers: { "x-workspace-user-id": actorId },
      };
      try {
        const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
          fetch("/api/tasks", requestOptions),
          fetch("/api/projects", requestOptions),
          fetch("/api/users", requestOptions),
        ]);
        if (tasksResponse.ok && projectsResponse.ok && usersResponse.ok) {
          const [tasksPayload, projectsPayload, usersPayload] = (await Promise.all([
            tasksResponse.json(),
            projectsResponse.json(),
            usersResponse.json(),
          ])) as [
            { tasks: Task[] },
            { projects: Project[] },
            { users: WorkspaceUser[] },
          ];
          const loadedUsers = usersPayload.users;
          const loadedProjects = projectsPayload.projects;
          const selectedProject =
            loadedProjects.find((project) => project.id === activeProject) ??
            loadedProjects.find((project) => !project.archived);
          const columnsResponse = selectedProject
            ? await fetch(
                `/api/columns?projectId=${encodeURIComponent(selectedProject.id)}`,
                requestOptions,
              )
            : null;
          const columnsPayload =
            columnsResponse?.ok
              ? ((await columnsResponse.json()) as { columns: CustomColumn[] })
              : { columns: [] };
          setTasks(
            tasksPayload.tasks.map((task) => ({
              ...task,
              customFields: task.customFields ?? {},
            })),
          );
          setProjects(loadedProjects);
          if (selectedProject) setActiveProject(selectedProject.id);
          setColumns(columnsPayload.columns);
          setUsers(loadedUsers);
          setCurrentUser(
            loadedUsers.find((user) => user.id === actorId && user.active) ??
              loadedUsers.find((user) => user.role === "admin" && user.active) ??
              WORKSPACE_USERS[0],
          );
          setMode("database");
          return;
        }
      } catch {
        // The local demo remains available when the API or database is offline.
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setTasks(
            (JSON.parse(saved) as Task[]).map((task) => ({
              ...task,
              customFields: task.customFields ?? {},
            })),
          );
        } catch {
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      const savedColumns = localStorage.getItem(COLUMNS_STORAGE_KEY);
      if (savedColumns) {
        try {
          setColumns(JSON.parse(savedColumns) as CustomColumn[]);
        } catch {
          localStorage.removeItem(COLUMNS_STORAGE_KEY);
        }
      }
      const savedProjects = localStorage.getItem(PROJECTS_STORAGE_KEY);
      if (savedProjects) {
        try {
          const localProjects = JSON.parse(savedProjects) as Project[];
          setProjects(localProjects);
          if (!localProjects.some((project) => project.id === activeProject)) {
            const firstProject = localProjects.find((project) => !project.archived);
            if (firstProject) setActiveProject(firstProject.id);
          }
        } catch {
          localStorage.removeItem(PROJECTS_STORAGE_KEY);
        }
      }
      const savedUsers = localStorage.getItem(USERS_STORAGE_KEY);
      if (savedUsers) {
        try {
          const localUsers = JSON.parse(savedUsers) as WorkspaceUser[];
          setUsers(localUsers);
          setCurrentUser(
            localUsers.find((user) => user.id === actorId && user.active) ??
              localUsers[0] ??
              WORKSPACE_USERS[0],
          );
        } catch {
          localStorage.removeItem(USERS_STORAGE_KEY);
        }
      }
      setMode("local");
    };

    void load();
  }, []);

  useEffect(() => {
    if (mode === "local") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
      localStorage.setItem(COLUMNS_STORAGE_KEY, JSON.stringify(columns));
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
      localStorage.setItem(PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    }
  }, [columns, mode, projects, tasks, users]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (mode !== "database") return;
    const project = projects.find((item) => item.id === activeProject);
    if (!project) return;
    const loadColumns = async () => {
      const response = await fetch(
        `/api/columns?projectId=${encodeURIComponent(project.id)}`,
        {
          cache: "no-store",
          headers: { "x-workspace-user-id": currentUser.id },
        },
      );
      if (!response.ok) return;
      const payload = (await response.json()) as { columns: CustomColumn[] };
      setColumns((items) => [
        ...items.filter((column) => column.projectId !== project.id),
        ...payload.columns,
      ]);
    };
    void loadColumns();
  }, [activeProject, currentUser.id, mode, projects]);

  const syncTask = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", task: Task) => {
      if (mode !== "database") return;
      try {
        const endpoint = method === "POST" ? "/api/tasks" : `/api/tasks/${task.id}`;
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-workspace-user-id": currentUser.id,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(task),
        });
        if (!response.ok) throw new Error("Sync failed");
      } catch {
        setMode("local");
        setToast("Database unavailable — changes saved on this device");
      }
    },
    [currentUser.id, mode],
  );

  const syncColumn = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", column: CustomColumn) => {
      if (mode !== "database") return;
      try {
        const endpoint =
          method === "POST" ? "/api/columns" : `/api/columns/${column.id}`;
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-workspace-user-id": currentUser.id,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(column),
        });
        if (!response.ok) throw new Error("Column sync failed");
      } catch {
        setMode("local");
        setToast("Database unavailable — column saved on this device");
      }
    },
    [currentUser.id, mode],
  );

  const syncUser = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", user: WorkspaceUser) => {
      if (mode !== "database") return true;
      try {
        const endpoint = method === "POST" ? "/api/users" : `/api/users/${user.id}`;
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-workspace-user-id": currentUser.id,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(user),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "User sync failed");
        return true;
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Unable to update user");
        return false;
      }
    },
    [currentUser.id, mode],
  );

  const syncProject = useCallback(
    async (method: "POST" | "PATCH" | "DELETE", project: Project) => {
      if (mode !== "database") return true;
      try {
        const endpoint =
          method === "POST" ? "/api/projects" : `/api/projects/${project.id}`;
        const response = await fetch(endpoint, {
          method,
          headers: {
            "Content-Type": "application/json",
            "x-workspace-user-id": currentUser.id,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(project),
        });
        const payload = (await response.json()) as {
          project?: Project;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Project sync failed");
        return payload.project ?? true;
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Unable to update project");
        return false;
      }
    },
    [currentUser.id, mode],
  );

  const saveTask = (draft: TaskDraft, id?: string) => {
    if (id) {
      const existingTask = tasks.find((task) => task.id === id);
      if (!existingTask || !canEditTask(currentUser, existingTask)) {
        setToast("Your role cannot edit this task");
        return;
      }
      const updated: Task = {
        ...draft,
        id,
        archived: existingTask.archived ?? false,
        archivedAt: existingTask.archivedAt ?? null,
        createdAt: existingTask.createdAt,
      };
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
      void syncTask("PATCH", updated);
      setToast("Task updated");
    } else {
      if (!hasPermission(currentUser, "createTask")) {
        setToast(`${ROLE_LABELS[currentUser.role]} is a read-only role`);
        return;
      }
      const effectiveDraft = hasPermission(currentUser, "assignTasks")
        ? draft
        : { ...draft, assignee: currentUser };
      const task: Task = {
        ...effectiveDraft,
        id: crypto.randomUUID(),
        archived: false,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      };
      setTasks((current) => [task, ...current]);
      void syncTask("POST", task);
      setToast("New task created");
    }
    setNewTaskOpen(false);
    setEditingTask(null);
  };

  const updateTask = (id: string, changes: Partial<Task>) => {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return;
    if (!canEditTask(currentUser, existing)) {
      setToast("You can only edit tasks assigned to you");
      return;
    }
    const updated = { ...existing, ...changes };
    setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
    void syncTask("PATCH", updated);
  };

  const deleteTask = (task: Task) => {
    if (!hasPermission(currentUser, "deleteTask")) {
      setToast("Only an admin can permanently delete tasks");
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
    void syncTask("DELETE", task);
    setEditingTask(null);
    setToast("Task deleted");
  };

  const saveColumn = (
    draft: Pick<CustomColumn, "name" | "type" | "options">,
    id?: string,
  ) => {
    if (!hasPermission(currentUser, "manageColumns")) {
      setToast("Your role cannot manage columns");
      return;
    }
    if (id) {
      const current = columns.find((column) => column.id === id);
      if (!current) return;
      const updated = { ...current, ...draft };
      setColumns((items) =>
        items.map((column) => (column.id === id ? updated : column)),
      );
      void syncColumn("PATCH", updated);
      setToast("Column updated");
    } else {
      const project = projects.find((item) => item.id === activeProject);
      if (!project) {
        setToast("Open a project before adding a column");
        return;
      }
      const column: CustomColumn = {
        ...draft,
        id: crypto.randomUUID(),
        projectId: project.id,
        position: columns.filter((item) => item.projectId === project.id).length,
        createdAt: new Date().toISOString(),
      };
      setColumns((items) => [...items, column]);
      void syncColumn("POST", column);
      setToast("Column added");
    }
    setEditingColumn(null);
  };

  const deleteColumn = (column: CustomColumn) => {
    if (!hasPermission(currentUser, "manageColumns")) {
      setToast("Your role cannot remove columns");
      return;
    }
    setColumns((items) => items.filter((item) => item.id !== column.id));
    setTasks((items) =>
      items.map((task) => {
        const customFields = { ...task.customFields };
        delete customFields[column.id];
        return { ...task, customFields };
      }),
    );
    void syncColumn("DELETE", column);
    setEditingColumn(null);
    setToast("Column removed");
  };

  const updateCustomField = (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => {
    const task = tasks.find((item) => item.id === taskId);
    if (!task) return;
    updateTask(taskId, {
      customFields: { ...task.customFields, [columnId]: value },
    });
  };

  const archiveTask = (task: Task, archived: boolean) => {
    if (!hasPermission(currentUser, "archiveTask")) {
      setToast("Your role cannot archive or restore tasks");
      return;
    }
    const updated: Task = {
      ...task,
      archived,
      archivedAt: archived ? new Date().toISOString() : null,
    };
    setTasks((items) => items.map((item) => (item.id === task.id ? updated : item)));
    void syncTask("PATCH", updated);
    setEditingTask(null);
    setToast(archived ? "Task archived" : "Task restored");
  };

  const saveWorkspaceUser = async (user: WorkspaceUser, isNew: boolean) => {
    if (!hasPermission(currentUser, "manageUsers")) {
      setToast("Only an admin can manage workspace access");
      return;
    }
    const success = await syncUser(isNew ? "POST" : "PATCH", user);
    if (!success) return;
    setUsers((items) =>
      isNew
        ? [...items, user]
        : items.map((item) => (item.id === user.id ? user : item)),
    );
    setToast(isNew ? "Team member added" : "Member role updated");
  };

  const deactivateWorkspaceUser = async (user: WorkspaceUser) => {
    if (!hasPermission(currentUser, "manageUsers")) {
      setToast("Only an admin can manage workspace access");
      return;
    }
    const success = await syncUser("DELETE", user);
    if (!success) return;
    setUsers((items) =>
      items.map((item) => (item.id === user.id ? { ...item, active: false } : item)),
    );
    setToast("Team member deactivated");
  };

  const switchCurrentUser = (user: WorkspaceUser) => {
    setCurrentUser(user);
    localStorage.setItem(CURRENT_USER_KEY, user.id);
    setToast(`Switched to ${ROLE_LABELS[user.role]} view`);
  };

  const saveProject = async (
    draft: Omit<
      Project,
      "id" | "workspaceId" | "taskCount" | "createdAt" | "updatedAt"
    >,
    id?: string,
  ) => {
    const existing = id ? projects.find((project) => project.id === id) : null;
    const requiredPermission = existing ? "editProject" : "createProject";
    if (!hasPermission(currentUser, requiredPermission)) {
      setToast("Your role cannot manage projects");
      return;
    }
    const now = new Date().toISOString();
    const project: Project = existing
      ? { ...existing, ...draft, updatedAt: now }
      : {
          ...draft,
          id: crypto.randomUUID(),
          workspaceId: "workspace-acme",
          taskCount: 0,
          createdAt: now,
          updatedAt: now,
        };
    const result = await syncProject(existing ? "PATCH" : "POST", project);
    if (!result) return;
    const saved = typeof result === "object" ? result : project;
    setProjects((items) =>
      existing
        ? items.map((item) => (item.id === saved.id ? saved : item))
        : [...items, saved],
    );
    setActiveProject(
      saved.archived
        ? projects.find((item) => item.id !== saved.id && !item.archived)?.id ??
            "All tasks"
        : saved.id,
    );
    setEditingProject(null);
    setToast(existing ? "Project updated" : "Project created");
  };

  const deleteProject = async (project: Project) => {
    if (!hasPermission(currentUser, "deleteProject")) {
      setToast("Only an admin can permanently delete projects");
      return;
    }
    const success = await syncProject("DELETE", project);
    if (!success) return;
    setProjects((items) => items.filter((item) => item.id !== project.id));
    setActiveProject(
      projects.find((item) => item.id !== project.id && !item.archived)?.id ??
        "all",
    );
    setEditingProject(null);
    setToast("Project deleted");
  };

  const openNewTask = () => {
    if (!hasPermission(currentUser, "createTask")) {
      setToast(`${ROLE_LABELS[currentUser.role]} has read-only access`);
      return;
    }
    setNewTaskOpen(true);
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("nimbus-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const projectTasks = useMemo(
    () => {
      if (activeProject === "Archive") {
        return tasks.filter((task) => task.archived);
      }
      const activeTasks = tasks.filter((task) => !task.archived);
      if (activeProject === "My work") {
        return activeTasks.filter((task) => task.assignee.id === currentUser.id);
      }
      return activeProject === "All tasks"
        ? activeTasks
        : activeTasks.filter((task) => task.projectId === activeProject);
    },
    [activeProject, currentUser.id, tasks],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return projectTasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        [task.title, task.project, task.assignee.name, ...task.tags]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      return matchesQuery && matchesStatus && matchesPriority;
    });
  }, [priorityFilter, projectTasks, query, statusFilter]);

  const doneCount = projectTasks.filter((task) => task.status === "Done").length;
  const activeCount = projectTasks.filter((task) => task.status === "Working on it").length;
  const overdueCount = projectTasks.filter((task) =>
    isOverdue(task.dueDate, task.status),
  ).length;
  const completion = projectTasks.length
    ? Math.round((doneCount / projectTasks.length) * 100)
    : 0;

  const activeProjectRecord = projects.find(
    (project) => project.id === activeProject,
  );
  const projectName =
    activeProject === "All tasks" ||
    activeProject === "My work" ||
    activeProject === "Archive"
      ? activeProject
      : activeProjectRecord?.name ?? "Projects";
  const projectColumns = activeProjectRecord
    ? columns
        .filter((column) => column.projectId === activeProjectRecord.id)
        .sort((a, b) => a.position - b.position)
    : [];

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-icon">
            <Sparkles size={18} strokeWidth={2.5} />
          </div>
          <span className="brand-name">nimbus</span>
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={19} />
          </button>
        </div>

        <button className="workspace-switcher">
          <span className="workspace-logo">AC</span>
          <span>
            <strong>Acme Studio</strong>
            <small>Free workspace</small>
          </span>
          <ChevronsUpDown size={16} />
        </button>

        <nav className="main-nav" aria-label="Main navigation">
          <button
            className={`nav-item ${activeProject === "My work" ? "active" : ""}`}
            onClick={() => {
              setActiveProject("My work");
              setSidebarOpen(false);
            }}
          >
            <Inbox size={18} />
            <span>My work</span>
            <span className="nav-count">
              {
                tasks.filter(
                  (task) => !task.archived && task.assignee.id === currentUser.id,
                ).length
              }
            </span>
          </button>
          <button className="nav-item">
            <Bell size={18} />
            <span>Inbox</span>
            <span className="nav-dot" />
          </button>
          <button className="nav-item">
            <MessageSquareText size={18} />
            <span>Messages</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>Workspace</span>
            <button aria-label="Add workspace item">
              <Plus size={15} />
            </button>
          </div>
          <button
            className={`nav-item ${activeProject === "All tasks" ? "active" : ""}`}
            onClick={() => {
              setActiveProject("All tasks");
              setSidebarOpen(false);
            }}
          >
            <Grid2X2 size={18} />
            <span>All tasks</span>
            <span className="nav-count">
              {tasks.filter((task) => !task.archived).length}
            </span>
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setTeamModalOpen(true);
              setSidebarOpen(false);
            }}
          >
            <Users size={18} />
            <span>Team directory</span>
          </button>
          <button
            className={`nav-item ${activeProject === "Archive" ? "active" : ""}`}
            onClick={() => {
              setActiveProject("Archive");
              setSidebarOpen(false);
            }}
          >
            <Archive size={18} />
            <span>Archive</span>
            <span className="nav-count">
              {tasks.filter((task) => task.archived).length}
            </span>
          </button>
        </div>

        <div className="sidebar-section projects-section">
          <div className="section-label">
            <span>Projects</span>
            <button
              aria-label="Create project"
              onClick={() => {
                if (hasPermission(currentUser, "createProject")) {
                  setEditingProject("new");
                } else {
                  setToast("Your role cannot create projects");
                }
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          {projects.filter((project) => !project.archived).map((project) => {
            const count = tasks.filter(
              (task) => task.projectId === project.id && !task.archived,
            ).length;
            return (
              <button
                className={`nav-item ${activeProject === project.id ? "active" : ""}`}
                key={project.id}
                onClick={() => {
                  setActiveProject(project.id);
                  setSidebarOpen(false);
                }}
              >
                <ProjectMark name={project.name} color={project.color} />
                <span>{project.name}</span>
                <span className="nav-count">{count}</span>
              </button>
            );
          })}
          {projects.some((project) => project.archived) && (
            <button
              className="nav-item archived-project-link"
              onClick={() => {
                const archived = projects.find((project) => project.archived);
                if (archived) setEditingProject(archived);
              }}
            >
              <Archive size={16} />
              <span>Archived projects</span>
              <span className="nav-count">
                {projects.filter((project) => project.archived).length}
              </span>
            </button>
          )}
        </div>

        <div className="sidebar-bottom">
          <div className="invite-card">
            <div className="invite-art">
              <Users size={19} />
            </div>
            <strong>Bring your team</strong>
            <span>Work moves faster together.</span>
            <button>Invite teammates</button>
          </div>
          <button className="nav-item">
            <CircleHelp size={18} />
            <span>Help & support</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu size={21} />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search tasks, people, or projects..."
              aria-label="Search"
            />
            <kbd>
              <Command size={11} /> K
            </kbd>
          </div>
          <div className="topbar-actions">
            <span className={`sync-indicator ${mode}`}>
              <span />
              {mode === "database"
                ? "Neon connected"
                : mode === "local"
                  ? "Demo mode"
                  : "Connecting"}
            </span>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className={`icon-button ${activityOpen ? "button-active" : ""}`}
              onClick={() => setActivityOpen((current) => !current)}
              aria-label="Toggle activity panel"
            >
              <Activity size={19} />
            </button>
            <button className="icon-button notification-button" aria-label="Notifications">
              <Bell size={19} />
              <span />
            </button>
            <RoleSwitcher
              currentUser={currentUser}
              users={users}
              onChange={switchCurrentUser}
              onManageTeam={() => setTeamModalOpen(true)}
            />
          </div>
        </header>

        <div className="workspace-content">
          <section className="workspace-header">
            <div className="eyebrow">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <span>Projects</span>
            </div>
            <div className="title-row">
              <div>
                <div className="project-title">
                  <ProjectMark
                    name={projectName}
                    color={activeProjectRecord?.color}
                  />
                  <h1>{projectName}</h1>
                  <button className="title-menu" aria-label="Project menu">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <p>
                  {activeProjectRecord?.description ||
                    "Plan, track, and ship meaningful work together."}
                </p>
              </div>
              <div className="title-actions">
                <div className="member-stack" aria-label="Project members">
                  {users
                    .filter(
                      (user) =>
                        user.active &&
                        user.id !== "unassigned" &&
                        (!activeProjectRecord ||
                          activeProjectRecord.memberIds.includes(user.id)),
                    )
                    .slice(0, 4)
                    .map((person) => (
                    <Avatar person={person} small key={person.name} />
                    ))}
                  <button className="add-member" aria-label="Add member">
                    <Plus size={15} />
                  </button>
                </div>
                <button
                  className="secondary-button"
                  onClick={() => {
                    if (activeProjectRecord) setEditingProject(activeProjectRecord);
                  }}
                  disabled={!activeProjectRecord}
                >
                  <Settings size={16} />
                  <span>Customize</span>
                </button>
                <button
                  className="primary-button"
                  onClick={openNewTask}
                  disabled={!hasPermission(currentUser, "createTask")}
                >
                  <Plus size={18} />
                  New task
                </button>
              </div>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Project summary">
            <MetricCard
              icon={<CheckCircle2 size={18} />}
              label="Completion"
              value={`${completion}%`}
              detail={`${doneCount} of ${projectTasks.length} tasks`}
              tone="violet"
              progress={completion}
            />
            <MetricCard
              icon={<Target size={18} />}
              label="In progress"
              value={String(activeCount)}
              detail="Tasks moving forward"
              tone="blue"
            />
            <MetricCard
              icon={<Clock3 size={18} />}
              label="Overdue"
              value={String(overdueCount)}
              detail={overdueCount ? "Needs your attention" : "Everything is on track"}
              tone="orange"
            />
          </section>

          <section className="work-panel">
            <div className="view-tabs">
              <button
                className={view === "list" ? "active" : ""}
                onClick={() => setView("list")}
              >
                <LayoutList size={17} />
                List
              </button>
              <button
                className={view === "board" ? "active" : ""}
                onClick={() => setView("board")}
              >
                <Columns3 size={17} />
                Board
              </button>
              <button
                className={view === "calendar" ? "active" : ""}
                onClick={() => setView("calendar")}
              >
                <CalendarDays size={17} />
                Calendar
              </button>
            </div>

            <div className="toolbar">
              <div className="toolbar-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search this project"
                  aria-label="Search this project"
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>
              <label className="filter-control">
                <Filter size={15} />
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as TaskStatus | "All")
                  }
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  {STATUSES.map((status) => (
                    <option key={status}>{status}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <label className="filter-control priority-filter">
                <select
                  value={priorityFilter}
                  onChange={(event) =>
                    setPriorityFilter(event.target.value as TaskPriority | "All")
                  }
                  aria-label="Filter by priority"
                >
                  <option value="All">All priorities</option>
                  {PRIORITIES.map((priority) => (
                    <option key={priority}>{priority}</option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <button
                className="add-column-button"
                onClick={() => {
                  if (hasPermission(currentUser, "manageColumns")) {
                    setEditingColumn("new");
                  } else {
                    setToast("Your role cannot manage columns");
                  }
                }}
                disabled={
                  !activeProjectRecord ||
                  !hasPermission(currentUser, "manageColumns")
                }
              >
                <Plus size={15} />
                <span>Add column</span>
              </button>
              <span className="result-count">
                {visibleTasks.length} {visibleTasks.length === 1 ? "task" : "tasks"}
              </span>
            </div>

            <div className="view-content">
              {view === "list" && (
                <ListView
                  tasks={visibleTasks}
                  users={users}
                  onEdit={setEditingTask}
                  onUpdate={updateTask}
                  columns={projectColumns}
                  onEditColumn={(column) => {
                    if (hasPermission(currentUser, "manageColumns")) {
                      setEditingColumn(column);
                    } else {
                      setToast("Your role cannot configure columns");
                    }
                  }}
                  onCellUpdate={updateCustomField}
                  onAdd={openNewTask}
                />
              )}
              {view === "board" && (
                <BoardView
                  tasks={visibleTasks}
                  onEdit={setEditingTask}
                  onUpdate={updateTask}
                  onAdd={openNewTask}
                />
              )}
              {view === "calendar" && (
                <CalendarView
                  tasks={visibleTasks}
                  month={month}
                  onMonthChange={setMonth}
                  onEdit={setEditingTask}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      <aside className={`activity-panel ${activityOpen ? "activity-open" : ""}`}>
        <div className="activity-header">
          <div>
            <span className="panel-kicker">Live updates</span>
            <h2>Activity</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setActivityOpen(false)}
            aria-label="Close activity panel"
          >
            <X size={18} />
          </button>
        </div>
        <div className="activity-list">
          <ActivityItem
            person={PEOPLE[2]}
            text={
              <>
                moved <strong>Finalize visual design system</strong> to In review
              </>
            }
            time="12 minutes ago"
            tone="review"
          />
          <ActivityItem
            person={PEOPLE[1]}
            text={
              <>
                completed <strong>QA responsive navigation</strong>
              </>
            }
            time="2 hours ago"
            tone="done"
          />
          <ActivityItem
            person={PEOPLE[0]}
            text={
              <>
                added a note to <strong>Research customer onboarding flow</strong>
              </>
            }
            time="Yesterday"
            tone="progress"
          />
          <div className="activity-date">Wednesday, July 22</div>
          <ActivityItem
            person={PEOPLE[3]}
            text={
              <>
                created <strong>Set up product event tracking</strong>
              </>
            }
            time="Yesterday"
            tone="neutral"
          />
        </div>
        <div className="activity-compose">
          <Avatar person={PEOPLE[0]} small />
          <button>Write an update...</button>
        </div>
      </aside>

      {(newTaskOpen || editingTask) && (
        <TaskModal
          task={editingTask}
          defaultProject={activeProjectRecord ?? projects.find((project) => !project.archived)}
          projects={projects.filter((project) => !project.archived)}
          defaultAssignee={currentUser}
          users={users}
          onClose={() => {
            setNewTaskOpen(false);
            setEditingTask(null);
          }}
          onSave={saveTask}
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
        />
      )}

      {editingColumn && (
        <ColumnModal
          column={editingColumn === "new" ? null : editingColumn}
          onClose={() => setEditingColumn(null)}
          onSave={saveColumn}
          onDelete={editingColumn === "new" ? undefined : deleteColumn}
        />
      )}

      {teamModalOpen && (
        <TeamManagementModal
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
        <ProjectModal
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
        <div className="toast" role="status">
          <span>
            <Check size={14} strokeWidth={3} />
          </span>
          {toast}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
  progress,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  tone: "violet" | "blue" | "orange";
  progress?: number;
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}>{icon}</div>
      <div className="metric-copy">
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {progress !== undefined && (
        <div className="metric-progress">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
      <div className={`metric-glow glow-${tone}`} />
    </article>
  );
}

function ListView({
  tasks,
  users,
  columns,
  onEdit,
  onUpdate,
  onEditColumn,
  onCellUpdate,
  onAdd,
}: {
  tasks: Task[];
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onEditColumn: (column: CustomColumn) => void;
  onCellUpdate: (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => void;
  onAdd: () => void;
}) {
  const groups = ["This week", "Upcoming", "Completed"];
  const usedGroups = groups.filter((group) => tasks.some((task) => task.group === group));
  const gridStyle = {
    "--task-grid": `27px minmax(240px, 1.6fr) minmax(130px, .8fr) 128px 100px 91px ${columns
      .map(() => "130px")
      .join(" ")} 25px`,
  } as React.CSSProperties;
  const tableStyle = {
    minWidth: `${790 + columns.length * 130}px`,
  };

  if (!tasks.length) return <EmptyState onAdd={onAdd} />;

  return (
    <div className="list-view">
      <div className="list-table" style={tableStyle}>
        <div className="task-table-header" style={gridStyle}>
          <span className="col-check" />
          <span>Task</span>
          <span>Owner</span>
          <span>Status</span>
          <span>Priority</span>
          <span>Due date</span>
          {columns.map((column) => (
            <button
              className="custom-column-header"
              onClick={() => onEditColumn(column)}
              key={column.id}
              title={`Edit ${column.name}`}
            >
              <ColumnTypeIcon type={column.type} />
              <span>{column.name}</span>
              <MoreHorizontal size={13} />
            </button>
          ))}
          <span className="col-menu" />
        </div>
        {usedGroups.map((group) => {
          const groupTasks = tasks.filter((task) => task.group === group);
          return (
            <div className="task-group" key={group}>
              <div className="group-header">
                <ChevronDown size={16} />
                <span
                  className={`group-accent group-${group.toLowerCase().replace(" ", "-")}`}
                />
                <strong>{group}</strong>
                <span>{groupTasks.length}</span>
              </div>
              {groupTasks.map((task) => (
                <TaskRow
                  task={task}
                  users={users}
                  columns={columns}
                  key={task.id}
                  onEdit={onEdit}
                  onUpdate={onUpdate}
                  onCellUpdate={onCellUpdate}
                  gridStyle={gridStyle}
                />
              ))}
              <button className="add-row" onClick={onAdd}>
                <span>
                  <Plus size={14} />
                </span>
                Add task
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  users,
  columns,
  onEdit,
  onUpdate,
  onCellUpdate,
  gridStyle,
}: {
  task: Task;
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onCellUpdate: (
    taskId: string,
    columnId: string,
    value: CustomFieldValue,
  ) => void;
  gridStyle: React.CSSProperties;
}) {
  const toggleDone = () =>
    onUpdate(task.id, {
      status: task.status === "Done" ? "Not started" : "Done",
      progress: task.status === "Done" ? 0 : 100,
    });

  return (
    <div className="task-row" style={gridStyle}>
      <button
        className={`task-check ${task.status === "Done" ? "checked" : ""}`}
        onClick={toggleDone}
        aria-label={task.status === "Done" ? "Mark incomplete" : "Mark complete"}
      >
        {task.status === "Done" && <Check size={13} strokeWidth={3} />}
      </button>
      <button className="task-name-cell" onClick={() => onEdit(task)}>
        <span className={task.status === "Done" ? "completed-title" : ""}>
          {task.title}
        </span>
        <small>{task.tags.join(" · ")}</small>
      </button>
      <div className="owner-cell">
        <Avatar person={task.assignee} small />
        <span>{task.assignee.name}</span>
      </div>
      <label className={`status-select ${statusClass[task.status]}`}>
        <span />
        <select
          value={task.status}
          onChange={(event) => {
            const status = event.target.value as TaskStatus;
            onUpdate(task.id, {
              status,
              progress: status === "Done" ? 100 : task.progress,
            });
          }}
          aria-label={`Status for ${task.title}`}
        >
          {STATUSES.map((status) => (
            <option key={status}>{status}</option>
          ))}
        </select>
        <ChevronDown size={12} />
      </label>
      <label className={`priority-select ${priorityClass[task.priority]}`}>
        <span />
        <select
          value={task.priority}
          onChange={(event) =>
            onUpdate(task.id, { priority: event.target.value as TaskPriority })
          }
          aria-label={`Priority for ${task.title}`}
        >
          {PRIORITIES.map((priority) => (
            <option key={priority}>{priority}</option>
          ))}
        </select>
      </label>
      <span
        className={`due-cell ${isOverdue(task.dueDate, task.status) ? "overdue" : ""}`}
      >
        <CalendarDays size={14} />
        {formatDueDate(task.dueDate)}
      </span>
      {columns.map((column) => (
        <CustomCell
          column={column}
          users={users}
          value={task.customFields?.[column.id] ?? null}
          onChange={(value) => onCellUpdate(task.id, column.id, value)}
          key={column.id}
        />
      ))}
      <button
        className="row-menu"
        onClick={() => onEdit(task)}
        aria-label={`Open ${task.title}`}
      >
        <MoreHorizontal size={17} />
      </button>
    </div>
  );
}

function ColumnTypeIcon({ type }: { type: CustomColumnType }) {
  if (type === "text") return <Type size={12} />;
  if (type === "number") return <Hash size={12} />;
  if (type === "date") return <CalendarDays size={12} />;
  if (type === "person") return <Users size={12} />;
  if (type === "checkbox") return <CheckCircle2 size={12} />;
  if (type === "progress") return <Target size={12} />;
  return <ListChecks size={12} />;
}

function CustomCell({
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
        placeholder="Add text"
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
      <div className="custom-cell">
        <input
          className="custom-date-input"
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
      <div className="custom-cell custom-checkbox-cell">
        <button
          className={`custom-checkbox ${value === true ? "checked" : ""}`}
          onClick={() => onChange(value !== true)}
          aria-label={`${column.name}: ${value === true ? "checked" : "unchecked"}`}
        >
          {value === true && <Check size={12} strokeWidth={3} />}
        </button>
      </div>
    );
  }

  if (column.type === "progress") {
    const progressValue = typeof value === "number" ? value : 0;
    return (
      <div className="custom-cell custom-progress-cell">
        <div className="mini-progress">
          <span style={{ width: `${progressValue}%` }} />
        </div>
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={progressValue}
          onChange={(event) => onChange(Number(event.target.value))}
          aria-label={column.name}
        />
        <small>{progressValue}%</small>
      </div>
    );
  }

  if (column.type === "person") {
    return (
      <div className="custom-cell">
        <select
          className="custom-cell-select"
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value || null)}
          aria-label={column.name}
        >
          <option value="">Unassigned</option>
          {users
            .filter((person) => person.active && person.id !== "unassigned")
            .map((person) => (
              <option value={person.name} key={person.name}>
                {person.name}
              </option>
            ))}
        </select>
      </div>
    );
  }

  if (column.type === "tags") {
    return (
      <InlineCellInput
        value={Array.isArray(value) ? value.join(", ") : ""}
        placeholder="Add tags"
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
  return (
    <div className="custom-cell">
      <select
        className="custom-cell-select custom-dropdown-select"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
        aria-label={column.name}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
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
    <div className="custom-cell">
      <input
        className="custom-cell-input"
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

function BoardView({
  tasks,
  onEdit,
  onUpdate,
  onAdd,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onUpdate: (id: string, changes: Partial<Task>) => void;
  onAdd: () => void;
}) {
  const [draggingId, setDraggingId] = useState<string | null>(null);

  return (
    <div className="board-view">
      {STATUSES.map((status) => {
        const columnTasks = tasks.filter((task) => task.status === status);
        return (
          <section
            className={`board-column board-${status.toLowerCase().replaceAll(" ", "-")}`}
            key={status}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              if (draggingId) {
                onUpdate(
                  draggingId,
                  status === "Done" ? { status, progress: 100 } : { status },
                );
              }
              setDraggingId(null);
            }}
          >
            <div className="board-column-header">
              <span className={statusClass[status]} />
              <strong>{status}</strong>
              <small>{columnTasks.length}</small>
              <button onClick={onAdd} aria-label={`Add task to ${status}`}>
                <Plus size={16} />
              </button>
            </div>
            <div className="board-cards">
              {columnTasks.map((task) => (
                <article
                  className={`board-card ${draggingId === task.id ? "dragging" : ""}`}
                  draggable
                  key={task.id}
                  onDragStart={() => setDraggingId(task.id)}
                  onDragEnd={() => setDraggingId(null)}
                  onClick={() => onEdit(task)}
                >
                  <div className="board-card-top">
                    <span className={`priority-pill ${priorityClass[task.priority]}`}>
                      {task.priority}
                    </span>
                    <MoreHorizontal size={17} />
                  </div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                  <div className="tag-list">
                    {task.tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${task.progress}%` }} />
                  </div>
                  <div className="board-card-footer">
                    <Avatar person={task.assignee} small />
                    <span
                      className={isOverdue(task.dueDate, task.status) ? "overdue" : ""}
                    >
                      <CalendarDays size={14} />
                      {formatDueDate(task.dueDate)}
                    </span>
                  </div>
                </article>
              ))}
              {!columnTasks.length && (
                <div className="empty-column">
                  <span>Drop a task here</span>
                </div>
              )}
              <button className="board-add-card" onClick={onAdd}>
                <Plus size={15} />
                Add task
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}

function CalendarView({
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

  const monthLabel = new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
  }).format(month);
  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="calendar-view">
      <div className="calendar-toolbar">
        <div>
          <button
            className="icon-button"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
            aria-label="Previous month"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
            aria-label="Next month"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h3>{monthLabel}</h3>
        <button
          className="secondary-button calendar-today"
          onClick={() => onMonthChange(new Date())}
        >
          Today
        </button>
      </div>
      <div className="calendar-grid">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div className="calendar-weekday" key={day}>
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
          return (
            <div
              className={`calendar-day ${muted ? "muted" : ""} ${
                dateKey === todayKey ? "today" : ""
              }`}
              key={dateKey}
            >
              <span className="day-number">{date.getDate()}</span>
              <div className="calendar-events">
                {dayTasks.slice(0, 3).map((task) => (
                  <button
                    className={`calendar-event ${statusClass[task.status]}`}
                    key={task.id}
                    onClick={() => onEdit(task)}
                    title={task.title}
                  >
                    <span />
                    {task.title}
                  </button>
                ))}
                {dayTasks.length > 3 && <small>+{dayTasks.length - 3} more</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div>
        <FolderKanban size={28} />
      </div>
      <h3>No tasks found</h3>
      <p>Try changing the filters or add a new task to this project.</p>
      <button className="primary-button" onClick={onAdd}>
        <Plus size={17} />
        New task
      </button>
    </div>
  );
}

function ActivityItem({
  person,
  text,
  time,
  tone,
}: {
  person: Task["assignee"];
  text: React.ReactNode;
  time: string;
  tone: "review" | "done" | "progress" | "neutral";
}) {
  return (
    <div className="activity-item">
      <Avatar person={person} small />
      <div>
        <p>
          <strong>{person.name}</strong> {text}
        </p>
        <span>{time}</span>
      </div>
      <i className={`activity-tone tone-${tone}`} />
    </div>
  );
}

function ColumnModal({
  column,
  onClose,
  onSave,
  onDelete,
}: {
  column: CustomColumn | null;
  onClose: () => void;
  onSave: (
    draft: Pick<CustomColumn, "name" | "type" | "options">,
    id?: string,
  ) => void;
  onDelete?: (column: CustomColumn) => void;
}) {
  const [name, setName] = useState(column?.name ?? "");
  const [type, setType] = useState<CustomColumnType>(column?.type ?? "text");
  const [options, setOptions] = useState(column?.options.join(", ") ?? "");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const usesOptions = type === "dropdown" || type === "status";
  const typeLabels: Record<CustomColumnType, string> = {
    text: "Text",
    number: "Number",
    date: "Date",
    status: "Status",
    person: "Person",
    dropdown: "Dropdown",
    checkbox: "Checkbox",
    progress: "Progress",
    tags: "Tags",
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="task-modal column-modal"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onSave(
            {
              name: name.trim(),
              type,
              options: usesOptions
                ? options
                    .split(",")
                    .map((option) => option.trim())
                    .filter(Boolean)
                : [],
            },
            column?.id,
          );
        }}
      >
        <div className="modal-header">
          <div>
            <span className="panel-kicker">
              {column ? "Configure column" : "Custom field"}
            </span>
            <h2>{column ? "Edit column" : "Add a column"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="column-modal-content">
          <label className="form-field">
            <span>Column name</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Effort, Client, Sprint"
              autoFocus
              required
            />
          </label>
          <div className="form-field">
            <span>Column type</span>
            <div className="column-types-grid">
              {CUSTOM_COLUMN_TYPES.map((columnType) => (
                <button
                  type="button"
                  className={type === columnType ? "selected" : ""}
                  onClick={() => {
                    setType(columnType);
                    if (
                      columnType === "status" &&
                      !options.trim()
                    ) {
                      setOptions("Not started, Working on it, In review, Done");
                    }
                  }}
                  key={columnType}
                >
                  <ColumnTypeIcon type={columnType} />
                  {typeLabels[columnType]}
                  {type === columnType && <Check size={13} />}
                </button>
              ))}
            </div>
          </div>
          {usesOptions && (
            <label className="form-field">
              <span>Options</span>
              <input
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                placeholder="Option one, Option two, Option three"
              />
              <small className="field-hint">
                Separate choices with commas. You can edit these later.
              </small>
            </label>
          )}
          {column && column.type !== type && (
            <div className="column-warning">
              Existing cell values stay saved, but may display differently with the new
              type.
            </div>
          )}
        </div>
        <div className="modal-footer">
          {column && onDelete ? (
            <button
              type="button"
              className="delete-button"
              onClick={() => {
                if (
                  window.confirm(
                    `Remove the “${column.name}” column? Existing values will be hidden.`,
                  )
                ) {
                  onDelete(column);
                }
              }}
            >
              <Trash2 size={16} />
              Remove column
            </button>
          ) : (
            <span />
          )}
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button">
              {column ? "Save column" : "Add column"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function ModalCustomField({
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
    return (
      <button
        type="button"
        className={`modal-checkbox ${value === true ? "checked" : ""}`}
        onClick={() => onChange(value !== true)}
      >
        <span>{value === true && <Check size={13} strokeWidth={3} />}</span>
        {value === true ? "Checked" : "Not checked"}
      </button>
    );
  }

  if (column.type === "progress") {
    const progress = typeof value === "number" ? value : 0;
    return (
      <div className="modal-custom-progress">
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={progress}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <strong>{progress}%</strong>
      </div>
    );
  }

  if (column.type === "person") {
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Unassigned</option>
        {users
          .filter((person) => person.active && person.id !== "unassigned")
          .map((person) => (
            <option value={person.name} key={person.name}>
              {person.name}
            </option>
          ))}
      </select>
    );
  }

  if (column.type === "dropdown" || column.type === "status") {
    const options =
      column.options.length > 0
        ? column.options
        : ["Not started", "Working on it", "In review", "Done"];
    return (
      <select
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
      >
        <option value="">Select...</option>
        {options.map((option) => (
          <option value={option} key={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (column.type === "tags") {
    return (
      <input
        value={Array.isArray(value) ? value.join(", ") : ""}
        onChange={(event) =>
          onChange(
            event.target.value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean),
          )
        }
        placeholder="Tag one, Tag two"
      />
    );
  }

  return (
    <input
      type={
        column.type === "number"
          ? "number"
          : column.type === "date"
            ? "date"
            : "text"
      }
      value={
        typeof value === "string" || typeof value === "number" ? String(value) : ""
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
      placeholder="Add value"
    />
  );
}

function TaskModal({
  task,
  defaultProject,
  projects,
  defaultAssignee,
  users,
  columns,
  onClose,
  onSave,
  onDelete,
  onArchive,
  readOnly,
  canAssign,
}: {
  task: Task | null;
  defaultProject: Project | undefined;
  projects: Project[];
  defaultAssignee: WorkspaceUser;
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onClose: () => void;
  onSave: (draft: TaskDraft, id?: string) => void;
  onDelete?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  readOnly: boolean;
  canAssign: boolean;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProject?.id ?? projects[0]?.id ?? "",
  );
  const [group, setGroup] = useState(task?.group ?? "This week");
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Not started");
  const [priority, setPriority] = useState<TaskPriority>(task?.priority ?? "Medium");
  const [assigneeName, setAssigneeName] = useState(
    task?.assignee.name ?? defaultAssignee.name,
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ?? new Date().toISOString().slice(0, 10),
  );
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [customFields, setCustomFields] = useState<
    Record<string, CustomFieldValue>
  >(task?.customFields ?? {});

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (readOnly) return;
    if (!title.trim()) return;
    const assignee =
      users.find((person) => person.name === assigneeName) ?? defaultAssignee;
    const selectedProject =
      projects.find((project) => project.id === projectId) ?? defaultProject;
    if (!selectedProject) return;
    onSave(
      {
        title: title.trim(),
        description: description.trim(),
        projectId: selectedProject.id,
        project: selectedProject.name,
        group,
        status,
        priority,
        assignee,
        dueDate,
        tags: tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        progress: status === "Done" ? 100 : progress,
        customFields,
      },
      task?.id,
    );
  };

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <form
        className="task-modal"
        onSubmit={handleSubmit}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <span className="panel-kicker">{task ? "Task details" : "Create task"}</span>
            <h2>
              {task ? (readOnly ? "View task" : "Edit task") : "Add something new"}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <fieldset className="modal-content" disabled={readOnly}>
          <label className="form-field full-field">
            <span>Task name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What needs to be done?"
              autoFocus
              required
            />
          </label>
          <label className="form-field full-field">
            <span>Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Add context, a brief, or a helpful note..."
              rows={3}
            />
          </label>
          <label className="form-field">
            <span>Project</span>
            <select
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
            >
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Group</span>
            <select value={group} onChange={(event) => setGroup(event.target.value)}>
              {["This week", "Upcoming", "Completed"].map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Status</span>
            <select
              value={status}
              onChange={(event) => {
                const nextStatus = event.target.value as TaskStatus;
                setStatus(nextStatus);
                if (nextStatus === "Done") setProgress(100);
              }}
            >
              {STATUSES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              {PRIORITIES.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Owner</span>
            <select
              value={assigneeName}
              disabled={!canAssign}
              onChange={(event) => setAssigneeName(event.target.value)}
            >
              {users
                .filter((person) => person.active && person.id !== "unassigned")
                .map((person) => (
                <option value={person.name} key={person.name}>
                  {person.name}
                </option>
                ))}
            </select>
            {!canAssign && (
              <small className="field-hint">
                Members can only assign new tasks to themselves.
              </small>
            )}
          </label>
          <label className="form-field">
            <span>Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </label>
          <label className="form-field full-field">
            <span>Tags</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Design, Research, Frontend"
            />
          </label>
          {columns.length > 0 && (
            <div className="custom-fields-editor full-field">
              <div className="custom-fields-title">
                <span>Custom fields</span>
                <small>{columns.length} columns</small>
              </div>
              <div className="custom-fields-grid">
                {columns.map((column) => (
                  <label className="form-field" key={column.id}>
                    <span>
                      <ColumnTypeIcon type={column.type} />
                      {column.name}
                    </span>
                    <ModalCustomField
                      column={column}
                      users={users}
                      value={customFields[column.id] ?? null}
                      onChange={(value) =>
                        setCustomFields((current) => ({
                          ...current,
                          [column.id]: value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
            </div>
          )}
          <label className="form-field full-field range-field">
            <span>
              Progress <strong>{progress}%</strong>
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(event) => setProgress(Number(event.target.value))}
            />
          </label>
        </fieldset>
        <div className="modal-footer">
          <div className="modal-danger-actions">
            {task && onArchive && (
              <button
                type="button"
                className="archive-button"
                onClick={() => onArchive(task)}
              >
                {task.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                {task.archived ? "Restore" : "Archive"}
              </button>
            )}
            {task && onDelete && (
              <button
                type="button"
                className="delete-button"
                onClick={() => {
                  if (window.confirm(`Permanently delete “${task.title}”?`)) {
                    onDelete(task);
                  }
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            )}
          </div>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              {readOnly ? "Close" : "Cancel"}
            </button>
            {!readOnly && (
              <button type="submit" className="primary-button">
                {task ? "Save changes" : "Create task"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
