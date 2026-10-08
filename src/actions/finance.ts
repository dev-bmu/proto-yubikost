"use server";
// Aksi menu Finance (PRD §9.10): ekspor impor-massal Accurate. File dikembalikan sebagai base64 lalu diunduh di peramban,
// sehingga penandaan "sudah diekspor" berjalan di proses yang sama dengan halaman.
import { revalidatePath } from "next/cache";
import { audit, nowIso, update } from "@/lib/db";
import { ACCURATE_EXPORTS, buildAccurateFile, buildAccurateRows, type AccurateKind } from "@/lib/accurate";
import { can } from "@/lib/perm";
import { currentAdmin } from "@/lib/session";
import type { Fail } from "./member";

const fail = (error: string, code?: string): Fail => ({ ok: false, error, code });

export async function exportAccurate(input: {
  kind: AccurateKind;
  ids: string[];
  /** Rentang tanggal untuk nama file, contoh "2026-10-08" atau "2026-10-01_sd_2026-10-08" */
  period: string;
}): Promise<{ ok: true; filename: string; base64: string; count: number; warnings: string[] } | Fail> {
  const admin = await currentAdmin();
  if (!admin) return fail("Sesi admin berakhir. Silakan masuk lagi.", "AUTH");
  if (!can(admin.role, "finance.export")) return fail("Akses ditolak untuk peran Anda.", "FORBIDDEN");
  const meta = ACCURATE_EXPORTS[input.kind];
  if (!meta) return fail("Jenis ekspor tidak dikenal.");
  const ids = [...new Set(input.ids)];
  if (!ids.length) return fail("Pilih minimal satu baris untuk diekspor.");
  if (ids.length > 2000) return fail("Maksimal 2.000 baris per file. Persempit rentang tanggal.");

  const { rows, included, warnings } = buildAccurateRows(input.kind, ids);
  if (!included.length) return { ok: false, error: warnings[0] ?? "Tidak ada baris yang bisa diekspor." };
  const file = buildAccurateFile(input.kind, rows);

  const at = nowIso();
  for (const id of included) {
    if (input.kind === "pelanggan") update("members", id, { accurateExportedAt: at });
    else if (input.kind === "faktur") update("invoices", id, { exportedAt: at });
    else update("payments", id, { exportedAt: at });
  }
  const period = input.period.replace(/[^0-9a-z_-]/gi, "") || "data";
  audit(admin, "accurate.export", input.kind, `${meta.title}: ${included.length} data · ${period}`);
  revalidatePath("/", "layout");
  return {
    ok: true,
    filename: `accurate-${meta.step}-${input.kind}-${period}.xlsx`,
    base64: file.toString("base64"),
    count: included.length,
    warnings,
  };
}
