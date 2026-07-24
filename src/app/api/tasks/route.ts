import { NextResponse } from "next/server";
import { authorize, getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase, rowToTask } from "@/lib/db";
import { canAccessEveryProject, hasPermission } from "@/lib/permissions";
import { notifyUsers } from "@/lib/notifications";
import type { Task } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      SELECT
        tasks.id, tasks.title, tasks.project_id, projects.name AS project,
        tasks.group_name, tasks.status, tasks.priority, tasks.assignee,
        tasks.parent_id, tasks.recurrence,
        ARRAY(
          SELECT task_dependencies.depends_on_id
          FROM task_dependencies
          WHERE task_dependencies.task_id = tasks.id
          ORDER BY task_dependencies.created_at
        ) AS dependency_ids,
        COALESCE(
          (
            SELECT JSONB_AGG(
              JSONB_BUILD_OBJECT(
                'id', users.id,
                'name', users.name,
                'email', users.email,
                'initials', users.initials,
                'tone', users.tone,
                'role', workspace_members.role,
                'active', workspace_members.active
              )
              ORDER BY task_assignees.assigned_at
            )
            FROM task_assignees
            JOIN users ON users.id = task_assignees.user_id
            JOIN workspace_members
              ON workspace_members.user_id = users.id
              AND workspace_members.workspace_id = projects.workspace_id
            WHERE task_assignees.task_id = tasks.id
          ),
          JSONB_BUILD_ARRAY(tasks.assignee)
        ) AS assignees,
        TO_CHAR(tasks.due_date, 'YYYY-MM-DD') AS due_date,
        tasks.tags, tasks.progress, tasks.description, tasks.custom_fields,
        tasks.archived, tasks.archived_at, tasks.created_at
      FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE projects.workspace_id = ${workspaceId}
        AND (
          ${canAccessEveryProject(actor)}
          OR EXISTS (
            SELECT 1
            FROM project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = ${actor.id}
          )
        )
      ORDER BY tasks.created_at DESC
    `;
    return NextResponse.json({ tasks: rows.map((row) => rowToTask(row as never)) });
  } catch (error) {
    console.error("Unable to load tasks", error);
    return NextResponse.json(
      { error: "Unable to load tasks. Run npm run db:setup first." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 },
    );
  }

  try {
    const task = (await request.json()) as Task;
    if (!task.id || !task.title?.trim()) {
      return NextResponse.json({ error: "Task id and title are required" }, { status: 400 });
    }
    const auth = await authorize(request, sql, "createTask");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const assignees =
      task.assignees?.length ? task.assignees : [task.assignee];
    const dependencyIds = Array.from(
      new Set((task.dependencyIds ?? []).map(String)),
    ).filter((dependencyId) => dependencyId !== task.id);
    const recurrence = task.recurrence ?? "none";
    if (!["none", "daily", "weekly", "monthly"].includes(recurrence)) {
      return NextResponse.json({ error: "Invalid recurrence" }, { status: 400 });
    }
    const assigneeIds = Array.from(
      new Set(assignees.map((assignee) => assignee.id)),
    );
    if (
      (assigneeIds.length !== 1 || assigneeIds[0] !== auth.user.id) &&
      !hasPermission(auth.user, "assignTasks")
    ) {
      return NextResponse.json(
        { error: "You can only assign new tasks to yourself" },
        { status: 403 },
      );
    }
    const projects = await sql`
      SELECT name
      FROM projects
      WHERE id = ${task.projectId}
        AND workspace_id = ${workspaceId}
        AND archived = FALSE
        AND (
          ${canAccessEveryProject(auth.user)}
          OR EXISTS (
            SELECT 1
            FROM project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = ${auth.user.id}
          )
        )
      LIMIT 1
    `;
    if (!projects.length) {
      return NextResponse.json(
        { error: "Active project not found in this workspace" },
        { status: 400 },
      );
    }
    const assigneeRows = await sql`
      SELECT user_id
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
        AND user_id = ANY(${assigneeIds}::text[])
        AND active = TRUE
    `;
    if (assigneeRows.length !== assigneeIds.length) {
      return NextResponse.json(
        { error: "Every assignee must be an active workspace member" },
        { status: 400 },
      );
    }
    if (task.parentId) {
      const parents = await sql`
        SELECT 1
        FROM tasks
        WHERE id = ${task.parentId}
          AND project_id = ${task.projectId}
          AND parent_id IS NULL
        LIMIT 1
      `;
      if (!parents.length) {
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
    }

    const primaryAssignee =
      assignees.find((assignee) => assignee.id === assigneeIds[0]) ??
      task.assignee;

    await sql`
      INSERT INTO tasks (
        id, title, project_id, project, group_name, status, priority,
        assignee_id, assignee, parent_id, created_by, updated_by,
        recurrence, due_date, tags, progress, description, created_at,
        custom_fields, archived, archived_at
      )
      VALUES (
        ${task.id}, ${task.title.trim()}, ${task.projectId},
        ${String(projects[0].name)}, ${task.group},
        ${task.status}, ${task.priority}, ${primaryAssignee.id},
        ${JSON.stringify(primaryAssignee)}::jsonb, ${task.parentId ?? null},
        ${auth.user.id}, ${auth.user.id},
        ${recurrence}, ${task.dueDate}::date, ${task.tags}, ${task.progress},
        ${task.description}, ${task.createdAt}::timestamptz,
        ${JSON.stringify(task.customFields ?? {})}::jsonb,
        ${task.archived ?? false},
        ${task.archivedAt ?? null}::timestamptz
      )
    `;
    for (const assigneeId of assigneeIds) {
      await sql`
        INSERT INTO task_assignees (task_id, user_id, assigned_by)
        VALUES (${task.id}, ${assigneeId}, ${auth.user.id})
        ON CONFLICT (task_id, user_id) DO NOTHING
      `;
    }
    for (const dependencyId of dependencyIds) {
      await sql`
        INSERT INTO task_dependencies (task_id, depends_on_id, created_by)
        VALUES (${task.id}, ${dependencyId}, ${auth.user.id})
        ON CONFLICT (task_id, depends_on_id) DO NOTHING
      `;
    }
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${task.id}, ${auth.user.id},
        'task.created', ${JSON.stringify({ title: task.title })}::jsonb
      )
    `;
    await notifyUsers(sql, {
      workspaceId,
      userIds: assigneeIds,
      actorId: auth.user.id,
      taskId: task.id,
      type: "task.assigned",
      title: `${auth.user.name} assigned you a task`,
      body: task.title,
    });

    return NextResponse.json(
      {
        task: {
          ...task,
          assignee: primaryAssignee,
          assignees,
          parentId: task.parentId ?? null,
          dependencyIds,
          recurrence,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create task", error);
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}
