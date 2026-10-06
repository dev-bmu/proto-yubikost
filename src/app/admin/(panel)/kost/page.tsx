// Kost & Kamar — daftar gedung (PRD §9.3, v1.2). Angka absolut, tanpa persentase okupansi.
import Link from "next/link";
import { Building2, CalendarClock, DoorClosed, DoorOpen, Plus, UserCheck } from "lucide-react";
import { PageHeader, StatCard } from "@/components/admin/kit";
import { KostList } from "@/components/admin/kost/KostList";
import { button, Notice } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { kostAdminList } from "@/lib/kost-admin";
import { can } from "@/lib/perm";

export const metadata = { title: "Kost & Kamar" };

export default async function KostAdminPage() {
  const admin = await requireAdmin();
  const canManage = can(admin.role, "rooms.manage");
  const items = kostAdminList();
  const sum = (k: "total" | "occupied" | "reserved" | "available") => items.reduce((s, x) => s + x[k], 0);

  return (
    <>
      <PageHeader
        title="Kost & Kamar"
        description="Kelola gedung, tipe kamar, dan unit kamar. Kamar bertipe sama berbagi foto, fasilitas, ukuran, dan harga."
        actions={
          canManage && (
            <Link href="/admin/kost/baru" className={button("primary", "md", "whitespace-nowrap")}>
              <Plus className="w-4 h-4" aria-hidden="true" /> Tambah Gedung
            </Link>
          )
        }
      />

      {!canManage && (
        <Notice tone="info" className="mb-6">
          <strong>Mode lihat saja.</strong> Perubahan gedung, tipe, dan kamar dilakukan Super Admin, Manager, atau Operasional.
        </Notice>
      )}

      <section aria-labelledby="kpi-kost" className="mb-6">
        <h2 id="kpi-kost" className="sr-only">Ringkasan kamar semua gedung</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 [&>*:last-child]:col-span-2 md:[&>*:last-child]:col-span-1">
          <StatCard label="Gedung" value={items.length} icon={<Building2 className="w-5 h-5" />} />
          <StatCard label="Total Kamar" value={sum("total")} icon={<DoorOpen className="w-5 h-5" />} />
          <StatCard label="Terisi" value={sum("occupied")} icon={<UserCheck className="w-5 h-5" />} />
          <StatCard label="Dipesan" value={sum("reserved")} tone="warning" icon={<CalendarClock className="w-5 h-5" />} />
          <StatCard label="Kosong" value={sum("available")} tone="success" icon={<DoorClosed className="w-5 h-5" />} />
        </div>
      </section>

      <KostList items={items} />
    </>
  );
}
