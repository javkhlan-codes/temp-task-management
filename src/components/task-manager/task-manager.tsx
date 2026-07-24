"use client";

import {
  Activity,
  Archive,
  BarChart3,
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
  FileDown,
  FolderKanban,
  GanttChart,
  Grid2X2,
  Hash,
  Inbox,
  LayoutList,
  ListTree,
  ListChecks,
  Menu,
  MessageSquareText,
  Moon,
  MoreHorizontal,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sun,
  Target,
  Trash2,
  Type,
  Users,
  UserPlus,
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
  PRIORITY_LABELS,
  PRIORITIES,
  STATUS_LABELS,
  STATUSES,
  groupLabel,
  type CustomColumn,
  type CustomColumnType,
  type CustomFieldValue,
  type Project,
  type Task,
  type TaskDraft,
  type TaskPriority,
  type TaskRecurrence,
  type TaskStatus,
  type ViewMode,
  type WorkspaceSummary,
  type WorkspaceUser,
} from "@/lib/types";
import { RoleSwitcher } from "@/components/workspace/role-switcher";
import { TeamManagementModal } from "@/components/workspace/team-management-modal";
import { ProjectModal } from "@/components/workspace/project-modal";
import { LoginScreen } from "@/components/auth/login-screen";
import { NotificationCenter } from "@/components/task-manager/notification-center";
import { TaskCollaboration } from "@/components/task-manager/task-collaboration";

const STORAGE_KEY = "nimbus-tasks-v1";
const COLUMNS_STORAGE_KEY = "nimbus-columns-v1";
const USERS_STORAGE_KEY = "nimbus-users-v1";
const PROJECTS_STORAGE_KEY = "nimbus-projects-v1";

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

function taskAssignees(task: Task): WorkspaceUser[] {
  return task.assignees?.length ? task.assignees : [task.assignee];
}

function normalizeTask(task: Task): Task {
  return {
    ...task,
    assignees: taskAssignees(task),
    parentId: task.parentId ?? null,
    dependencyIds: task.dependencyIds ?? [],
    recurrence: task.recurrence ?? "none",
    customFields: task.customFields ?? {},
  };
}

