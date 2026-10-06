// Simpan unggahan privat (foto KTP, bukti transfer). Jenis file dicek dari magic bytes, bukan MIME browser (SEC-03).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MAX_UPLOAD = 3 * 1024 * 1024;

export function detectExt(buf: Buffer, allowPdf = false): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpg";
  if (buf.subarray(0, 4).toString("hex") === "89504e47") return "png";
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return "webp";
  if (allowPdf && buf.subarray(0, 5).toString("ascii") === "%PDF-") return "pdf";
  return null;
}

/** Validasi + simpan. Hasil: nama file (key) atau pesan error. */
export async function savePrivateFile(file: FormDataEntryValue | null, dir: string, allowPdf = false): Promise<{ key: string } | { error: string }> {
  const types = allowPdf ? "JPG, PNG, WEBP, atau PDF" : "JPG, PNG, atau WEBP";
  if (!(file instanceof File) || file.size === 0) return { error: "Pilih file untuk diunggah." };
  if (file.size > MAX_UPLOAD) return { error: "Ukuran file maksimal 3 MB." };
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = detectExt(buf, allowPdf);
  if (!ext) return { error: `File harus ${types}.` };
  fs.mkdirSync(dir, { recursive: true });
  const key = `${crypto.randomUUID()}.${ext}`;
  fs.writeFileSync(path.join(dir, key), buf);
  return { key };
}

/** Baca file privat untuk route handler admin; fallback ke folder spesimen seed. */
export function readPrivateFile(key: string, dirs: string[]): { buf: Buffer; type: string } | null {
  if (!key || path.basename(key) !== key) return null; // cegah path traversal
  const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", svg: "image/svg+xml", pdf: "application/pdf" };
  const type = TYPES[key.split(".").pop() ?? ""];
  if (!type) return null;
  for (const dir of dirs) {
    const file = path.join(dir, key);
    if (fs.existsSync(file)) return { buf: fs.readFileSync(file), type };
  }
  return null;
}
