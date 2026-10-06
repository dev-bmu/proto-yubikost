import { Forbidden, PageHeader } from "@/components/admin/kit";
import { ChannelManager } from "@/components/admin/people/ChannelManager";
import { requirePermission } from "@/lib/admin-guard";
import { all } from "@/lib/db";

export const metadata = { title: "Rekening & QRIS" };

export default async function RekeningPage() {
  const { allowed } = await requirePermission("channels.manage");
  if (!allowed) return <Forbidden what="mengelola rekening & QRIS" />;
  const channels = all("channels").sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <PageHeader title="Rekening & QRIS" description="Kanal pembayaran sewa baru & perpanjangan. Hanya kanal aktif yang tampil di Dashboard Customer." />
      <ChannelManager channels={channels} />
    </>
  );
}
