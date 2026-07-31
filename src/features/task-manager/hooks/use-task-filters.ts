"use client";

import { useMemo, useState } from "react";
import { isOverdue } from "@/lib/format";
import type {
  Task,
  TaskPriority,
  TaskStatus,
  WorkspaceUser,
} from "@/lib/types";
import { taskAssignees } from "@/features/task-manager/lib/task-visuals";

export function useTaskFilters({
  tasks,
  activeProject,
  currentUser,
}: {
  tasks: Task[];
  activeProject: string;
  currentUser: WorkspaceUser;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "All">("All");
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | "All"
  >("All");
  const [assigneeFilter, setAssigneeFilter] = useState("All");
  const [tagFilter, setTagFilter] = useState("All");
  const [dueFilter, setDueFilter] = useState<
    "All" | "overdue" | "today" | "week"
  >("All");

  const projectTasks = useMemo(() => {
    if (activeProject === "Archive") {
      return tasks.filter((task) => task.archived);
    }
    const activeTasks = tasks.filter((task) => !task.archived);
    if (activeProject === "My work") {
      return activeTasks.filter((task) =>
        taskAssignees(task).some(
          (assignee) => assignee.id === currentUser.id,
        ),
      );
    }
    return activeProject === "All tasks"
      ? activeTasks
      : activeTasks.filter((task) => task.projectId === activeProject);
  }, [activeProject, currentUser.id, tasks]);

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
      const matchesStatus =
        statusFilter === "All" || task.status === statusFilter;
      const matchesPriority =
        priorityFilter === "All" || task.priority === priorityFilter;
      const matchesAssignee =
        assigneeFilter === "All" ||
        taskAssignees(task).some(
          (assignee) => assignee.id === assigneeFilter,
        );
      const matchesTag =
        tagFilter === "All" || task.tags.includes(tagFilter);
      const taskDue = new Date(`${task.dueDate}T23:59:59+08:00`);
      const matchesDue =
        dueFilter === "All" ||
        (dueFilter === "overdue" &&
          isOverdue(task.dueDate, task.status)) ||
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
      Array.from(new Set(projectTasks.flatMap((task) => task.tags))).sort(
        (a, b) => a.localeCompare(b),
      ),
    [projectTasks],
  );

  const summaryTasks = projectTasks.filter((task) => !task.parentId);
  const doneCount = summaryTasks.filter(
    (task) => task.status === "Done",
  ).length;
  const activeCount = summaryTasks.filter(
    (task) => task.status === "Working on it",
  ).length;
  const overdueCount = summaryTasks.filter((task) =>
    isOverdue(task.dueDate, task.status),
  ).length;
  const completion = summaryTasks.length
    ? Math.round((doneCount / summaryTasks.length) * 100)
    : 0;

  return {
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
  };
}
