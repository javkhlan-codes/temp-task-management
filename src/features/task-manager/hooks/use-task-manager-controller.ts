"use client";

import { useCallback, useEffect, useState } from "react";
import { ROLE_LABELS, canEditTask, hasPermission } from "@/lib/permissions";
import {
  PRIORITY_LABELS,
  STATUS_LABELS,
  groupLabel,
  type CustomColumn,
  type CustomFieldValue,
  type Project,
  type Task,
  type TaskDraft,
  type ViewMode,
  type WorkspaceSummary,
  type WorkspaceUser,
} from "@/lib/types";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";
import { useTaskFilters } from "@/features/task-manager/hooks/use-task-filters";
import { useWorkspaceData } from "@/features/task-manager/hooks/use-workspace-data";

const STORAGE_KEY = "nimbus-tasks-v2";
const COLUMNS_STORAGE_KEY = "nimbus-columns-v2";
const USERS_STORAGE_KEY = "nimbus-users-v2";
const PROJECTS_STORAGE_KEY = "nimbus-projects-v2";

type PersistenceMode = "loading" | "local" | "database";

const EMPTY_USER: WorkspaceUser = {
  id: "unassigned",
  name: "Unassigned",
  email: "",
  initials: "?",
  tone: "slate",
  role: "viewer",
  active: false,
};

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

export function useTaskManagerController() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [columns, setColumns] = useState<CustomColumn[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<WorkspaceUser[]>([]);
  const [currentUser, setCurrentUser] = useState<WorkspaceUser>(EMPTY_USER);
  const {
    workspaces,
    setWorkspaces,
    activeWorkspaceId,
    setActiveWorkspaceId,
    workspaceMenuOpen,
    setWorkspaceMenuOpen,
    newWorkspaceName,
    setNewWorkspaceName,
    creatingWorkspace,
    setCreatingWorkspace,
  } = useWorkspaceData();
  const [sessionReady, setSessionReady] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [mode, setMode] = useState<PersistenceMode>("loading");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [view, setView] = useState<ViewMode>("list");
  const [activeProject, setActiveProject] = useState("All tasks");
  const {
    query,
    setQuery,
    statusFilter,
    setStatusFilter,
    priorityFilter,
    setPriorityFilter,
    assigneeFilter,
    setAssigneeFilter,
    tagFilter,
    setTagFilter,
    dueFilter,
    setDueFilter,
    visibleTasks,
    availableTags,
    summaryTasks,
    doneCount,
    activeCount,
    overdueCount,
    completion,
  } = useTaskFilters({ tasks, activeProject, currentUser });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [inlineTaskFocusRequest, setInlineTaskFocusRequest] = useState(0);
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
          EMPTY_USER,
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
    document.documentElement.classList.toggle("dark", nextTheme === "dark");

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
        // Fall back to the browser's current workspace data when the API is offline.
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
              EMPTY_USER,
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

  const authenticated = async (user: WorkspaceUser) => {
    setCurrentUser(user);
    setSignedIn(true);
    setSessionReady(true);

    let selectedWorkspaceId = activeWorkspaceId;
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

      if (!(await loadWorkspaceData(selectedWorkspaceId, user.id))) {
        setMode("local");
      }
    } catch {
      setMode("local");
    }
  };

  const deleteWorkspace = async (workspaceId: string) => {
    const target = workspaces.find((workspace) => workspace.id === workspaceId);
    if (!target || target.id === "workspace-acme" || target.role !== "admin") {
      setToast("Үндсэн workspace эсвэл таны admin биш workspace-ийг устгах боломжгүй");
      return;
    }
    try {
      const response = await fetch(`/api/workspaces/${workspaceId}`, {
        method: "DELETE",
        headers: { "x-workspace-id": workspaceId },
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Workspace устгах боломжгүй");
      }

      const remaining = workspaces.filter((workspace) => workspace.id !== workspaceId);
      setWorkspaces(remaining);
      setWorkspaceMenuOpen(false);
      if (activeWorkspaceId === workspaceId) {
        const fallback = remaining[0];
        if (fallback) await switchWorkspace(fallback.id);
      }
      setToast("Workspace устгагдлаа");
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Workspace устгах боломжгүй");
    }
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

  const startNewTask = () => {
    if (!hasPermission(currentUser, "createTask")) {
      setToast(`${ROLE_LABELS[currentUser.role]} нь зөвхөн унших эрхтэй`);
      return;
    }
    if (!projects.some((project) => !project.archived)) {
      setToast("Эхлээд төсөл үүсгэнэ үү");
      setEditingProject("new");
      return;
    }
    setView("list");
    setInlineTaskFocusRequest((current) => current + 1);
  };

  const createInlineTask = (title: string, group: string) => {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const selectedProject =
      projects.find(
        (project) => project.id === activeProject && !project.archived,
      ) ?? projects.find((project) => !project.archived);
    if (!selectedProject) {
      setToast("Эхлээд төсөл үүсгэнэ үү");
      setEditingProject("new");
      return;
    }

    saveTask({
      title: nextTitle,
      description: "",
      projectId: selectedProject.id,
      project: selectedProject.name,
      group,
      status: "Not started",
      priority: "Medium",
      assignee: currentUser,
      assignees: [currentUser],
      parentId: null,
      dependencyIds: [],
      recurrence: "none",
      dueDate: new Date().toISOString().slice(0, 10),
      tags: [],
      progress: 0,
      customFields: {},
    });
  };

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    localStorage.setItem("nimbus-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
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


  return {
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
    inlineTaskFocusRequest,
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
    deleteWorkspace,
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
    startNewTask,
    createInlineTask,
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
  };
}
