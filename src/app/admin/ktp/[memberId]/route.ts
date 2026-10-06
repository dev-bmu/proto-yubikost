// Foto KTP privat (PRD §12 SEC-03, SEC-05): hanya admin berizin, setiap akses diaudit.
import fs from "node:fs";
import path from "node:path";
import { audit, KTP_DIR, KTP_SEED_DIR } from "@/lib/db";
import { can } from "@/lib/perm";
import { profileOf } from "@/lib/queries";
import { currentAdmin } from "@/lib/session";

const TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const admin = await currentAdmin();
  if (!admin) return text("Unauthorized", 401);
  if (!can(admin.role, "residents.ktp")) return text("Forbidden", 403);

  const { memberId } = await params;
  const key = profileOf(memberId)?.ktpPhotoKey ?? "";
  const type = TYPES[path.extname(key).toLowerCase()];
  // Tolak path traversal: kunci harus nama file murni.
  if (!key || !type || path.basename(key) !== key) return text("Not found", 404);

  const file = [KTP_DIR, KTP_SEED_DIR].map((dir) => path.join(dir, key)).find((f) => fs.existsSync(f));
  if (!file) return text("Not found", 404);

  audit(admin, "ktp.view", memberId);
  return new Response(new Uint8Array(fs.readFileSync(file)), {
    headers: {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      // SVG bisa memuat skrip; sandbox mencegah eksekusi bila dibuka langsung.
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox",
    },
  });
}
