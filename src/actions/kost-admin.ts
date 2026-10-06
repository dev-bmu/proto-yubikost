"use server";
// Manajemen Kost admin (PRD §9.3, v1.2): gedung, tipe kamar, kamar. Semua aksi butuh izin rooms.manage.
import { revalidatePath } from "next/cache";
import { all, audit, byId, insert, newId, nowIso, remove, update, type Admin, type Kost } from "@/lib/db";
import { BUILDING_FACILITIES, KOST_TYPES, ROOM_FACILITIES } from "@/lib/constants";
import { normalizePhone } from "@/lib/format";
import { can } from "@/lib/perm";
import { currentAdmin } from "@/lib/session";
import { formatSize, isRoomNumber, MAX_BULK, normalizeRoomNumber, slugify, toMapsEmbed } from "@/components/admin/kost/helpers";
import type { Fail } from "./member";

const fail = (error: string, field?: string, code?: string): Fail => ({ ok: false, error, field, code });
const done = () => revalidatePath("/", "layout");

async function guard(): Promise<Admin | Fail> {
  const admin = await currentAdmin();
  if (!admin) return fail("Sesi admin berakhir. Silakan masuk lagi.", undefined, "AUTH");
  if (!can(admin.role, "rooms.manage")) return fail("Akses ditolak untuk peran Anda.", undefined, "FORBIDDEN");
  return admin;
}
const isFail = (x: unknown): x is Fail => typeof x === "object" && x !== null && "ok" in x;

const PHOTO = /^\/media\/[0-9a-f-]{36}\.(jpg|png|webp)$|^https:\/\/images\.unsplash\.com\/[^\s"'<>]+$/;

function checkPhotos(photos: unknown, min: number, max: number): string[] | Fail {
  if (!Array.isArray(photos) || photos.some((p) => typeof p !== "string" || !PHOTO.test(p))) return fail("Foto tidak valid. Unggah ulang foto.", "photos");
  if (photos.length < min) return fail(`Unggah minimal ${min} foto.`, "photos");
  if (photos.length > max) return fail(`Maksimal ${max} foto.`, "photos");
  return [...new Set(photos as string[])];
}

const checkFacilities = (list: unknown, allowed: string[]): string[] | Fail =>
  Array.isArray(list) && list.every((f) => allowed.includes(f))
    ? allowed.filter((f) => list.includes(f))
    : fail("Pilihan fasilitas tidak valid.", "facilities");

/** Harga gedung (kartu katalog) = harga termurah antar tipe. */
function syncKostPrice(kostId: string) {
  const prices = all("roomTypes").filter((t) => t.kostId === kostId).map((t) => t.monthlyPrice);
  update("kosts", kostId, { monthlyPrice: prices.length ? Math.min(...prices) : 0 });
}

// ── Gedung ──────────────────────────────────────────────────

export type KostInput = {
  name: string;
  type: string;
  area: string;
  address: string;
  totalFloors: number;
  description: string;
  maps: string;
  facilities: string[];
  photos: string[];
  ownerName: string;
  ownerPhone: string;
  isPublished: boolean;
};

function parseKost(input: KostInput) {
  const name = String(input.name ?? "").trim();
  const area = String(input.area ?? "").trim();
  const address = String(input.address ?? "").trim();
  const floors = Number(input.totalFloors);
  if (name.length < 3) return fail("Nama gedung minimal 3 karakter.", "name");
  if (name.length > 80) return fail("Nama gedung maksimal 80 karakter.", "name");
  if (!(KOST_TYPES as readonly string[]).includes(input.type)) return fail("Pilih tipe penghuni.", "type");
  if (!area) return fail("Area wajib diisi, contoh: Suhat, Lowokwaru.", "area");
  if (address.length < 10) return fail("Alamat lengkap minimal 10 karakter.", "address");
  if (!Number.isInteger(floors) || floors < 1 || floors > 20) return fail("Jumlah lantai 1–20.", "totalFloors");
  const mapsEmbed = toMapsEmbed(String(input.maps ?? ""));
  if (mapsEmbed === null) return fail("Masukkan tautan embed Google Maps atau koordinat, contoh: -7.9425,112.6215.", "maps");
  const facilities = checkFacilities(input.facilities, BUILDING_FACILITIES);
  if (isFail(facilities)) return facilities;
  const photos = checkPhotos(input.photos, 0, 10);
  if (isFail(photos)) return photos;
  const ownerPhone = String(input.ownerPhone ?? "").trim();
  const phone = ownerPhone ? normalizePhone(ownerPhone) : "";
  if (ownerPhone && !phone) return fail("Nomor WhatsApp pemilik tidak valid. Contoh: 0812-3456-7890.", "ownerPhone");
  return {
    name,
    type: input.type,
    area,
    address,
    totalFloors: floors,
    description: String(input.description ?? "").trim().slice(0, 2000),
    mapsEmbed,
    facilities,
    photos,
    ownerName: String(input.ownerName ?? "").trim().slice(0, 80),
    ownerPhone: phone,
    isPublished: !!input.isPublished,
  };
}

function uniqueSlug(name: string) {
  const base = slugify(name) || "kost";
  const taken = new Set(all("kosts").map((k) => k.slug));
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  return slug;
}

/** Gedung baru tampil di katalog setelah punya foto sampul & minimal satu tipe kamar (kartu katalog tidak kosong). */
const publishBlocker = (photos: string[], typeCount: number) =>
  !photos.length
    ? "Unggah foto sampul sebelum menampilkan gedung di katalog."
    : !typeCount
      ? "Tambahkan minimal satu tipe kamar sebelum menampilkan gedung di katalog."
      : "";

export async function createKost(input: KostInput): Promise<{ ok: true; id: string } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const data = parseKost(input);
  if (isFail(data)) return data;
  if (all("kosts").some((k) => k.name.toLowerCase() === data.name.toLowerCase())) return fail("Nama gedung sudah dipakai.", "name");
  if (data.isPublished) return fail(publishBlocker(data.photos, 0), "isPublished");
  const kost: Kost = { id: newId("kost"), slug: uniqueSlug(data.name), monthlyPrice: 0, createdAt: nowIso(), ...data };
  insert("kosts", kost);
  audit(admin, "kost.create", kost.id, kost.name);
  done();
  return { ok: true, id: kost.id };
}

