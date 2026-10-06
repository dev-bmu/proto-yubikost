// Hash kata sandi dengan scrypt (stdlib). Produksi memakai bcrypt yang sudah ada di backend (SEC-02).
import crypto from "node:crypto";

export function hashPassword(password: string) {
  const salt = crypto.randomBytes(8).toString("hex");
  return `${salt}:${crypto.scryptSync(password, salt, 32).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = crypto.scryptSync(password, salt, 32);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

/** Kata sandi sementara 10 karakter tanpa karakter ambigu (0/O, 1/l/I). */
export function tempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join("");
}
