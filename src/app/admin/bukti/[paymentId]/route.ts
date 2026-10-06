// Bukti transfer privat (PRD §12, v1.1): hanya peran payments.verify, tidak pernah di-serve publik.
import { byId, PROOF_DIR, PROOF_SEED_DIR } from "@/lib/db";
import { can } from "@/lib/perm";
import { currentAdmin } from "@/lib/session";
import { readPrivateFile } from "@/lib/upload";

const text = (body: string, status: number) =>
  new Response(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ paymentId: string }> }) {
  const admin = await currentAdmin();
  if (!admin) return text("Unauthorized", 401);
  if (!can(admin.role, "payments.verify")) return text("Forbidden", 403);

  const payment = byId("payments", (await params).paymentId);
  const file = payment && readPrivateFile(payment.proofKey, [PROOF_DIR, PROOF_SEED_DIR]);
  if (!file) return text("Not found", 404);

  const headers: Record<string, string> = { "Content-Type": file.type, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" };
  // SVG bisa memuat skrip → sandbox. PDF tidak diberi sandbox agar viewer bawaan browser tetap jalan.
  if (file.type === "image/svg+xml") headers["Content-Security-Policy"] = "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; sandbox";
  return new Response(new Uint8Array(file.buf), { headers });
}
