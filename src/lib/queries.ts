// Query baca (join antar tabel TSV) untuk Server Component. Jangan impor dari komponen klien.
import {
  all, byId, nowIso, update,
  type Booking, type Channel, type Inquiry, type Kost, type Lease, type Member, type Payment, type Profile, type Room,
} from "./db";
import { bookingDue, cancelInvoice } from "./finance";
import { bookingStatusLabel } from "./constants";

/**
 * Pesanan MENUNGGU_PEMBAYARAN yang lewat batas → KEDALUWARSA, kamar dilepas, faktur batal (PRD §8, K-16).
 * Tahap DP: uang muka tidak dibayar dalam 24 jam. Tahap PELUNASAN: masa berlaku uang muka habis (uang muka hangus).
 * ponytail: dijalankan saat data kamar/pesanan dibaca (lazy); produksi pakai cron.
 */
export function expireBookings() {
  const now = nowIso();
  for (const b of all("bookings").filter((b) => b.status === "MENUNGGU_PEMBAYARAN" && b.expiresAt < now)) {
    update("bookings", b.id, { status: "KEDALUWARSA", updatedAt: now });
    cancelInvoice(b.invoiceId, b.stage === "PELUNASAN" ? "Masa berlaku uang muka habis sebelum pelunasan" : "Uang muka tidak dibayar sampai batas waktu");
    const room = byId("rooms", b.roomId);
    if (room?.status === "RESERVED") update("rooms", room.id, { status: "AVAILABLE" });
  }
}

export const ACTIVE_BOOKING = ["MENUNGGU_PEMBAYARAN", "MENUNGGU_VERIFIKASI"];

/** Data gedung untuk publik/customer — kontak pemilik (internal) tidak ikut. */
export type KostCard = Omit<Kost, "ownerName" | "ownerPhone"> & { isAvailable: boolean; startPrice: number; isNew: boolean };

function toCard({ ownerName: _name, ownerPhone: _phone, ...k }: Kost, rooms: Room[]): KostCard {
  const own = rooms.filter((r) => r.kostId === k.id);
  const prices = own.map((r) => r.monthlyPrice).filter((p) => p > 0);
  const age = Date.now() - new Date(k.createdAt).getTime();
  return {
    ...k,
    isAvailable: own.some((r) => r.status === "AVAILABLE"),
    startPrice: prices.length ? Math.min(...prices) : k.monthlyPrice,
    isNew: age >= 0 && age <= 30 * 86_400_000,
  };
}

/** Katalog publik: hanya gedung isPublished. Admin memakai src/lib/kost-admin.ts. */
export function kostCards(): KostCard[] {
  expireBookings();
  const rooms = all("rooms");
  return all("kosts").filter((k) => k.isPublished).map((k) => toCard(k, rooms));
}

export function kostBySlug(slug: string): KostCard | undefined {
  expireBookings();
  const k = all("kosts").find((x) => x.slug === slug && x.isPublished);
  return k && toCard(k, all("rooms"));
}

const byFloorNumber = (a: Room, b: Room) =>
  a.floor.localeCompare(b.floor, "id", { numeric: true }) || a.number.localeCompare(b.number, "id", { numeric: true });

export function availableRooms(kostId: string): Room[] {
  expireBookings();
  return all("rooms").filter((r) => r.kostId === kostId && r.status === "AVAILABLE").sort(byFloorNumber);
}

/** Total = Terisi + Dipesan + Kosong (Kosong = belum dipesan). Angka absolut, tanpa persentase. */
export function roomStats(kostId?: string) {
  expireBookings();
  const rooms = all("rooms").filter((r) => !kostId || r.kostId === kostId);
  const occupied = rooms.filter((r) => r.status === "OCCUPIED").length;
  const reserved = rooms.filter((r) => r.status === "RESERVED").length;
  return { total: rooms.length, occupied, available: rooms.length - occupied - reserved, reserved };
}

export function perKostStats() {
  expireBookings();
  const rooms = all("rooms");
  return all("kosts").map((kost) => {
    const own = rooms.filter((r) => r.kostId === kost.id);
    const occupied = own.filter((r) => r.status === "OCCUPIED").length;
    return { kost, total: own.length, occupied, available: own.length - occupied, reserved: own.filter((r) => r.status === "RESERVED").length };
  });
}

export function landingStats() {
  const published = new Set(all("kosts").filter((k) => k.isPublished).map((k) => k.id));
  const rooms = all("rooms").filter((r) => published.has(r.kostId));
  return {
    kost: published.size,
    rooms: rooms.length,
    available: rooms.filter((r) => r.status === "AVAILABLE").length,
    residents: all("leases").filter((l) => l.status === "ACTIVE").length,
  };
}