/** Slug tidak berubah saat nama diganti agar tautan katalog lama tetap berlaku. */
export async function updateKost(id: string, input: KostInput): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const data = parseKost(input);
  if (isFail(data)) return data;
  if (!byId("kosts", id)) return fail("Gedung tidak ditemukan.");
  if (all("kosts").some((k) => k.id !== id && k.name.toLowerCase() === data.name.toLowerCase())) return fail("Nama gedung sudah dipakai.", "name");
  const floorsUsed = all("rooms").filter((r) => r.kostId === id).map((r) => Number(r.floor) || 0);
  if (floorsUsed.some((f) => f > data.totalFloors)) return fail(`Masih ada kamar di lantai ${Math.max(...floorsUsed)}. Pindahkan kamar dulu.`, "totalFloors");
  const blocker = data.isPublished && publishBlocker(data.photos, all("roomTypes").filter((t) => t.kostId === id).length);
  if (blocker) return fail(blocker, "isPublished");
  update("kosts", id, data);
  audit(admin, "kost.update", id, data.name);
  done();
  return { ok: true };
}

export async function deleteKost(id: string, confirmName: string): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const kost = byId("kosts", id);
  if (!kost) return fail("Gedung tidak ditemukan.");
  if (String(confirmName ?? "").trim() !== kost.name) return fail("Nama gedung tidak cocok.", "confirm");
  if (all("rooms").some((r) => r.kostId === id)) return fail("Hapus semua kamar di gedung ini terlebih dahulu.");
  for (const t of all("roomTypes").filter((t) => t.kostId === id)) remove("roomTypes", t.id);
  remove("kosts", id);
  audit(admin, "kost.delete", id, kost.name);
  done();
  return { ok: true };
}

// ── Tipe kamar ──────────────────────────────────────────────

export type RoomTypeInput = {
  id?: string;
  kostId: string;
  name: string;
  length: number;
  width: number;
  monthlyPrice: number;
  description: string;
  facilities: string[];
  photos: string[];
};

