// Sesi prototype: cookie berisi ID member/admin.
// ponytail: cookie tidak ditandatangani — HANYA untuk prototype. Produksi pakai JWT (PRD §7.6, SEC-01).
import { cookies } from "next/headers";
import { byId, type Admin, type Member } from "./db";

const MEMBER_COOKIE = "yk_member";
const ADMIN_COOKIE = "yk_admin";
const OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 60 * 60 * 24 * 7 };

export async function currentMember(): Promise<Member | null> {
  const id = (await cookies()).get(MEMBER_COOKIE)?.value;
  return (id && byId("members", id)) || null;
}

export async function currentAdmin(): Promise<Admin | null> {
  const id = (await cookies()).get(ADMIN_COOKIE)?.value;
  return (id && byId("admins", id)) || null;
}

export async function setMemberSession(id: string) {
  (await cookies()).set(MEMBER_COOKIE, id, OPTS);
}

export async function clearMemberSession() {
  (await cookies()).delete(MEMBER_COOKIE);
}

export async function setAdminSession(id: string) {
  (await cookies()).set(ADMIN_COOKIE, id, { ...OPTS, maxAge: 60 * 60 * 8 });
}

export async function clearAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

/** Data viewer yang aman dikirim ke komponen klien (tanpa password). */
export type Viewer =
  | { kind: "guest" }
  | { kind: "member"; id: string; name: string; whatsapp: string; role: "PROSPECT" | "RESIDENT"; mustChangePassword: boolean };

export async function currentViewer(): Promise<Viewer> {
  const m = await currentMember();
  if (!m) return { kind: "guest" };
  return {
    kind: "member",
    id: m.id,
    name: m.name,
    whatsapp: m.whatsapp,
    role: m.role === "RESIDENT" ? "RESIDENT" : "PROSPECT",
    mustChangePassword: m.mustChangePassword,
  };
}