/** Tipe kamar sebuah gedung + kamar AVAILABLE per tipe (Dashboard Customer: pilih tipe → pilih nomor). */
export function roomTypesWithAvailability(kostId: string) {
  const free = availableRooms(kostId);
  return all("roomTypes")
    .filter((t) => t.kostId === kostId)
    .sort((a, b) => a.monthlyPrice - b.monthlyPrice)
    .map((type) => ({ type, rooms: free.filter((r) => r.typeId === type.id) }));
}

export const activeLeaseOfMember = (memberId: string) =>
  all("leases").find((l) => l.memberId === memberId && l.status === "ACTIVE");

export const activeLeaseOfRoom = (roomId: string) =>
  all("leases").find((l) => l.roomId === roomId && l.status === "ACTIVE");

export const activeBookingOfMember = (memberId: string) =>
  all("bookings").find((b) => b.memberId === memberId && ACTIVE_BOOKING.includes(b.status));

export const profileOf = (memberId: string) => all("profiles").find((p) => p.memberId === memberId);

export type ResidentContext = {
  member: Member;
  lease: Lease;
  room: Room;
  kost: Kost;
  profile?: Profile;
  pendingPayment?: Payment;
};

export function residentContext(memberId: string): ResidentContext | null {
  const member = byId("members", memberId);
  const lease = activeLeaseOfMember(memberId);
  if (!member || member.role !== "RESIDENT" || !lease) return null;
  const room = byId("rooms", lease.roomId);
  const kost = room && byId("kosts", room.kostId);
  if (!room || !kost) return null;
  return {
    member,
    lease,
    room,
    kost,
    profile: profileOf(memberId),
    pendingPayment: all("payments").find((p) => p.leaseId === lease.id && p.kind === "PERPANJANGAN" && p.status === "MENUNGGU_VERIFIKASI"),
  };
}

export type PaymentView = Payment & { roomNumber: string; kostName: string; channelLabel: string };

