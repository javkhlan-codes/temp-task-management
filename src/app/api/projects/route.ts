import { NextResponse } from "next/server";
import {
  authorize,
  getActor,
  getWorkspaceId,
} from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import type { Project } from "@/lib/types";

export const runtime = "nodejs";

type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  color: string;
  description: string;
  owner_id: string;
  member_ids: string[];
  archived: boolean;
  archived_at: string | Date | null;
  task_count: number;
  created_at: string | Date;
  updated_at: string | Date;
};

function toIso(value: string | Date | null) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    name: row.name,
    color: row.color,
    description: row.description,
    ownerId: row.owner_id,
    memberIds: row.member_ids ?? [],
    archived: row.archived,
    archivedAt: toIso(row.archived_at),
    taskCount: Number(row.task_count ?? 0),
    createdAt: toIso(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIso(row.updated_at) ?? new Date().toISOString(),
  };
}

const PROJECT_SELECT = `
  SELECT
    projects.id,
    projects.workspace_id,
    projects.name,
    projects.color,
    projects.description,
    projects.owner_id,
    projects.archived,
    projects.archived_at,
    projects.created_at,
    projects.updated_at,
    COUNT(DISTINCT tasks.id)::int AS task_count,
    COALESCE(
      ARRAY_AGG(DISTINCT project_members.user_id)
        FILTER (WHERE project_members.user_id IS NOT NULL),
      '{}'
    ) AS member_ids
  FROM projects
  LEFT JOIN tasks ON tasks.project_id = projects.id
  LEFT JOIN project_members ON project_members.project_id = projects.id
`;

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
    const rows = await sql(
      `${PROJECT_SELECT}
       WHERE projects.workspace_id = $1
       GROUP BY projects.id
       ORDER BY projects.archived ASC, projects.created_at ASC`,
      [workspaceId],
    );
    return NextResponse.json({
      projects: rows.map((row) => rowToProject(row as never)),
    });
  } catch (error) {
    console.error("Unable to load projects", error);
    return NextResponse.json({ error: "Unable to load projects" }, { status: 500 });
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
    const auth = await authorize(request, sql, "createProject");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const project = (await request.json()) as Project;
    if (!project.id || !project.name?.trim() || !project.ownerId) {
      return NextResponse.json(
        { error: "Project id, name, and owner are required" },
        { status: 400 },
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
        { error: "Project owner must be an active workspace member" },
        { status: 400 },
      );
    }
    await sql`
      INSERT INTO projects (
        id, workspace_id, name, color, description, owner_id,
        archived, archived_at
      )
      VALUES (
        ${project.id}, ${workspaceId}, ${project.name.trim()},
        ${project.color}, ${project.description}, ${project.ownerId},
        FALSE, NULL
      )
    `;
    const memberIds = Array.from(
      new Set([project.ownerId, auth.user.id, ...(project.memberIds ?? [])]),
    );
    for (const memberId of memberIds) {
      await sql`
        INSERT INTO project_members (project_id, user_id)
        SELECT ${project.id}, user_id
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
        ${workspaceId}, ${project.id}, ${auth.user.id},
        'project.created', ${JSON.stringify({ name: project.name })}::jsonb
      )
    `;
    return NextResponse.json(
      {
        project: {
          ...project,
          workspaceId,
          memberIds,
          archived: false,
          archivedAt: null,
          taskCount: 0,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to create project", error);
    return NextResponse.json(
      { error: "Unable to create project. The name may already exist." },
      { status: 409 },
    );
  }
}
