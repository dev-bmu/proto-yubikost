import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Forbidden, PageHeader } from "@/components/admin/kit";
import { KostForm } from "@/components/admin/kost/KostForm";
import { button } from "@/components/ui";
import { requirePermission } from "@/lib/admin-guard";
import { cn } from "@/lib/format";

export const metadata = { title: "Tambah Gedung" };

const STEPS = ["Info Gedung", "Tipe Kamar", "Tambah Kamar"];

export default async function KostBaruPage() {
  const { allowed } = await requirePermission("rooms.manage");
  return (
    <>
      <Link href="/admin/kost" className={button("ghost", "sm", "-ml-3 mb-2 min-h-11 sm:min-h-9")}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Kembali ke Kost &amp; Kamar
      </Link>
      <PageHeader title="Tambah Gedung" description="Isi data gedung terlebih dahulu. Setelah disimpan, lanjutkan dengan tipe kamar lalu tambah kamar sekaligus (bulk)." />
      {allowed ? (
        <>
          {/* Stepper alur (C-19): langkah 1 aktif */}
          <ol className="flex items-center gap-2 mb-6" aria-label="Alur menambah gedung">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-2 flex-1 last:flex-none" aria-current={i === 0 ? "step" : undefined}>
                <span
                  className={cn(
                    "w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0",
                    i === 0 ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-100 text-slate-500",
                  )}
                >
                  {i + 1}
                </span>
                <span className={cn("text-xs font-semibold whitespace-nowrap", i === 0 ? "text-slate-900" : "hidden sm:inline text-slate-500")}>{s}</span>
                {i < STEPS.length - 1 && <span className="h-0.5 flex-1 bg-slate-200 min-w-4" aria-hidden="true" />}
              </li>
            ))}
          </ol>
          <KostForm />
        </>
      ) : (
        <Forbidden what="menambah gedung kost" />
      )}
    </>
  );
}
