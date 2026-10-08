"use client";
// Denah kamar per lantai (tab Ringkasan): tile berwarna status, klik membuka detail kamar.
import { useState } from "react";
import Link from "next/link";
import { BedDouble, CalendarClock, ChevronRight, DoorOpen, UserCheck } from "lucide-react";
import { Modal } from "@/components/Modal";
import { button, Notice, Pill } from "@/components/ui";
import { BOOKING_STATUS, bookingStatusLabel } from "@/lib/constants";
import { cn, formatDate, formatDateTime, rupiah } from "@/lib/format";
import type { AdminRoom } from "@/lib/kost-admin";
import { ROOM_STATUS } from "./parts";

const ICON = { AVAILABLE: DoorOpen, RESERVED: CalendarClock, OCCUPIED: UserCheck } as Record<string, typeof DoorOpen>;

export function FloorPlan({ kostId, rooms, totalFloors }: { kostId: string; rooms: AdminRoom[]; totalFloors: number }) {
  const [open, setOpen] = useState<AdminRoom | null>(null);
  const floors = [...new Set([...Array.from({ length: totalFloors }, (_, i) => String(i + 1)), ...rooms.map((r) => r.floor)])].sort(
    (a, b) => a.localeCompare(b, "id", { numeric: true }),
  );

  return (
    <>
      <ul className="flex flex-wrap gap-x-4 gap-y-2 mb-5 text-xs text-slate-600" aria-label="Legenda status kamar">
        {Object.entries(ROOM_STATUS).map(([k, s]) => (
          <li key={k} className="inline-flex items-center gap-1.5">
            <span className={cn("w-3.5 h-3.5 rounded border", s.tile)} aria-hidden="true" />
            {s.label} <strong className="text-slate-900 tabular-nums">{rooms.filter((r) => r.status === k).length}</strong>
          </li>
        ))}
      </ul>

      <div className="space-y-5">
        {[...floors].reverse().map((f) => {
          const list = rooms.filter((r) => r.floor === f);
          return (
            <section key={f} aria-labelledby={`lantai-${f}`} className="space-y-2">
              <div className="flex items-baseline gap-2">
                <h3 id={`lantai-${f}`} className="text-sm font-bold text-slate-900">Lantai {f}</h3>
                <p className="text-xs text-slate-500">{list.length} kamar</p>
              </div>
              {list.length ? (
                <ul className="flex-1 min-w-0 grid grid-cols-3 sm:grid-cols-[repeat(auto-fill,minmax(6.25rem,1fr))] gap-2">
                  {list.map((r) => {
                    const s = ROOM_STATUS[r.status] ?? ROOM_STATUS.AVAILABLE!;
                    const Icon = ICON[r.status] ?? DoorOpen;
                    return (
                      <li key={r.id}>
                        <button
                          type="button"
                          onClick={() => setOpen(r)}
                          aria-haspopup="dialog"
                          className={cn("w-full min-h-[4.5rem] p-2.5 rounded-xl border-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-md", s.tile)}
                        >
                          <span className="flex items-center justify-between gap-1">
                            <span className="text-sm font-extrabold tabular-nums whitespace-nowrap truncate">{r.number}</span>
                            <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          </span>
                          <span className="block text-xs truncate mt-1" title={r.typeName}>{r.typeName}</span>
                          <span className="sr-only">, {s.label}{r.memberName ? `, ${r.memberName}` : ""}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="flex-1 min-h-[4.5rem] rounded-xl border-2 border-dashed border-slate-200 text-xs text-slate-500 flex items-center justify-center">
                  Belum ada kamar di lantai ini
                </p>
              )}
            </section>
          );
        })}
      </div>

      <Modal
        open={!!open}
        onClose={() => setOpen(null)}
        title={open ? `Kamar ${open.number}` : ""}
        subtitle={open && `Lantai ${open.floor} · ${open.typeName}`}
        icon={<BedDouble className="w-4 h-4" />}
      >
        {open && <RoomDetail room={open} kostId={kostId} />}
      </Modal>
    </>
  );
}

function RoomDetail({ room, kostId }: { room: AdminRoom; kostId: string }) {
  const s = ROOM_STATUS[room.status] ?? ROOM_STATUS.AVAILABLE!;
  const booking = room.bookingStatus
    ? { tone: BOOKING_STATUS[room.bookingStatus]?.tone ?? "warning", label: bookingStatusLabel({ stage: room.bookingStage, status: room.bookingStatus }) }
    : undefined;
  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-b-0">
      <dt className="text-sm text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-900 text-right tabular-nums">{value}</dd>
    </div>
  );

  return (
    <div className="p-5 space-y-4">
      <dl className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-1">
        {row("Status", <Pill tone={s.tone}>{s.label}</Pill>)}
        {row("Tipe", room.typeName)}
        {row("Ukuran", room.size || "-")}
        {row("Harga", <>{rupiah(room.monthlyPrice)}<span className="text-xs font-normal text-slate-500">/bulan</span></>)}
      </dl>

      {room.status === "OCCUPIED" && room.memberId && (
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500">Penghuni</p>
          <p className="font-bold text-slate-900 mt-0.5">{room.memberName}</p>
          <p className="text-sm text-slate-600 mt-1">
            Check-in {formatDate(room.leaseStart, "short")} · Jatuh tempo <strong className="text-slate-900">{formatDate(room.dueDate, "short")}</strong>
          </p>
          {room.due && <Pill tone={room.due.tone} className="mt-2">{room.due.label}</Pill>}
          <Link href={`/admin/penghuni/${room.memberId}`} className={button("neutral", "sm", "mt-3 min-h-11 sm:min-h-9")}>
            Lihat penghuni <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}
      {room.status === "OCCUPIED" && !room.memberId && (
        <Notice tone="neutral">Terisi tanpa akun penghuni (penghuni offline / data impor). Tautkan lewat Direct Add di menu Penghuni.</Notice>
      )}
      {room.status === "RESERVED" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-xs font-semibold text-amber-900">Dipesan oleh</p>
          <p className="font-bold text-slate-900 mt-0.5">{room.memberName || "-"}</p>
          {booking && <Pill tone={booking.tone} className="mt-2">{booking.label}</Pill>}
          {room.bookingStatus === "MENUNGGU_PEMBAYARAN" && room.bookingExpires && (
            <p className="text-sm text-amber-900 mt-2">
              {room.bookingStage === "PELUNASAN" ? "Ditahan sampai" : "Batas bayar uang muka"} {formatDateTime(room.bookingExpires)}
            </p>
          )}
          <Link
            href={`/admin/finance/konfirmasi?status=${room.bookingStatus === "MENUNGGU_PEMBAYARAN" ? "belum-bayar" : "verifikasi"}`}
            className={button("neutral", "sm", "mt-3 min-h-11 sm:min-h-9")}
          >
            Lihat di Konfirmasi Pembayaran <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>
      )}
      {room.status === "AVAILABLE" && <Notice tone="success">Kamar kosong dan siap dipesan customer dari Dashboard Customer.</Notice>}

      <Link href={`/admin/kost/${kostId}?tab=kamar`} className={button("ghost", "sm", "w-full min-h-11")}>
        Kelola di tab Kamar <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
