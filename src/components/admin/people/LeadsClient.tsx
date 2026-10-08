"use client";
// Leads Management & Assign (PRD §9.4): filter klien, ubah status, dialog Assign ke Kamar.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DoorOpen, MessageCircle, UserCheck } from "lucide-react";
import { assignRoom, updateInquiryStatus } from "@/actions/admin";
import { Input, RadioCard, Select } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { button, Notice, Pill, Spinner } from "@/components/ui";
import { td, th, TableWrap } from "@/components/admin/kit";
import { INQUIRY_STATUSES, PACKAGES } from "@/lib/constants";
import { addMonths, maskPhone, rupiah, todayIso, type Tone } from "@/lib/format";
import { waChat } from "@/lib/wa";

export type LeadItem = {
  memberId: string;
  name: string;
  whatsapp: string;
  registered: string;
  activity: string;
  statusLabel: string;
  inquiryId?: string;
  inquiryStatus?: string;
  notes?: string;
  kostId?: string;
  kostName?: string;
  roomId?: string;
  roomNumber?: string;
  /** Pesanan aktif dari Dashboard Customer → Assign manual dinonaktifkan */
  hasBooking?: boolean;
};

export type KostRooms = { kostId: string; kostName: string; rooms: { id: string; number: string; price: number }[] };

const STATUS_LABEL: Record<string, string> = { NEW: "Baru", CONTACTED: "Dihubungi", CLOSED_WON: "Jadi Penghuni", CLOSED_LOST: "Batal" };
const TONE: Record<string, Tone> = {
  Baru: "info",
  Dihubungi: "warning",
  "Jadi Penghuni": "success",
  Batal: "neutral",
  Terdaftar: "neutral",
  "Menunggu Pembayaran": "warning",
  "Menunggu Verifikasi": "info",
};
const FILTER_STATUSES = ["Baru", "Dihubungi", "Menunggu Pembayaran", "Menunggu Verifikasi", "Jadi Penghuni", "Batal", "Terdaftar"];
/** Tombol sm tetap 44px di mobile (C-01). */
const TOUCH = "min-h-11 sm:min-h-9";

