import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { hashResetToken } from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json({ error: "Password recovery requires a database." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const token = body.token?.trim() ?? "";
    const password = body.password ?? "";
    if (!token) {
      return NextResponse.json({ error: "The reset session is missing." }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json(
        { error: "Password must contain at least 8 characters." },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(password);
    const claimed = await sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE token_hash = ${hashResetToken(token)}
        AND used_at IS NULL
        AND expires_at > NOW()
      RETURNING user_id
    `;
    if (!claimed.length) {
      return NextResponse.json(
        { error: "The reset session is invalid or expired." },
        { status: 400 },
      );
    }

    const userId = String(claimed[0].user_id);
    await sql`
      UPDATE user_credentials
      SET password_hash = ${passwordHash}, updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    await sql`DELETE FROM auth_sessions WHERE user_id = ${userId}`;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Unable to reset password", error);
    return NextResponse.json({ error: "Unable to reset password." }, { status: 500 });
  }
}
