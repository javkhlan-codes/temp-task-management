import { randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(nodeScrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  const [algorithm, salt, encodedHash] = storedHash.split("$");
  if (algorithm !== "scrypt" || !salt || !encodedHash) return false;
  const expected = Buffer.from(encodedHash, "hex");
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return (
    actual.length === expected.length && timingSafeEqual(actual, expected)
  );
}
