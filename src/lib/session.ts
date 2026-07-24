import { createHash, randomBytes } from "node:crypto";
import type { NextResponse } from "next/server";
import type { getDatabase } from "./db";

type SqlClient = NonNullable<ReturnType<typeof getDatabase>>;

export const SESSION_COOKIE = "nimbus_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function tokenHash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function getSessionToken(request: Request): string | null {
  const cookie = request.headers.get("cookie");
  if (!cookie) return null;
  for (const part of cookie.split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === SESSION_COOKIE) return decodeURIComponent(value.join("="));
  }
  return null;
}

export async function createSession(
  sql: SqlClient,
  userId: string,
  persistent = true,
) {
  const token = randomBytes(32).toString("base64url");
  const maxAgeSeconds = persistent
    ? SESSION_MAX_AGE_SECONDS
    : 60 * 60 * 12;
  const expiresAt = new Date(Date.now() + maxAgeSeconds * 1000);
  await sql`
    INSERT INTO auth_sessions (token_hash, user_id, expires_at)
    VALUES (${tokenHash(token)}, ${userId}, ${expiresAt.toISOString()}::timestamptz)
  `;
  return { token, expiresAt };
}

export async function resolveSessionUserId(
  request: Request,
  sql: SqlClient,
): Promise<string | null> {
  const token = getSessionToken(request);
  if (!token) return null;
  const rows = await sql`
    SELECT user_id
    FROM auth_sessions
    WHERE token_hash = ${tokenHash(token)}
      AND expires_at > NOW()
    LIMIT 1
  `;
  return rows.length ? String(rows[0].user_id) : null;
}

export async function revokeSession(request: Request, sql: SqlClient) {
  const token = getSessionToken(request);
  if (!token) return;
  await sql`DELETE FROM auth_sessions WHERE token_hash = ${tokenHash(token)}`;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  expiresAt: Date,
  persistent = true,
) {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    ...(persistent ? { expires: expiresAt } : {}),
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
