// Guard halaman admin (Server Component): redirect ke login bila belum masuk.
import { redirect } from "next/navigation";
import type { Admin } from "./db";
import { can, type Permission } from "./perm";
import { currentAdmin } from "./session";

export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/** Untuk halaman yang butuh izin tertentu: { admin, allowed }. Render <Forbidden/> bila !allowed. */
export async function requirePermission(perm: Permission) {
  const admin = await requireAdmin();
  return { admin, allowed: can(admin.role, perm) };
}
