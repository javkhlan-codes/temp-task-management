import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { rowToUser } from "@/lib/api-auth";
import { verifyPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "Authentication requires a configured database." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
      remember?: boolean | string;
    };
    const email = body.email?.trim().toLowerCase();
    const password = body.password ?? "";
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 },
      );
    }

    const rows = await sql`
      SELECT
        users.id, users.name, users.email, users.initials, users.tone,
        workspace_members.role, workspace_members.active,
        user_credentials.password_hash
      FROM users
      JOIN workspace_members
        ON workspace_members.user_id = users.id
      JOIN user_credentials
        ON user_credentials.user_id = users.id
      WHERE LOWER(users.email) = ${email}
        AND workspace_members.workspace_id = 'workspace-acme'
        AND workspace_members.active = TRUE
      LIMIT 1
    `;
    const row = rows[0] as
      | {
          id: string;
          name: string;
          email: string;
          initials: string;
          tone: string;
          role: "admin" | "manager" | "member" | "viewer";
          active: boolean;
          password_hash: string;
        }
      | undefined;
    if (!row || !(await verifyPassword(password, row.password_hash))) {
      return NextResponse.json(
        { error: "The email or password is incorrect." },
        { status: 401 },
      );
    }

    const persistent = body.remember === true || body.remember === "true";
    const { token, expiresAt } = await createSession(
      sql,
      row.id,
      persistent,
    );
    const response = NextResponse.json({ user: rowToUser(row) });
    setSessionCookie(response, token, expiresAt, persistent);
    return response;
  } catch (error) {
    console.error("Unable to sign in", error);
    return NextResponse.json({ error: "Unable to sign in." }, { status: 500 });
  }
}
