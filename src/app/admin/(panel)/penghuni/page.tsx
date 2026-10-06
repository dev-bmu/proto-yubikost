import Link from "next/link";
import { ArrowDown, ArrowUp, ChevronRight } from "lucide-react";
import { PageHeader, TableWrap, td, th } from "@/components/admin/kit";
import { DirectAddButton } from "@/components/admin/people/DirectAddButton";
import { button, Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { formatDate, leaseStatus } from "@/lib/format";
import { can } from "@/lib/perm";
import { residentsList, roomsForDirectAdd } from "@/lib/queries";

export const metadata = { title: "Penghuni" };

export default async function PenghuniPage({ searchParams }: { searchParams: Promise<{ urut?: string }> }) {
  const admin = await requireAdmin();
  const desc = (await searchParams).urut === "terjauh";
  const rows = desc ? residentsList().reverse() : residentsList();
  const rooms = can(admin.role, "residents.add")
    ? roomsForDirectAdd().map(({ room, kost }) => ({
        id: room.id,
        label: `${kost.name} · ${room.number}${room.status === "OCCUPIED" ? " (terisi, data impor)" : ""}`,
      })).sort((a, b) => a.label.localeCompare(b.label, "id", { numeric: true }))
    : null;

  return (
    <>
      <PageHeader
        title="Penghuni"
        description={`${rows.length} penghuni dengan sewa aktif, diurutkan dari jatuh tempo ${desc ? "terjauh" : "terdekat"}.`}
        actions={rooms && <DirectAddButton rooms={rooms} />}
      />
      <TableWrap caption="Daftar penghuni dengan sewa aktif">
        <thead>
          <tr>
            <th scope="col" className={th}>Nama</th>
            <th scope="col" className={th}>Kamar &amp; Kost</th>
            <th scope="col" className={th}>Check-in</th>
            <th scope="col" className={th} aria-sort={desc ? "descending" : "ascending"}>
              <Link href={desc ? "/admin/penghuni" : "/admin/penghuni?urut=terjauh"} className="inline-flex items-center gap-1 min-h-11 sm:min-h-9 uppercase hover:text-primary">
                Jatuh tempo
                {desc ? <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" /> : <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />}
                <span className="sr-only">, urutkan dari {desc ? "terdekat" : "terjauh"}</span>
              </Link>
            </th>
            <th scope="col" className={th}>Biodata</th>
            <th scope="col" className={th}><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map(({ member, lease, room, kost, profile }) => {
            const status = leaseStatus(lease.dueDate);
            return (
              <tr key={lease.id} className="hover:bg-slate-50/60">
                <td className={td}>
                  <p className="font-semibold text-slate-900">{member.name}</p>
                  {member.mustChangePassword && <p className="text-xs text-slate-500">Belum ganti kata sandi</p>}
                </td>
                <td className={td}>
                  <p className="font-semibold text-slate-800">Kamar {room.number}</p>
                  <p className="text-xs text-slate-500">{kost.name}</p>
                </td>
                <td className={`${td} whitespace-nowrap`}>{formatDate(lease.startDate, "short")}</td>
                <td className={td}>
                  <p className="whitespace-nowrap">{formatDate(lease.dueDate, "short")}</p>
                  {status.tone !== "success" && (
                    <Pill tone={status.tone} className="mt-1">{status.label}</Pill>
                  )}
                </td>
                <td className={td}>
                  {profile ? <Pill tone="success">Lengkap</Pill> : <Pill tone="warning">Belum</Pill>}
                </td>
                <td className={`${td} text-right`}>
                  <Link
                    href={`/admin/penghuni/${member.id}`}
                    className={button("neutral", "sm", "min-h-11 sm:min-h-9")}
                    aria-label={`Detail penghuni ${member.name}`}
                  >
                    Detail <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </td>
              </tr>
            );
          })}
          {!rows.length && (
            <tr>
              <td colSpan={6} className={`${td} text-center py-10 text-slate-500`}>Belum ada penghuni dengan sewa aktif.</td>
            </tr>
          )}
        </tbody>
      </TableWrap>
    </>
  );
}
