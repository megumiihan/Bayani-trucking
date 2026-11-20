import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Reversible encryption for employee login passwords, so the admin can look one
 * up when a driver forgets it (their emails are not real, so Supabase's reset
 * emails never arrive). Server-only: never import from a client component.
 */

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const raw = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "Password storage isn't configured on this server (CREDENTIALS_ENCRYPTION_KEY missing)."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CREDENTIALS_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32)."
    );
  }
  return key;
}

/** Returns `iv:authTag:ciphertext`, each base64. */
export function encryptPassword(password: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const data = Buffer.concat([cipher.update(password, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, data].map((part) => part.toString("base64")).join(":");
}

export function decryptPassword(stored: string): string {
  const [iv, tag, data] = stored.split(":").map((part) => Buffer.from(part, "base64"));
  if (!iv || !tag || !data) throw new Error("Stored password is malformed.");

  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
