import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { resolveVerifiedSessionUserId } from "@/lib/session";
import type { WorkspaceSummary } from "@/lib/types";

export const runtime = "nodejs";

function slugify(value: string) {
  const base = value
    .normalize("NFKD")
    .replace(/[^\p{Letter}\p{Number}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase()
    .slice(0, 48);
  return `${base || "workspace"}-${randomUUID().slice(0, 6)}`;
}

function toWorkspace(row: Record<string, unknown>): WorkspaceSummary {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    plan: String(row.plan),
    role: row.role as WorkspaceSummary["role"],
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
  };
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
    const userId = await resolveVerifiedSessionUserId(request, sql);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const rows = await sql`
      SELECT
        workspaces.id,
        workspaces.name,
        workspaces.slug,
        workspaces.plan,
        workspaces.created_at,
        workspace_members.role
      FROM workspaces
      JOIN workspace_members
        ON workspace_members.workspace_id = workspaces.id
      WHERE workspace_members.user_id = ${userId}
        AND workspace_members.active = TRUE
      ORDER BY workspaces.created_at ASC
    `;
    return NextResponse.json({
      workspaces: rows.map((row) => toWorkspace(row as Record<string, unknown>)),
    });
  } catch (error) {
    console.error("Unable to load workspaces", error);
    return NextResponse.json({ error: "Unable to load workspaces" }, { status: 500 });
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
    const userId = await resolveVerifiedSessionUserId(request, sql);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    const payload = (await request.json()) as { name?: string };
    const name = payload.name?.trim() ?? "";
    if (name.length < 2 || name.length > 80) {
      return NextResponse.json(
        { error: "Workspace name must contain between 2 and 80 characters" },
        { status: 400 },
      );
    }
    const workspace: WorkspaceSummary = {
      id: `workspace-${randomUUID()}`,
      name,
      slug: slugify(name),
      plan: "free",
      role: "admin",
      createdAt: new Date().toISOString(),
    };
    await sql`
      INSERT INTO workspaces (id, name, slug, plan, created_at, updated_at)
      VALUES (
        ${workspace.id}, ${workspace.name}, ${workspace.slug},
        ${workspace.plan}, ${workspace.createdAt}::timestamptz, NOW()
      )
    `;
    await sql`
      INSERT INTO workspace_members (
        workspace_id, user_id, role, active
      )
      VALUES (${workspace.id}, ${userId}, 'admin', TRUE)
    `;
    await sql`
      INSERT INTO activity_logs (
        workspace_id, actor_id, event_type, payload
      )
      VALUES (
        ${workspace.id}, ${userId}, 'workspace.created',
        ${JSON.stringify({ name: workspace.name })}::jsonb
      )
    `;
    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error("Unable to create workspace", error);
    return NextResponse.json({ error: "Unable to create workspace" }, { status: 500 });
  }
}
