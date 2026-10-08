// Finance → Konfirmasi Pembayaran (PRD §9.7, §9.10): verifikasi bukti uang muka / pelunasan / perpanjangan,
// dan pesanan yang menunggu pembayaran customer.
import Link from "next/link";
import { CalendarCheck, CircleDollarSign, FileClock, Hourglass, ReceiptText } from "lucide-react";
import { PageHeader, StatCard, Forbidden } from "@/components/admin/kit";
import { DueTable, VerifyTable, type VerifyRow } from "@/components/admin/finance/ConfirmTables";
import { StatusTabs } from "@/components/admin/people/StatusTabs";
import { Notice } from "@/components/ui";
import { requirePermission } from "@/lib/admin-guard";
import { DEPOSIT_AMOUNT, DP_TIERS } from "@/lib/constants";
import { all } from "@/lib/db";
import { endOfDayWib, wibDate } from "@/lib/finance";
import { dueRows, financeSummary, transactionRows, type TxRow } from "@/lib/finance-views";
import { addMonths, formatDate, rupiah } from "@/lib/format";
import { can } from "@/lib/perm";

export const metadata = { title: "Konfirmasi Pembayaran" };

const BASE = "/admin/finance/konfirmasi";

export default async function KonfirmasiPage({ searchParams }: { searchParams: Promise<{ status?: string; done?: string; due?: string }> }) {
  const { admin, allowed } = await requirePermission("finance.view");
  if (!allowed) return <Forbidden what="melihat konfirmasi pembayaran" />;
  const { status, done, due } = await searchParams;
  const tab = status === "belum-bayar" ? "belum-bayar" : "verifikasi";
  const canVerify = can(admin.role, "payments.verify");
  const canCancel = canVerify || can(admin.role, "leads.assign");

  const unpaid = dueRows(); // dipanggil sebelum ringkasan: sekaligus mengakhiri pesanan kedaluwarsa
  const today = wibDate(new Date().toISOString());
  const sum = financeSummary(today);
  const tx = transactionRows();

  // Efek persetujuan per jenis (sama dengan approvePayment di server)
  const payments = new Map(all("payments").map((p) => [p.id, p]));
  const bookings = new Map(all("bookings").map((b) => [b.id, b]));
  const leases = new Map(all("leases").map((l) => [l.id, l]));
  const effect = (r: TxRow): string[] => {
    const p = payments.get(r.id);
    const place = `Kamar ${r.roomNumber} ${r.kostName}`;
    if (r.kind === "PERPANJANGAN") {
      const lease = p && leases.get(p.leaseId);
      if (!lease) return ["Sewa aktif tidak ditemukan; persetujuan akan ditolak sistem."];
      return [`Jatuh tempo ${r.memberName} diperpanjang ${r.months} bulan: ${formatDate(lease.dueDate)} → ${formatDate(addMonths(lease.dueDate, r.months))}.`];
    }
    if (r.stage === "DP") {
      const dpPct = (p && bookings.get(p.bookingId)?.dpPct) ?? 0;
      const tier = DP_TIERS.find((t) => t.pct === dpPct) ?? DP_TIERS[0];
      const rest = Math.max(0, r.invoiceTotal - r.invoicePaid - r.amount);
      return [
        `${place} tetap ditahan sampai ${formatDate(wibDate(endOfDayWib(r.date, tier.days)))} (uang muka ${tier.pct}% berlaku ${tier.days} hari sejak bukti dikirim).`,
        `Pesanan pindah ke tab Menunggu Pembayaran: customer melunasi ${rupiah(rest)} (sisa sewa + deposit ${rupiah(DEPOSIT_AMOUNT)}) saat check-in ${formatDate(r.checkIn)}.`,
      ];
    }
    return [
      `${r.memberName} menjadi Penghuni ${place} mulai check-in ${formatDate(r.checkIn)} sampai ${formatDate(addMonths(r.checkIn, r.months))}; kamar berubah Terisi.`,
    ];
  };
  const waiting: VerifyRow[] = tx.filter((r) => r.status === "MENUNGGU_VERIFIKASI").map((r) => ({ ...r, effect: effect(r) }));

  // Hasil aksi terakhir (?done=<paymentId>&due=<tanggal hasil approvePayment>)
  const result = done ? tx.find((r) => r.id === done && r.status !== "MENUNGGU_VERIFIKASI") : undefined;
  const dueText = due && /^\d{4}-\d{2}-\d{2}$/.test(due) ? formatDate(due) : "";
  const resultText = !result
    ? ""
    : result.status === "DITOLAK"
      ? `Bukti ${result.label.toLowerCase()} ${result.memberName} (Ref ${result.ref}) ditolak. ${
          result.kind === "PERPANJANGAN" ? "Faktur perpanjangan dibatalkan; customer perlu mengajukan ulang." : "Customer diminta upload ulang bukti."
        }`
      : `${result.label} ${result.memberName} disetujui · No. Penerimaan ${result.receiptNo}. ${
          result.kind === "PERPANJANGAN"
            ? `Jatuh tempo baru ${dueText || "-"}.`
            : result.stage === "DP"
              ? `Kamar ${result.roomNumber} ditahan sampai ${dueText || "-"}; pelunasan dipantau di tab Menunggu Pembayaran.`
              : `${result.memberName} kini Penghuni Kamar ${result.roomNumber} mulai ${formatDate(result.checkIn)}${dueText ? ` sampai ${dueText}` : ""}.`
        }`;

  return (
    <>
      <PageHeader
        title="Konfirmasi Pembayaran"
        description="Bukti transfer dari Dashboard Customer: uang muka, pelunasan saat check-in, dan perpanjangan. Cocokkan nominal & kanal dengan mutasi rekening sebelum menyetujui."
      />

      {result && (
        <Notice tone={result.status === "DISETUJUI" ? "success" : "warning"} className="mb-4">
          <span role="status">{resultText}</span>
        </Notice>
      )}
      {!canVerify && (
        <Notice tone="info" className="mb-4">
          <strong>Mode lihat saja.</strong> Verifikasi bukti dilakukan Super Admin, Manager, atau Finance.
        </Notice>
      )}

      <section aria-labelledby="kpi-finance" className="mb-6">
        <h2 id="kpi-finance" className="sr-only">Ringkasan Finance</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1">
          <StatCard label="Menunggu verifikasi" value={sum.pending} tone="warning" icon={<FileClock className="w-5 h-5" />} sub="bukti perlu dicek" />
          <StatCard label="Tagihan berjalan" value={sum.due} icon={<Hourglass className="w-5 h-5" />} sub="pesanan menunggu pembayaran" />
          <StatCard label="Diterima hari ini" value={rupiah(sum.receivedToday)} tone="success" icon={<CircleDollarSign className="w-5 h-5" />} sub="pembayaran disetujui" />
          <StatCard label="Diterima bulan ini" value={rupiah(sum.receivedMonth)} tone="success" icon={<CalendarCheck className="w-5 h-5" />} sub="pembayaran disetujui" />
          <StatCard label="Piutang belum lunas" value={rupiah(sum.receivable)} tone="warning" icon={<ReceiptText className="w-5 h-5" />} sub={`${sum.openInvoices} faktur terbuka`} />
        </div>
      </section>

      <StatusTabs
        label="Konfirmasi pembayaran"
        basePath={BASE}
        panelId="panel-konfirmasi"
        active={tab}
        tabs={[
          { key: "verifikasi", label: "Menunggu Verifikasi", count: waiting.length },
          { key: "belum-bayar", label: "Menunggu Pembayaran", count: unpaid.length },
        ]}
      />

      <div role="tabpanel" id="panel-konfirmasi" aria-labelledby={`tab-${tab}`} className="space-y-4">
        {tab === "verifikasi" ? (
          <>
            <Notice tone="neutral">
              <p className="font-semibold text-slate-900">Efek persetujuan per jenis</p>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                <li><strong>Uang Muka</strong>: kamar tetap ditahan sampai masa berlaku uang muka habis; sisa sewa + deposit {rupiah(DEPOSIT_AMOUNT)} dibayar saat check-in.</li>
                <li><strong>Pelunasan</strong>: customer menjadi Penghuni mulai tanggal check-in dan kamar berubah Terisi.</li>
                <li><strong>Perpanjangan</strong>: jatuh tempo penghuni diperpanjang sesuai paket.</li>
              </ul>
            </Notice>
            <VerifyTable rows={waiting} canVerify={canVerify} />
          </>
        ) : (
          <DueTable rows={unpaid} canCancel={canCancel} />
        )}
      </div>

      <p className="mt-4 text-xs text-slate-500">
        Pesanan tanpa bukti otomatis batal setelah batas bayar. Pembayaran offline/walk-in lewat{" "}
        <Link href="/admin/leads" className="text-primary font-semibold underline">Leads → Assign</Link>. Riwayat lengkap ada di{" "}
        <Link href="/admin/finance/transaksi" className="text-primary font-semibold underline">Data Transaksi</Link>.
      </p>
    </>
  );
}
