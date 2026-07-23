import { NextResponse } from "next/server";
import { authorize, getActor, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase, rowToTask } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
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
        TO_CHAR(tasks.due_date, 'YYYY-MM-DD') AS due_date,
        tasks.tags, tasks.progress, tasks.description, tasks.custom_fields,
        tasks.archived, tasks.archived_at, tasks.created_at
      FROM tasks
      JOIN projects ON projects.id = tasks.project_id
      WHERE projects.workspace_id = ${workspaceId}
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
    if (
      task.assignee.id !== auth.user.id &&
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
      LIMIT 1
    `;
    if (!projects.length) {
      return NextResponse.json(
        { error: "Active project not found in this workspace" },
        { status: 400 },
      );
    }
    const assignees = await sql`
      SELECT 1
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
        AND user_id = ${task.assignee.id}
        AND active = TRUE
      LIMIT 1
    `;
    if (!assignees.length) {
      return NextResponse.json(
        { error: "Assignee must be an active workspace member" },
        { status: 400 },
      );
    }

    await sql`
      INSERT INTO tasks (
        id, title, project_id, project, group_name, status, priority,
        assignee_id, assignee, created_by, updated_by,
        due_date, tags, progress, description, created_at,
        custom_fields, archived, archived_at
      )
      VALUES (
        ${task.id}, ${task.title.trim()}, ${task.projectId},
        ${String(projects[0].name)}, ${task.group},
        ${task.status}, ${task.priority}, ${task.assignee.id},
        ${JSON.stringify(task.assignee)}::jsonb,
        ${auth.user.id}, ${auth.user.id},
        ${task.dueDate}::date, ${task.tags}, ${task.progress},
        ${task.description}, ${task.createdAt}::timestamptz,
        ${JSON.stringify(task.customFields ?? {})}::jsonb,
        ${task.archived ?? false},
        ${task.archivedAt ?? null}::timestamptz
      )
    `;
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, task_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${task.projectId}, ${task.id}, ${auth.user.id},
        'task.created', ${JSON.stringify({ title: task.title })}::jsonb
      )
    `;

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Unable to create task", error);
    return NextResponse.json({ error: "Unable to create task" }, { status: 500 });
  }
}
