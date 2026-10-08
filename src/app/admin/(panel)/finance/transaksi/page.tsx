// Finance → Data Transaksi: seluruh bukti pembayaran (menunggu, disetujui, ditolak) dalam data table.
import Link from "next/link";
import { FileSpreadsheet } from "lucide-react";
import { PageHeader, Forbidden } from "@/components/admin/kit";
import { TransactionTable } from "@/components/admin/finance/TransactionTable";
import { button } from "@/components/ui";
import { requirePermission } from "@/lib/admin-guard";
import { PAYMENT_STATUS } from "@/lib/constants";
import { transactionRows } from "@/lib/finance-views";
import { can } from "@/lib/perm";

export const metadata = { title: "Data Transaksi" };

export default async function TransaksiPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { admin, allowed } = await requirePermission("finance.view");
  if (!allowed) return <Forbidden what="melihat data transaksi" />;
  const { status: raw } = await searchParams;
  const status = raw && PAYMENT_STATUS[raw] ? raw : "";

  return (
    <>
      <PageHeader
        title="Data Transaksi"
        description="Semua bukti pembayaran beserta faktur & nomor penerimaannya. Cari, filter, urutkan kolom, atau saring per tanggal."
        actions={
          can(admin.role, "finance.export") && (
            <Link href="/admin/finance/accurate" className={button("neutral", "md", "whitespace-nowrap")}>
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" /> Ekspor Accurate
            </Link>
          )
        }
      />
      {/* key: tautan ?status= baru (mis. dari Dashboard) mengatur ulang filter tabel */}
      <TransactionTable key={status} rows={transactionRows()} canVerify={can(admin.role, "payments.verify")} initialStatus={status} />
    </>
  );
}
