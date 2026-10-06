"use server";
// Alat bantu demo prototype: login satu klik & reset data. Tidak ada di produksi.
import { revalidatePath } from "next/cache";
import { byId, resetData } from "@/lib/db";
import { setAdminSession, setMemberSession, clearAdminSession, clearMemberSession } from "@/lib/session";

export async function demoLogin(kind: "member" | "admin", id: string) {
  if (kind === "member" && byId("members", id)) await setMemberSession(id);
  if (kind === "admin" && byId("admins", id)) await setAdminSession(id);
  revalidatePath("/", "layout");
}

export async function resetDemoData() {
  resetData();
  await clearMemberSession();
  await clearAdminSession();
  revalidatePath("/", "layout");
}