export function TaskManager() {
  const [tasks, setTasks] = useState<Task[]>(DEMO_TASKS);
  const [columns, setColumns] = useState<CustomColumn[]>(DEMO_COLUMNS);
  const [projects, setProjects] = useState<Project[]>(DEMO_PROJECTS);
  const [users, setUsers] = useState<WorkspaceUser[]>(WORKSPACE_USERS);
  const [currentUser, setCurrentUser] = useState<WorkspaceUser>(
    WORKSPACE_USERS[0],
  );
  const [workspaces, setWorkspaces] = useState<WorkspaceSummary[]>([
    {
      id: "workspace-acme",
      name: "Acme Studio",
      slug: "acme-studio",
      plan: "free",
      role: "admin",
      createdAt: "2026-07-01T00:00:00.000Z",
    },
  ]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("workspace-acme");
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<PersistenceMode>("loading");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<ViewMode>("list");
  const [activeProject, setActiveProject] = useState(DEMO_PROJECTS[0].id);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "All">("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState<
    "All" | "overdue" | "today" | "week"
  >("All");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [subtaskParent, setSubtaskParent] = useState<Task | null>(null);
  const [editingColumn, setEditingColumn] = useState<CustomColumn | "new" | null>(
    null,
  );
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | "new" | null>(
    null,
  );
  const [toast, setToast] = useState("");
  const [month, setMonth] = useState(() => new Date(2026, 6, 1));

  const loadWorkspaceData = useCallback(
    async (workspaceId: string, actorId: string) => {
      const requestOptions: RequestInit = {
        cache: "no-store",
        headers: {
          "x-workspace-user-id": actorId,
          "x-workspace-id": workspaceId,
        },
      };
      const [tasksResponse, projectsResponse, usersResponse] = await Promise.all([
        fetch("/api/tasks", requestOptions),
        fetch("/api/projects", requestOptions),
        fetch("/api/users", requestOptions),
      ]);
      if (!tasksResponse.ok || !projectsResponse.ok || !usersResponse.ok) {
        return false;
      }
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
      const selectedProject = loadedProjects.find((project) => !project.archived);
      const columnsResponse = selectedProject
        ? await fetch(
            `/api/columns?projectId=${encodeURIComponent(selectedProject.id)}`,
            requestOptions,
          )
        : null;
      const columnsPayload = columnsResponse?.ok
        ? ((await columnsResponse.json()) as { columns: CustomColumn[] })
        : { columns: [] };
      setTasks(tasksPayload.tasks.map(normalizeTask));
      setProjects(loadedProjects);
      setActiveProject(selectedProject?.id ?? "All tasks");
      setColumns(columnsPayload.columns);
      setUsers(loadedUsers);
      setCurrentUser(
        loadedUsers.find((user) => user.id === actorId && user.active) ??
          loadedUsers[0] ??
          WORKSPACE_USERS[0],
      );
      setMode("database");
      return true;
    },
    [],
  );

  useEffect(() => {
    const savedTheme = localStorage.getItem("nimbus-theme");
    const nextTheme =
      savedTheme === "dark" || savedTheme === "light"
        ? savedTheme
        : "light";
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;

    const load = async () => {
      let sessionUser: WorkspaceUser;
      try {
        const sessionResponse = await fetch("/api/auth/session", {
          cache: "no-store",
        });
        if (!sessionResponse.ok) {
          setSignedIn(false);
          setSessionReady(true);
          return;
        }
        const sessionPayload = (await sessionResponse.json()) as {
          user: WorkspaceUser | null;
        };
        if (!sessionPayload.user) {
          setSignedIn(false);
          setSessionReady(true);
          return;
        }
        sessionUser = sessionPayload.user;
        setCurrentUser(sessionUser);
        setSignedIn(true);
      } catch {
        setSignedIn(false);
        setSessionReady(true);
        return;
      }

      const actorId = sessionUser.id;
      let selectedWorkspaceId = "workspace-acme";
      try {
        const workspacesResponse = await fetch("/api/workspaces", {
          cache: "no-store",
        });
        if (workspacesResponse.ok) {
          const payload = (await workspacesResponse.json()) as {
            workspaces: WorkspaceSummary[];
          };
          if (payload.workspaces.length) {
            setWorkspaces(payload.workspaces);
            const savedWorkspaceId = localStorage.getItem("nimbus-workspace-id");
            selectedWorkspaceId =
              payload.workspaces.find((item) => item.id === savedWorkspaceId)?.id ??
              payload.workspaces[0].id;
            setActiveWorkspaceId(selectedWorkspaceId);
          }
        }
        if (await loadWorkspaceData(selectedWorkspaceId, actorId)) {
          setSessionReady(true);
          return;
        }
      } catch {
        // The local demo remains available when the API or database is offline.
      }

      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          setTasks(
            (JSON.parse(saved) as Task[]).map(normalizeTask),
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
      setSessionReady(true);
    };

    void load();
  }, [loadWorkspaceData]);

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
          headers: {
            "x-workspace-user-id": currentUser.id,
            "x-workspace-id": activeWorkspaceId,
          },
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
  }, [activeProject, activeWorkspaceId, currentUser.id, mode, projects]);

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
            "x-workspace-id": activeWorkspaceId,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(task),
        });
        if (!response.ok) throw new Error("Синк хийхэд алдаа гарлаа");
      } catch {
        setMode("local");
        setToast("Database холбогдохгүй байна — өөрчлөлтийг төхөөрөмжид хадгаллаа");
      }
    },
    [activeWorkspaceId, currentUser.id, mode],
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
            "x-workspace-id": activeWorkspaceId,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(column),
        });
        if (!response.ok) throw new Error("Багана синк хийхэд алдаа гарлаа");
      } catch {
        setMode("local");
        setToast("Database холбогдохгүй байна — баганыг төхөөрөмжид хадгаллаа");
      }
    },
    [activeWorkspaceId, currentUser.id, mode],
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
            "x-workspace-id": activeWorkspaceId,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(user),
        });
        const payload = (await response.json()) as { error?: string };
        if (!response.ok) throw new Error(payload.error ?? "Хэрэглэгч синк хийхэд алдаа гарлаа");
        return true;
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Хэрэглэгчийг шинэчлэх боломжгүй");
        return false;
      }
    },
    [activeWorkspaceId, currentUser.id, mode],
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
            "x-workspace-id": activeWorkspaceId,
          },
          body: method === "DELETE" ? undefined : JSON.stringify(project),
        });
        const payload = (await response.json()) as {
          project?: Project;
          error?: string;
        };
        if (!response.ok) throw new Error(payload.error ?? "Төсөл синк хийхэд алдаа гарлаа");
        return payload.project ?? true;
      } catch (error) {
        setToast(error instanceof Error ? error.message : "Төслийг шинэчлэх боломжгүй");
        return false;
      }
    },
    [activeWorkspaceId, currentUser.id, mode],
  );

  const switchWorkspace = async (workspaceId: string) => {
    if (workspaceId === activeWorkspaceId) {
      setWorkspaceMenuOpen(false);
      return;
    }
    setMode("loading");
    const loaded = await loadWorkspaceData(workspaceId, currentUser.id);
    if (!loaded) {
      setMode("database");
      setToast("Workspace мэдээллийг ачаалах боломжгүй");
      return;
    }
    setActiveWorkspaceId(workspaceId);
    localStorage.setItem("nimbus-workspace-id", workspaceId);
    setWorkspaceMenuOpen(false);
    setEditingTask(null);
    setEditingProject(null);
    setToast("Workspace солигдлоо");
  };

  const createWorkspace = async () => {
    const name = newWorkspaceName.trim();
    if (name.length < 2 || creatingWorkspace) return;
    setCreatingWorkspace(true);
    try {
      const response = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = (await response.json()) as {
        workspace?: WorkspaceSummary;
        error?: string;
      };
      if (!response.ok || !payload.workspace) {
        throw new Error(payload.error ?? "Workspace үүсгэх боломжгүй");
      }
      setWorkspaces((current) => [...current, payload.workspace as WorkspaceSummary]);
      setNewWorkspaceName("");
      await switchWorkspace(payload.workspace.id);
      setToast("Шинэ workspace үүслээ");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Workspace үүсгэх боломжгүй");
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const saveTask = (draft: TaskDraft, id?: string) => {
    if (id) {
      const existingTask = tasks.find((task) => task.id === id);
      if (!existingTask || !canEditTask(currentUser, existingTask)) {
        setToast("Таны эрх энэ таскийг засах боломжгүй");
        return;
      }
      const updated = normalizeTask({
        ...draft,
        id,
        archived: existingTask.archived ?? false,
        archivedAt: existingTask.archivedAt ?? null,
        createdAt: existingTask.createdAt,
      });
      setTasks((current) => current.map((task) => (task.id === id ? updated : task)));
      void syncTask("PATCH", updated);
      setToast("Таск шинэчлэгдлээ");
    } else {
      if (!hasPermission(currentUser, "createTask")) {
        setToast(`${ROLE_LABELS[currentUser.role]} нь зөвхөн унших эрхтэй`);
        return;
      }
      const effectiveDraft = hasPermission(currentUser, "assignTasks")
        ? draft
        : { ...draft, assignee: currentUser, assignees: [currentUser] };
      const task = normalizeTask({
        ...effectiveDraft,
        id: crypto.randomUUID(),
        archived: false,
        archivedAt: null,
        createdAt: new Date().toISOString(),
      });
      setTasks((current) => [task, ...current]);
      void syncTask("POST", task);
      setToast("Шинэ таск үүслээ");
    }
    setNewTaskOpen(false);
    setEditingTask(null);
    setSubtaskParent(null);
  };

  const updateTask = (id: string, changes: Partial<Task>) => {
    const existing = tasks.find((task) => task.id === id);
    if (!existing) return;
    if (!canEditTask(currentUser, existing)) {
      setToast("Та зөвхөн өөрт хуваарилагдсан таскийг засна");
      return;
    }
    const updated = normalizeTask({ ...existing, ...changes });
    const nextTasks = tasks.map((task) => (task.id === id ? updated : task));
    let updatedParent: Task | undefined;
    if (updated.parentId) {
      const siblings = nextTasks.filter(
        (task) => task.parentId === updated.parentId && !task.archived,
      );
      const progress = siblings.length
        ? Math.round(
            siblings.reduce((total, task) => total + task.progress, 0) /
              siblings.length,
          )
        : 0;
      const parent = nextTasks.find((task) => task.id === updated.parentId);
      if (parent) {
        updatedParent = { ...parent, progress };
      }
    }
    setTasks(
      updatedParent
        ? nextTasks.map((task) =>
            task.id === updatedParent?.id ? updatedParent : task,
          )
        : nextTasks,
    );
    void syncTask("PATCH", updated);
    if (updatedParent) void syncTask("PATCH", updatedParent);
  };

  const createSubtask = (parent: Task, title: string) => {
    if (!hasPermission(currentUser, "createTask")) {
      setToast("Таны эрх дэд таск үүсгэх боломжгүй");
      return;
    }
    const assignees = hasPermission(currentUser, "assignTasks")
      ? taskAssignees(parent)
      : [currentUser];
    const subtask: Task = {
      ...parent,
      id: crypto.randomUUID(),
      title: title.trim(),
      description: "",
      status: "Not started",
      priority: parent.priority,
      assignee: assignees[0],
      assignees,
      parentId: parent.id,
      dependencyIds: [],
      recurrence: "none",
      progress: 0,
      customFields: {},
      archived: false,
      archivedAt: null,
      createdAt: new Date().toISOString(),
    };
    setTasks((current) => [...current, subtask]);
    void syncTask("POST", subtask);
    setToast("Дэд таск нэмэгдлээ");
  };

  const deleteTask = (task: Task) => {
    if (!hasPermission(currentUser, "deleteTask")) {
      setToast("Зөвхөн админ таскийг бүрмөсөн устгана");
      return;
    }
    setTasks((current) => current.filter((item) => item.id !== task.id));
    void syncTask("DELETE", task);
    setEditingTask(null);
    setToast("Таск устгагдлаа");
  };

  const saveColumn = (
    draft: Pick<CustomColumn, "name" | "type" | "options">,
    id?: string,
  ) => {
    if (!hasPermission(currentUser, "manageColumns")) {
      setToast("Таны эрх багана удирдах боломжгүй");
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
      setToast("Багана шинэчлэгдлээ");
    } else {
      const project = projects.find((item) => item.id === activeProject);
      if (!project) {
        setToast("Багана нэмэхийн өмнө төсөл нээнэ үү");
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
      setToast("Багана нэмэгдлээ");
    }
    setEditingColumn(null);
  };

  const deleteColumn = (column: CustomColumn) => {
    if (!hasPermission(currentUser, "manageColumns")) {
      setToast("Таны эрх багана устгах боломжгүй");
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
    setToast("Багана устгагдлаа");
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
      setToast("Таны эрх таск архивлах эсвэл сэргээх боломжгүй");
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
    setToast(archived ? "Таск архивлагдлаа" : "Таск сэргээгдлээ");
  };

  const saveWorkspaceUser = async (user: WorkspaceUser, isNew: boolean) => {
    if (!hasPermission(currentUser, "manageUsers")) {
      setToast("Зөвхөн админ workspace хандалтыг удирдана");
      return;
    }
    const success = await syncUser(isNew ? "POST" : "PATCH", user);
    if (!success) return;
    setUsers((items) =>
      isNew
        ? [...items, user]
        : items.map((item) => (item.id === user.id ? user : item)),
    );
    setToast(isNew ? "Багийн гишүүн нэмэгдлээ" : "Гишүүний эрх шинэчлэгдлээ");
  };

  const deactivateWorkspaceUser = async (user: WorkspaceUser) => {
    if (!hasPermission(currentUser, "manageUsers")) {
      setToast("Зөвхөн админ workspace хандалтыг удирдана");
      return;
    }
    const success = await syncUser("DELETE", user);
    if (!success) return;
    setUsers((items) =>
      items.map((item) => (item.id === user.id ? { ...item, active: false } : item)),
    );
    setToast("Багийн гишүүн идэвхгүй боллоо");
  };

  const authenticated = (_user: WorkspaceUser) => {
    window.location.reload();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setSignedIn(false);
    setActivityOpen(false);
    setSidebarOpen(false);
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
      setToast("Таны эрх төсөл удирдах боломжгүй");
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
    setToast(existing ? "Төсөл шинэчлэгдлээ" : "Төсөл үүслээ");
  };

  const deleteProject = async (project: Project) => {
    if (!hasPermission(currentUser, "deleteProject")) {
      setToast("Зөвхөн админ төслийг бүрмөсөн устгана");
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
    setToast("Төсөл устгагдлаа");
  };

  const openNewTask = () => {
    if (!hasPermission(currentUser, "createTask")) {
      setToast(`${ROLE_LABELS[currentUser.role]} нь зөвхөн унших эрхтэй`);
      return;
    }
    if (!projects.some((project) => !project.archived)) {
      setToast("Эхлээд төсөл үүсгэнэ үү");
      setEditingProject("new");
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

  const exportTasksCsv = () => {
    const escapeCell = (value: string | number) => {
      let text = String(value);
      if (/^[=+\-@]/.test(text)) text = `'${text}`;
      return `"${text.replaceAll('"', '""')}"`;
    };
    const headers = [
      "Таск",
      "Төсөл",
      "Бүлэг",
      "Төлөв",
      "Ач холбогдол",
      "Хариуцагч",
      "Эцсийн хугацаа",
      "Таг",
      "Гүйцэтгэл",
    ];
    const rows = visibleTasks
      .filter((task) => !task.parentId)
      .map((task) => [
        task.title,
        task.project,
        groupLabel(task.group),
        STATUS_LABELS[task.status],
        PRIORITY_LABELS[task.priority],
        taskAssignees(task)
          .map((assignee) => assignee.name)
          .join(", "),
        task.dueDate,
        task.tags.join(", "),
        `${task.progress}%`,
      ]);
    const csv = [headers, ...rows]
      .map((row) => row.map(escapeCell).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `tasks-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    setToast("CSV тайлан татагдлаа");
  };

  const projectTasks = useMemo(
    () => {
      if (activeProject === "Archive") {
        return tasks.filter((task) => task.archived);
      }
      const activeTasks = tasks.filter((task) => !task.archived);
      if (activeProject === "My work") {
        return activeTasks.filter((task) =>
          taskAssignees(task).some((assignee) => assignee.id === currentUser.id),
        );
      }
      return activeProject === "All tasks"
        ? activeTasks
        : activeTasks.filter((task) => task.projectId === activeProject);
    },
    [activeProject, currentUser.id, tasks],
  );

  const visibleTasks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ulaanbaatar",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const weekEnd = new Date(`${today}T00:00:00+08:00`);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const directMatches = projectTasks.filter((task) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          task.title,
          task.description,
          task.project,
          task.group,
          task.status,
          task.priority,
          ...taskAssignees(task).map((assignee) => assignee.name),
          ...taskAssignees(task).map((assignee) => assignee.email),
          ...task.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      const matchesStatus = statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === "All" ||
        taskAssignees(task).some((assignee) => assignee.id === assigneeFilter);
      const matchesTag = tagFilter === "All" || task.tags.includes(tagFilter);
      const taskDue = new Date(`${task.dueDate}T23:59:59+08:00`);
      const matchesDue =
        dueFilter === "All" ||
        (dueFilter === "overdue" && isOverdue(task.dueDate, task.status)) ||
        (dueFilter === "today" && task.dueDate === today) ||
        (dueFilter === "week" &&
          task.dueDate >= today &&
          taskDue.getTime() <= weekEnd.getTime());
      return (
        matchesQuery &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesTag &&
        matchesDue
      );
    });
    const parentIds = new Set(
      directMatches
        .map((task) => task.parentId)
        .filter((id): id is string => Boolean(id)),
    );
    const matchIds = new Set(directMatches.map((task) => task.id));
    return projectTasks.filter(
      (task) => matchIds.has(task.id) || parentIds.has(task.id),
    );
  }, [
    assigneeFilter,
    dueFilter,
    priorityFilter,
    projectTasks,
    query,
    statusFilter,
    tagFilter,
  ]);

  const availableTags = useMemo(
    () =>
      Array.from(new Set(projectTasks.flatMap((task) => task.tags))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [projectTasks],
  );

  const summaryTasks = projectTasks.filter((task) => !task.parentId);
  const doneCount = summaryTasks.filter((task) => task.status === "Done").length;
  const activeCount = summaryTasks.filter(
    (task) => task.status === "Working on it",
  ).length;
  const overdueCount = summaryTasks.filter((task) =>
    isOverdue(task.dueDate, task.status),
  ).length;
  const completion = summaryTasks.length
    ? Math.round((doneCount / summaryTasks.length) * 100)
    : 0;

  const activeProjectRecord = projects.find(
    (project) => project.id === activeProject,
  );
  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === activeWorkspaceId) ??
    workspaces[0];
  const projectName =
    activeProject === "All tasks"
      ? "Бүх таск"
      : activeProject === "My work"
        ? "Миний ажил"
        : activeProject === "Archive"
          ? "Архив"
          : activeProjectRecord?.name ?? "Төслүүд";
  const projectColumns = activeProjectRecord
    ? columns
        .filter((column) => column.projectId === activeProjectRecord.id)
        .sort((a, b) => a.position - b.position)
    : [];

  if (!sessionReady) {
    return (
      <div className="app-loading">
        <span className="brand-icon" aria-hidden="true">
          <img src="/pro-team-logo.png" alt="" />
        </span>
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
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="brand-row">
          <div className="brand-icon" aria-hidden="true">
            <img src="/pro-team-logo.png" alt="" />
          </div>
          <span className="brand-name">Pro Team</span>
          <button
            className="icon-button sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Хажуу цэс хаах"
          >
            <X size={19} />
          </button>
        </div>

        <div className="workspace-switcher-wrap">
          <button
            className="workspace-switcher"
            onClick={() => setWorkspaceMenuOpen((current) => !current)}
            aria-expanded={workspaceMenuOpen}
          >
            <span className="workspace-logo">
              {activeWorkspace?.name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("") || "WS"}
            </span>
            <span>
              <strong>{activeWorkspace?.name ?? "Workspace"}</strong>
              <small>{activeWorkspace?.plan === "free" ? "Үнэгүй" : activeWorkspace?.plan}</small>
            </span>
            <ChevronsUpDown size={16} />
          </button>
          {workspaceMenuOpen && (
            <div className="workspace-menu">
              <div className="workspace-menu-heading">
                <span>Таны workspace</span>
                <small>{workspaces.length}</small>
              </div>
              {workspaces.map((workspace) => (
                <button
                  className={workspace.id === activeWorkspaceId ? "active" : ""}
                  onClick={() => void switchWorkspace(workspace.id)}
                  key={workspace.id}
                >
                  <span className="workspace-logo">
                    {workspace.name
                      .split(/\s+/)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("")}
                  </span>
                  <span>
                    <strong>{workspace.name}</strong>
                    <small>{ROLE_LABELS[workspace.role]}</small>
                  </span>
                  {workspace.id === activeWorkspaceId && <Check size={14} />}
                </button>
              ))}
              <div className="workspace-create">
                <input
                  value={newWorkspaceName}
                  onChange={(event) => setNewWorkspaceName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      void createWorkspace();
                    }
                  }}
                  placeholder="Шинэ workspace нэр"
                  maxLength={80}
                />
                <button
                  onClick={() => void createWorkspace()}
                  disabled={newWorkspaceName.trim().length < 2 || creatingWorkspace}
                  aria-label="Workspace үүсгэх"
                >
                  <Plus size={15} />
                </button>
              </div>
            </div>
          )}
        </div>

        <nav className="main-nav" aria-label="Үндсэн цэс">
          <button
            className={`nav-item ${activeProject === "My work" ? "active" : ""}`}
            onClick={() => {
              setActiveProject("My work");
              setSidebarOpen(false);
            }}
          >
            <Inbox size={18} />
            <span>Миний ажил</span>
            <span className="nav-count">
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
          </button>
          <button className="nav-item">
            <Bell size={18} />
            <span>Ирсэн</span>
            <span className="nav-dot" />
          </button>
          <button className="nav-item">
            <MessageSquareText size={18} />
            <span>Мессеж</span>
          </button>
        </nav>

        <div className="sidebar-section">
          <div className="section-label">
            <span>Workspace</span>
            <button aria-label="Workspace зүйл нэмэх">
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
            <span>Бүх таск</span>
            <span className="nav-count">
              {tasks.filter((task) => !task.archived && !task.parentId).length}
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
            <span>Багийн гишүүд</span>
          </button>
          <button
            className={`nav-item ${activeProject === "Archive" ? "active" : ""}`}
            onClick={() => {
              setActiveProject("Archive");
              setSidebarOpen(false);
            }}
          >
            <Archive size={18} />
            <span>Архив</span>
            <span className="nav-count">
              {tasks.filter((task) => task.archived).length}
            </span>
          </button>
        </div>

        <div className="sidebar-section projects-section">
          <div className="section-label">
            <span>Төслүүд</span>
            <button
              aria-label="Төсөл үүсгэх"
              onClick={() => {
                if (hasPermission(currentUser, "createProject")) {
                  setEditingProject("new");
                } else {
                  setToast("Таны эрх төсөл үүсгэх боломжгүй");
                }
              }}
            >
              <Plus size={15} />
            </button>
          </div>
          {projects.filter((project) => !project.archived).map((project) => {
            const count = tasks.filter(
              (task) =>
                task.projectId === project.id &&
                !task.archived &&
                !task.parentId,
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
              <span>Архивласан төсөл</span>
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
            <strong>Багаа уриарай</strong>
            <span>Хамтдаа ажил илүү хурдан урагшилна.</span>
            <button>Гишүүн урих</button>
          </div>
          <button className="nav-item">
            <CircleHelp size={18} />
            <span>Тусламж</span>
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-label="Цэс хаах"
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <button
            className="icon-button mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Цэс нээх"
          >
            <Menu size={21} />
          </button>
          <div className="global-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => {
                const value = event.target.value;
                setQuery(value);
                if (value.trim()) setActiveProject("All tasks");
              }}
              placeholder="Таск, хүн, төсөл хайх..."
              aria-label="Хайх"
            />
            <kbd>
              <Command size={11} /> K
            </kbd>
          </div>
          <div className="topbar-actions">
            <span className={`sync-indicator ${mode}`}>
              <span />
              {mode === "database"
                ? "Neon холбогдсон"
                : mode === "local"
                  ? "Demo горим"
                  : "Холбож байна"}
            </span>
            <button
              className="icon-button"
              onClick={toggleTheme}
              aria-label={`${theme === "light" ? "Бараан" : "Цайвар"} горимд шилжих`}
            >
              {theme === "light" ? <Moon size={19} /> : <Sun size={19} />}
            </button>
            <button
              className={`icon-button ${activityOpen ? "button-active" : ""}`}
              onClick={() => setActivityOpen((current) => !current)}
              aria-label="Үйлдлийн түүх нээх"
            >
              <Activity size={19} />
            </button>
            <NotificationCenter
              currentUser={currentUser}
              mode={mode}
              workspaceId={activeWorkspaceId}
              onOpenTask={(taskId) => {
                const task = tasks.find((item) => item.id === taskId);
                if (task) setEditingTask(task);
              }}
            />
            <RoleSwitcher
              currentUser={currentUser}
              onManageTeam={() => setTeamModalOpen(true)}
              onLogout={logout}
            />
          </div>
        </header>

        <div className="workspace-content">
          <section className="workspace-header">
            <div className="eyebrow">
              <span>Workspace</span>
              <ChevronRight size={13} />
              <span>Төслүүд</span>
            </div>
            <div className="title-row">
              <div>
                <div className="project-title">
                  <ProjectMark
                    name={projectName}
                    color={activeProjectRecord?.color}
                  />
                  <h1>{projectName}</h1>
                  <button className="title-menu" aria-label="Төслийн цэс">
                    <MoreHorizontal size={20} />
                  </button>
                </div>
                <p>
                  {activeProjectRecord?.description ||
                    "Төлөвлөж, хянаж, үнэ цэнтэй ажлыг хамтдаа гүйцэтгээрэй."}
                </p>
              </div>
              <div className="title-actions">
                <div className="member-stack" aria-label="Төслийн гишүүд">
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
                  <button className="add-member" aria-label="Гишүүн нэмэх">
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
                  <span>Тохируулах</span>
                </button>
                <button
                  className="primary-button"
                  onClick={openNewTask}
                  disabled={
                    !hasPermission(currentUser, "createTask") ||
                    !projects.some((project) => !project.archived)
                  }
                >
                  <Plus size={18} />
                  Шинэ таск
                </button>
              </div>
            </div>
          </section>

          <section className="metrics-grid" aria-label="Төслийн тойм">
            <MetricCard
              icon={<CheckCircle2 size={18} />}
              label="Гүйцэтгэл"
              value={`${completion}%`}
              detail={`${summaryTasks.length} таскаас ${doneCount} дууссан`}
              tone="violet"
              progress={completion}
            />
            <MetricCard
              icon={<Target size={18} />}
              label="Хийгдэж буй"
              value={String(activeCount)}
              detail="Урагшилж буй таскууд"
              tone="blue"
            />
            <MetricCard
              icon={<Clock3 size={18} />}
              label="Хугацаа хэтэрсэн"
              value={String(overdueCount)}
              detail={overdueCount ? "Анхаарал шаардлагатай" : "Бүх ажил төлөвлөгөөний дагуу"}
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
                Жагсаалт
              </button>
              <button
                className={view === "board" ? "active" : ""}
                onClick={() => setView("board")}
              >
                <Columns3 size={17} />
                Самбар
              </button>
              <button
                className={view === "calendar" ? "active" : ""}
                onClick={() => setView("calendar")}
              >
                <CalendarDays size={17} />
                Календарь
              </button>
              <button
                className={view === "timeline" ? "active" : ""}
                onClick={() => setView("timeline")}
              >
                <GanttChart size={17} />
                Timeline
              </button>
              <button
                className={view === "dashboard" ? "active" : ""}
                onClick={() => setView("dashboard")}
              >
                <BarChart3 size={17} />
                Дашбоард
              </button>
            </div>

            <div className="toolbar">
              <div className="toolbar-search">
                <Search size={16} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Энэ төслөөс хайх"
                  aria-label="Энэ төслөөс хайх"
                />
                {query && (
                  <button onClick={() => setQuery("")} aria-label="Хайлт арилгах">
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
                  aria-label="Төлвөөр шүүх"
                >
                  <option value="All">Бүх төлөв</option>
                  {STATUSES.map((status) => (
                    <option value={status} key={status}>
                      {STATUS_LABELS[status]}
                    </option>
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
                  aria-label="Ач холбогдлоор шүүх"
                >
                  <option value="All">Бүх ач холбогдол</option>
                  {PRIORITIES.map((priority) => (
                    <option value={priority} key={priority}>
                      {PRIORITY_LABELS[priority]}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <label className="filter-control">
                <select
                  value={assigneeFilter}
                  onChange={(event) => setAssigneeFilter(event.target.value)}
                  aria-label="Хариуцагчаар шүүх"
                >
                  <option value="All">Бүх хариуцагч</option>
                  {users
                    .filter((user) => user.active && user.id !== "unassigned")
                    .map((user) => (
                      <option value={user.id} key={user.id}>
                        {user.name}
                      </option>
                    ))}
                </select>
                <ChevronDown size={14} />
              </label>
              <label className="filter-control">
                <select
                  value={dueFilter}
                  onChange={(event) =>
                    setDueFilter(
                      event.target.value as "All" | "overdue" | "today" | "week",
                    )
                  }
                  aria-label="Эцсийн хугацаагаар шүүх"
                >
                  <option value="All">Бүх хугацаа</option>
                  <option value="overdue">Хугацаа хэтэрсэн</option>
                  <option value="today">Өнөөдөр дуусах</option>
                  <option value="week">Дараагийн 7 хоног</option>
                </select>
                <ChevronDown size={14} />
              </label>
              <label className="filter-control">
                <select
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  aria-label="Тагаар шүүх"
                >
                  <option value="All">Бүх таг</option>
                  {availableTags.map((tag) => (
                    <option value={tag} key={tag}>
                      {tag}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} />
              </label>
              {(statusFilter !== "All" ||
                priorityFilter !== "All" ||
                assigneeFilter !== "All" ||
                dueFilter !== "All" ||
                tagFilter !== "All") && (
                <button
                  className="clear-filters"
                  onClick={() => {
                    setStatusFilter("All");
                    setPriorityFilter("All");
                    setAssigneeFilter("All");
                    setDueFilter("All");
                    setTagFilter("All");
                  }}
                >
                  <X size={14} />
                  Арилгах
                </button>
              )}
              <button className="clear-filters export-button" onClick={exportTasksCsv}>
                <FileDown size={14} />
                CSV
              </button>
              <button
                className="add-column-button"
                onClick={() => {
                  if (hasPermission(currentUser, "manageColumns")) {
                    setEditingColumn("new");
                  } else {
                    setToast("Таны эрх багана удирдах боломжгүй");
                  }
                }}
                disabled={
                  !activeProjectRecord ||
                  !hasPermission(currentUser, "manageColumns")
                }
              >
                <Plus size={15} />
                <span>Багана нэмэх</span>
              </button>
              <span className="result-count">
                {visibleTasks.length} таск
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
                      setToast("Таны эрх багана тохируулах боломжгүй");
                    }
                  }}
                  onCellUpdate={updateCustomField}
                  onAdd={openNewTask}
                  onAddSubtask={(parent) => {
                    setSubtaskParent(parent);
                    setNewTaskOpen(true);
                  }}
                  canAssign={hasPermission(currentUser, "assignTasks")}
                  canCreate={hasPermission(currentUser, "createTask")}
                />
              )}
              {view === "board" && (
                <BoardView
                  tasks={visibleTasks.filter((task) => !task.parentId)}
                  onEdit={setEditingTask}
                  onUpdate={updateTask}
                  onAdd={openNewTask}
                />
              )}
              {view === "calendar" && (
                <CalendarView
                  tasks={visibleTasks.filter((task) => !task.parentId)}
                  month={month}
                  onMonthChange={setMonth}
                  onEdit={setEditingTask}
                />
              )}
              {view === "timeline" && (
                <TimelineView
                  tasks={visibleTasks.filter((task) => !task.parentId)}
                  onEdit={setEditingTask}
                  onAdd={openNewTask}
                />
              )}
              {view === "dashboard" && (
                <DashboardView
                  tasks={visibleTasks.filter((task) => !task.parentId)}
                  users={users}
                />
              )}
            </div>
          </section>
        </div>
      </main>

      <aside className={`activity-panel ${activityOpen ? "activity-open" : ""}`}>
        <div className="activity-header">
          <div>
            <span className="panel-kicker">Шууд шинэчлэл</span>
            <h2>Үйлдлийн түүх</h2>
          </div>
          <button
            className="icon-button"
            onClick={() => setActivityOpen(false)}
            aria-label="Үйлдлийн түүх хаах"
          >
            <X size={18} />
          </button>
        </div>
        <div className="activity-list">
          <ActivityItem
            person={PEOPLE[2]}
            text={
              <>
                <strong>Finalize visual design system</strong> таскийг хяналтын төлөвт оруулсан
              </>
            }
            time="12 minutes ago"
            tone="review"
          />
          <ActivityItem
            person={PEOPLE[1]}
            text={
              <>
                <strong>QA responsive navigation</strong> таскийг дуусгасан
              </>
            }
            time="2 hours ago"
            tone="done"
          />
          <ActivityItem
            person={PEOPLE[0]}
            text={
              <>
                <strong>Research customer onboarding flow</strong> таскт тэмдэглэл нэмсэн
              </>
            }
            time="Өчигдөр"
            tone="progress"
          />
          <div className="activity-date">7-р сарын 22, Лхагва</div>
          <ActivityItem
            person={PEOPLE[3]}
            text={
              <>
                <strong>Set up product event tracking</strong> таск үүсгэсэн
              </>
            }
            time="Өчигдөр"
            tone="neutral"
          />
        </div>
        <div className="activity-compose">
          <Avatar person={PEOPLE[0]} small />
          <button>Шинэчлэл бичих...</button>
        </div>
      </aside>

      {(newTaskOpen || editingTask) && (
        <TaskModal
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
  onAddSubtask,
  canAssign,
  canCreate,
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
  onAddSubtask: (parent: Task) => void;
  canAssign: boolean;
  canCreate: boolean;
}) {
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(
    () => new Set(["task-001", "task-002"]),
  );
  const rootTasks = tasks.filter((task) => !task.parentId);
  const groups = ["This week", "Upcoming", "Completed"];
  const usedGroups = groups.filter((group) =>
    rootTasks.some((task) => task.group === group),
  );
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
          <span>Таск</span>
          <span>Хариуцагч</span>
          <span>Төлөв</span>
          <span>Ач холбогдол</span>
          <span>Эцсийн хугацаа</span>
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
          const groupTasks = rootTasks.filter((task) => task.group === group);
          return (
            <div className="task-group" key={group}>
              <div className="group-header">
                <ChevronDown size={16} />
                <span
                  className={`group-accent group-${group.toLowerCase().replace(" ", "-")}`}
                />
                <strong>{groupLabel(group)}</strong>
                <span>{groupTasks.length}</span>
              </div>
              {groupTasks.map((task) => {
                const subtasks = tasks.filter(
                  (candidate) => candidate.parentId === task.id,
                );
                const expanded = expandedTasks.has(task.id);
                return (
                  <div className="task-family" key={task.id}>
                    <TaskRow
                      task={task}
                      subtasks={subtasks}
                      users={users}
                      columns={columns}
                      onEdit={onEdit}
                      onUpdate={onUpdate}
                      onCellUpdate={onCellUpdate}
                      gridStyle={gridStyle}
                      canAssign={canAssign}
                      expanded={expanded}
                      onToggleSubtasks={() =>
                        setExpandedTasks((current) => {
                          const next = new Set(current);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                    />
                    {expanded &&
                      subtasks.map((subtask) => (
                        <TaskRow
                          task={subtask}
                          subtasks={[]}
                          users={users}
                          columns={columns}
                          key={subtask.id}
                          onEdit={onEdit}
                          onUpdate={onUpdate}
                          onCellUpdate={onCellUpdate}
                          gridStyle={gridStyle}
                          canAssign={canAssign}
                          isSubtask
                        />
                      ))}
                    {expanded && canCreate && (
                      <button
                        className="subtask-add-row"
                        onClick={() => onAddSubtask(task)}
                      >
                        <UserPlus size={14} />
                        Add subtask
                      </button>
                    )}
                  </div>
                );
              })}
              {canCreate && <button className="add-row" onClick={onAdd}>
                <span>
                  <Plus size={14} />
                </span>
                Таск нэмэх
              </button>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({
  task,
  subtasks,
  users,
  columns,
  onEdit,
  onUpdate,
  onCellUpdate,
  gridStyle,
  canAssign,
  expanded = false,
  onToggleSubtasks,
  isSubtask = false,
}: {
  task: Task;
  subtasks: Task[];
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
  canAssign: boolean;
  expanded?: boolean;
  onToggleSubtasks?: () => void;
  isSubtask?: boolean;
}) {
  const toggleDone = () =>
    onUpdate(task.id, {
      status: task.status === "Done" ? "Not started" : "Done",
      progress: task.status === "Done" ? 0 : 100,
    });

  return (
    <div className={`task-row ${isSubtask ? "subtask-row" : ""}`} style={gridStyle}>
      <button
        className={`task-check ${task.status === "Done" ? "checked" : ""}`}
        onClick={toggleDone}
        aria-label={task.status === "Done" ? "Дуусаагүй болгох" : "Дууссан болгох"}
      >
        {task.status === "Done" && <Check size={13} strokeWidth={3} />}
      </button>
      <div className="task-title-cluster">
        {subtasks.length > 0 ? (
          <button
            className={`subtask-toggle ${expanded ? "expanded" : ""}`}
            onClick={onToggleSubtasks}
            aria-label={`${subtasks.length} дэд таск ${expanded ? "хураах" : "дэлгэх"}`}
          >
            <ChevronRight size={14} />
          </button>
        ) : isSubtask ? (
          <span className="subtask-branch">
            <ListTree size={13} />
          </span>
        ) : (
          <span className="subtask-spacer" />
        )}
        <button className="task-name-cell" onClick={() => onEdit(task)}>
          <span className={task.status === "Done" ? "completed-title" : ""}>
            {task.title}
          </span>
          <small>
            {subtasks.length
              ? `${subtasks.filter((subtask) => subtask.status === "Done").length}/${subtasks.length} дэд таск · ${task.progress}%`
              : task.tags.join(" · ")}
          </small>
        </button>
      </div>
      <AssigneeCell
        task={task}
        users={users}
        canAssign={canAssign}
        onUpdate={onUpdate}
      />
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
            <option value={status} key={status}>
              {STATUS_LABELS[status]}
            </option>
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
            <option value={priority} key={priority}>
              {PRIORITY_LABELS[priority]}
            </option>
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

function AssigneeCell({
  task,
  users,
  canAssign,
  onUpdate,
}: {
  task: Task;
  users: WorkspaceUser[];
  canAssign: boolean;
  onUpdate: (id: string, changes: Partial<Task>) => void;
}) {
  const [open, setOpen] = useState(false);
  const assigned = taskAssignees(task);
  const activeUsers = users.filter(
    (user) => user.active && user.id !== "unassigned",
  );

  const toggle = (user: WorkspaceUser) => {
    const exists = assigned.some((assignee) => assignee.id === user.id);
    if (exists && assigned.length === 1) return;
    const next = exists
      ? assigned.filter((assignee) => assignee.id !== user.id)
      : [...assigned, user];
    onUpdate(task.id, {
      assignee: next[0],
      assignees: next,
    });
  };

  return (
    <div className={`owner-cell assignee-cell ${open ? "open" : ""}`}>
      <button
        className="assignee-trigger"
        disabled={!canAssign}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Assign people to ${task.title}`}
        aria-expanded={open}
      >
        <span className="assignee-stack">
          {assigned.slice(0, 3).map((person) => (
            <Avatar person={person} small key={person.id} />
          ))}
        </span>
        <span>
          {assigned.length === 1
            ? assigned[0].name
            : `${assigned.length} people`}
        </span>
        {canAssign && <Plus size={13} />}
      </button>
      {open && canAssign && (
        <div className="assignee-menu">
          <div className="assignee-menu-heading">
            <strong>Хариуцагч сонгох</strong>
            <button onClick={() => setOpen(false)}>Болсон</button>
          </div>
          {activeUsers.map((user) => {
            const selected = assigned.some(
              (assignee) => assignee.id === user.id,
            );
            return (
              <button
                className={selected ? "selected" : ""}
                onClick={() => toggle(user)}
                key={user.id}
              >
                <Avatar person={user} small />
                <span>
                  <strong>{user.name}</strong>
                  <small>{ROLE_LABELS[user.role]}</small>
                </span>
                <i>{selected && <Check size={12} strokeWidth={3} />}</i>
              </button>
            );
          })}
        </div>
      )}
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
          <option value="">Хуваарилаагүй</option>
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
  return (
    <div className="custom-cell">
      <select
        className="custom-cell-select custom-dropdown-select"
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(event.target.value || null)}
        aria-label={column.name}
      >
        <option value="">Сонгох...</option>
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
              <strong>{STATUS_LABELS[status]}</strong>
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
                      {PRIORITY_LABELS[task.priority]}
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
                  <span>Таскийг энд чирж оруулна уу</span>
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
    <div className="calendar-view">
      <div className="calendar-toolbar">
        <div>
          <button
            className="icon-button"
            onClick={() => onMonthChange(new Date(year, monthIndex - 1, 1))}
            aria-label="Өмнөх сар"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            className="icon-button"
            onClick={() => onMonthChange(new Date(year, monthIndex + 1, 1))}
            aria-label="Дараагийн сар"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <h3>{monthLabel}</h3>
        <button
          className="secondary-button calendar-today"
          onClick={() => onMonthChange(new Date())}
        >
          Өнөөдөр
        </button>
      </div>
      <div className="calendar-grid">
        {["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"].map((day) => (
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
                {dayTasks.length > 3 && <small>+{dayTasks.length - 3} бусад</small>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineView({
  tasks,
  onEdit,
  onAdd,
}: {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onAdd: () => void;
}) {
  if (!tasks.length) return <EmptyState onAdd={onAdd} />;
  const starts = tasks.map((task) =>
    new Date(task.createdAt).setHours(0, 0, 0, 0),
  );
  const ends = tasks.map((task) =>
    new Date(`${task.dueDate}T23:59:59+08:00`).getTime(),
  );
  const rangeStart = Math.min(...starts);
  const rangeEnd = Math.max(...ends, rangeStart + 86_400_000);
  const range = Math.max(rangeEnd - rangeStart, 86_400_000);
  const markers = Array.from({ length: 5 }, (_, index) => {
    const value = new Date(rangeStart + (range * index) / 4);
    return {
      position: `${(index / 4) * 100}%`,
      label: new Intl.DateTimeFormat("mn-MN", {
        month: "short",
        day: "numeric",
        timeZone: "Asia/Ulaanbaatar",
      }).format(value),
    };
  });

  return (
    <div className="timeline-view">
      <div className="timeline-scale">
        <span />
        <div>
          {markers.map((marker) => (
            <span style={{ left: marker.position }} key={marker.position}>
              {marker.label}
            </span>
          ))}
        </div>
      </div>
      {tasks.map((task) => {
        const start = new Date(task.createdAt).setHours(0, 0, 0, 0);
        const end = new Date(`${task.dueDate}T23:59:59+08:00`).getTime();
        const left = Math.max(0, ((start - rangeStart) / range) * 100);
        const width = Math.max(2.5, ((Math.max(end, start) - start) / range) * 100);
        return (
          <button
            className="timeline-row"
            onClick={() => onEdit(task)}
            key={task.id}
          >
            <span>
              <strong>{task.title}</strong>
              <small>{STATUS_LABELS[task.status]} · {task.dueDate}</small>
            </span>
            <span className="timeline-track">
              {markers.map((marker) => (
                <i style={{ left: marker.position }} key={marker.position} />
              ))}
              <b
                className={statusClass[task.status]}
                style={{
                  left: `${left}%`,
                  width: `${Math.min(width, 100 - left)}%`,
                }}
              >
                <em style={{ width: `${task.progress}%` }} />
              </b>
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DashboardView({
  tasks,
  users,
}: {
  tasks: Task[];
  users: WorkspaceUser[];
}) {
  const total = tasks.length || 1;
  const statusCounts = STATUSES.map((status) => ({
    status,
    count: tasks.filter((task) => task.status === status).length,
  }));
  const priorityCounts = PRIORITIES.map((priority) => ({
    priority,
    count: tasks.filter((task) => task.priority === priority).length,
  }));
  const workload = users
    .filter((user) => user.active && user.id !== "unassigned")
    .map((user) => ({
      user,
      count: tasks.filter((task) =>
        taskAssignees(task).some((assignee) => assignee.id === user.id),
      ).length,
    }))
    .sort((a, b) => b.count - a.count);
  const maxWorkload = Math.max(...workload.map((item) => item.count), 1);

  return (
    <div className="dashboard-view">
      <section className="dashboard-card">
        <header>
          <span>
            <BarChart3 size={16} />
            Төлвийн хуваарилалт
          </span>
          <small>{tasks.length} таск</small>
        </header>
        <div className="chart-list">
          {statusCounts.map(({ status, count }) => (
            <div key={status}>
              <span>{STATUS_LABELS[status]}</span>
              <b>
                <i
                  className={statusClass[status]}
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </b>
              <strong>{count}</strong>
            </div>
          ))}
        </div>
      </section>
      <section className="dashboard-card">
        <header>
          <span>
            <Target size={16} />
            Ач холбогдол
          </span>
        </header>
        <div className="priority-donut-wrap">
          <div
            className="priority-donut"
            style={{
              background: `conic-gradient(
                #8b73ff 0 ${(priorityCounts[3].count / total) * 100}%,
                #ed5a70 ${(priorityCounts[3].count / total) * 100}% ${((priorityCounts[3].count + priorityCounts[2].count) / total) * 100}%,
                #ffb547 ${((priorityCounts[3].count + priorityCounts[2].count) / total) * 100}% ${((priorityCounts[3].count + priorityCounts[2].count + priorityCounts[1].count) / total) * 100}%,
                #21c8a8 ${((priorityCounts[3].count + priorityCounts[2].count + priorityCounts[1].count) / total) * 100}% 100%
              )`,
            }}
          >
            <span>
              <strong>{tasks.length}</strong>
              <small>нийт</small>
            </span>
          </div>
          <div className="donut-legend">
            {priorityCounts.map(({ priority, count }) => (
              <span className={priorityClass[priority]} key={priority}>
                <i /> {PRIORITY_LABELS[priority]} <strong>{count}</strong>
              </span>
            ))}
          </div>
        </div>
      </section>
      <section className="dashboard-card workload-card">
        <header>
          <span>
            <Users size={16} />
            Ажлын ачаалал
          </span>
          <small>Хариуцагчаар</small>
        </header>
        <div className="workload-list">
          {workload.map(({ user, count }) => (
            <div key={user.id}>
              <Avatar person={user} small />
              <span>
                <strong>{user.name}</strong>
                <b>
                  <i style={{ width: `${(count / maxWorkload) * 100}%` }} />
                </b>
              </span>
              <em>{count}</em>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="empty-state">
      <div>
        <FolderKanban size={28} />
      </div>
      <h3>Таск олдсонгүй</h3>
      <p>Шүүлтүүрээ өөрчлөх эсвэл энэ төсөлд шинэ таск нэмнэ үү.</p>
      <button className="primary-button" onClick={onAdd}>
        <Plus size={17} />
        Шинэ таск
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
    text: "Текст",
    number: "Тоо",
    date: "Огноо",
    status: "Төлөв",
    person: "Хүн",
    dropdown: "Сонголт",
    checkbox: "Чекбокс",
    progress: "Гүйцэтгэл",
    tags: "Таг",
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
              {column ? "Багана тохируулах" : "Нэмэлт талбар"}
            </span>
            <h2>{column ? "Багана засах" : "Багана нэмэх"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <div className="column-modal-content">
          <label className="form-field">
            <span>Баганын нэр</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Жишээ: Хүчин чармайлт, Харилцагч, Sprint"
              autoFocus
              required
            />
          </label>
          <div className="form-field">
            <span>Баганын төрөл</span>
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
              <span>Сонголтууд</span>
              <input
                value={options}
                onChange={(event) => setOptions(event.target.value)}
                placeholder="Сонголт нэг, Сонголт хоёр, Сонголт гурав"
              />
              <small className="field-hint">
                Сонголтуудыг таслалаар тусгаарлана. Дараа нь засах боломжтой.
              </small>
            </label>
          )}
          {column && column.type !== type && (
            <div className="column-warning">
              Одоогийн утгууд хадгалагдах боловч шинэ төрлөөр өөр харагдаж болно.
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
                    `“${column.name}” баганыг устгах уу? Одоогийн утгууд харагдахгүй болно.`,
                  )
                ) {
                  onDelete(column);
                }
              }}
            >
              <Trash2 size={16} />
              Багана устгах
            </button>
          ) : (
            <span />
          )}
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              Цуцлах
            </button>
            <button type="submit" className="primary-button">
              {column ? "Багана хадгалах" : "Багана нэмэх"}
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
        {value === true ? "Сонгосон" : "Сонгоогүй"}
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
        <option value="">Хуваарилаагүй</option>
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
        <option value="">Сонгох...</option>
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
        placeholder="Таг нэг, Таг хоёр"
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
      placeholder="Утга нэмэх"
    />
  );
}

function TaskModal({
  task,
  parentTask,
  subtasks,
  defaultProject,
  projects,
  allTasks,
  defaultAssignee,
  users,
  columns,
  onClose,
  onSave,
  onCreateSubtask,
  onUpdateSubtask,
  onDelete,
  onArchive,
  readOnly,
  canAssign,
  currentUser,
  mode,
  workspaceId,
}: {
  task: Task | null;
  parentTask: Task | null;
  subtasks: Task[];
  defaultProject: Project | undefined;
  projects: Project[];
  allTasks: Task[];
  defaultAssignee: WorkspaceUser;
  users: WorkspaceUser[];
  columns: CustomColumn[];
  onClose: () => void;
  onSave: (draft: TaskDraft, id?: string) => void;
  onCreateSubtask: (parent: Task, title: string) => void;
  onUpdateSubtask: (id: string, changes: Partial<Task>) => void;
  onDelete?: (task: Task) => void;
  onArchive?: (task: Task) => void;
  readOnly: boolean;
  canAssign: boolean;
  currentUser: WorkspaceUser;
  mode: PersistenceMode;
  workspaceId: string;
}) {
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [projectId, setProjectId] = useState(
    task?.projectId ?? defaultProject?.id ?? projects[0]?.id ?? "",
  );
  const [group, setGroup] = useState(
    task?.group ?? parentTask?.group ?? "This week",
  );
  const [status, setStatus] = useState<TaskStatus>(task?.status ?? "Not started");
  const [priority, setPriority] = useState<TaskPriority>(
    task?.priority ?? parentTask?.priority ?? "Medium",
  );
  const [assigneeIds, setAssigneeIds] = useState<string[]>(
    task
      ? taskAssignees(task).map((assignee) => assignee.id)
      : parentTask
        ? taskAssignees(parentTask).map((assignee) => assignee.id)
        : [defaultAssignee.id],
  );
  const [dueDate, setDueDate] = useState(
    task?.dueDate ??
      parentTask?.dueDate ??
      new Date().toISOString().slice(0, 10),
  );
  const [recurrence, setRecurrence] = useState<TaskRecurrence>(
    task?.recurrence ?? "none",
  );
  const [dependencyIds, setDependencyIds] = useState<string[]>(
    task?.dependencyIds ?? [],
  );
  const [tags, setTags] = useState(task?.tags.join(", ") ?? "");
  const [progress, setProgress] = useState(task?.progress ?? 0);
  const [customFields, setCustomFields] = useState<
    Record<string, CustomFieldValue>
  >(task?.customFields ?? {});
  const [subtaskTitle, setSubtaskTitle] = useState("");

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
    const assignees = users.filter((person) => assigneeIds.includes(person.id));
    const assignee = assignees[0] ?? defaultAssignee;
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
        assignees: assignees.length ? assignees : [assignee],
        parentId: task?.parentId ?? parentTask?.id ?? null,
        dependencyIds,
        recurrence,
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
            <span className="panel-kicker">
              {task ? "Таскийн мэдээлэл" : parentTask ? "Дэд таск үүсгэх" : "Таск үүсгэх"}
            </span>
            <h2>
              {task
                ? readOnly
                  ? "Таск харах"
                  : "Таск засах"
                : parentTask
                  ? `“${parentTask.title}” таскийг задлах`
                  : "Шинэ ажил нэмэх"}
            </h2>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            <X size={19} />
          </button>
        </div>
        <fieldset className="modal-content" disabled={readOnly}>
          {parentTask && (
            <div className="parent-task-banner full-field">
              <ListTree size={17} />
              <span>
                <small>Үндсэн таск</small>
                <strong>{parentTask.title}</strong>
              </span>
            </div>
          )}
          <label className="form-field full-field">
            <span>Таскийн нэр</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Юу хийх шаардлагатай вэ?"
              autoFocus
              required
            />
          </label>
          <label className="form-field full-field">
            <span>Тайлбар</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Нөхцөл, товч мэдээлэл эсвэл тэмдэглэл нэмэх..."
              rows={3}
            />
          </label>
          <label className="form-field">
            <span>Төсөл</span>
            <select
              value={projectId}
              disabled={Boolean(parentTask)}
              onChange={(event) => {
                setProjectId(event.target.value);
                setDependencyIds([]);
              }}
            >
              {projects.map((project) => (
                <option value={project.id} key={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Бүлэг</span>
            <input
              list="task-group-options"
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              placeholder="Жишээ: Энэ долоо хоног"
              required
            />
            <datalist id="task-group-options">
              {["This week", "Upcoming", "Completed"].map((name) => (
                <option value={name} key={name}>
                  {groupLabel(name)}
                </option>
              ))}
            </datalist>
          </label>
          <label className="form-field">
            <span>Төлөв</span>
            <select
              value={status}
              onChange={(event) => {
                const nextStatus = event.target.value as TaskStatus;
                setStatus(nextStatus);
                if (nextStatus === "Done") setProgress(100);
              }}
            >
              {STATUSES.map((name) => (
                <option value={name} key={name}>
                  {STATUS_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Ач холбогдол</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as TaskPriority)}
            >
              {PRIORITIES.map((name) => (
                <option value={name} key={name}>
                  {PRIORITY_LABELS[name]}
                </option>
              ))}
            </select>
          </label>
          <div className="form-field full-field">
            <span>Хариуцагчид</span>
            <div className="modal-assignee-grid">
              {users
                .filter((person) => person.active && person.id !== "unassigned")
                .map((person) => {
                  const selected = assigneeIds.includes(person.id);
                  return (
                    <button
                      type="button"
                      className={selected ? "selected" : ""}
                      disabled={!canAssign}
                      onClick={() =>
                        setAssigneeIds((current) => {
                          if (current.includes(person.id)) {
                            return current.length === 1
                              ? current
                              : current.filter((id) => id !== person.id);
                          }
                          return [...current, person.id];
                        })
                      }
                      key={person.id}
                    >
                      <Avatar person={person} small />
                      <span>
                        <strong>{person.name}</strong>
                        <small>{ROLE_LABELS[person.role]}</small>
                      </span>
                      <i>{selected && <Check size={12} strokeWidth={3} />}</i>
                    </button>
                  );
                })}
            </div>
            {!canAssign && (
              <small className="field-hint">
                Таны эрх таскийн хариуцагчийг өөрчлөх боломжгүй.
              </small>
            )}
          </div>
          <label className="form-field">
            <span>Эцсийн хугацаа</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              required
            />
          </label>
          <label className="form-field">
            <span>Давтамж</span>
            <select
              value={recurrence}
              onChange={(event) =>
                setRecurrence(event.target.value as TaskRecurrence)
              }
            >
              <option value="none">Давтахгүй</option>
              <option value="daily">Өдөр бүр</option>
              <option value="weekly">Долоо хоног бүр</option>
              <option value="monthly">Сар бүр</option>
            </select>
          </label>
          {!parentTask && (
            <div className="form-field full-field">
              <span>Хамаарал · эхлүүлэхийн өмнө дууссан байх таск</span>
              <div className="dependency-grid">
                {allTasks
                  .filter(
                    (candidate) =>
                      !candidate.parentId &&
                      !candidate.archived &&
                      candidate.projectId === projectId &&
                      candidate.id !== task?.id,
                  )
                  .map((candidate) => {
                    const selected = dependencyIds.includes(candidate.id);
                    return (
                      <button
                        type="button"
                        className={selected ? "selected" : ""}
                        onClick={() =>
                          setDependencyIds((current) =>
                            selected
                              ? current.filter((id) => id !== candidate.id)
                              : [...current, candidate.id],
                          )
                        }
                        key={candidate.id}
                      >
                        <span
                          className={`status-dot ${statusClass[candidate.status]}`}
                        />
                        <span>
                          <strong>{candidate.title}</strong>
                          <small>
                            {STATUS_LABELS[candidate.status]} · {candidate.dueDate}
                          </small>
                        </span>
                        <i>{selected && <Check size={12} />}</i>
                      </button>
                    );
                  })}
                {!allTasks.some(
                  (candidate) =>
                    !candidate.parentId &&
                    !candidate.archived &&
                    candidate.projectId === projectId &&
                    candidate.id !== task?.id,
                ) && (
                  <small className="field-hint">
                    Хамаарал сонгох өөр таск одоогоор алга.
                  </small>
                )}
              </div>
            </div>
          )}
          <label className="form-field full-field">
            <span>Таг</span>
            <input
              value={tags}
              onChange={(event) => setTags(event.target.value)}
              placeholder="Дизайн, Судалгаа, Frontend"
            />
          </label>
          {task && !task.parentId && (
            <div className="subtask-editor full-field">
              <div className="subtask-editor-heading">
                <span>
                  <ListTree size={15} />
                  Дэд таск
                </span>
                <small>
                  {subtasks.filter((subtask) => subtask.status === "Done").length}/
                  {subtasks.length} дууссан
                </small>
              </div>
              <div className="subtask-editor-list">
                {subtasks.map((subtask) => (
                  <div className="subtask-editor-row" key={subtask.id}>
                    <button
                      type="button"
                      className={`task-check ${subtask.status === "Done" ? "checked" : ""}`}
                      onClick={() =>
                        onUpdateSubtask(subtask.id, {
                          status:
                            subtask.status === "Done" ? "Not started" : "Done",
                          progress: subtask.status === "Done" ? 0 : 100,
                        })
                      }
                    >
                      {subtask.status === "Done" && (
                        <Check size={12} strokeWidth={3} />
                      )}
                    </button>
                    <span>
                      <strong
                        className={
                          subtask.status === "Done" ? "completed-title" : ""
                        }
                      >
                        {subtask.title}
                      </strong>
                      <small>{STATUS_LABELS[subtask.status]}</small>
                    </span>
                    <span className="assignee-stack">
                      {taskAssignees(subtask).slice(0, 2).map((person) => (
                        <Avatar person={person} small key={person.id} />
                      ))}
                    </span>
                  </div>
                ))}
                {!subtasks.length && (
                  <p className="subtask-empty">
                    Энэ таскийг жижиг, хуваарилах боломжтой алхмуудад задлаарай.
                  </p>
                )}
              </div>
              {!readOnly && (
                <div className="subtask-quick-add">
                  <Plus size={15} />
                  <input
                    value={subtaskTitle}
                    onChange={(event) => setSubtaskTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && subtaskTitle.trim()) {
                        event.preventDefault();
                        onCreateSubtask(task, subtaskTitle);
                        setSubtaskTitle("");
                      }
                    }}
                    placeholder="Дэд таск бичээд Enter дарна уу"
                  />
                  <button
                    type="button"
                    disabled={!subtaskTitle.trim()}
                    onClick={() => {
                      onCreateSubtask(task, subtaskTitle);
                      setSubtaskTitle("");
                    }}
                  >
                    Нэмэх
                  </button>
                </div>
              )}
            </div>
          )}
          {columns.length > 0 && (
            <div className="custom-fields-editor full-field">
              <div className="custom-fields-title">
                <span>Нэмэлт талбар</span>
                <small>{columns.length} багана</small>
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
              Гүйцэтгэл <strong>{progress}%</strong>
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
        {task && (
          <TaskCollaboration
            taskId={task.id}
            currentUser={currentUser}
            users={users}
            mode={mode}
            workspaceId={workspaceId}
          />
        )}
        <div className="modal-footer">
          <div className="modal-danger-actions">
            {task && onArchive && (
              <button
                type="button"
                className="archive-button"
                onClick={() => onArchive(task)}
              >
                {task.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
                {task.archived ? "Сэргээх" : "Архивлах"}
              </button>
            )}
            {task && onDelete && (
              <button
                type="button"
                className="delete-button"
                onClick={() => {
                  if (window.confirm(`“${task.title}” таскийг бүрмөсөн устгах уу?`)) {
                    onDelete(task);
                  }
                }}
              >
                <Trash2 size={16} />
                Устгах
              </button>
            )}
          </div>
          <div>
            <button type="button" className="secondary-button" onClick={onClose}>
              {readOnly ? "Хаах" : "Цуцлах"}
            </button>
            {!readOnly && (
              <button type="submit" className="primary-button">
                {task ? "Өөрчлөлт хадгалах" : "Таск үүсгэх"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
