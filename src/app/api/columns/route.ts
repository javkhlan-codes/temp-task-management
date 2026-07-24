import { NextResponse } from "next/server";
import {
  authorize,
  getActor,
  getWorkspaceId,
} from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { canAccessEveryProject } from "@/lib/permissions";
import {
  CUSTOM_COLUMN_TYPES,
  type CustomColumn,
  type CustomColumnType,
} from "@/lib/types";

export const runtime = "nodejs";

type ColumnRow = {
  id: string;
  project_id: string;
  name: string;
  type: CustomColumnType;
  options: string[];
  position: number;
  created_at: string | Date;
};

function rowToColumn(row: ColumnRow): CustomColumn {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    type: row.type,
    options: row.options ?? [],
    position: row.position,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
}

function isValidColumn(column: CustomColumn) {
  return (
    column.id &&
    column.name?.trim() &&
    CUSTOM_COLUMN_TYPES.includes(column.type)
  );
}

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
    const projectId = new URL(request.url).searchParams.get("projectId");
    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }
    const rows = await sql`
      SELECT
        custom_columns.id, custom_columns.project_id, custom_columns.name,
        custom_columns.type, custom_columns.options, custom_columns.position,
        custom_columns.created_at
      FROM custom_columns
      JOIN projects ON projects.id = custom_columns.project_id
      WHERE custom_columns.project_id = ${projectId}
        AND projects.workspace_id = ${workspaceId}
        AND (
          ${canAccessEveryProject(actor)}
          OR EXISTS (
            SELECT 1
            FROM project_members
            WHERE project_members.project_id = projects.id
              AND project_members.user_id = ${actor.id}
          )
        )
      ORDER BY custom_columns.position ASC, custom_columns.created_at ASC
    `;
    return NextResponse.json({
      columns: rows.map((row) => rowToColumn(row as never)),
    });
  } catch (error) {
    console.error("Unable to load columns", error);
    return NextResponse.json(
      { error: "Unable to load columns. Run npm run db:setup first." },
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
    const column = (await request.json()) as CustomColumn;
    if (!isValidColumn(column)) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }
    const auth = await authorize(request, sql, "manageColumns");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const projects = await sql`
      SELECT 1 FROM projects
      WHERE id = ${column.projectId}
        AND workspace_id = ${workspaceId}
        AND archived = FALSE
      LIMIT 1
    `;
    if (!projects.length) {
      return NextResponse.json({ error: "Active project not found" }, { status: 404 });
    }

    await sql`
      INSERT INTO custom_columns (
        id, project_id, name, type, options, position, created_at
      )
      VALUES (
        ${column.id}, ${column.projectId}, ${column.name.trim()}, ${column.type},
        ${JSON.stringify(column.options ?? [])}::jsonb,
        ${column.position},
        ${column.createdAt}::timestamptz
      )
    `;
    return NextResponse.json({ column }, { status: 201 });
  } catch (error) {
    console.error("Unable to create column", error);
    return NextResponse.json({ error: "Unable to create column" }, { status: 500 });
  }
}
