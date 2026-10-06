// Foto publik hasil upload admin (gedung & tipe kamar). Nama file = UUID, jadi aman di-cache lama.
import { MEDIA_DIR } from "@/lib/db";
import { readPrivateFile } from "@/lib/upload";

export async function GET(_req: Request, { params }: { params: Promise<{ key: string }> }) {
  const file = readPrivateFile((await params).key, [MEDIA_DIR]);
  if (!file || file.type === "application/pdf" || file.type === "image/svg+xml") return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(file.buf), {
    headers: { "Content-Type": file.type, "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" },
  });
}
