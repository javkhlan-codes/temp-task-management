import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import { resolveSessionUserId } from "@/lib/session";
import {
  createRecoveryCodes,
  decryptTotpSecret,
  hashRecoveryCode,
  verifyTotpCode,
} from "@/lib/totp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json({ error: "Authenticator setup requires a database." }, { status: 503 });
  }

  try {
    const userId = await resolveSessionUserId(request, sql);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const body = (await request.json()) as { code?: string };
    const code = body.code?.trim() ?? "";
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json({ error: "Enter the 6-digit authenticator code." }, { status: 400 });
    }

    const rows = await sql`
      SELECT pending_secret_encrypted
      FROM user_totp
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    const encryptedSecret = rows[0]?.pending_secret_encrypted;
    if (!encryptedSecret) {
      return NextResponse.json({ error: "Start authenticator setup again." }, { status: 409 });
    }

    const secret = decryptTotpSecret(String(encryptedSecret));
    if (!(await verifyTotpCode(secret, code))) {
      return NextResponse.json({ error: "The authenticator code is incorrect." }, { status: 400 });
    }

    const recoveryCodes = createRecoveryCodes();
    await sql`
      UPDATE user_totp
      SET
        secret_encrypted = pending_secret_encrypted,
        pending_secret_encrypted = NULL,
        verified_at = NOW(),
        updated_at = NOW()
      WHERE user_id = ${userId}
    `;
    await sql`DELETE FROM mfa_recovery_codes WHERE user_id = ${userId}`;
    for (const recoveryCode of recoveryCodes) {
      await sql`
        INSERT INTO mfa_recovery_codes (user_id, code_hash)
        VALUES (${userId}, ${hashRecoveryCode(recoveryCode)})
      `;
    }

    return NextResponse.json({ enabled: true, recoveryCodes });
  } catch (error) {
    console.error("Unable to confirm TOTP setup", error);
    return NextResponse.json(
      { error: "Unable to confirm authenticator setup." },
      { status: 500 },
    );
  }
}
