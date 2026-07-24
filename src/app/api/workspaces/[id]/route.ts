import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { resolveSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

async function requireWorkspaceAdmin(
  request: Request,
  workspaceId: string,
  sql: NonNullable<ReturnType<typeof getDatabase>>,
) {
  const userId = await resolveSessionUserId(request, sql);
  if (!userId) return null;
  const rows = await sql`
    SELECT 1
    FROM workspace_members
    WHERE workspace_id = ${workspaceId}
      AND user_id = ${userId}
      AND role = 'admin'
      AND active = TRUE
    LIMIT 1
  `;
  return rows.length ? userId : null;
}

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
    const userId = await requireWorkspaceAdmin(request, id, sql);
    if (!userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const payload = (await request.json()) as { name?: string };
    const name = payload.name?.trim() ?? "";
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json({ error: "Invalid workspace name" }, { status: 400 });
    }
    const rows = await sql`
      UPDATE workspaces
      SET name = ${name}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, slug, plan, created_at
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json({
      workspace: {
        id: String(rows[0].id),
        name: String(rows[0].name),
        slug: String(rows[0].slug),
        plan: String(rows[0].plan),
        role: "admin",
        createdAt:
          rows[0].created_at instanceof Date
            ? rows[0].created_at.toISOString()
            : String(rows[0].created_at),
      },
    });
  } catch (error) {
    console.error("Unable to update workspace", error);
    return NextResponse.json({ error: "Unable to update workspace" }, { status: 500 });
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
    const userId = await requireWorkspaceAdmin(request, id, sql);
    if (!userId) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }
    const counts = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM projects WHERE workspace_id = ${id}) AS projects,
        (SELECT COUNT(*)::int FROM workspace_members WHERE workspace_id = ${id}) AS members
    `;
    if (Number(counts[0].projects) > 0 || Number(counts[0].members) > 1) {
      return NextResponse.json(
        { error: "Only an empty single-member workspace can be deleted" },
        { status: 409 },
      );
    }
    const rows = await sql`
      DELETE FROM workspaces WHERE id = ${id} RETURNING id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to delete workspace", error);
    return NextResponse.json({ error: "Unable to delete workspace" }, { status: 500 });
  }
}
