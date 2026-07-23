import { NextResponse } from "next/server";
import {
  authorize,
  getActor,
  getWorkspaceId,
  rowToUser,
} from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { USER_ROLES, type WorkspaceUser } from "@/lib/types";

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
        users.id, users.name, users.email, users.initials, users.tone,
        workspace_members.role, workspace_members.active
      FROM users
      JOIN workspace_members
        ON workspace_members.user_id = users.id
      WHERE workspace_members.workspace_id = ${workspaceId}
      ORDER BY workspace_members.active DESC, users.name ASC
    `;
    return NextResponse.json({
      users: rows.map((row) => rowToUser(row as never)),
    });
  } catch (error) {
    console.error("Unable to load workspace users", error);
    return NextResponse.json(
      { error: "Unable to load users. Run npm run db:setup first." },
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
    const auth = await authorize(request, sql, "manageUsers");
    if (auth.response) return auth.response;
    const workspaceId = getWorkspaceId(request);
    const user = (await request.json()) as WorkspaceUser;
    if (
      !user.id ||
      !user.name?.trim() ||
      !user.email?.trim() ||
      !USER_ROLES.includes(user.role)
    ) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    await sql`
      INSERT INTO users (
        id, name, email, initials, tone
      )
      VALUES (
        ${user.id}, ${user.name.trim()}, ${user.email.trim().toLowerCase()},
        ${user.initials}, ${user.tone}
      )
      ON CONFLICT (email) DO UPDATE SET
        name = EXCLUDED.name,
        initials = EXCLUDED.initials,
        tone = EXCLUDED.tone,
        updated_at = NOW()
    `;
    const userRows = await sql`
      SELECT id FROM users WHERE email = ${user.email.trim().toLowerCase()} LIMIT 1
    `;
    const resolvedUserId = String(userRows[0].id);
    await sql`
      INSERT INTO workspace_members (
        workspace_id, user_id, role, active
      )
      VALUES (${workspaceId}, ${resolvedUserId}, ${user.role}, ${user.active})
      ON CONFLICT (workspace_id, user_id) DO UPDATE SET
        role = EXCLUDED.role,
        active = EXCLUDED.active
    `;
    return NextResponse.json(
      { user: { ...user, id: resolvedUserId } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to add workspace user", error);
    return NextResponse.json(
      { error: "Unable to add user. The email may already exist." },
      { status: 500 },
    );
  }
}
