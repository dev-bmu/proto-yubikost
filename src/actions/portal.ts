"use server";
// Aksi biodata penghuni (PRD §8): simpan biodata + foto KTP privat.
import { revalidatePath } from "next/cache";
import { all, insert, KTP_DIR, newId, nowIso } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { residentContext } from "@/lib/queries";
import { currentMember } from "@/lib/session";
import { PROFILE_RELATIONS } from "@/lib/constants";
import { MAX_UPLOAD, savePrivateFile } from "@/lib/upload";
import type { Fail } from "./member";

const fail = (error: string, field?: string): Fail => ({ ok: false, error, field });


/** Biodata wajib (PRD §8.2). FormData: lihat nama field di bawah; ktpPhoto = File. */
export async function submitProfile(form: FormData): Promise<{ ok: true } | Fail> {
  const member = await currentMember();
  const ctx = member && residentContext(member.id);
  if (!member || !ctx) return fail("Portal khusus penghuni aktif.");
  if (ctx.profile) return fail("Biodata sudah tersimpan. Perubahan diajukan lewat Customer Care.");

  const get = (k: string) => String(form.get(k) ?? "").trim();
  const fullNameKtp = get("fullNameKtp");
  const nik = get("nik");
  const ktpAddress = get("ktpAddress");
  const occupation = get("occupation");
  const institution = get("institution");
  const faculty = get("faculty");
  const studyProgram = get("studyProgram");
  const guardianName = get("guardianName");
  const guardianWhatsapp = normalizePhone(get("guardianWhatsapp"));
  const guardianRelation = get("guardianRelation");
  const file = form.get("ktpPhoto");

  if (fullNameKtp.length < 3 || fullNameKtp.length > 100) return fail("Nama sesuai KTP 3–100 karakter.", "fullNameKtp");
  if (!/^\d{16}$/.test(nik)) return fail("NIK harus 16 digit angka.", "nik");
  if (all("profiles").some((p) => p.nik === nik)) return fail("NIK sudah terdaftar pada penghuni lain.", "nik");
  if (ktpAddress.length < 10) return fail("Alamat KTP minimal 10 karakter.", "ktpAddress");
  if (!(file instanceof File) || file.size === 0) return fail("Unggah foto KTP.", "ktpPhoto");
  if (file.size > MAX_UPLOAD) return fail("Ukuran foto KTP maksimal 3 MB.", "ktpPhoto");
  if (occupation !== "MAHASISWA" && occupation !== "PEKERJA") return fail("Pilih status Mahasiswa atau Pekerja.", "occupation");
  if (institution.length < 2) return fail(occupation === "MAHASISWA" ? "Isi nama universitas." : "Isi nama instansi.", "institution");
  if (occupation === "MAHASISWA" && !faculty) return fail("Isi fakultas.", "faculty");
  if (occupation === "MAHASISWA" && !studyProgram) return fail("Isi program studi.", "studyProgram");
  if (guardianName.length < 3) return fail("Nama orang tua/wali minimal 3 karakter.", "guardianName");
  if (!guardianWhatsapp) return fail("Nomor WhatsApp orang tua/wali tidak valid.", "guardianWhatsapp");
  if (guardianWhatsapp === member.whatsapp) return fail("Nomor orang tua/wali tidak boleh sama dengan nomor Anda.", "guardianWhatsapp");
  if (!PROFILE_RELATIONS.includes(guardianRelation)) return fail("Pilih hubungan keluarga.", "guardianRelation");
  if (form.get("consent") !== "on") return fail("Centang persetujuan pengolahan data pribadi.", "consent");

  // Disimpan di storage/ktp (privat, tidak di-serve publik). Akses hanya via /admin/ktp/[memberId].
  const saved = await savePrivateFile(file, KTP_DIR);
  if ("error" in saved) return fail(saved.error.replace("File", "Foto KTP"), "ktpPhoto");
  const key = saved.key;

  insert("profiles", {
    id: newId("prf"),
    memberId: member.id,
    fullNameKtp,
    nik,
    ktpAddress,
    ktpPhotoKey: key,
    occupation,
    institution,
    faculty: occupation === "MAHASISWA" ? faculty : "",
    studyProgram: occupation === "MAHASISWA" ? studyProgram : "",
    guardianName,
    guardianWhatsapp,
    guardianRelation,
    consentAt: nowIso(),
    createdAt: nowIso(),
  });
  revalidatePath("/", "layout");
  return { ok: true };
}

