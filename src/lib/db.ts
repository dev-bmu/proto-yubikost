// Penyimpanan data prototype berbasis TSV.
// Sumber asli: data/seed/*.tsv (jangan diubah aplikasi). Data hidup: data/*.tsv,
// disalin otomatis dari seed saat pertama dibaca. Edit data/*.tsv lalu refresh browser.
// ponytail: baca/tulis seluruh file per operasi; cukup untuk prototype (< ribuan baris).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import os from "node:os";

// Seed ikut ter-deploy (read-only). Data hidup & upload ditulis ke RUNTIME_ROOT.
// Di Vercel filesystem read-only kecuali /tmp, jadi data hidup pindah ke sana.
// ponytail: /tmp per-instance dan kosong lagi saat cold start (data kembali ke seed). Route handler (/media, /admin/bukti,
// /admin/ktp) jalan di function terpisah dengan /tmp sendiri, jadi file yang di-upload saat demo di Vercel tidak bisa dibuka.
// Produksi pakai PostgreSQL + object storage (PRD §10).
const RUNTIME_ROOT = process.env.VERCEL ? path.join(os.tmpdir(), "yubikost") : process.cwd();
const SEED_ROOT = path.join(process.cwd(), "data");
const DATA_DIR = path.join(RUNTIME_ROOT, "data");
const SEED_DIR = path.join(SEED_ROOT, "seed");
export const KTP_DIR = path.join(RUNTIME_ROOT, "storage", "ktp");
export const KTP_SEED_DIR = path.join(SEED_ROOT, "seed-ktp");
/** Bukti transfer customer — privat seperti KTP, hanya dibaca lewat /admin/bukti/[id]. */
export const PROOF_DIR = path.join(RUNTIME_ROOT, "storage", "bukti");
export const PROOF_SEED_DIR = path.join(SEED_ROOT, "seed-bukti");
/** Foto gedung & tipe kamar hasil upload admin — publik, di-serve lewat /media/[key]. */
export const MEDIA_DIR = path.join(RUNTIME_ROOT, "storage", "media");

// s = string, n = number, b = boolean, l = list (dipisah "|")
type FT = { s: string; n: number; b: boolean; l: string[] };

export const schemas = {
  // Gedung kost. monthlyPrice = harga termurah antar tipe (dihitung ulang saat tipe disimpan). photos[0] = foto luar gedung.
  kosts: {
    id: "s", slug: "s", name: "s", type: "s", area: "s", address: "s", monthlyPrice: "n",
    facilities: "l", photos: "l", mapsEmbed: "s", description: "s", totalFloors: "n",
    ownerName: "s", ownerPhone: "s", isPublished: "b", createdAt: "s",
  },
  // Tipe kamar per gedung: kamar bertipe sama berbagi foto, fasilitas, ukuran, harga.
  roomTypes: {
    id: "s", kostId: "s", name: "s", size: "s", monthlyPrice: "n", facilities: "l", photos: "l",
    description: "s", createdAt: "s",
  },
  // size/monthlyPrice/facilities/photos = salinan dari tipe (ponytail: denormalisasi agar kode baca tetap sederhana;
  // disinkronkan saat tipe disimpan). status: AVAILABLE | RESERVED | OCCUPIED
  rooms: {
    id: "s", kostId: "s", typeId: "s", number: "s", floor: "s", size: "s", monthlyPrice: "n",
    facilities: "l", photos: "l", status: "s", createdAt: "s",
  },
  members: {
    id: "s", name: "s", whatsapp: "s", email: "s", password: "s", role: "s",
    mustChangePassword: "b", source: "s", consentAt: "s", createdAt: "s",
  },
  leases: {
    id: "s", memberId: "s", roomId: "s", startDate: "s", dueDate: "s", status: "s",
    createdBy: "s", endedAt: "s", createdAt: "s",
  },
  profiles: {
    id: "s", memberId: "s", fullNameKtp: "s", nik: "s", ktpAddress: "s", ktpPhotoKey: "s",
    occupation: "s", institution: "s", faculty: "s", studyProgram: "s", guardianName: "s",
    guardianWhatsapp: "s", guardianRelation: "s", consentAt: "s", createdAt: "s",
  },
  inquiries: {
    id: "s", memberId: "s", kostId: "s", roomId: "s", status: "s", notes: "s",
    createdAt: "s", updatedAt: "s",
  },
  // Pesanan sewa dari Dashboard Customer. status: MENUNGGU_PEMBAYARAN | MENUNGGU_VERIFIKASI | DISETUJUI | DIBATALKAN | KEDALUWARSA
  bookings: {
    id: "s", memberId: "s", kostId: "s", roomId: "s", startDate: "s", months: "n", status: "s",
    expiresAt: "s", leaseId: "s", note: "s", createdAt: "s", updatedAt: "s",
  },
  // Bukti pembayaran. kind: SEWA_BARU | PERPANJANGAN. status: MENUNGGU_VERIFIKASI | DISETUJUI | DITOLAK
  payments: {
    id: "s", kind: "s", memberId: "s", bookingId: "s", leaseId: "s", months: "n", amount: "n",
    channelId: "s", proofKey: "s", status: "s", note: "s", verifiedBy: "s", verifiedAt: "s", createdAt: "s",
  },
  channels: {
    id: "s", label: "s", accountNumber: "s", accountHolder: "s", qrisImage: "s",
    isActive: "b", sortOrder: "n",
  },
  admins: { id: "s", name: "s", email: "s", password: "s", role: "s" },
  testimonials: { id: "s", name: "s", content: "s", rating: "n", tag: "s" },
  audit: { id: "s", actorId: "s", actorName: "s", action: "s", targetId: "s", meta: "s", createdAt: "s" },
} as const satisfies Record<string, Record<string, keyof FT>>;

