import { NextResponse } from "next/server";
import { getActor, getWorkspaceId, rowToUser } from "@/lib/api-auth";
import { getDatabase } from "@/lib/db";
import type { WorkspaceNotification } from "@/lib/types";

export const runtime = "nodejs";

function toIso(value: string | Date | null | undefined) {
  if (!value) return null;
  return value instanceof Date ? value.toISOString() : String(value);
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
    const rows = await sql`
      SELECT
        notifications.id,
        notifications.task_id,
        notifications.type,
        notifications.title,
        notifications.body,
        notifications.read_at,
        notifications.created_at,
        users.id AS actor_id,
        users.name AS actor_name,
        users.email AS actor_email,
        users.initials AS actor_initials,
        users.tone AS actor_tone,
        actor_members.role AS actor_role,
        actor_members.active AS actor_active
      FROM notifications
      LEFT JOIN users ON users.id = notifications.actor_id
      LEFT JOIN workspace_members actor_members
        ON actor_members.user_id = users.id
        AND actor_members.workspace_id = notifications.workspace_id
      WHERE notifications.workspace_id = ${workspaceId}
        AND notifications.user_id = ${actor.id}
      ORDER BY notifications.created_at DESC
      LIMIT 50
    `;
    const notifications: WorkspaceNotification[] = rows.map((row) => ({
      id: String(row.id),
      taskId: row.task_id ? String(row.task_id) : null,
      type: String(row.type),
      title: String(row.title),
      body: String(row.body),
      readAt: toIso(row.read_at),
      createdAt: toIso(row.created_at) ?? new Date().toISOString(),
      actor: row.actor_id
        ? rowToUser({
            id: String(row.actor_id),
            name: String(row.actor_name),
            email: String(row.actor_email),
            initials: String(row.actor_initials),
            tone: String(row.actor_tone),
            role: row.actor_role as never,
            active: Boolean(row.actor_active),
          })
        : null,
    }));
    return NextResponse.json({
      notifications,
      unreadCount: notifications.filter((item) => !item.readAt).length,
    });
  } catch (error) {
    console.error("Unable to load notifications", error);
    return NextResponse.json(
      { error: "Unable to load notifications" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
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
    const payload = (await request.json()) as {
      all?: boolean;
      ids?: string[];
    };
    const ids = Array.from(new Set((payload.ids ?? []).map(String))).slice(0, 50);
    if (payload.all) {
      await sql`
        UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
        WHERE workspace_id = ${workspaceId}
          AND user_id = ${actor.id}
      `;
    } else if (ids.length) {
      await sql`
        UPDATE notifications
        SET read_at = COALESCE(read_at, NOW())
        WHERE workspace_id = ${workspaceId}
          AND user_id = ${actor.id}
          AND id = ANY(${ids}::text[])
      `;
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to update notifications", error);
    return NextResponse.json(
      { error: "Unable to update notifications" },
      { status: 500 },
    );
  }
}
