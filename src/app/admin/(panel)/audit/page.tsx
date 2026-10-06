// Audit log (PRD §12 SEC-05) — hanya Super Admin & Manager.
import { Forbidden, PageHeader, TableWrap, td, th } from "@/components/admin/kit";
import { requirePermission } from "@/lib/admin-guard";
import { all } from "@/lib/db";
import { cn, formatDate } from "@/lib/format";

export const metadata = { title: "Audit Log" };

const ACTION_LABEL: Record<string, string> = {
  "lease.assign": "Assign kamar",
  "resident.direct_add": "Direct Add penghuni",
  "payment.approve": "Setujui pembayaran",
  "payment.reject": "Tolak bukti pembayaran",
  "booking.cancel": "Batalkan pesanan",
  "nik.view": "Lihat NIK lengkap",
  "ktp.view": "Lihat foto KTP",
  "lease.end": "Akhiri sewa",
  "lease.due_date": "Ubah jatuh tempo",
  "member.reset_password": "Reset kata sandi",
  "room.create": "Tambah kamar",
  "room.update": "Ubah kamar",
  "room.delete": "Hapus kamar",
  "room.status": "Ubah status kamar",
  "channel.create": "Tambah rekening/QRIS",
  "channel.update": "Ubah rekening/QRIS",
  "channel.delete": "Hapus rekening/QRIS",
  "lead.status": "Ubah status lead",
};

const time = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

export default async function AuditPage() {
  const { allowed } = await requirePermission("audit.view");
  if (!allowed) {
    return (
      <>
        <PageHeader title="Audit Log" />
        <Forbidden what="melihat audit log" />
      </>
    );
  }

  const logs = all("audit").sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <>
      <PageHeader title="Audit Log" description="Riwayat aksi sensitif admin: akses KTP/NIK, assign, Direct Add, sewa, verifikasi pembayaran, dan kamar." />
      <TableWrap caption="Audit log, terbaru di atas">
        <thead>
          <tr>
            <th scope="col" className={th}>Waktu</th>
            <th scope="col" className={th}>Aktor</th>
            <th scope="col" className={th}>Aksi</th>
            <th scope="col" className={th}>Target</th>
            <th scope="col" className={th}>Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {logs.length === 0 && (
            <tr>
              <td colSpan={5} className={cn(td, "text-center text-slate-500 py-10")}>Belum ada aktivitas tercatat.</td>
            </tr>
          )}
          {logs.map((log) => (
            <tr key={log.id} className="hover:bg-slate-50">
              <td className={cn(td, "whitespace-nowrap tabular-nums")}>
                <time dateTime={log.createdAt}>
                  {formatDate(log.createdAt, "short")}, {time(log.createdAt)}
                </time>
              </td>
              <td className={td}>
                <p className="font-semibold text-slate-900">{log.actorName}</p>
                <p className="text-xs text-slate-500">{log.actorId}</p>
              </td>
              <td className={td}>
                <p className="font-semibold text-slate-900">{ACTION_LABEL[log.action] ?? log.action}</p>
                <code className="text-xs text-slate-500">{log.action}</code>
              </td>
              <td className={cn(td, "font-mono text-xs")}>{log.targetId || "—"}</td>
              <td className={cn(td, "max-w-xs break-words")}>{log.meta || "—"}</td>
            </tr>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}
