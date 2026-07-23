import { NextResponse } from "next/server";
import { authorize, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { CUSTOM_COLUMN_TYPES, type CustomColumn } from "@/lib/types";

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
    const column = (await request.json()) as CustomColumn;
    if (!column.name?.trim() || !CUSTOM_COLUMN_TYPES.includes(column.type)) {
      return NextResponse.json({ error: "Invalid column" }, { status: 400 });
    }
    const auth = await authorize(request, sql, "manageColumns");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);

    const rows = await sql`
      UPDATE custom_columns
      SET
        name = ${column.name.trim()},
        type = ${column.type},
        options = ${JSON.stringify(column.options ?? [])}::jsonb
      WHERE id = ${id}
        AND project_id IN (
          SELECT id FROM projects WHERE workspace_id = ${workspaceId}
        )
      RETURNING id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }
    return NextResponse.json({ column });
  } catch (error) {
    console.error("Unable to update column", error);
    return NextResponse.json({ error: "Unable to update column" }, { status: 500 });
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
    const auth = await authorize(request, sql, "manageColumns");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const rows = await sql`
      DELETE FROM custom_columns
      WHERE id = ${id}
        AND project_id IN (
          SELECT id FROM projects WHERE workspace_id = ${workspaceId}
        )
      RETURNING id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Column not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete column", error);
    return NextResponse.json({ error: "Unable to delete column" }, { status: 500 });
  }
}
