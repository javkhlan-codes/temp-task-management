import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/db";
import {
  createResetToken,
  decryptTotpSecret,
  hashRecoveryCode,
  hashResetToken,
  verifyTotpCode,
} from "@/lib/totp";

export const runtime = "nodejs";

const DUMMY_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

export async function POST(request: Request) {
  const sql = getDatabase();
  if (!sql) {
    return NextResponse.json({ error: "Password recovery requires a database." }, { status: 503 });
  }

  try {
    const body = (await request.json()) as { email?: string; proof?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const proof = body.proof?.trim() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !proof) {
      return NextResponse.json(
        { error: "Enter your email and authenticator or recovery code." },
        { status: 400 },
      );
    }

    const identifierHash = hashResetToken(email);
    const recentAttempts = await sql`
      SELECT COUNT(*)::int AS count
      FROM password_reset_attempts
      WHERE identifier_hash = ${identifierHash}
        AND attempted_at > NOW() - INTERVAL '15 minutes'
    `;
    if (Number(recentAttempts[0]?.count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429 },
      );
    }
    await sql`
      INSERT INTO password_reset_attempts (identifier_hash)
      VALUES (${identifierHash})
    `;

    const rows = await sql`
      SELECT users.id, user_totp.secret_encrypted
      FROM users
      JOIN workspace_members ON workspace_members.user_id = users.id
      LEFT JOIN user_totp ON user_totp.user_id = users.id
      WHERE LOWER(users.email) = ${email}
        AND workspace_members.workspace_id = 'workspace-acme'
        AND workspace_members.active = TRUE
        AND user_totp.verified_at IS NOT NULL
      LIMIT 1
    `;
    const userId = rows[0]?.id ? String(rows[0].id) : null;
    const encryptedSecret = rows[0]?.secret_encrypted
      ? String(rows[0].secret_encrypted)
      : null;

    let verified = false;
    if (/^\d{6}$/.test(proof)) {
      const secret = encryptedSecret
        ? decryptTotpSecret(encryptedSecret)
        : DUMMY_TOTP_SECRET;
      verified = await verifyTotpCode(secret, proof);
    } else if (userId) {
      const recoveryRows = await sql`
        UPDATE mfa_recovery_codes
        SET used_at = NOW()
        WHERE user_id = ${userId}
          AND code_hash = ${hashRecoveryCode(proof)}
          AND used_at IS NULL
        RETURNING id
      `;
      verified = recoveryRows.length > 0;
    }

    if (!userId || !verified) {
      return NextResponse.json(
        { error: "The account or verification code is incorrect." },
        { status: 400 },
      );
    }

    const resetToken = createResetToken();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await sql`
      DELETE FROM password_reset_tokens
      WHERE user_id = ${userId} OR expires_at <= NOW()
    `;
    await sql`
      INSERT INTO password_reset_tokens (token_hash, user_id, expires_at)
      VALUES (${hashResetToken(resetToken)}, ${userId}, ${expiresAt.toISOString()}::timestamptz)
    `;
    return NextResponse.json({ resetToken, expiresAt: expiresAt.toISOString() });
  } catch (error) {
    console.error("Unable to verify password recovery", error);
    return NextResponse.json({ error: "Unable to verify password recovery." }, { status: 500 });
  }
}
