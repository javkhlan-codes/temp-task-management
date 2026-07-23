import { NextResponse } from "next/server";
import { authorize, getWorkspaceId } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import { USER_ROLES, type WorkspaceUser } from "@/lib/types";

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
    const auth = await authorize(request, sql, "manageUsers");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    const user = (await request.json()) as WorkspaceUser;
    if (
      !user.name?.trim() ||
      !user.email?.trim() ||
      !USER_ROLES.includes(user.role)
    ) {
      return NextResponse.json({ error: "Invalid user" }, { status: 400 });
    }

    if (id === auth.user.id && (!user.active || user.role !== "admin")) {
      return NextResponse.json(
        { error: "You cannot remove your own admin access" },
        { status: 400 },
      );
    }

    if (user.role !== "admin" || !user.active) {
      const admins = await sql`
        SELECT COUNT(*)::int AS count
        FROM workspace_members
        WHERE workspace_id = ${workspaceId}
          AND role = 'admin' AND active = TRUE AND user_id <> ${id}
      `;
      if (admins[0].count === 0) {
        return NextResponse.json(
          { error: "A workspace must keep at least one active admin" },
          { status: 400 },
        );
      }
    }

    await sql`
      UPDATE users
      SET
        name = ${user.name.trim()},
        email = ${user.email.trim().toLowerCase()},
        initials = ${user.initials},
        tone = ${user.tone},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    const rows = await sql`
      UPDATE workspace_members
      SET
        role = ${user.role},
        active = ${user.active}
      WHERE workspace_id = ${workspaceId} AND user_id = ${id}
      RETURNING user_id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Unable to update workspace user", error);
    return NextResponse.json({ error: "Unable to update user" }, { status: 500 });
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
    const auth = await authorize(request, sql, "manageUsers");
    if (auth.response) return auth.response;
    const { id } = await context.params;
    const workspaceId = getWorkspaceId(request);
    if (id === auth.user.id) {
      return NextResponse.json(
        { error: "You cannot deactivate your own account" },
        { status: 400 },
      );
    }
    const rows = await sql`
      UPDATE workspace_members
      SET active = FALSE
      WHERE workspace_id = ${workspaceId} AND user_id = ${id}
      RETURNING user_id
    `;
    if (!rows.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to deactivate workspace user", error);
    return NextResponse.json({ error: "Unable to deactivate user" }, { status: 500 });
  }
}
