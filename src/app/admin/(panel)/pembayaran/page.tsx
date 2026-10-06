// Verifikasi Pembayaran (PRD §9.7, v1.1): bukti dari Dashboard Customer → Setujui / Tolak.
import Link from "next/link";
import { ExternalLink, FileSearch } from "lucide-react";
import { PageHeader, TableWrap, td, th } from "@/components/admin/kit";
import { CancelBookingAdminButton, PaymentActions } from "@/components/admin/people/PaymentActions";
import { StatusTabs } from "@/components/admin/people/StatusTabs";
import { button, Notice, Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { PAYMENT_KIND_LABEL, PAYMENT_STATUS, paymentRef } from "@/lib/constants";
import { all } from "@/lib/db";
import { addMonths, formatDate, formatDateTime, rupiah } from "@/lib/format";
import { can } from "@/lib/perm";
import { paymentsList, unpaidBookings, type PaymentRow } from "@/lib/queries";

export const metadata = { title: "Pembayaran" };

const TABS = ["verifikasi", "belum-bayar", "riwayat"] as const;

export default async function PembayaranAdminPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string }> }) {
  const admin = await requireAdmin();
  const { status: raw, done } = await searchParams;
  const tab = (TABS as readonly string[]).includes(raw ?? "") ? raw! : "verifikasi";
  const canVerify = can(admin.role, "payments.verify");
  const canCancel = canVerify || can(admin.role, "leads.assign");
  const payments = paymentsList();
  const waiting = payments.filter((p) => p.payment.status === "MENUNGGU_VERIFIKASI");
  const history = payments.filter((p) => p.payment.status !== "MENUNGGU_VERIFIKASI");
  const unpaid = unpaidBookings();
  const adminName = new Map(all("admins").map((a) => [a.id, a.name]));
  const result = done ? payments.find((p) => p.payment.id === done) : undefined;

  const effect = ({ payment, booking, lease, member, room }: PaymentRow) =>
    payment.kind === "SEWA_BARU" && booking
      ? `${member.name} menjadi Penghuni Kamar ${room?.number ?? "-"}, sewa ${formatDate(booking.startDate)} – ${formatDate(addMonths(booking.startDate, booking.months))}. Kamar berubah Terisi.`
      : lease
        ? `Jatuh tempo berubah dari ${formatDate(lease.dueDate)} menjadi ${formatDate(addMonths(lease.dueDate, payment.months))}.`
        : "Sewa aktif tidak ditemukan.";

  const place = (r: { room?: { number: string }; kost?: { name: string } }) => (
    <>
      <p className="font-semibold text-slate-800">Kamar {r.room?.number ?? "-"}</p>
      <p className="text-xs text-slate-500">{r.kost?.name ?? "-"}</p>
    </>
  );

  return (
    <>
      <PageHeader title="Pembayaran" description="Bukti transfer dari Dashboard Customer. Cocokkan nominal & kanal dengan mutasi rekening sebelum menyetujui." />

      {result && result.payment.status !== "MENUNGGU_VERIFIKASI" && (
        <Notice tone={result.payment.status === "DISETUJUI" ? "success" : "warning"} className="mb-4">
          <span role="status">
            Pembayaran {result.member.name} (Ref {paymentRef(result.payment.id)}) {result.payment.status === "DISETUJUI" ? "disetujui." : "ditolak. Customer diminta upload ulang."}
          </span>
        </Notice>
      )}
      {!canVerify && <Notice tone="info" className="mb-4">Peran Anda hanya dapat melihat. Verifikasi dilakukan Super Admin, Manager, atau Finance.</Notice>}

      <StatusTabs
        label="Status pembayaran"
        basePath="/admin/pembayaran"
        panelId="panel-pembayaran"
        active={tab}
        tabs={[
          { key: "verifikasi", label: "Menunggu Verifikasi", count: waiting.length },
          { key: "belum-bayar", label: "Menunggu Pembayaran", count: unpaid.length },
          { key: "riwayat", label: "Riwayat", count: history.length },
        ]}
      />

      <div role="tabpanel" id="panel-pembayaran" aria-labelledby={`tab-${tab}`}>
        {tab === "belum-bayar" ? (
          <TableWrap caption="Pesanan yang belum mengirim bukti">
            <thead>
              <tr>
                {["Customer", "Kamar & Kost", "Mulai · Paket", "Batas bayar", "Aksi"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {unpaid.map(({ booking, member, room, kost }) => (
                <tr key={booking.id}>
                  <td className={td}>
                    <p className="font-semibold text-slate-900">{member.name}</p>
                    {booking.note && <p className="text-xs text-red-700">Bukti ditolak: {booking.note}</p>}
                  </td>
                  <td className={td}>{place({ room, kost })}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(booking.startDate, "short")} · {booking.months} bln</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDateTime(booking.expiresAt)}</td>
                  <td className={td}>{canCancel ? <CancelBookingAdminButton id={booking.id} name={member.name} /> : "-"}</td>
                </tr>
              ))}
              {!unpaid.length && (
                <tr><td colSpan={5} className={`${td} text-center py-10 text-slate-500`}>Tidak ada pesanan yang menunggu pembayaran.</td></tr>
              )}
            </tbody>
          </TableWrap>
        ) : (
          <TableWrap caption={tab === "verifikasi" ? "Pembayaran menunggu verifikasi" : "Riwayat pembayaran"}>
            <thead>
              <tr>
                {["Customer", "Jenis", "Kamar & Kost", "Nominal", "Kanal", "Bukti", "Dikirim", tab === "verifikasi" ? "Aksi" : "Status"].map((h) => (
                  <th key={h} scope="col" className={th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(tab === "verifikasi" ? waiting : history).map((row) => {
                const { payment, member, channelLabel } = row;
                const s = PAYMENT_STATUS[payment.status] ?? { label: payment.status, tone: "neutral" as const };
                const kindLabel = `${PAYMENT_KIND_LABEL[payment.kind] ?? payment.kind} · ${payment.months} bulan`;
                return (
                  <tr key={payment.id} className="hover:bg-slate-50/60">
                    <td className={td}>
                      <p className="font-semibold text-slate-900">{member.name}</p>
                      <p className="text-xs text-slate-500 font-mono">Ref {paymentRef(payment.id)}</p>
                    </td>
                    <td className={td}><Pill tone={payment.kind === "SEWA_BARU" ? "info" : "neutral"}>{kindLabel}</Pill></td>
                    <td className={td}>{place(row)}</td>
                    <td className={`${td} tabular-nums whitespace-nowrap font-semibold text-slate-900`}>{rupiah(payment.amount)}</td>
                    <td className={td}>{channelLabel}</td>
                    <td className={td}>
                      {canVerify ? (
                        <a href={`/admin/bukti/${payment.id}`} target="_blank" rel="noopener noreferrer" className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                          <FileSearch className="w-4 h-4" aria-hidden="true" /> Lihat Bukti <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                          <span className="sr-only">(tab baru)</span>
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">Khusus Finance</span>
                      )}
                    </td>
                    <td className={`${td} whitespace-nowrap`}>{formatDateTime(payment.createdAt)}</td>
                    <td className={td}>
                      {tab === "verifikasi" ? (
                        canVerify ? (
                          <PaymentActions id={payment.id} name={member.name} kindLabel={kindLabel} amount={payment.amount} effect={effect(row)} />
                        ) : (
                          <span className="text-xs text-slate-500">Menunggu Finance</span>
                        )
                      ) : (
                        <>
                          <Pill tone={s.tone}>{s.label}</Pill>
                          <p className="text-xs text-slate-500 mt-1">
                            {adminName.get(payment.verifiedBy) ?? (payment.verifiedBy || "-")} · {formatDate(payment.verifiedAt, "short")}
                          </p>
                          {payment.note && <p className="text-xs text-slate-600 mt-0.5">{payment.note}</p>}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!(tab === "verifikasi" ? waiting : history).length && (
                <tr>
                  <td colSpan={8} className={`${td} text-center py-10 text-slate-500`}>
                    {tab === "verifikasi" ? "Tidak ada bukti yang menunggu verifikasi." : "Belum ada riwayat."}
                  </td>
                </tr>
              )}
            </tbody>
          </TableWrap>
        )}
      </div>
      <p className="mt-4 text-xs text-slate-500">
        Pesanan tanpa bukti otomatis batal setelah batas bayar. Pembayaran offline/walk-in tetap bisa lewat{" "}
        <Link href="/admin/leads" className="text-primary font-semibold underline">Leads → Assign</Link>.
      </p>
    </>
  );
}
