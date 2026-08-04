import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { rowToUser } from "@/lib/api-auth";
import { clearSessionCookie, resolveSessionUserId } from "@/lib/session";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  try {
    const userId = await resolveSessionUserId(request, sql);
    if (!userId) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }
    const rows = await sql`
      SELECT
        users.id, users.name, users.email, users.initials, users.tone,
        workspace_members.role, workspace_members.active,
        user_totp.verified_at AS totp_verified_at
      FROM users
      JOIN workspace_members ON workspace_members.user_id = users.id
      LEFT JOIN user_totp ON user_totp.user_id = users.id
      WHERE users.id = ${userId}
        AND workspace_members.workspace_id = 'workspace-acme'
        AND workspace_members.active = TRUE
      LIMIT 1
    `;
    if (!rows.length) {
      const response = NextResponse.json({ user: null }, { status: 401 });
      clearSessionCookie(response);
      return response;
    }
    const row = rows[0] as { totp_verified_at?: string | null };
    if (!row.totp_verified_at) {
      return NextResponse.json(
        { user: rowToUser(rows[0] as never), requiresTotpSetup: true },
        { status: 403 },
      );
    }
    return NextResponse.json({ user: rowToUser(rows[0] as never) });
  } catch (error) {
    console.error("Unable to resolve session", error);
    return NextResponse.json({ user: null }, { status: 401 });
  }
}
