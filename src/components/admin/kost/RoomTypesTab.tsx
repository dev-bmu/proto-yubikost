"use client";
// Tab Tipe Kamar: kartu per tipe (galeri, harga, fasilitas, hitungan kamar) + modal tipe, hapus, dan bulk kamar.
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Layers, ListPlus, Pencil, Plus, Ruler, Trash2 } from "lucide-react";
import { deleteRoomType, saveRoomType } from "@/actions/kost-admin";
import { Input, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { FacilityChips, Photo } from "@/components/media";
import { button, card, EmptyState, Notice, Spinner } from "@/components/ui";
import { ROOM_FACILITIES } from "@/lib/constants";
import { cn, rupiah } from "@/lib/format";
import type { AdminRoom, AdminRoomType } from "@/lib/kost-admin";
import { BulkRoomsModal } from "./BulkRoomsModal";
import { FacilityPicker } from "./FacilityPicker";
import { parseSize } from "./helpers";
import { PhotoUploader } from "./PhotoUploader";

type TypeForm = { id?: string; name: string; length: string; width: string; price: string; description: string; facilities: string[]; photos: string[] };

export function RoomTypesTab({
  kostId,
  types,
  rooms,
  totalFloors,
  canManage,
}: {
  kostId: string;
  types: AdminRoomType[];
  rooms: AdminRoom[];
  totalFloors: number;
  canManage: boolean;
}) {
  const router = useRouter();
  const [form, setForm] = useState<TypeForm | null>(null);
  const [deleting, setDeleting] = useState<AdminRoomType | null>(null);
  const [bulk, setBulk] = useState<{ open: boolean; typeId?: string; key: number }>({ open: false, key: 0 });
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  const editing = form?.id ? types.find((t) => t.id === form.id) : undefined;
  const set = <K extends keyof TypeForm>(k: K, v: TypeForm[K]) => {
    setError((e) => (e?.field === (k === "price" ? "monthlyPrice" : k) ? null : e));
    setForm((f) => f && { ...f, [k]: v });
  };
  const err = (f: string) => (error?.field === f ? error.text : undefined);

  function open(t?: AdminRoomType) {
    setError(null);
    setForm(
      t
        ? { id: t.id, name: t.name, ...parseSize(t.size), price: String(t.monthlyPrice), description: t.description, facilities: t.facilities, photos: t.photos }
        : { name: "", length: "3", width: "4", price: "", description: "", facilities: [], photos: [] },
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    setError(null);
    const r = await saveRoomType({
      id: form.id,
      kostId,
      name: form.name,
      length: Number(form.length),
      width: Number(form.width),
      monthlyPrice: Number(form.price),
      description: form.description,
      facilities: form.facilities,
      photos: form.photos,
    });
    setPending(false);
    if (!r.ok) return setError({ text: r.error, field: r.field });
    setMessage(`Tipe ${form.name.trim()} disimpan${r.synced ? ` dan diterapkan ke ${r.synced} kamar` : ""}.`);
    setForm(null);
    router.refresh();
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    setError(null);
    const r = await deleteRoomType(deleting.id);
    setPending(false);
    if (!r.ok) return setError({ text: r.error });
    setMessage(`Tipe ${deleting.name} dihapus.`);
    setDeleting(null);
    router.refresh();
  }

  const openBulk = (typeId?: string) => setBulk((b) => ({ open: true, typeId, key: b.key + 1 }));

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{types.length} tipe kamar</h2>
          <p className="text-sm text-slate-500">Kamar bertipe sama berbagi foto, fasilitas, ukuran, dan harga. Beda tipe, beda foto.</p>
        </div>
        {canManage && (
          <button type="button" className={button("primary")} onClick={() => open()}>
            <Plus className="w-4 h-4" aria-hidden="true" /> Tambah Tipe Kamar
          </button>
        )}
      </div>

      {message && (
        <Notice tone="success" className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
          <span role="status">{message}</span>
        </Notice>
      )}

      {types.length ? (
        <ul className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {types.map((t) => (
            <TypeCard key={t.id} t={t} canManage={canManage} onEdit={() => open(t)} onBulk={() => openBulk(t.id)} onDelete={() => (setError(null), setDeleting(t))} />
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="Belum ada tipe kamar"
          action={canManage && <button type="button" className={button("primary")} onClick={() => open()}><Plus className="w-4 h-4" aria-hidden="true" /> Tambah Tipe Kamar</button>}
        >
          Buat tipe seperti &quot;Standard&quot; atau &quot;Deluxe Balkon&quot; dengan foto, fasilitas, dan harga. Setelah itu tambahkan banyak kamar sekaligus.
        </EmptyState>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        size="lg"
        title={form?.id ? `Ubah Tipe ${editing?.name ?? ""}` : "Tambah Tipe Kamar"}
        subtitle="Foto & fasilitas berlaku untuk semua kamar bertipe ini"
        icon={<Layers className="w-4 h-4" />}
      >
        {form && (
          <form onSubmit={save} noValidate className="p-5 space-y-5">
            <Notice tone="info">
              Semua kamar bertipe ini otomatis memakai foto &amp; fasilitas yang sama.
              {editing && editing.total > 0 && <> Perubahan diterapkan ke <strong>{editing.total} kamar</strong>.</>}
            </Notice>
            {editing && editing.reserved > 0 && Number(form.price) !== editing.monthlyPrice && (
              <Notice tone="warning">
                {editing.reserved} kamar bertipe ini sedang dipesan. Pesanan yang sudah dibuat tetap memakai harga saat dipesan; harga baru berlaku untuk pesanan berikutnya.
              </Notice>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Nama tipe" required maxLength={40} placeholder="Deluxe Balkon" value={form.name} onChange={(e) => set("name", e.target.value)} error={err("name")} className="sm:col-span-2" data-autofocus />
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5" id="lbl-ukuran">Ukuran kamar (meter)</p>
                <div className="flex items-start gap-2" role="group" aria-labelledby="lbl-ukuran">
                  <Input label="Panjang" type="number" inputMode="decimal" min={1} max={20} step={0.5} value={form.length} onChange={(e) => set("length", e.target.value)} error={err("length")} className="flex-1" />
                  <span className="pt-9 text-slate-500 font-bold" aria-hidden="true">×</span>
                  <Input label="Lebar" type="number" inputMode="decimal" min={1} max={20} step={0.5} value={form.width} onChange={(e) => set("width", e.target.value)} error={err("width")} className="flex-1" />
                </div>
              </div>
              <Input
                label="Harga per bulan (Rp)"
                required
                inputMode="numeric"
                placeholder="1.300.000"
                value={form.price ? Number(form.price).toLocaleString("id-ID") : ""}
                onChange={(e) => set("price", e.target.value.replace(/\D/g, "").slice(0, 9))}
                error={err("monthlyPrice")}
                hint={form.price ? `${rupiah(Number(form.price))}/bulan` : "Harga termurah antar tipe tampil sebagai “mulai” di katalog."}
                className="self-end"
              />
              <Textarea label="Deskripsi" rows={2} maxLength={1000} className="sm:col-span-2" placeholder="Kamar lega dengan balkon pribadi dan jendela menghadap taman." value={form.description} onChange={(e) => set("description", e.target.value)} />
            </div>
            <FacilityPicker legend="Fasilitas kamar" options={ROOM_FACILITIES} value={form.facilities} onChange={(v) => set("facilities", v)} error={err("facilities")} />
            <PhotoUploader label="Foto tipe kamar (minimal 1)" coverLabel="Foto utama" max={8} value={form.photos} onChange={(v) => set("photos", v)} error={err("photos")} onBusy={setUploading} />
            {error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}
            <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-white py-3 -mb-5 border-t border-slate-100">
              <button type="button" className={button("neutral")} onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className={button("primary")} disabled={pending || uploading} aria-busy={pending}>
                {(pending || uploading) && <Spinner className="w-4 h-4" />} {uploading ? "Menunggu unggahan…" : "Simpan Tipe"}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus tipe kamar?" icon={<Trash2 className="w-4 h-4" />} size="sm">
        {deleting && (
          <div className="p-5 space-y-4">
            <p className="text-sm text-slate-600">
              Tipe <strong className="text-slate-900">{deleting.name}</strong> beserta fotonya dihapus. Tipe ini tidak dipakai kamar mana pun.
            </p>
            {error && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}
            <div className="flex justify-end gap-2">
              <button type="button" className={button("neutral")} onClick={() => setDeleting(null)}>Batal</button>
              <button type="button" className={button("danger")} disabled={pending} aria-busy={pending} onClick={remove}>
                {pending && <Spinner className="w-4 h-4" />} Hapus Tipe
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
        initialTypeId={bulk.typeId}
      />
    </div>
  );
}

function TypeCard({ t, canManage, onEdit, onBulk, onDelete }: { t: AdminRoomType; canManage: boolean; onEdit: () => void; onBulk: () => void; onDelete: () => void }) {
  const [shown, setShown] = useState(0);
  const counts = [
    { label: "Total", n: t.total, cls: "text-slate-900" },
    { label: "Terisi", n: t.occupied, cls: "text-primary" },
    { label: "Dipesan", n: t.reserved, cls: "text-amber-800" },
    { label: "Tersedia", n: t.available, cls: "text-emerald-700" },
  ];
  return (
    <li className={card(false, "overflow-hidden flex flex-col")}>
      <div className="relative aspect-[16/9] bg-slate-100">
        <Photo src={t.photos[shown] ?? t.photos[0]} alt={`Foto ${shown + 1} tipe ${t.name}`} sizes="(min-width: 1024px) 40vw, 100vw" />
        <span className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-bold tabular-nums">
          {t.photos.length} foto
        </span>
      </div>
      {t.photos.length > 1 && (
        <div className="grid grid-cols-6 gap-1.5 p-1.5 bg-slate-50 border-b border-slate-100">
          {t.photos.slice(0, 6).map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => setShown(i)}
              aria-label={`Tampilkan foto ${i + 1} tipe ${t.name}`}
              aria-pressed={shown === i}
              className={cn("relative aspect-square rounded-lg overflow-hidden ring-2 transition", shown === i ? "ring-primary" : "ring-transparent opacity-70 hover:opacity-100")}
            >
              <Photo src={p} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}

      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 leading-snug">{t.name}</h3>
            <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
              <Ruler className="w-4 h-4" aria-hidden="true" /> {t.size || "-"}
            </p>
          </div>
          <p className="text-right shrink-0">
            <span className="block text-xl font-extrabold text-primary tracking-tight tabular-nums">{rupiah(t.monthlyPrice)}</span>
            <span className="text-xs text-slate-500">/bulan</span>
          </p>
        </div>
        {t.description && <p className="text-sm text-slate-600 leading-relaxed line-clamp-2">{t.description}</p>}
        {t.facilities.length ? <FacilityChips items={t.facilities} max={6} /> : <p className="text-sm text-slate-500">Belum ada fasilitas dipilih.</p>}

        <dl className="grid grid-cols-4 rounded-xl border border-slate-200 divide-x divide-slate-200 text-center">
          {counts.map((c) => (
            <div key={c.label} className="py-2.5 flex flex-col-reverse">
              <dt className="text-xs text-slate-500">{c.label}</dt>
              <dd className={cn("text-lg font-extrabold tabular-nums", c.cls)}>{c.n}</dd>
            </div>
          ))}
        </dl>

        {canManage && (
          <div className="flex flex-wrap gap-2 mt-auto pt-1">
            <button type="button" className={button("neutral", "sm", "min-h-11 sm:min-h-9")} onClick={onEdit}>
              <Pencil className="w-4 h-4" aria-hidden="true" /> Edit<span className="sr-only"> tipe {t.name}</span>
            </button>
            <button type="button" className={button("primary", "sm", "min-h-11 sm:min-h-9")} onClick={onBulk}>
              <ListPlus className="w-4 h-4" aria-hidden="true" /> Tambah kamar tipe ini
            </button>
            {t.total === 0 && (
              <button type="button" className={button("neutral", "sm", "min-h-11 sm:min-h-9 hover:border-red-600 hover:text-red-700 sm:ml-auto")} onClick={onDelete}>
                <Trash2 className="w-4 h-4" aria-hidden="true" /> Hapus<span className="sr-only"> tipe {t.name}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </li>
  );
}
