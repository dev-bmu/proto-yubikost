"use client";
// Tambah kamar sekaligus (bulk): 1) pilih tipe → 2) lantai + nomor (rentang / daftar manual) dengan pratinjau.
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Layers, ListPlus, Plus } from "lucide-react";
import { bulkCreateRooms } from "@/actions/kost-admin";
import { Input, RadioCard, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Photo } from "@/components/media";
import { button, Notice, Spinner } from "@/components/ui";
import { cn, rupiah } from "@/lib/format";
import type { AdminRoom, AdminRoomType } from "@/lib/kost-admin";
import { isRoomNumber, MAX_BULK, normalizeRoomNumber } from "./helpers";

type Mode = "range" | "list";

/** Awalan & nomor berikutnya dari kamar yang sudah ada di lantai itu, mis. "B-05" → { prefix: "B-", next: 6 }. */
function guess(rooms: AdminRoom[], floor: string) {
  const onFloor = rooms.filter((r) => r.floor === floor).map((r) => r.number.match(/^(.*?)(\d+)$/)).filter((m) => !!m);
  if (!onFloor.length) return { prefix: `${String.fromCharCode(64 + Math.min(Math.max(Number(floor) || 1, 1), 26))}-`, next: 1, digits: 2 };
  const last = onFloor.reduce((a, b) => (Number(b![2]) > Number(a![2]) ? b : a))!;
  return { prefix: last[1]!, next: Number(last[2]) + 1, digits: last[2]!.length };
}

