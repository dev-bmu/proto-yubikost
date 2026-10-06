import { Forbidden, PageHeader } from "@/components/admin/kit";
import { LeadsClient, type KostRooms, type LeadItem } from "@/components/admin/people/LeadsClient";
import { requirePermission } from "@/lib/admin-guard";
import { formatDate } from "@/lib/format";
import { can } from "@/lib/perm";
import { availableRoomOptions, leadsList } from "@/lib/queries";

export const metadata = { title: "Leads" };

export default async function LeadsPage() {
  const { admin, allowed } = await requirePermission("leads.manage");
  if (!allowed) return <Forbidden what="melihat leads" />;

  // Hanya field yang aman dikirim ke klien (tanpa hash kata sandi).
  const leads: LeadItem[] = leadsList().map((l) => ({
    memberId: l.member.id,
    name: l.member.name,
    whatsapp: l.member.whatsapp,
    // Diformat di server agar tanggal (timestamp UTC) tidak beda zona waktu saat hydration.
    registered: formatDate(l.member.createdAt, "short"),
    activity: formatDate(l.lastActivity, "short"),
    statusLabel: l.statusLabel,
    inquiryId: l.inquiry?.id,
    inquiryStatus: l.inquiry?.status,
    notes: l.inquiry?.notes || undefined,
    kostId: l.kost?.id,
    kostName: l.kost?.name,
    roomId: l.room?.id,
    roomNumber: l.room?.number,
    hasBooking: Boolean(l.booking),
  }));
  const options: KostRooms[] = availableRoomOptions().map(({ kost, rooms }) => ({
    kostId: kost.id,
    kostName: kost.name,
    rooms: rooms.map((r) => ({ id: r.id, number: r.number, price: r.monthlyPrice })),
  }));

  return (
    <>
      <PageHeader
        title="Leads"
        description="Prospect beserta permintaan survey terakhirnya. Assign ke kamar setelah pembayaran pertama dicek."
      />
      <LeadsClient leads={leads} options={options} canManage canAssign={can(admin.role, "leads.assign")} />
    </>
  );
}