export type TableName = keyof typeof schemas;
type Schema<T extends TableName> = (typeof schemas)[T];
export type Row<T extends TableName> = { -readonly [K in keyof Schema<T>]: FT[Schema<T>[K] & keyof FT] };

export type Kost = Row<"kosts">;
export type Room = Row<"rooms">;
export type RoomType = Row<"roomTypes">;
export type Member = Row<"members">;
export type Lease = Row<"leases">;
export type Profile = Row<"profiles">;
export type Inquiry = Row<"inquiries">;
export type Booking = Row<"bookings">;
export type Payment = Row<"payments">;
export type Channel = Row<"channels">;
export type Admin = Row<"admins">;
export type Testimonial = Row<"testimonials">;
export type AuditLog = Row<"audit">;

const file = (t: TableName) => path.join(DATA_DIR, `${t}.tsv`);
const clean = (s: string) => s.replace(/[\t\r\n]+/g, " ").trim();

function decode(type: keyof FT, raw: string) {
  if (type === "n") return raw === "" ? 0 : Number(raw);
  if (type === "b") return raw === "true" || raw === "1";
  if (type === "l") return raw ? raw.split("|").map((s) => s.trim()).filter(Boolean) : [];
  return raw;
}

function encode(type: keyof FT, value: unknown): string {
  if (type === "l") return ((value as string[]) ?? []).map(clean).join("|");
  if (type === "b") return value ? "true" : "false";
  return clean(String(value ?? ""));
}

function ensureFile(t: TableName) {
  const f = file(t);
  if (!fs.existsSync(f)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.copyFileSync(path.join(SEED_DIR, `${t}.tsv`), f);
  }
  return f;
}

export function all<T extends TableName>(t: T): Row<T>[] {
  const text = fs.readFileSync(ensureFile(t), "utf8").replace(/^﻿/, "");
  const [head, ...lines] = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (!head) return [];
  const cols = head.split("\t").map((c) => c.trim());
  const schema = schemas[t] as Record<string, keyof FT>;
  return lines.map((line) => {
    const cells = line.split("\t");
    const row: Record<string, unknown> = {};
    for (const [key, type] of Object.entries(schema)) {
      const i = cols.indexOf(key);
      row[key] = decode(type, i === -1 ? "" : (cells[i] ?? "").trim());
    }
    return row as Row<T>;
  });
}

function save<T extends TableName>(t: T, rows: Row<T>[]) {
  const schema = schemas[t] as Record<string, keyof FT>;
  const keys = Object.keys(schema);
  const body = rows.map((r) => keys.map((k) => encode(schema[k], (r as Record<string, unknown>)[k])).join("\t"));
  fs.writeFileSync(file(t), [keys.join("\t"), ...body].join("\n") + "\n", "utf8");
}

type WithId = { id: string };

export function byId<T extends TableName>(t: T, id: string): Row<T> | undefined {
  return all(t).find((r) => (r as WithId).id === id);
}

export function where<T extends TableName>(t: T, pred: (r: Row<T>) => boolean): Row<T>[] {
  return all(t).filter(pred);
}

export function insert<T extends TableName>(t: T, row: Row<T>): Row<T> {
  save(t, [...all(t), row]);
  return row;
}

export function update<T extends TableName>(t: T, id: string, patch: Partial<Row<T>>): Row<T> | undefined {
  const rows = all(t);
  const i = rows.findIndex((r) => (r as WithId).id === id);
  if (i === -1) return undefined;
  rows[i] = { ...rows[i], ...patch };
  save(t, rows);
  return rows[i];
}

export function remove<T extends TableName>(t: T, id: string): boolean {
  const rows = all(t);
  const next = rows.filter((r) => (r as WithId).id !== id);
  if (next.length === rows.length) return false;
  save(t, next);
  return true;
}

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
export const nowIso = () => new Date().toISOString();

export function audit(actor: { id: string; name: string }, action: string, targetId: string, meta = "") {
  insert("audit", { id: newId("log"), actorId: actor.id, actorName: actor.name, action, targetId, meta, createdAt: nowIso() });
}

export function resetData() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  for (const f of fs.readdirSync(SEED_DIR).filter((f) => f.endsWith(".tsv"))) {
    fs.copyFileSync(path.join(SEED_DIR, f), path.join(DATA_DIR, f));
  }
  for (const [dir, seed] of [[KTP_DIR, KTP_SEED_DIR], [PROOF_DIR, PROOF_SEED_DIR]]) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.cpSync(seed, dir, { recursive: true });
  }
  fs.rmSync(MEDIA_DIR, { recursive: true, force: true });
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}