export function BulkRoomsModal({
  open,
  onClose,
  onDone,
  kostId,
  types,
  rooms,
  totalFloors,
  initialTypeId,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (message: string) => void;
  kostId: string;
  types: AdminRoomType[];
  rooms: AdminRoom[];
  totalFloors: number;
  initialTypeId?: string;
}) {
  const router = useRouter();
  const start = guess(rooms, "1");
  const [step, setStep] = useState<1 | 2>(initialTypeId ? 2 : 1);
  const [typeId, setTypeId] = useState(initialTypeId ?? types[0]?.id ?? "");
  const [floor, setFloor] = useState("1");
  const [mode, setMode] = useState<Mode>("range");
  const [prefix, setPrefix] = useState(start.prefix);
  const [from, setFrom] = useState(String(start.next));
  const [to, setTo] = useState(String(start.next + 4));
  const [digits, setDigits] = useState(String(start.digits));
  const [list, setList] = useState("");
  // Saran nomor otomatis per lantai hanya selama admin belum mengetik rentang sendiri
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const type = types.find((t) => t.id === typeId);
  const taken = useMemo(() => new Set(rooms.map((r) => r.number.toUpperCase())), [rooms]);

  function changeFloor(f: string) {
    setFloor(f);
    if (touched) return;
    const g = guess(rooms, f);
    setPrefix(g.prefix);
    setFrom(String(g.next));
    setTo(String(g.next + 4));
    setDigits(String(g.digits));
  }

  const { numbers, rangeError } = useMemo(() => {
    if (mode === "list") return { numbers: [...new Set(list.split(/[\s,;]+/).map(normalizeRoomNumber).filter(Boolean))], rangeError: "" };
    const a = Number(from);
    const b = Number(to);
    const d = Math.min(Math.max(Number(digits) || 1, 1), 4);
    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < a) return { numbers: [], rangeError: "Nomor “sampai” harus ≥ nomor “mulai”." };
    if (b - a >= 500) return { numbers: [], rangeError: "Rentang terlalu besar." };
    return { numbers: Array.from({ length: b - a + 1 }, (_, i) => normalizeRoomNumber(prefix + String(a + i).padStart(d, "0"))), rangeError: "" };
  }, [mode, list, from, to, digits, prefix]);

  const fresh = numbers.filter((n) => isRoomNumber(n) && !taken.has(n));
  const skipped = numbers.filter((n) => taken.has(n));
  const invalid = numbers.filter((n) => !isRoomNumber(n));
  const floorNum = Number(floor);
  const floorError = !Number.isInteger(floorNum) || floorNum < 1 || floorNum > totalFloors ? `Lantai 1–${totalFloors}.` : "";
  const blocker = floorError || rangeError || (invalid.length ? `Nomor tidak valid: ${invalid.slice(0, 3).join(", ")}` : "") ||
    (fresh.length > MAX_BULK ? `Maksimal ${MAX_BULK} kamar sekali simpan.` : "") || (!fresh.length ? "Belum ada nomor baru untuk dibuat." : "");

  async function save() {
    if (!type || blocker) return;
    setPending(true);
    setError("");
    const r = await bulkCreateRooms({ kostId, typeId: type.id, floor: floorNum, numbers: fresh });
    setPending(false);
    if (!r.ok) return setError(r.error);
    onDone(`${r.created} kamar ${type.name} ditambahkan di lantai ${floorNum}${r.skipped.length ? ` (${r.skipped.length} nomor sudah ada, dilewati)` : ""}.`);
    router.refresh();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title="Tambah Kamar (Bulk)"
      subtitle={step === 1 ? "Langkah 1 dari 2 · Pilih tipe kamar" : `Langkah 2 dari 2 · Nomor & lantai${type ? ` · ${type.name}` : ""}`}
      icon={<ListPlus className="w-4 h-4" />}
      onBack={step === 2 ? () => setStep(1) : undefined}
    >
      {step === 1 ? (
        <div className="p-5 space-y-4">
          {types.length ? (
            <>
              <div role="radiogroup" aria-label="Tipe kamar" className="space-y-2">
                {types.map((t) => (
                  <RadioCard key={t.id} name="bulk-type" value={t.id} checked={typeId === t.id} onChange={setTypeId} className="p-3">
                    <span className="flex items-center gap-3">
                      <span className="relative w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                        <Photo src={t.photos[0]} alt={`Foto tipe ${t.name}`} sizes="64px" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-900">{t.name}</span>
                        <span className="block text-xs text-slate-500 mt-0.5">{t.size} · {t.facilities.length} fasilitas · {t.total} kamar saat ini</span>
                      </span>
                      <span className="text-right shrink-0">
                        <span className="block font-extrabold text-primary tabular-nums">{rupiah(t.monthlyPrice)}</span>
                        <span className="block text-xs text-slate-500">/bulan</span>
                      </span>
                    </span>
                  </RadioCard>
                ))}
              </div>
              <p className="text-xs text-slate-500">Kamar baru otomatis memakai foto, fasilitas, ukuran, dan harga dari tipe yang dipilih.</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className={button("neutral")} onClick={onClose}>Batal</button>
                <button type="button" className={button("primary")} disabled={!type} onClick={() => setStep(2)}>
                  Lanjut <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <Layers className="w-10 h-10 text-primary mx-auto mb-3" aria-hidden="true" />
              <p className="font-bold text-slate-900">Belum ada tipe kamar</p>
              <p className="text-sm text-slate-500 mt-1 mb-4">Buat tipe kamar terlebih dahulu (foto, fasilitas, harga), lalu tambahkan kamar.</p>
              <Link href={`/admin/kost/${kostId}?tab=tipe`} className={button("primary")} onClick={onClose}>
                <Plus className="w-4 h-4" aria-hidden="true" /> Buat Tipe Kamar
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-4 items-start">
            <Input
              label="Lantai"
              required
              type="number"
              inputMode="numeric"
              min={1}
              max={totalFloors}
              value={floor}
              onChange={(e) => changeFloor(e.target.value)}
              error={floorError || undefined}
              hint={`Gedung ${totalFloors} lantai`}
              data-autofocus
            />
            <div role="radiogroup" aria-labelledby="lbl-mode">
              <p id="lbl-mode" className="text-xs font-semibold text-slate-600 mb-1.5">Cara mengisi nomor</p>
              <div className="grid grid-cols-2 gap-2">
                <RadioCard name="bulk-mode" value="range" checked={mode === "range"} onChange={() => setMode("range")} className="p-3">
                  <span className="block text-sm font-bold text-slate-900">Rentang</span>
                  <span className="block text-xs text-slate-500">A-01 … A-10</span>
                </RadioCard>
                <RadioCard name="bulk-mode" value="list" checked={mode === "list"} onChange={() => setMode("list")} className="p-3">
                  <span className="block text-sm font-bold text-slate-900">Daftar manual</span>
                  <span className="block text-xs text-slate-500">A-11, A-15, VIP-1</span>
                </RadioCard>
              </div>
            </div>
          </div>

          {mode === "range" ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Input label="Awalan" value={prefix} maxLength={6} onChange={(e) => { setTouched(true); setPrefix(e.target.value); }} hint="Boleh kosong" />
              <Input label="Mulai" type="number" inputMode="numeric" min={0} value={from} onChange={(e) => { setTouched(true); setFrom(e.target.value); }} />
              <Input label="Sampai" type="number" inputMode="numeric" min={0} value={to} onChange={(e) => { setTouched(true); setTo(e.target.value); }} error={rangeError || undefined} />
              <Input label="Jumlah digit" type="number" inputMode="numeric" min={1} max={4} value={digits} onChange={(e) => { setTouched(true); setDigits(e.target.value); }} hint="2 → 01, 02" />
            </div>
          ) : (
            <Textarea
              label="Nomor kamar"
              rows={3}
              value={list}
              onChange={(e) => setList(e.target.value)}
              placeholder={"A-11, A-12, A-15\natau satu nomor per baris"}
              hint="Pisahkan dengan koma, spasi, atau baris baru. Huruf otomatis kapital."
            />
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-slate-600">Pratinjau nomor</p>
              <ul className="flex gap-3 text-xs text-slate-600" aria-hidden="true">
                <li className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-primary" /> Baru</li>
                <li className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-600" /> Sudah ada, dilewati</li>
              </ul>
            </div>
            {numbers.length ? (
              <ul className="flex flex-wrap gap-1.5 max-h-44 overflow-y-auto p-3 rounded-xl bg-slate-50 border border-slate-200" aria-label="Nomor kamar yang akan dibuat">
                {numbers.slice(0, 200).map((n) => {
                  const exists = taken.has(n);
                  const bad = !isRoomNumber(n);
                  return (
                    <li
                      key={n}
                      className={cn(
                        "px-2 py-1 rounded-lg text-xs font-bold tabular-nums border",
                        exists || bad ? "bg-red-100 text-red-700 border-red-200 line-through" : "bg-primary/10 text-primary border-primary/20",
                      )}
                    >
                      {n}
                      {(exists || bad) && <span className="sr-only">{exists ? " (sudah ada, dilewati)" : " (tidak valid)"}</span>}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="p-4 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-500 text-center">Nomor kamar akan tampil di sini.</p>
            )}
          </div>

          {type && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-primary-ultralight border border-primary/20" aria-live="polite">
              <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center text-sm font-extrabold tabular-nums shrink-0">{fresh.length}</span>
              <p className="text-sm text-slate-700">
                <strong className="text-slate-900">{fresh.length} kamar baru</strong> · tipe {type.name} · {rupiah(type.monthlyPrice)}/bulan · lantai {floor || "-"}
                {skipped.length > 0 && <span className="block text-xs text-red-700 mt-0.5">{skipped.length} nomor sudah ada dan dilewati.</span>}
              </p>
            </div>
          )}

          {error && <Notice tone="danger"><span role="alert">{error}</span></Notice>}

          <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-xs text-slate-500">{blocker || `Batas ${MAX_BULK} kamar per simpan.`}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" className={button("neutral")} onClick={() => setStep(1)}>Kembali</button>
              <button type="button" className={button("primary")} disabled={!!blocker || pending} aria-busy={pending} onClick={save}>
                {pending ? <Spinner className="w-4 h-4" /> : <Plus className="w-4 h-4" aria-hidden="true" />}
                Simpan {fresh.length || ""} Kamar
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}
