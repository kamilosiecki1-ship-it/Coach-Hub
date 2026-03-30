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
 *  - at least 8 characters
 *  - at least one digit or special character
 */
export function validatePassword(password: string): string | null {
  if (password.length < 8) return "Hasło musi mieć co najmniej 8 znaków.";
  if (!/[0-9!@#$%^&*_+={};<>?]/.test(password)) {
    return "Hasło musi zawierać co najmniej jedną cyfrę lub znak specjalny.";
  }
  return null;
}
