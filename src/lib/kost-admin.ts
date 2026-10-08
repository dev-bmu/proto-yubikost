// Query server-only Manajemen Kost admin (PRD §9.3, v1.2). Jangan impor dari komponen klien.
import { all, byId } from "./db";
import { leaseStatus, toIsoDate } from "./format";
import { expireBookings, residentsList, roomsOfKost } from "./queries";

export type RoomCounts = { total: number; occupied: number; reserved: number; available: number };

/** available = kamar berstatus AVAILABLE saja, sehingga total = terisi + dipesan + kosong. */
function countRooms(rooms: { status: string }[]): RoomCounts {
  const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
  const reserved = rooms.filter((r) => r.status === "RESERVED").length;
  return { total: rooms.length, occupied, reserved, available: rooms.length - occupied - reserved };
}

/** Daftar gedung untuk /admin/kost (termasuk yang disembunyikan). */
export function kostAdminList() {
  expireBookings();
  const rooms = all("rooms");
  const types = all("roomTypes");
  const leased = new Set(all("leases").filter((l) => l.status === "ACTIVE").map((l) => l.roomId));
  return all("kosts")
    .map((k) => {
      const own = rooms.filter((r) => r.kostId === k.id);
      const prices = types.filter((t) => t.kostId === k.id).map((t) => t.monthlyPrice);
      return {
        id: k.id,
        slug: k.slug,
        name: k.name,
        type: k.type,
        area: k.area,
        cover: k.photos[0] ?? "",
        isPublished: k.isPublished,
        typeCount: prices.length,
        residents: own.filter((r) => leased.has(r.id)).length,
        startPrice: prices.length ? Math.min(...prices) : k.monthlyPrice,
        ...countRooms(own),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name, "id"));
}
export type KostListItem = ReturnType<typeof kostAdminList>[number];

/** Semua data subpage gedung /admin/kost/[id]. Field kamar dibuat aman untuk dikirim ke klien. */
export function kostAdminDetail(id: string) {
  const kost = byId("kosts", id);
  if (!kost) return null;
  const roomRows = roomsOfKost(id);
  const types = all("roomTypes")
    .filter((t) => t.kostId === id)
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice);
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const bookings = all("bookings");
  const leases = all("leases");
  // Hanya kamar Tersedia yang belum pernah disewa/dipesan yang boleh dihapus (riwayat tetap utuh)
  const used = new Set([...leases.map((l) => l.roomId), ...bookings.map((b) => b.roomId)]);

  const rooms = roomRows.map((r) => ({
    id: r.id,
    number: r.number,
    floor: r.floor,
    typeId: r.typeId,
    typeName: typeName.get(r.typeId) ?? "Tanpa tipe",
    monthlyPrice: r.monthlyPrice,
    size: r.size,
    status: r.status,
    memberId: r.member?.id ?? "",
    memberName: r.member?.name ?? "",
    leaseStart: r.lease?.startDate ?? "",
    dueDate: r.lease?.dueDate ?? "",
    // Dihitung di server agar render klien stabil (tanpa hydration mismatch zona waktu)
    due: r.lease ? leaseStatus(r.lease.dueDate) : null,
    bookingStatus: r.booking?.status ?? "",
    bookingStage: r.booking?.stage ?? "",
    bookingExpires: r.booking?.expiresAt ?? "",
    hasLease: !!r.lease,
    deletable: !used.has(r.id) && r.status === "AVAILABLE",
  }));

  // Pendapatan = pembayaran DISETUJUI (tanggal verifikasi) untuk kamar di gedung ini
  const roomIds = new Set(rooms.map((r) => r.id));
  const paid = all("payments").filter((p) => {
    if (p.status !== "DISETUJUI") return false;
    const roomId = p.bookingId ? bookings.find((b) => b.id === p.bookingId)?.roomId : leases.find((l) => l.id === p.leaseId)?.roomId;
    return !!roomId && roomIds.has(roomId);
  });
  const now = new Date();
  const revenueOf = (offset: number) => {
    const month = toIsoDate(new Date(now.getFullYear(), now.getMonth() - offset, 1)).slice(0, 7);
    return paid.filter((p) => toIsoDate(new Date(p.verifiedAt || p.createdAt)).slice(0, 7) === month).reduce((sum, p) => sum + p.amount, 0);
  };

  return {
    kost,
    counts: countRooms(rooms),
    types: types.map((type) => ({ ...type, ...countRooms(rooms.filter((r) => r.typeId === type.id)) })),
    rooms,
    residents: residentsList().filter((r) => r.kost.id === id),
    revenue: revenueOf(0),
    revenuePrev: revenueOf(1),
  };
}
export type KostDetail = NonNullable<ReturnType<typeof kostAdminDetail>>;
export type AdminRoom = KostDetail["rooms"][number];
export type AdminRoomType = KostDetail["types"][number];