/** Simpan tipe lalu salin ukuran/harga/fasilitas/foto ke semua kamar bertipe ini. */
export async function saveRoomType(input: RoomTypeInput): Promise<{ ok: true; id: string; synced: number } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const kost = byId("kosts", input.kostId);
  if (!kost) return fail("Gedung tidak ditemukan.");
  const existing = input.id ? byId("roomTypes", input.id) : undefined;
  if (input.id && existing?.kostId !== kost.id) return fail("Tipe kamar tidak ditemukan.");

  const name = String(input.name ?? "").trim();
  const length = Number(input.length);
  const width = Number(input.width);
  const price = Math.round(Number(input.monthlyPrice));
  if (name.length < 2 || name.length > 40) return fail("Nama tipe 2–40 karakter.", "name");
  if (all("roomTypes").some((t) => t.kostId === kost.id && t.id !== input.id && t.name.toLowerCase() === name.toLowerCase()))
    return fail("Nama tipe sudah dipakai di gedung ini.", "name");
  if (!(length >= 1 && length <= 20)) return fail("Panjang 1–20 meter.", "length");
  if (!(width >= 1 && width <= 20)) return fail("Lebar 1–20 meter.", "width");
  if (!(price > 0 && price <= 100_000_000)) return fail("Harga per bulan wajib lebih dari Rp 0.", "monthlyPrice");
  const facilities = checkFacilities(input.facilities, ROOM_FACILITIES);
  if (isFail(facilities)) return facilities;
  const photos = checkPhotos(input.photos, 1, 8);
  if (isFail(photos)) return photos;

  const shared = { size: formatSize(length, width), monthlyPrice: price, facilities, photos };
  const description = String(input.description ?? "").trim().slice(0, 1000);
  const id = existing?.id ?? newId("rt");
  if (existing) update("roomTypes", id, { name, description, ...shared });
  else insert("roomTypes", { id, kostId: kost.id, name, description, ...shared, createdAt: nowIso() });

  const rooms = all("rooms").filter((r) => r.typeId === id);
  for (const r of rooms) update("rooms", r.id, shared);
  syncKostPrice(kost.id);
  audit(admin, "roomtype.save", id, `${kost.name} · ${name} · ${rooms.length} kamar`);
  done();
  return { ok: true, id, synced: rooms.length };
}

export async function deleteRoomType(id: string): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const type = byId("roomTypes", id);
  if (!type) return fail("Tipe kamar tidak ditemukan.");
  const used = all("rooms").filter((r) => r.typeId === id).length;
  if (used) return fail(`Tipe ini masih dipakai ${used} kamar.`);
  const lastType = all("roomTypes").filter((t) => t.kostId === type.kostId).length === 1;
  if (lastType && byId("kosts", type.kostId)?.isPublished)
    return fail("Ini tipe terakhir gedung yang tampil di katalog. Sembunyikan gedung dulu di Info Gedung.");
  remove("roomTypes", id);
  syncKostPrice(type.kostId);
  audit(admin, "roomtype.delete", id, type.name);
  done();
  return { ok: true };
}

// ── Kamar ───────────────────────────────────────────────────

function checkFloor(kost: Kost, floor: unknown): string | Fail {
  const n = Number(floor);
  const max = kost.totalFloors || 20;
  if (!Number.isInteger(n) || n < 1 || n > max) return fail(`Lantai harus 1–${max}${kost.totalFloors ? ` (gedung ini ${max} lantai)` : ""}.`, "floor");
  return String(n);
}

export async function bulkCreateRooms(input: {
  kostId: string;
  typeId: string;
  floor: number;
  numbers: string[];
}): Promise<{ ok: true; created: number; skipped: string[] } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const kost = byId("kosts", input.kostId);
  if (!kost) return fail("Gedung tidak ditemukan.");
  const type = byId("roomTypes", input.typeId);
  if (type?.kostId !== kost.id) return fail("Pilih tipe kamar milik gedung ini.", "typeId");
  const floor = checkFloor(kost, input.floor);
  if (isFail(floor)) return floor;
  if (!Array.isArray(input.numbers) || input.numbers.length > 500) return fail("Daftar nomor kamar tidak valid.", "numbers");
  const numbers = [...new Set(input.numbers.map((n) => normalizeRoomNumber(String(n))))].filter(Boolean);
  const bad = numbers.find((n) => !isRoomNumber(n));
  if (bad) return fail(`Nomor "${bad}" tidak valid. Gunakan huruf, angka, atau tanda hubung (maks 10 karakter).`, "numbers");
  const taken = new Set(all("rooms").filter((r) => r.kostId === kost.id).map((r) => r.number.toUpperCase()));
  const fresh = numbers.filter((n) => !taken.has(n));
  if (!fresh.length) return fail("Semua nomor sudah ada di gedung ini.", "numbers");
  if (fresh.length > MAX_BULK) return fail(`Maksimal ${MAX_BULK} kamar sekali simpan.`, "numbers");

  const createdAt = nowIso();
  // ponytail: insert() menulis ulang file per baris; cukup untuk ≤ 100 kamar di prototype
  for (const number of fresh) {
    insert("rooms", {
      id: newId("room"), kostId: kost.id, typeId: type.id, number, floor,
      size: type.size, monthlyPrice: type.monthlyPrice, facilities: type.facilities, photos: type.photos,
      status: "AVAILABLE", createdAt,
    });
  }
  audit(admin, "rooms.bulk_create", kost.id, `${type.name} · lantai ${floor} · ${fresh.join(", ")}`);
  done();
  return { ok: true, created: fresh.length, skipped: numbers.filter((n) => taken.has(n)) };
}

