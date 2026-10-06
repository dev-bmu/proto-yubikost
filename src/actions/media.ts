"use server";
// Upload foto gedung / tipe kamar (admin). Satu file per panggilan agar body tetap kecil; klien mengulang per file.
import { MEDIA_DIR } from "@/lib/db";
import { can } from "@/lib/perm";
import { currentAdmin } from "@/lib/session";
import { savePrivateFile } from "@/lib/upload";
import type { Fail } from "./member";

/** FormData: file (JPG/PNG/WEBP ≤ 3 MB). Hasil: URL publik "/media/<uuid>.<ext>" untuk disimpan di kolom photos. */
export async function uploadPhoto(form: FormData): Promise<{ ok: true; url: string } | Fail> {
  const admin = await currentAdmin();
  if (!admin) return { ok: false, error: "Sesi admin berakhir. Silakan masuk lagi.", code: "AUTH" };
  if (!can(admin.role, "rooms.manage")) return { ok: false, error: "Akses ditolak untuk peran Anda.", code: "FORBIDDEN" };
  const saved = await savePrivateFile(form.get("file"), MEDIA_DIR);
  if ("error" in saved) return { ok: false, error: saved.error.replace("File", "Foto"), field: "file" };
  return { ok: true, url: `/media/${saved.key}` };
}
