import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { createSession, setSessionCookie } from "@/lib/session";
import type { WorkspaceUser } from "@/lib/types";

export const runtime = "nodejs";

const TONES = ["violet", "cyan", "amber", "rose"] as const;

function initialsFor(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json(
      { error: "Sign-up requires a configured database." },
      { status: 503 },
    );
  }

  try {
    const body = (await request.json()) as {
      name?: string;
      email?: string;
      password?: string;
    };
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (name.length < 2) {
      return NextResponse.json(
        { error: "Enter your full name." },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Enter a valid work email." },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 },
      );
    }

    const existing = await sql`
      SELECT id FROM users WHERE LOWER(email) = ${email} LIMIT 1
    `;
    if (existing.length) {
      return NextResponse.json(
        { error: "An account with this email already exists." },
        { status: 409 },
      );
    }

    const userId = `user-${randomUUID()}`;
    const tone = TONES[Math.floor(Math.random() * TONES.length)];
    const initials = initialsFor(name) || "NM";
    const passwordHash = await hashPassword(password);

    await sql`
      INSERT INTO users (id, name, email, initials, tone)
      VALUES (${userId}, ${name}, ${email}, ${initials}, ${tone})
    `;
    await sql`
      INSERT INTO workspace_members (workspace_id, user_id, role, active)
      VALUES ('workspace-acme', ${userId}, 'member', TRUE)
    `;
    await sql`
      INSERT INTO user_credentials (user_id, password_hash)
      VALUES (${userId}, ${passwordHash})
    `;
    await sql`
      INSERT INTO project_members (project_id, user_id)
      SELECT id, ${userId}
      FROM projects
      WHERE workspace_id = 'workspace-acme' AND archived = FALSE
      ON CONFLICT (project_id, user_id) DO NOTHING
    `;

    const user: WorkspaceUser = {
      id: userId,
      name,
      email,
      initials,
      tone,
      role: "member",
      active: true,
    };
    const { token, expiresAt } = await createSession(sql, userId);
    const response = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(response, token, expiresAt);
    return response;
  } catch (error) {
    console.error("Unable to create account", error);
    return NextResponse.json(
      { error: "Unable to create your account." },
      { status: 500 },
    );
  }
}