export async function updateRoom(input: { id: string; typeId: string; number: string; floor: number }): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const room = byId("rooms", input.id);
  const kost = room && byId("kosts", room.kostId);
  if (!room || !kost) return fail("Kamar tidak ditemukan.");
  const number = normalizeRoomNumber(String(input.number ?? ""));
  if (!isRoomNumber(number)) return fail("Nomor kamar: huruf, angka, atau tanda hubung (maks 10 karakter).", "number");
  if (all("rooms").some((r) => r.kostId === kost.id && r.id !== room.id && r.number.toUpperCase() === number))
    return fail(`Nomor ${number} sudah dipakai di gedung ini.`, "number");
  const type = byId("roomTypes", input.typeId);
  if (type?.kostId !== kost.id) return fail("Pilih tipe kamar milik gedung ini.", "typeId");
  // Tagihan pesanan dihitung dari harga kamar, jadi tipe kamar yang sedang dipesan dikunci
  if (room.status === "RESERVED" && type.id !== room.typeId)
    return fail("Kamar sedang dipesan customer. Tipe bisa diubah setelah pesanan selesai.", "typeId");
  const floor = checkFloor(kost, input.floor);
  if (isFail(floor)) return floor;
  update("rooms", room.id, {
    number, floor, typeId: type.id,
    size: type.size, monthlyPrice: type.monthlyPrice, facilities: type.facilities, photos: type.photos,
  });
  audit(admin, "room.update", room.id, `${kost.name} · ${room.number} → ${number} · ${type.name}`);
  done();
  return { ok: true };
}

/** Hanya kamar Tersedia yang belum pernah disewa/dipesan (riwayat tetap utuh). */
export async function deleteRoom(id: string): Promise<{ ok: true } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const room = byId("rooms", id);
  if (!room) return fail("Kamar tidak ditemukan.");
  if (room.status !== "AVAILABLE") return fail("Hanya kamar berstatus Tersedia yang bisa dihapus. Tandai Tersedia dulu bila kamar sudah kosong.");
  if (all("leases").some((l) => l.roomId === id) || all("bookings").some((b) => b.roomId === id))
    return fail("Kamar ini punya riwayat sewa atau pesanan, jadi tidak bisa dihapus.");
  remove("rooms", id);
  audit(admin, "room.delete", id, room.number);
  done();
  return { ok: true };
}

/** Tandai Terisi ⇄ Tersedia untuk kamar tanpa sewa aktif (mis. penghuni offline / data impor). */
export async function toggleRoomStatus(id: string): Promise<{ ok: true; status: string } | Fail> {
  const admin = await guard();
  if (isFail(admin)) return admin;
  const room = byId("rooms", id);
  if (!room) return fail("Kamar tidak ditemukan.");
  if (room.status === "RESERVED") return fail("Kamar sedang dipesan customer. Status berubah lewat pesanan.");
  if (all("leases").some((l) => l.roomId === id && l.status === "ACTIVE"))
    return fail("Kamar punya sewa aktif. Akhiri sewa dari halaman Penghuni.");
  const status = room.status === "OCCUPIED" ? "AVAILABLE" : "OCCUPIED";
  update("rooms", id, { status });
  audit(admin, "room.status", id, `${room.number} → ${status}`);
  done();
  return { ok: true, status };
}
