"use client";
// Tab Kamar: filter, tabel per lantai, ubah/hapus/tandai status, dan tambah kamar bulk.
import { useMemo, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BedDouble, CheckCircle2, DoorClosed, DoorOpen, ListPlus, Pencil, Search, Trash2, X } from "lucide-react";
import { deleteRoom, toggleRoomStatus, updateRoom } from "@/actions/kost-admin";
import { Input, Select } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { td, th } from "@/components/admin/kit";
import { button, card, EmptyState, Notice, Pill, Spinner } from "@/components/ui";
import { bookingStatusLabel } from "@/lib/constants";
import { cn, formatDate, rupiah } from "@/lib/format";
import type { AdminRoom, AdminRoomType } from "@/lib/kost-admin";
import { BulkRoomsModal } from "./BulkRoomsModal";
import { ROOM_STATUS } from "./parts";

const byFloor = (a: string, b: string) => a.localeCompare(b, "id", { numeric: true });

export function RoomsTab({
  kostId,
  rooms,
  types,
  totalFloors,
  canManage,
}: {
  kostId: string;
  rooms: AdminRoom[];
  types: AdminRoomType[];
  totalFloors: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [type, setType] = useState("");
  const [floor, setFloor] = useState("");
  const [status, setStatus] = useState("");
  const [bulk, setBulk] = useState({ open: false, key: 0 });
  const [edit, setEdit] = useState<{ room: AdminRoom; typeId: string; number: string; floor: string } | null>(null);
  const [deleting, setDeleting] = useState<AdminRoom | null>(null);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [message, setMessage] = useState("");

  const floors = [...new Set(rooms.map((r) => r.floor))].sort(byFloor);
  const shown = useMemo(() => {
    const s = q.trim().toUpperCase();
    return rooms.filter(
      (r) => (!s || r.number.toUpperCase().includes(s)) && (!type || r.typeId === type) && (!floor || r.floor === floor) && (!status || r.status === status),
    );
  }, [rooms, q, type, floor, status]);
  const filtered = !!(q || type || floor || status);
  const reset = () => (setQ(""), setType(""), setFloor(""), setStatus(""));
  const err = (f: string) => (error?.field === f ? error.text : undefined);

  async function toggle(r: AdminRoom) {
    setBusyId(r.id);
    setError(null);
    const res = await toggleRoomStatus(r.id);
    setBusyId("");
    if (!res.ok) return setError({ text: res.error });
    setMessage(`Kamar ${r.number} ditandai ${res.status === "OCCUPIED" ? "Terisi" : "Tersedia"}.`);
    router.refresh();
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (!edit) return;
    setBusyId(edit.room.id);
    setError(null);
    const res = await updateRoom({ id: edit.room.id, typeId: edit.typeId, number: edit.number, floor: Number(edit.floor) });
    setBusyId("");
    if (!res.ok) return setError({ text: res.error, field: res.field });
    setMessage(`Kamar ${edit.number.trim().toUpperCase()} diperbarui.`);
    setEdit(null);
    router.refresh();
  }

  async function confirmDelete() {
    if (!deleting) return;
    setBusyId(deleting.id);
    setError(null);
    const res = await deleteRoom(deleting.id);
    setBusyId("");
    if (!res.ok) return setError({ text: res.error });
    setMessage(`Kamar ${deleting.number} dihapus.`);
    setDeleting(null);
    router.refresh();
  }

  const openBulk = () => (setMessage(""), setBulk((b) => ({ open: true, key: b.key + 1 })));

  return (
    <div className="space-y-5">
      <div className={card(false, "p-4 flex flex-col xl:flex-row xl:items-end gap-3")}>
        <div className="flex-1 min-w-0 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 md:col-span-1">
            <label htmlFor="cari-kamar" className="block text-xs font-semibold text-slate-600 mb-1.5">Cari nomor</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" aria-hidden="true" />
              <input
                id="cari-kamar"
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="A-01"
                className="w-full min-h-11 pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 text-sm text-slate-900 placeholder:text-slate-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
              />
            </div>
          </div>
          <Select label="Tipe" value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Semua tipe</option>
            {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
          <Select label="Lantai" value={floor} onChange={(e) => setFloor(e.target.value)}>
            <option value="">Semua lantai</option>
            {floors.map((f) => <option key={f} value={f}>Lantai {f}</option>)}
          </Select>
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Semua status</option>
            {Object.entries(ROOM_STATUS).map(([k, s]) => <option key={k} value={k}>{s.label}</option>)}
          </Select>
        </div>
        {canManage && (
          <button type="button" className={button("primary", "md", "shrink-0")} onClick={openBulk}>
            <ListPlus className="w-4 h-4" aria-hidden="true" /> Tambah Kamar (Bulk)
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-slate-500" aria-live="polite">
          Menampilkan <strong className="text-slate-900">{shown.length}</strong> dari {rooms.length} kamar
        </p>
        {filtered && (
          <button type="button" onClick={reset} className={button("ghost", "sm", "min-h-11 sm:min-h-9")}>
            <X className="w-4 h-4" aria-hidden="true" /> Reset filter
          </button>
        )}
      </div>

      {message && (
        <Notice tone="success" className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span role="status">{message}</span>
        </Notice>
      )}
      {error && !edit && !deleting && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}

      {shown.length ? (
        <div className="relative bg-white rounded-2xl border border-slate-200/80 shadow-card overflow-x-auto">
          <table className={cn("w-full", canManage ? "min-w-[860px]" : "min-w-[680px]")}>
            <caption className="sr-only">Daftar kamar per lantai</caption>
            <thead>
              <tr>
                {["Nomor", "Tipe", "Status", "Penghuni / pemesan", "Jatuh tempo"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                {canManage && <th scope="col" className={cn(th, "text-right")}>Aksi</th>}
              </tr>
            </thead>
            {[...new Set(shown.map((r) => r.floor))].sort(byFloor).map((f) => {
              const list = shown.filter((r) => r.floor === f);
              return (
                <tbody key={f} className="divide-y divide-slate-100 border-t border-slate-200">
                  <tr>
                    <th scope="colgroup" colSpan={canManage ? 6 : 5} className="px-4 py-2 text-left text-xs font-bold text-primary bg-primary-ultralight">
                      Lantai {f} <span className="font-semibold text-slate-600">· {list.length} kamar</span>
                    </th>
                  </tr>
                  {list.map((r) => {
                    const s = ROOM_STATUS[r.status] ?? ROOM_STATUS.AVAILABLE!;
                    const canToggle = r.status !== "RESERVED" && !r.hasLease;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60">
                        <td className={cn(td, "font-extrabold text-slate-900 tabular-nums")}>{r.number}</td>
                        <td className={td}>
                          <p className="font-semibold text-slate-800">{r.typeName}</p>
                          <p className="text-xs text-slate-500 tabular-nums whitespace-nowrap">{r.size} · {rupiah(r.monthlyPrice)}</p>
                        </td>
                        <td className={td}>
                          <Pill tone={s.tone}>{s.label}</Pill>
                          {r.status === "OCCUPIED" && !r.hasLease && <p className="text-xs text-slate-500 mt-1">Tanpa akun penghuni</p>}
                        </td>
                        <td className={td}>
                          {r.hasLease ? (
                            <Link href={`/admin/penghuni/${r.memberId}`} className="font-semibold text-primary hover:underline">{r.memberName}</Link>
                          ) : r.status === "RESERVED" ? (
                            <>
                              <p className="font-semibold text-slate-800">{r.memberName || "-"}</p>
                              <p className="text-xs text-amber-800">{r.bookingStatus ? bookingStatusLabel({ stage: r.bookingStage, status: r.bookingStatus }) : "Dipesan"}</p>
                            </>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        <td className={td}>
                          {r.dueDate ? (
                            <>
                              <p className="whitespace-nowrap tabular-nums">{formatDate(r.dueDate, "short")}</p>
                              {r.due && r.due.tone !== "success" && <Pill tone={r.due.tone} className="mt-1">{r.due.label}</Pill>}
                            </>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                        {canManage && (
                        <td className={cn(td, "text-right")}>
                            <div className="flex justify-end gap-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                className={button("neutral", "sm", "min-h-11 sm:min-h-9")}
                                onClick={() => (setError(null), setEdit({ room: r, typeId: r.typeId, number: r.number, floor: r.floor }))}
                              >
                                <Pencil className="w-4 h-4" aria-hidden="true" /> Ubah<span className="sr-only"> kamar {r.number}</span>
                              </button>
                              {canToggle && (
                                <button type="button" className={button("neutral", "sm", "min-h-11 sm:min-h-9")} disabled={busyId === r.id} onClick={() => toggle(r)}>
                                  {busyId === r.id ? <Spinner className="w-4 h-4" /> : r.status === "OCCUPIED" ? <DoorOpen className="w-4 h-4" aria-hidden="true" /> : <DoorClosed className="w-4 h-4" aria-hidden="true" />}
                                  {r.status === "OCCUPIED" ? "Tandai Tersedia" : "Tandai Terisi"}
                                  <span className="sr-only"> kamar {r.number}</span>
                                </button>
                              )}
                              {r.deletable && (
                                <button
                                  type="button"
                                  className={button("neutral", "sm", "min-h-11 sm:min-h-9 hover:border-red-600 hover:text-red-700")}
                                  onClick={() => (setError(null), setDeleting(r))}
                                  aria-label={`Hapus kamar ${r.number}`}
                                >
                                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                                </button>
                              )}
                            </div>
                        </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      ) : (
        <EmptyState
          icon={<BedDouble className="w-8 h-8" />}
          title={rooms.length ? "Tidak ada kamar yang cocok" : "Belum ada kamar"}
          action={
            rooms.length ? (
              <button type="button" className={button("primary")} onClick={reset}>Reset Semua Filter</button>
            ) : canManage ? (
              <button type="button" className={button("primary")} onClick={openBulk}><ListPlus className="w-4 h-4" aria-hidden="true" /> Tambah Kamar (Bulk)</button>
            ) : undefined
          }
        >
          {rooms.length ? "Ubah kata kunci atau filter." : "Tambahkan banyak kamar sekaligus untuk satu tipe, mis. A-01 sampai A-10."}
        </EmptyState>
      )}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit ? `Ubah Kamar ${edit.room.number}` : ""} icon={<Pencil className="w-4 h-4" />}>
        {edit && (
          <form onSubmit={saveEdit} noValidate className="p-5 space-y-4">
            <Select
              label="Tipe kamar"
              required
              value={edit.typeId}
              onChange={(e) => setEdit({ ...edit, typeId: e.target.value })}
              error={err("typeId")}
              disabled={edit.room.status === "RESERVED"}
              hint={edit.room.status === "RESERVED" ? "Kamar sedang dipesan customer; tipe bisa diubah setelah pesanan selesai." : undefined}
            >
              {types.map((t) => <option key={t.id} value={t.id}>{t.name} · {t.size} · {rupiah(t.monthlyPrice)}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nomor kamar" required maxLength={10} value={edit.number} onChange={(e) => setEdit({ ...edit, number: e.target.value })} error={err("number")} data-autofocus />
              <Input label="Lantai" required type="number" inputMode="numeric" min={1} max={totalFloors} value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })} error={err("floor")} />
            </div>
            {edit.typeId !== edit.room.typeId && (
              <Notice tone="warning">
                Foto, fasilitas, ukuran, dan harga kamar mengikuti tipe baru.
                {edit.room.hasLease && ` Kamar sedang disewa ${edit.room.memberName}; harga baru berlaku di perpanjangan berikutnya.`}
              </Notice>
            )}
            {error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}
            <div className="flex justify-end gap-2">
              <button type="button" className={button("neutral")} onClick={() => setEdit(null)}>Batal</button>
              <button type="submit" className={button("primary")} disabled={busyId === edit.room.id} aria-busy={busyId === edit.room.id}>
                {busyId === edit.room.id && <Spinner className="w-4 h-4" />} Simpan
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus kamar?" icon={<Trash2 className="w-4 h-4" />} size="sm">
        {deleting && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Kamar <strong className="text-slate-900">{deleting.number}</strong> ({deleting.typeName}, lantai {deleting.floor}) dihapus permanen. Kamar ini belum pernah disewa atau dipesan.
            </p>
            {error && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}
            <div className="flex justify-end gap-2">
              <button type="button" className={button("neutral")} onClick={() => setDeleting(null)}>Batal</button>
              <button type="button" className={button("danger")} disabled={busyId === deleting.id} aria-busy={busyId === deleting.id} onClick={confirmDelete}>
                {busyId === deleting.id && <Spinner className="w-4 h-4" />} Hapus Kamar
              </button>
            </div>
          </div>
        )}
      </Modal>

      <BulkRoomsModal
        key={bulk.key}
        open={bulk.open}
        onClose={() => setBulk((b) => ({ ...b, open: false }))}
        onDone={(m) => (setMessage(m), setBulk((b) => ({ ...b, open: false })))}
        kostId={kostId}
        types={types}
        rooms={rooms}
        totalFloors={totalFloors}
      />
    </div>
  );
}
