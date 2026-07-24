import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { clearSessionCookie, revokeSession } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sql = getDatabase();
  if (sql) {
    try {
      await revokeSession(request, sql);
    } catch (error) {
      console.error("Unable to revoke session", error);
    }
  }
  const response = NextResponse.json({ ok: true });
  clearSessionCookie(response);
  return response;
}
