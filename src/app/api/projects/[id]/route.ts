import { NextResponse } from "next/server";
import {
  authorize,
  getActor,
  getWorkspaceId,
} from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import type { Project } from "@/lib/types";

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
    const actor = await getActor(request, sql);
    if (!actor) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!hasPermission(actor, "editProject")) {
      return NextResponse.json(
        { error: "Your role cannot edit projects" },
        { status: 403 },
      );
    }
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const project = (await request.json()) as Project;
    const existingRows = await sql`
      SELECT archived
      FROM projects
      WHERE id = ${id} AND workspace_id = ${workspaceId}
      LIMIT 1
    `;
    if (!existingRows.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (
      Boolean(existingRows[0].archived) !== Boolean(project.archived) &&
      !hasPermission(actor, "archiveProject")
    ) {
      return NextResponse.json(
        { error: "Your role cannot archive projects" },
        { status: 403 },
      );
    }
    const owners = await sql`
      SELECT 1
      FROM workspace_members
      WHERE workspace_id = ${workspaceId}
        AND user_id = ${project.ownerId}
        AND active = TRUE
      LIMIT 1
    `;
    if (!owners.length) {
      return NextResponse.json(
        { error: "Project owner must be an active member" },
        { status: 400 },
      );
    }
    await sql`
      UPDATE projects
      SET
        name = ${project.name.trim()},
        color = ${project.color},
        description = ${project.description},
        owner_id = ${project.ownerId},
        archived = ${project.archived},
        archived_at = ${project.archivedAt ?? null}::timestamptz,
        updated_at = NOW()
      WHERE id = ${id} AND workspace_id = ${workspaceId}
    `;
    await sql`DELETE FROM project_members WHERE project_id = ${id}`;
    const memberIds = Array.from(
      new Set([project.ownerId, ...(project.memberIds ?? [])]),
    );
    for (const memberId of memberIds) {
      await sql`
        INSERT INTO project_members (project_id, user_id)
        SELECT ${id}, user_id
        FROM workspace_members
        WHERE workspace_id = ${workspaceId}
          AND user_id = ${memberId}
          AND active = TRUE
        ON CONFLICT (project_id, user_id) DO NOTHING
      `;
    }
    await sql`
      INSERT INTO activity_logs (
        workspace_id, project_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspaceId}, ${id}, ${actor.id},
        ${project.archived ? "project.archived" : "project.updated"},
        ${JSON.stringify({ name: project.name })}::jsonb
      )
    `;
    return NextResponse.json({ project: { ...project, memberIds } });
  } catch (error) {
    console.error("Unable to update project", error);
    return NextResponse.json({ error: "Unable to update project" }, { status: 409 });
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
    const auth = await authorize(request, sql, "deleteProject");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      SELECT
        projects.archived,
        COUNT(tasks.id)::int AS task_count
      FROM projects
      LEFT JOIN tasks ON tasks.project_id = projects.id
      WHERE projects.id = ${id} AND projects.workspace_id = ${workspaceId}
      GROUP BY projects.id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!rows[0].archived || Number(rows[0].task_count) > 0) {
      return NextResponse.json(
        { error: "Only an empty archived project can be permanently deleted" },
        { status: 409 },
      );
    }
    await sql`
      DELETE FROM projects WHERE id = ${id} AND workspace_id = ${workspaceId}
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete project", error);
    return NextResponse.json({ error: "Unable to delete project" }, { status: 500 });
  }
}