export function LeadsClient({
  leads,
  options,
  canManage,
  canAssign,
}: {
  leads: LeadItem[];
  options: KostRooms[];
  canManage: boolean;
  canAssign: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [kost, setKost] = useState("");
  const [assigning, setAssigning] = useState<LeadItem | null>(null);
  const [savingId, setSavingId] = useState("");
  const [message, setMessage] = useState<{ tone: Tone; text: string; assigned?: boolean } | null>(null);

  const rows = useMemo(() => {
    const text = q.trim().toLowerCase();
    const digits = q.replace(/\D/g, "").replace(/^0/, "62");
    return leads.filter(
      (l) =>
        (!text || l.name.toLowerCase().includes(text) || (digits.length >= 3 && l.whatsapp.includes(digits))) &&
        (!status || l.statusLabel === status) &&
        (!kost || l.kostId === kost),
    );
  }, [leads, q, status, kost]);

  async function changeStatus(lead: LeadItem, next: string) {
    if (!lead.inquiryId) return;
    setSavingId(lead.inquiryId);
    const r = await updateInquiryStatus(lead.inquiryId, next);
    setSavingId("");
    setMessage(r.ok ? { tone: "success", text: `Status ${lead.name} diubah menjadi "${STATUS_LABEL[next]}".` } : { tone: "danger", text: r.error });
    router.refresh();
  }

  const filtered = q || status || kost;

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-card grid gap-3 sm:grid-cols-3">
        <Input label="Cari nama / nomor" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nama atau 08xx" />
        <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {FILTER_STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </Select>
        <Select label="Kost" value={kost} onChange={(e) => setKost(e.target.value)}>
          <option value="">Semua Kost</option>
          {options.map((o) => (
            <option key={o.kostId} value={o.kostId}>{o.kostName}</option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-500">
        <p aria-live="polite">
          Menampilkan <strong className="text-slate-900">{rows.length}</strong> dari {leads.length} prospect
        </p>
        {filtered && (
          <button type="button" className={button("ghost", "sm", TOUCH)} onClick={() => (setQ(""), setStatus(""), setKost(""))}>
            Reset filter
          </button>
        )}
      </div>

      {message && (
        <Notice tone={message.tone} className="flex flex-wrap items-center justify-between gap-2">
          <span role="status">{message.text}</span>
          {message.assigned && (
            <Link href="/admin/penghuni" className="font-bold text-primary hover:text-primary-dark underline">
              Lihat Penghuni
            </Link>
          )}
        </Notice>
      )}

      <TableWrap caption="Daftar prospect beserta permintaan survey terakhir">
        <thead>
          <tr>
            <th scope="col" className={th}>Nama</th>
            <th scope="col" className={th}>WhatsApp</th>
            <th scope="col" className={th}>Minat</th>
            <th scope="col" className={th}>Terdaftar</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}>Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((l) => (
            <tr key={l.memberId} className="hover:bg-slate-50/60">
              <td className={td}>
                <p className="font-semibold text-slate-900">{l.name}</p>
              </td>
              <td className={`${td} tabular-nums whitespace-nowrap`}>{maskPhone(l.whatsapp)}</td>
              <td className={td}>
                {l.kostName ? (
                  <>
                    <p className="text-slate-800">
                      {l.kostName}
                      {l.roomNumber && <> · {l.roomNumber}</>}
                    </p>
                    {l.notes && <p className="text-xs text-slate-500 mt-0.5">{l.notes}</p>}
                  </>
                ) : (
                  <span className="text-slate-500">Belum mengajukan survey</span>
                )}
              </td>
              <td className={`${td} whitespace-nowrap`}>
                <p>{l.registered}</p>
                {l.activity !== l.registered && <p className="text-xs text-slate-500">Aktivitas {l.activity}</p>}
              </td>
              <td className={td}>
                <Pill tone={TONE[l.statusLabel] ?? "neutral"}>{l.statusLabel}</Pill>
              </td>
              <td className={td}>
                <div className="flex flex-wrap items-center gap-2 min-w-[10.75rem]">
                  <a
                    href={waChat(l.whatsapp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={button("whatsapp", "sm", TOUCH)}
                    aria-label={`Chat WhatsApp ${l.name}`}
                  >
                    <MessageCircle className="w-4 h-4" aria-hidden="true" />
                    Chat
                  </a>
                  {canAssign && !l.hasBooking && (
                    <button type="button" className={button("primary", "sm", TOUCH)} onClick={() => setAssigning(l)} aria-label={`Assign ${l.name} ke kamar`}>
                      <UserCheck className="w-4 h-4" aria-hidden="true" />
                      Assign
                    </button>
                  )}
                  {canManage && l.inquiryId && (
                    <select
                      aria-label={`Ubah status lead ${l.name}`}
                      value={l.inquiryStatus}
                      disabled={savingId === l.inquiryId}
                      onChange={(e) => changeStatus(l, e.target.value)}
                      className="min-h-11 sm:min-h-9 px-2 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary disabled:bg-slate-100"
                    >
                      {INQUIRY_STATUSES.map((s) => (
                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                      ))}
                    </select>
                  )}
                </div>
              </td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={6} className={`${td} text-center py-10 text-slate-500`}>
                {leads.length ? "Tidak ada prospect yang cocok dengan filter." : "Belum ada prospect terdaftar."}
              </td>
            </tr>
          )}
        </tbody>
      </TableWrap>

      {assigning && (
        <AssignDialog
          lead={assigning}
          options={options}
          onClose={() => setAssigning(null)}
          onDone={(text) => {
            setAssigning(null);
            setMessage({ tone: "success", text, assigned: true });
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AssignDialog({
  lead,
  options,
  onClose,
  onDone,
}: {
  lead: LeadItem;
  options: KostRooms[];
  onClose: () => void;
  onDone: (text: string) => void;
}) {
  const router = useRouter();
  const withRooms = options.filter((o) => o.rooms.length);
  const initialKost = withRooms.find((o) => o.kostId === lead.kostId) ?? withRooms[0];
  const [kostId, setKostId] = useState(initialKost?.kostId ?? "");
  const [roomId, setRoomId] = useState(initialKost?.rooms.some((r) => r.id === lead.roomId) ? lead.roomId! : "");
  const [start, setStart] = useState(todayIso());
  const [months, setMonths] = useState<number>(1);
  const [due, setDue] = useState(addMonths(todayIso(), 1));
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);

  // Setelah refresh (TAKEN) kost terpilih bisa tak punya kamar lagi: pakai kost pertama yang masih ada.
  const kost = withRooms.find((o) => o.kostId === kostId) ?? withRooms[0];
  const kostRooms = kost?.rooms ?? [];
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!roomId) return setError({ text: "Pilih kamar yang tersedia.", field: "roomId" });
    setPending(true);
    setError(null);
    const r = await assignRoom({ memberId: lead.memberId, roomId, startDate: start, months, dueDate: due });
    setPending(false);
    if (r.ok) {
      const kostName = kost?.kostName ?? "";
      const roomNumber = kostRooms.find((x) => x.id === roomId)?.number ?? "";
      return onDone(`${lead.name} kini menjadi Resident di ${kostName} · Kamar ${roomNumber}.`);
    }
    if (r.code === "TAKEN") {
      setRoomId("");
      setError({ text: "Kamar sudah tidak tersedia. Daftar kamar sudah dimuat ulang, silakan pilih kamar lain.", field: "roomId" });
      router.refresh();
      return;
    }
    setError({ text: r.error, field: r.field });
  }

  return (
    <Modal open onClose={onClose} title="Assign ke Kamar" subtitle="Jalur manual (bayar offline/walk-in). Pembayaran dari Dashboard diverifikasi di menu Finance → Konfirmasi Pembayaran." icon={<DoorOpen className="w-4 h-4" />}>
      <form onSubmit={submit} className="p-5 space-y-4" noValidate>
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
          <p className="text-xs font-semibold text-slate-600">Prospect</p>
          <p className="font-semibold text-slate-900">
            {lead.name} · <span className="tabular-nums">{maskPhone(lead.whatsapp)}</span>
          </p>
        </div>

        {!withRooms.length ? (
          <Notice tone="warning">Tidak ada kamar berstatus Tersedia di semua Kost saat ini.</Notice>
        ) : (
          <>
            <Select
              label="Kost"
              required
              value={kost?.kostId ?? ""}
              onChange={(e) => (setKostId(e.target.value), setRoomId(""))}
            >
              {withRooms.map((o) => (
                <option key={o.kostId} value={o.kostId}>
                  {o.kostName} ({o.rooms.length} kamar tersedia)
                </option>
              ))}
            </Select>
            <Select
              label="Kamar"
              required
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              hint="Hanya kamar berstatus Tersedia."
              error={fieldError("roomId")}
            >
              <option value="">Pilih kamar</option>
              {kostRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.number} · {rupiah(r.price)}
                </option>
              ))}
            </Select>
            <Input
              label="Mulai sewa"
              type="date"
              required
              value={start}
              onChange={(e) => {
                setStart(e.target.value);
                if (e.target.value) setDue(addMonths(e.target.value, months));
              }}
              error={fieldError("startDate")}
            />
            <fieldset>
              <legend className="block text-xs font-semibold text-slate-600 mb-1.5">Paket awal (bulan)</legend>
              <div className="grid grid-cols-4 gap-2">
                {PACKAGES.map((p) => (
                  <RadioCard
                    key={p}
                    name="months"
                    value={String(p)}
                    checked={months === p}
                    className="p-3"
                    onChange={(v) => {
                      setMonths(Number(v));
                      if (start) setDue(addMonths(start, Number(v)));
                    }}
                  >
                    <span className="text-sm font-semibold text-slate-800">{p}<span className="sr-only"> bulan</span></span>
                  </RadioCard>
                ))}
              </div>
            </fieldset>
            <Input
              label="Jatuh tempo"
              type="date"
              required
              value={due}
              onChange={(e) => setDue(e.target.value)}
              hint="Otomatis dari mulai sewa + paket, dapat diubah."
              error={fieldError("dueDate")}
            />
          </>
        )}

        {error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}

        <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
          <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={onClose}>
            Batal
          </button>
          <button type="submit" className={button("primary", "md", "sm:flex-[2]")} disabled={pending || !withRooms.length} aria-busy={pending}>
            {pending && <Spinner className="w-4 h-4" />}
            Assign &amp; Jadikan Resident
          </button>
        </div>
      </form>
    </Modal>
  );
}