/** Semua data Dashboard Customer dalam satu panggilan (PRD §8). */
export function customerContext(memberId: string) {
  expireBookings();
  const member = byId("members", memberId);
  if (!member) return null;
  const rooms = all("rooms");
  const kosts = all("kosts");
  const channels = all("channels");
  const place = (roomId: string) => {
    const room = rooms.find((r) => r.id === roomId);
    return { room, kost: room && kosts.find((k) => k.id === room.kostId) };
  };

  const resident = residentContext(memberId);
  const bookingRow = activeBookingOfMember(memberId);
  const booking = bookingRow && { ...bookingRow, ...place(bookingRow.roomId), ...bookingDue(bookingRow) };
  const myBookings = all("bookings").filter((b) => b.memberId === memberId);
  const leaseRoom = new Map(all("leases").filter((l) => l.memberId === memberId).map((l) => [l.id, l.roomId]));

  const payments: PaymentView[] = all("payments")
    .filter((p) => p.memberId === memberId)
    .map((p) => {
      const roomId = p.bookingId ? myBookings.find((b) => b.id === p.bookingId)?.roomId : leaseRoom.get(p.leaseId);
      const { room, kost } = place(roomId ?? "");
      return { ...p, roomNumber: room?.number ?? "-", kostName: kost?.name ?? "-", channelLabel: channels.find((c) => c.id === p.channelId)?.label ?? "-" };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    member,
    resident,
    profile: profileOf(memberId),
    booking,
    /** Bukti untuk pesanan aktif yang sedang diverifikasi / terakhir ditolak */
    bookingPayment: booking ? payments.find((p) => p.bookingId === booking.id) : undefined,
    payments,
  };
}
export type CustomerContext = NonNullable<ReturnType<typeof customerContext>>;

export function activeChannels(): Pick<Channel, "id" | "label" | "accountNumber" | "accountHolder" | "qrisImage">[] {
  return all("channels")
    .filter((c) => c.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(({ id, label, accountNumber, accountHolder, qrisImage }) => ({ id, label, accountNumber, accountHolder, qrisImage }));
}

export const INQUIRY_STATUS_LABEL: Record<string, string> = {
  NEW: "Baru",
  CONTACTED: "Dihubungi",
  CLOSED_WON: "Jadi Penghuni",
  CLOSED_LOST: "Batal",
};

export type LeadRow = {
  member: Member;
  inquiry?: Inquiry;
  booking?: Booking;
  kost?: Kost;
  room?: Room;
  statusLabel: string;
  lastActivity: string;
};

/** Prospect + pesanan aktif / permintaan survey terakhirnya (PRD §9.4). */
export function leadsList(): LeadRow[] {
  expireBookings();
  const inquiries = all("inquiries");
  const bookings = all("bookings");
  const kosts = all("kosts");
  const rooms = all("rooms");
  return all("members")
    .filter((m) => m.role === "PROSPECT")
    .map((member) => {
      const inquiry = inquiries
        .filter((i) => i.memberId === member.id)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
      const booking = bookings.find((b) => b.memberId === member.id && ACTIVE_BOOKING.includes(b.status));
      const kostId = booking?.kostId ?? inquiry?.kostId;
      const roomId = booking?.roomId ?? inquiry?.roomId;
      return {
        member,
        inquiry,
        booking,
        kost: kostId ? kosts.find((k) => k.id === kostId) : undefined,
        room: roomId ? rooms.find((r) => r.id === roomId) : undefined,
        statusLabel: booking
          ? bookingStatusLabel(booking)
          : inquiry ? INQUIRY_STATUS_LABEL[inquiry.status] ?? inquiry.status : "Terdaftar",
        lastActivity: [booking?.updatedAt, inquiry?.updatedAt, member.createdAt].filter(Boolean).sort().pop()!,
      };
    })
    .sort((a, b) => b.lastActivity.localeCompare(a.lastActivity));
}

export type ResidentRow = { member: Member; lease: Lease; room: Room; kost: Kost; profile?: Profile };

export function residentsList(): ResidentRow[] {
  const members = all("members");
  const rooms = all("rooms");
  const kosts = all("kosts");
  const profiles = all("profiles");
  return all("leases")
    .filter((l) => l.status === "ACTIVE")
    .flatMap((lease) => {
      const member = members.find((m) => m.id === lease.memberId);
      const room = rooms.find((r) => r.id === lease.roomId);
      const kost = room && kosts.find((k) => k.id === room.kostId);
      if (!member || !room || !kost) return [];
      return [{ member, lease, room, kost, profile: profiles.find((p) => p.memberId === member.id) }];
    })
    .sort((a, b) => a.lease.dueDate.localeCompare(b.lease.dueDate));
}

export type LeaseWithPlace = Lease & { room?: Room; kost?: Kost };

export function residentDetail(memberId: string) {
  const member = byId("members", memberId);
  if (!member) return null;
  const rooms = all("rooms");
  const kosts = all("kosts");
  const place = (l: Lease): LeaseWithPlace => {
    const room = rooms.find((r) => r.id === l.roomId);
    return { ...l, room, kost: room && kosts.find((k) => k.id === room.kostId) };
  };
  const leases = all("leases").filter((l) => l.memberId === memberId).map(place).sort((a, b) => b.startDate.localeCompare(a.startDate));
  return {
    member,
    profile: profileOf(memberId),
    leases,
    payments: all("payments").filter((p) => p.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  };
}

export type RoomRow = Room & { lease?: Lease; member?: Member; booking?: Booking };

export function roomsOfKost(kostId: string): RoomRow[] {
  expireBookings();
  const leases = all("leases").filter((l) => l.status === "ACTIVE");
  const bookings = all("bookings").filter((b) => ACTIVE_BOOKING.includes(b.status));
  const members = all("members");
  return all("rooms")
    .filter((r) => r.kostId === kostId)
    .sort(byFloorNumber)
    .map((room) => {
      const lease = leases.find((l) => l.roomId === room.id);
      const booking = bookings.find((b) => b.roomId === room.id);
      const memberId = lease?.memberId ?? booking?.memberId;
      return { ...room, lease, booking, member: memberId ? members.find((m) => m.id === memberId) : undefined };
    });
}

/** Kamar untuk Direct Add: AVAILABLE, atau OCCUPIED tanpa lease (hasil impor Sheets). RESERVED tidak boleh. */
export function roomsForDirectAdd() {
  const active = new Set(all("leases").filter((l) => l.status === "ACTIVE").map((l) => l.roomId));
  const kosts = all("kosts");
  return all("rooms")
    .filter((r) => r.status === "AVAILABLE" || (r.status === "OCCUPIED" && !active.has(r.id)))
    .sort(byFloorNumber)
    .map((room) => ({ room, kost: kosts.find((k) => k.id === room.kostId)! }))
    .filter((x) => x.kost);
}

/** Pilihan kamar AVAILABLE dikelompokkan per kost (dialog Assign & Sewa Kamar). */
export function availableRoomOptions() {
  return all("kosts").map((kost) => ({ kost, rooms: availableRooms(kost.id) }));
}
