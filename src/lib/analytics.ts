// Agregasi Dashboard admin (server-only: membaca TSV lewat db.ts). Angka absolut, tanpa persentase okupansi (PRD §2).
import { all } from "./db";
import { daysUntil, leaseStatus } from "./format";
import { expireBookings } from "./queries";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
/** "2026-05" → { label: "Mei 26", title: "Mei 2026" } */
function monthNames(key: string) {
  const m = MONTHS[Number(key.slice(5, 7)) - 1];
  return { label: `${m} ${key.slice(2, 4)}`, title: `${m} ${key.slice(0, 4)}` };
}
const dayLabel = (d: Date) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const sum = (xs: { amount: number }[]) => xs.reduce((s, x) => s + x.amount, 0);

export const PERIODS = [6, 12] as const;

export function dashboardData(kostId: string | undefined, months: number) {
  expireBookings();
  const now = new Date();
  const kosts = all("kosts");
  const rooms = all("rooms");
  const leases = all("leases");
  const members = all("members");
  const bookings = all("bookings");
  const inquiries = all("inquiries");
  const inScope = (kid?: string) => !kostId || kid === kostId;

  const roomKost = new Map(rooms.map((r) => [r.id, r.kostId]));
  const bookingRoom = new Map(bookings.map((b) => [b.id, b.roomId]));
  const leaseRoom = new Map(leases.map((l) => [l.id, l.roomId]));
  const payments = all("payments").filter((p) => inScope(roomKost.get(bookingRoom.get(p.bookingId) ?? leaseRoom.get(p.leaseId) ?? "")));

  // Gedung tiap member: sewa terakhir > pesanan > permintaan survey (yang terakhir menimpa).
  const memberKost = new Map<string, string>();
  for (const i of [...inquiries].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) memberKost.set(i.memberId, i.kostId);
  for (const b of [...bookings].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) memberKost.set(b.memberId, b.kostId);
  for (const l of [...leases].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const k = roomKost.get(l.roomId);
    if (k) memberKost.set(l.memberId, k);
  }

  const keys = Array.from({ length: months }, (_, i) => monthKey(new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1)));
  const approved = payments.filter((p) => p.status === "DISETUJUI" && p.verifiedAt);
  const inPeriod = (iso: string) => iso.slice(0, 7) >= keys[0];

  // 1. Pendapatan terverifikasi per bulan (verifiedAt)
  const revenue = keys.map((key) => {
    const m = approved.filter((p) => p.verifiedAt.slice(0, 7) === key);
    return {
      ...monthNames(key),
      baru: sum(m.filter((p) => p.kind === "SEWA_BARU")),
      perpanjangan: sum(m.filter((p) => p.kind === "PERPANJANGAN")),
    };
  });

  // Bulan berjalan s/d hari ini vs periode yang sama bulan lalu (adil di awal bulan).
  const day = now.getDate();
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const revenueNow = sum(approved.filter((p) => p.verifiedAt.slice(0, 7) === monthKey(now)));
  const revenuePrev = sum(approved.filter((p) => p.verifiedAt.slice(0, 7) === monthKey(prev) && Number(p.verifiedAt.slice(8, 10)) <= day));

  // 2. Okupansi: per gedung, atau per tipe kamar bila satu gedung dipilih; urut total kamar terbanyak (PRD §9.2)
  const count = (rs: typeof rooms) => {
    const occupied = rs.filter((r) => r.status === "OCCUPIED").length;
    const reserved = rs.filter((r) => r.status === "RESERVED").length;
    return { occupied, reserved, free: rs.length - occupied - reserved, total: rs.length };
  };
  let occupancy;
  if (kostId) {
    const types = all("roomTypes").filter((t) => t.kostId === kostId);
    const typeIds = new Set(types.map((t) => t.id));
    const untyped = rooms.filter((r) => r.kostId === kostId && !typeIds.has(r.typeId));
    occupancy = types.map((t) => ({ id: t.id, name: t.name, href: `/admin/kost/${kostId}`, ...count(rooms.filter((r) => r.typeId === t.id)) }));
    if (untyped.length) occupancy.push({ id: "tanpa-tipe", name: "Tanpa tipe", href: `/admin/kost/${kostId}`, ...count(untyped) });
  } else {
    occupancy = kosts.map((k) => ({ id: k.id, name: k.name, href: `/admin/kost/${k.id}`, ...count(rooms.filter((r) => r.kostId === k.id)) }));
  }
  occupancy.sort((a, b) => b.total - a.total);

  // 3. Leads & konversi per bulan
  const registrants = members.filter((m) => (m.role === "PROSPECT" || m.role === "RESIDENT") && inScope(memberKost.get(m.id)));
  const scopedLeases = leases.filter((l) => inScope(roomKost.get(l.roomId)));
  const leads = keys.map((key) => ({
    ...monthNames(key),
    prospects: registrants.filter((m) => m.createdAt.slice(0, 7) === key).length,
    converted: scopedLeases.filter((l) => l.startDate.slice(0, 7) === key).length,
  }));

  // 4. Status bukti pembayaran dalam periode (createdAt)
  const periodPays = payments.filter((p) => inPeriod(p.createdAt));
  const paymentStatus = {
    approved: periodPays.filter((p) => p.status === "DISETUJUI").length,
    pending: periodPays.filter((p) => p.status === "MENUNGGU_VERIFIKASI").length,
    rejected: periodPays.filter((p) => p.status === "DITOLAK").length,
  };

  // 5. Jatuh tempo 30 hari ke depan, per minggu (hari 0–6, 7–13, …, 28–30)
  const active = scopedLeases.filter((l) => l.status === "ACTIVE").map((l) => ({ ...l, days: daysUntil(l.dueDate) }));
  const dueWeeks = Array.from({ length: 5 }, (_, w) => {
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate() + w * 7);
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.min(w * 7 + 6, 30));
    return {
      label: dayLabel(from),
      title: `${dayLabel(from)} – ${dayLabel(to)}`,
      count: active.filter((l) => l.days >= w * 7 && l.days <= Math.min(w * 7 + 6, 30)).length,
    };
  });
  const memberName = new Map(members.map((m) => [m.id, m.name]));
  const roomById = new Map(rooms.map((r) => [r.id, r]));
  const kostName = new Map(kosts.map((k) => [k.id, k.name]));
  const dueList = [...active]
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5)
    .map((l) => {
      const room = roomById.get(l.roomId);
      return {
        leaseId: l.id,
        memberId: l.memberId,
        name: memberName.get(l.memberId) ?? "-",
        room: room?.number ?? "-",
        kost: kostName.get(room?.kostId ?? "") ?? "-",
        dueDate: l.dueDate,
        status: leaseStatus(l.dueDate),
      };
    });

  // KPI & butuh tindakan
  const scopedRooms = rooms.filter((r) => inScope(r.kostId));
  const occ = count(scopedRooms);
  const prospectIds = new Set(members.filter((m) => m.role === "PROSPECT").map((m) => m.id));
  const since30 = new Date(now.getTime() - 30 * 86_400_000).toISOString();
  const kpi = {
    kostCount: kosts.filter((k) => inScope(k.id)).length,
    total: occ.total,
    occupied: occ.occupied,
    available: occ.total - occ.occupied - occ.reserved, // Kosong = belum dipesan; Total = Terisi + Dipesan + Kosong
    reserved: occ.reserved,
    residents: active.length,
    revenueNow,
    revenuePrev,
    prevLabel: `1–${day} ${MONTHS[prev.getMonth()]}`,
    pendingProofs: payments.filter((p) => p.status === "MENUNGGU_VERIFIKASI").length,
    newLeads30: registrants.filter((m) => m.createdAt >= since30).length,
    dueSoon: active.filter((l) => l.days <= 14).length,
    overdue: active.filter((l) => l.days < 0).length,
  };
  const todos = {
    newLeads: inquiries.filter((i) => i.status === "NEW" && prospectIds.has(i.memberId) && inScope(i.kostId)).length,
    pendingProofs: kpi.pendingProofs,
    unpaid: bookings.filter((b) => b.status === "MENUNGGU_PEMBAYARAN" && inScope(b.kostId)).length,
    dueSoon: kpi.dueSoon,
  };

  // 6. Ringkasan per gedung (pendapatan = periode terpilih)
  const perKost = kosts
    .filter((k) => inScope(k.id))
    .map((k) => {
      const c = count(rooms.filter((r) => r.kostId === k.id));
      const roomIds = new Set(rooms.filter((r) => r.kostId === k.id).map((r) => r.id));
      return {
        id: k.id,
        name: k.name,
        type: k.type,
        isPublished: k.isPublished,
        ...c,
        residents: active.filter((l) => roomIds.has(l.roomId)).length,
        revenue: sum(approved.filter((p) => inPeriod(p.verifiedAt) && roomIds.has(bookingRoom.get(p.bookingId) ?? leaseRoom.get(p.leaseId) ?? ""))),
      };
    });

  return { kpi, todos, revenue, occupancy, leads, paymentStatus, dueWeeks, dueList, perKost };
}

