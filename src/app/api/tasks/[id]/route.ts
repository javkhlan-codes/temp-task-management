import { NextResponse } from "next/server";
import { authorize, getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { canAccessEveryProject, hasPermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const task = (await request.json()) as Task;
    if (!task.title?.trim()) {
      return NextResponse.json({ error: "Task title is required" }, { status: 400 });
    }
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const workspaceId = getWorkspaceId(request);
    const existingRows = await sql`
      SELECT
        tasks.assignee,
        tasks.archived,
        tasks.project_id,
        tasks.status,
        tasks.recurrence,
        COALESCE(
          ARRAY(
            SELECT user_id
            FROM task_assignees
            WHERE task_id = tasks.id
            ORDER BY assigned_at
          ),
          ARRAY[tasks.assignee_id]
        ) AS assignee_ids
      FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE tasks.id = ${id} AND projects.workspace_id = ${workspaceId}
        AND (
          ${canAccessEveryProject(actor)}
          OR EXISTS (
            SELECT 1
            FROM project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = ${actor.id}
          )
        )
      LIMIT 1
    `;
    if (!existingRows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    const existing = existingRows[0] as {
      assignee: Task["assignee"];
      archived: boolean;
      project_id: string;
      status: Task["status"];
      recurrence: Task["recurrence"];
      assignee_ids: string[];
    };
    const nextAssignees =
      task.assignees?.length ? task.assignees : [task.assignee];
    const dependencyIds = Array.from(
      new Set((task.dependencyIds ?? []).map(String)),
    ).filter((dependencyId) => dependencyId !== id);
    const recurrence = task.recurrence ?? "none";
    if (!["none", "daily", "weekly", "monthly"].includes(recurrence)) {
      return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
    }
    const nextAssigneeIds = Array.from(
      new Set(nextAssignees.map((assignee) => assignee.id)),
    );
    const existingAssigneeIds = existing.assignee_ids?.filter(Boolean).length
      ? existing.assignee_ids.filter(Boolean)
      : [existing.assignee.id];
    const canEdit =
      hasPermission(actor, "editAnyTask") ||
      (hasPermission(actor, "editOwnTask") &&
        existingAssigneeIds.includes(actor.id));
    if (!canEdit) {
      return NextResponse.json(
        { error: "You cannot edit this task" },
        { status: 403 },
      );
    }
    if (
      existing.archived !== Boolean(task.archived) &&
      !hasPermission(actor, "archiveTask")
    ) {
      return NextResponse.json(
        { error: "Your role cannot archive or restore tasks" },
        { status: 403 },
      );
    }
    if (
      (existingAssigneeIds.length !== nextAssigneeIds.length ||
        existingAssigneeIds.some((id) => !nextAssigneeIds.includes(id))) &&
      !hasPermission(actor, "assignTasks")
    ) {
      return NextResponse.json(
        { error: "Your role cannot reassign tasks" },
        { status: 403 },
      );
    }
    const projectRows = await sql`
      SELECT name
      FROM projects
      WHERE id = ${task.projectId}
        AND workspace_id = ${workspaceId}
        AND (${task.archived ?? false} OR archived = FALSE)
        AND (
          ${canAccessEveryProject(actor)}
          OR EXISTS (
            SELECT 1
            FROM project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = ${actor.id}
          )
        )
      LIMIT 1
    `;
    if (!projectRows.length) {
      return NextResponse.json(
        { error: "Target project not found in this workspace" },
        { status: 400 },
      );
    }
    const assigneeRows = await sql`
      SELECT user_id
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
        AND user_id = ANY(${nextAssigneeIds}::text[])
        AND active = TRUE
    `;
    if (assigneeRows.length !== nextAssigneeIds.length) {
      return NextResponse.json(
        { error: "Every assignee must be an active workspace member" },
        { status: 400 },
      );
    }
    if (task.parentId) {
      const parentRows = await sql`
        SELECT 1
        FROM tasks
        WHERE id = ${task.parentId}
          AND project_id = ${task.projectId}
          AND parent_id IS NULL
        LIMIT 1
      `;
      if (!parentRows.length) {
        return NextResponse.json(
          { error: "Subtask parent must be a top-level task in this project" },
          { status: 400 },
        );
      }
    }
    if (dependencyIds.length) {
      const dependencyRows = await sql`
        SELECT tasks.id
        FROM tasks
        JOIN projects ON projects.id = tasks.project_id
        WHERE tasks.id = ANY(${dependencyIds}::text[])
          AND tasks.project_id = ${task.projectId}
          AND projects.workspace_id = ${workspaceId}
      `;
      if (dependencyRows.length !== dependencyIds.length) {
        return NextResponse.json(
          { error: "Every dependency must belong to the same project" },
          { status: 400 },
        );
      }
      const cycleRows = await sql`
        WITH RECURSIVE dependency_chain AS (
          SELECT task_id, depends_on_id
          FROM task_dependencies
          WHERE task_id = ANY(${dependencyIds}::text[])
          UNION
          SELECT next_dependency.task_id, next_dependency.depends_on_id
          FROM task_dependencies next_dependency
          JOIN dependency_chain
            ON next_dependency.task_id = dependency_chain.depends_on_id
        )
        SELECT 1
        FROM dependency_chain
        WHERE depends_on_id = ${id}
        LIMIT 1
      `;
      if (cycleRows.length) {
        return NextResponse.json(
          { error: "Task dependencies cannot form a cycle" },
          { status: 409 },
        );
      }
    }
    const primaryAssignee =
      nextAssignees.find(
        (assignee) => assignee.id === nextAssigneeIds[0],
      ) ?? task.assignee;

    const rows = await sql`
      UPDATE tasks
      SET
        title = ${task.title.trim()},
        project_id = ${task.projectId},
        project = ${String(projectRows[0].name)},
        group_name = ${task.group},
        status = ${task.status},
        priority = ${task.priority},
        assignee_id = ${primaryAssignee.id},
        assignee = ${JSON.stringify(primaryAssignee)}::jsonb,
        parent_id = ${task.parentId ?? null},
        recurrence = ${recurrence},
        due_date = ${task.dueDate}::date,
        tags = ${task.tags},
        progress = ${task.progress},
        description = ${task.description},
        custom_fields = ${JSON.stringify(task.customFields ?? {})}::jsonb,
        archived = ${task.archived ?? false},
        archived_at = ${task.archivedAt ?? null}::timestamptz,
        archived_by = ${
          task.archived ? actor.id : null
        },
        updated_by = ${actor.id},
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    await sql`DELETE FROM task_assignees WHERE task_id = ${id}`;
    for (const assigneeId of nextAssigneeIds) {
      await sql`
        INSERT INTO task_assignees (task_id, user_id, assigned_by)
        VALUES (${id}, ${assigneeId}, ${actor.id})
        ON CONFLICT (task_id, user_id) DO UPDATE SET
          assigned_by = EXCLUDED.assigned_by,
          assigned_at = NOW()
      `;
    }
    await sql`DELETE FROM task_dependencies WHERE task_id = ${id}`;
    for (const dependencyId of dependencyIds) {
      await sql`
        INSERT INTO task_dependencies (task_id, depends_on_id, created_by)
        VALUES (${id}, ${dependencyId}, ${actor.id})
        ON CONFLICT (task_id, depends_on_id) DO NOTHING
      `;
    }
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${id}, ${actor.id},
        ${task.archived ? "task.archived" : "task.updated"},
        ${JSON.stringify({ title: task.title })}::jsonb
      )
    `;
    const newlyAssigned = nextAssigneeIds.filter(
      (assigneeId) => !existingAssigneeIds.includes(assigneeId),
    );
    if (newlyAssigned.length) {
      await notifyUsers(sql, {
        workspaceId,
        userIds: newlyAssigned,
        actorId: actor.id,
        taskId: id,
        type: "task.assigned",
        title: `${actor.name} assigned you a task`,
        body: task.title,
      });
    }
    if (existing.status !== task.status) {
      await notifyUsers(sql, {
        workspaceId,
        userIds: nextAssigneeIds,
        actorId: actor.id,
        taskId: id,
        type: "task.status_changed",
        title: `${actor.name} changed a task status`,
        body: `${task.title}: ${existing.status} → ${task.status}`,
      });
    }
    return NextResponse.json({
      task: {
        ...task,
        assignee: primaryAssignee,
        assignees: nextAssignees,
        parentId: task.parentId ?? null,
        dependencyIds,
        recurrence,
      },
    });
  } catch (error) {
    console.error("Unable to update task", error);
    return NextResponse.json({ error: "Unable to update task" }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const { id } = await context.params;
    const auth = await authorize(request, sql, "deleteTask");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      DELETE FROM tasks
      USING projects
      WHERE tasks.id = ${id}
        AND projects.id = tasks.project_id
        AND projects.workspace_id = ${workspaceId}
      RETURNING tasks.id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete task", error);
    return NextResponse.json({ error: "Unable to delete task" }, { status: 500 });
  }
}
