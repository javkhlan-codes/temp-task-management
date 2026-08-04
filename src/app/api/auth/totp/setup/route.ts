import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { getDatabase } from "@/lib/db";
import { resolveSessionUserId } from "@/lib/session";
import {
  createOtpAuthUri,
  createTotpSecret,
  encryptTotpSecret,
} from "@/lib/totp";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const sql = getDatabase();
  if (!sql) return NextResponse.json({ enabled: false }, { status: 503 });

  try {
    const userId = await resolveSessionUserId(request, sql);
    if (!userId) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }
    const rows = await sql`
      SELECT verified_at
      FROM user_totp
      WHERE user_id = ${userId}
      LIMIT 1
    `;
    return NextResponse.json({ enabled: Boolean(rows[0]?.verified_at) });
  } catch (error) {
    console.error("Unable to read TOTP status", error);
    return NextResponse.json({ error: "Unable to read authenticator status." }, { status: 500 });
  }
}

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
    const users = await sql`
      SELECT email FROM users WHERE id = ${userId} LIMIT 1
    `;
    if (!users.length) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const email = String(users[0].email);
    const secret = createTotpSecret();
    const encryptedSecret = encryptTotpSecret(secret);
    const otpAuthUri = createOtpAuthUri(email, secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpAuthUri, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 240,
    });

    await sql`
      INSERT INTO user_totp (user_id, pending_secret_encrypted)
      VALUES (${userId}, ${encryptedSecret})
      ON CONFLICT (user_id) DO UPDATE SET
        pending_secret_encrypted = EXCLUDED.pending_secret_encrypted,
        updated_at = NOW()
    `;

    return NextResponse.json({ secret, otpAuthUri, qrCodeDataUrl });
  } catch (error) {
    console.error("Unable to start TOTP setup", error);
    return NextResponse.json(
      { error: "Unable to start authenticator setup." },
      { status: 500 },
    );
  }
}
