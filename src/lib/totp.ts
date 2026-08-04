import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { TOTP } from "totp-generator";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_PERIOD_MS = 30_000;

function encryptionKey() {
  const encoded = process.env.TOTP_ENCRYPTION_KEY;
  if (!encoded) {
    throw new Error("TOTP_ENCRYPTION_KEY is not configured");
  }
  const key = Buffer.from(encoded, "base64url");
  if (key.length !== 32) {
    throw new Error("TOTP_ENCRYPTION_KEY must be a 32-byte base64url value");
  }
  return key;
}

function base32Encode(input: Buffer) {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of input) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  return output;
}

export function createTotpSecret() {
  return base32Encode(randomBytes(20));
}

export function createRecoveryCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const encoded = base32Encode(randomBytes(5));
    return `${encoded.slice(0, 4)}-${encoded.slice(4, 8)}`;
  });
}

export function normalizeRecoveryCode(code: string) {
  return code.trim().toUpperCase().replace(/[^A-Z2-7]/g, "");
}

export function hashRecoveryCode(code: string) {
  return createHmac("sha256", encryptionKey())
    .update(normalizeRecoveryCode(code))
    .digest("hex");
}

export function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createResetToken() {
  return randomBytes(32).toString("base64url");
}

export function encryptTotpSecret(secret: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext]
    .map((part) => part.toString("base64url"))
    .join(".");
}

export function decryptTotpSecret(encrypted: string) {
  const [ivValue, tagValue, ciphertextValue] = encrypted.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) {
    throw new Error("Invalid encrypted TOTP secret");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    encryptionKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

function codesMatch(actual: string, expected: string) {
  const actualBuffer = Buffer.from(actual);
  const expectedBuffer = Buffer.from(expected);
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

export async function verifyTotpCode(secret: string, submittedCode: string) {
  const normalized = submittedCode.replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const now = Date.now();
  for (const offset of [-1, 0, 1]) {
    const { otp } = await TOTP.generate(secret, {
      timestamp: now + offset * TOTP_PERIOD_MS,
      explicitZeroPad: true,
    });
    if (codesMatch(otp, normalized)) return true;
  }
  return false;
}

export function createOtpAuthUri(email: string, secret: string) {
  const issuer = "Pro Team";
  const label = `${issuer}:${email}`;
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`;
}
