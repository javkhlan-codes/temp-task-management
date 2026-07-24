import { NextResponse } from "next/server";
import type { getDatabase } from "./db";
import { hasPermission, type Permission } from "./permissions";
import type { UserRole, WorkspaceUser } from "./types";
import { resolveSessionUserId } from "./session";

type SqlClient = NonNullable<ReturnType<typeof getDatabase>>;

type UserRow = {
  id: string;
  name: string;
  email: string;
  initials: string;
  tone: string;
  role: UserRole;
  active: boolean;
};

export function rowToUser(row: UserRow): WorkspaceUser {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    initials: row.initials,
    tone: row.tone,
    role: row.role,
    active: row.active,
  };
}

export async function getActor(
  request: Request,
  sql: SqlClient,
): Promise<WorkspaceUser | null> {
  const sessionUserId = await resolveSessionUserId(request, sql);
  const demoActorId = request.headers.get("x-workspace-user-id");
  const actorId =
    process.env.NODE_ENV === "production"
      ? sessionUserId
      : demoActorId || sessionUserId;
  const workspaceId = getWorkspaceId(request);
  if (!actorId) return null;

  const rows = await sql`
    SELECT
      users.id, users.name, users.email, users.initials, users.tone,
      workspace_members.role, workspace_members.active
    FROM users
    JOIN workspace_members
      ON workspace_members.user_id = users.id
    WHERE users.id = ${actorId}
      AND workspace_members.workspace_id = ${workspaceId}
      AND workspace_members.active = TRUE
    LIMIT 1
  `;
  return rows.length ? rowToUser(rows[0] as never) : null;
}

export function getWorkspaceId(request: Request): string {
  return request.headers.get("x-workspace-id") || "workspace-acme";
}

export async function authorize(
  request: Request,
  sql: SqlClient,
  permission: Permission,
): Promise<
  | { user: WorkspaceUser; response?: never }
  | { user?: never; response: NextResponse }
> {
  const user = await getActor(request, sql);
  if (!user) {
    return {
      response: NextResponse.json({ error: "Authentication required" }, { status: 401 }),
    };
  }
  if (!hasPermission(user, permission)) {
    return {
      response: NextResponse.json(
        { error: `The ${user.role} role cannot perform this action` },
        { status: 403 },
      ),
    };
  }
  return { user };
}
