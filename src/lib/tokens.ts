import crypto from "crypto";

/** Generates a cryptographically secure random token (hex string, 64 chars). */
export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Returns SHA-256 hex digest of a raw token. Always store the hash, never the raw token. */
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/** Validates a password against the app rules:
 *  - more than 5 characters
 */
export function validatePassword(password: string): string | null {
  if (password.length <= 5) return "Hasło musi mieć więcej niż 5 znaków.";
  return null;
}
