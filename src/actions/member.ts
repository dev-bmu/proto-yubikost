"use server";
// Aksi member publik: daftar, masuk, keluar, ganti sandi, catat survey.
import { revalidatePath } from "next/cache";
import { all, byId, insert, newId, nowIso, update } from "@/lib/db";
import { normalizePhone } from "@/lib/format";
import { hashPassword, verifyPassword } from "@/lib/password";
import { clearMemberSession, currentMember, setMemberSession } from "@/lib/session";

export type Fail = { ok: false; error: string; field?: string; code?: string };
const fail = (error: string, field?: string, code?: string): Fail => ({ ok: false, error, field, code });

export async function registerMember(input: {
  name: string;
  whatsapp: string;
  email: string;
  password: string;
  consent: boolean;
}): Promise<{ ok: true } | Fail> {
  const name = input.name.trim();
  const phone = normalizePhone(input.whatsapp);
  const email = input.email.trim();
  if (name.length < 3) return fail("Nama minimal 3 karakter.", "name");
  if (!phone) return fail("Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890.", "whatsapp");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Format email tidak valid.", "email");
  if (input.password.length < 8) return fail("Kata sandi minimal 8 karakter.", "password");
  if (!input.consent) return fail("Centang persetujuan Syarat & Ketentuan dan Kebijakan Privasi.", "consent");

  const members = all("members");
  if (members.some((m) => m.whatsapp === phone)) return fail("Nomor ini sudah terdaftar. Silakan masuk.", "whatsapp", "EXISTS");
  if (email && members.some((m) => m.email.toLowerCase() === email.toLowerCase()))
    return fail("Email sudah dipakai akun lain.", "email");

  const member = insert("members", {
    id: newId("mbr"),
    name,
    whatsapp: phone,
    email,
    password: hashPassword(input.password),
    role: "PROSPECT",
    mustChangePassword: false,
    source: "catalog",
    consentAt: nowIso(),
    createdAt: nowIso(),
    customerNo: "",
    accurateExportedAt: "",
  });
  await setMemberSession(member.id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function loginMember(input: { whatsapp: string; password: string }): Promise<{ ok: true; mustChangePassword: boolean } | Fail> {
  const phone = normalizePhone(input.whatsapp);
  const member = phone ? all("members").find((m) => m.whatsapp === phone) : undefined;
  // Pesan generik: tidak membocorkan nomor mana yang terdaftar (PRD §7.2)
  if (!member || !verifyPassword(input.password, member.password)) return fail("Nomor atau kata sandi salah.");
  await setMemberSession(member.id);
  revalidatePath("/", "layout");
  return { ok: true, mustChangePassword: member.mustChangePassword };
}

export async function logoutMember() {
  await clearMemberSession();
  revalidatePath("/", "layout");
}

export async function changeMemberPassword(input: { oldPassword: string; newPassword: string }): Promise<{ ok: true } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Sesi berakhir. Silakan masuk lagi.", undefined, "AUTH");
  if (!member.mustChangePassword && !verifyPassword(input.oldPassword, member.password))
    return fail("Kata sandi lama salah.", "oldPassword");
  if (input.newPassword.length < 8) return fail("Kata sandi baru minimal 8 karakter.", "newPassword");
  update("members", member.id, { password: hashPassword(input.newPassword), mustChangePassword: false });
  revalidatePath("/", "layout");
  return { ok: true };
}

/** Catat lead saat "Ajukan Survey Lokasi" diklik. Dedupe 24 jam per member + kamar (PRD §7.5). */
export async function logSurvey(input: { kostId: string; roomId: string }): Promise<{ ok: true } | Fail> {
  const member = await currentMember();
  if (!member) return fail("Silakan masuk.", undefined, "AUTH");
  if (!byId("rooms", input.roomId)) return fail("Kamar tidak ditemukan.");
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const recent = all("inquiries").find(
    (i) => i.memberId === member.id && i.roomId === input.roomId && i.createdAt >= dayAgo,
  );
  if (recent) {
    update("inquiries", recent.id, { updatedAt: nowIso() });
  } else {
    insert("inquiries", {
      id: newId("inq"),
      memberId: member.id,
      kostId: input.kostId,
      roomId: input.roomId,
      status: "NEW",
      notes: "",
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  }
  revalidatePath("/admin", "layout");
  return { ok: true };
}
