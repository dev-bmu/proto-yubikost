"use client";
// Form gedung lengkap (PRD §9.3 v1.2) — dipakai /admin/kost/baru dan tab Info Gedung.
import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle, Building2, Camera, CheckCircle2, Circle, Eye, Globe, MapPin, Save, Sparkles, Trash2, UserRound,
} from "lucide-react";
import { createKost, deleteKost, updateKost, type KostInput } from "@/actions/kost-admin";
import { Input, RadioCard, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { Photo } from "@/components/media";
import { button, card, kostTypeClass, Notice, Spinner } from "@/components/ui";
import { BUILDING_FACILITIES, KOST_TYPES } from "@/lib/constants";
import { cn } from "@/lib/format";
import { FacilityPicker } from "./FacilityPicker";
import { slugify, toMapsEmbed } from "./helpers";
import { FormSection } from "./parts";
import { PhotoUploader } from "./PhotoUploader";

export type KostFormValues = Omit<KostInput, "totalFloors"> & { totalFloors: string };

const TYPE_DESC: Record<string, string> = { Putra: "Khusus laki-laki", Putri: "Khusus perempuan", Campur: "Laki-laki & perempuan" };

export const EMPTY_KOST: KostFormValues = {
  name: "", type: "Putri", area: "", address: "", totalFloors: "2", description: "", maps: "",
  facilities: [], photos: [], ownerName: "", ownerPhone: "", isPublished: false,
};

export function KostForm({
  id,
  slug,
  initial = EMPTY_KOST,
  roomCount = 0,
  typeCount = 0,
  readOnly = false,
}: {
  id?: string;
  slug?: string;
  initial?: KostFormValues;
  roomCount?: number;
  /** Jumlah tipe kamar; gedung tanpa tipe belum boleh tampil di katalog. */
  typeCount?: number;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [v, setV] = useState(initial);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const canPublish = typeCount > 0 || initial.isPublished;
  const set = <K extends keyof KostFormValues>(k: K, value: KostFormValues[K]) => {
    setSaved(false);
    setError((e) => (e?.field === k ? null : e));
    setV((x) => ({ ...x, [k]: value }));
  };
  const text = (k: "name" | "area" | "address" | "totalFloors" | "description" | "maps" | "ownerName" | "ownerPhone") =>
    ({ value: v[k], onChange: (e: { target: { value: string } }) => set(k, e.target.value) });
  const err = (f: string) => (error?.field === f ? error.text : undefined);

  const embed = toMapsEmbed(v.maps);
  const urlSlug = slug ?? (slugify(v.name) || "nama-gedung");

  // Fokus ke field pertama yang error setelah submit
  useEffect(() => {
    if (error?.field) document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [error]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const input = { ...v, totalFloors: Number(v.totalFloors) };
    const r = id ? await updateKost(id, input) : await createKost(input);
    setPending(false);
    if (!r.ok) return setError({ text: r.error, field: r.field });
    if (!id && "id" in r) return router.push(`/admin/kost/${r.id}?tab=tipe&baru=1`);
    setSaved(true);
    router.refresh();
  }

  const checklist = [
    { label: "Nama, tipe & area", ok: v.name.trim().length >= 3 && !!v.area.trim() },
    { label: "Alamat lengkap", ok: v.address.trim().length >= 10 },
    { label: "Foto sampul (luar gedung)", ok: v.photos.length > 0 },
    { label: "Minimal 3 foto gedung", ok: v.photos.length >= 3 },
    { label: "Fasilitas gedung", ok: v.facilities.length > 0 },
    { label: "Lokasi peta", ok: !!embed },
    { label: "Deskripsi", ok: v.description.trim().length >= 30 },
  ];
  const doneCount = checklist.filter((c) => c.ok).length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_300px] gap-6 items-start">
      <div className="space-y-6 min-w-0">
        <form onSubmit={submit} noValidate className={card()}>
          <fieldset disabled={readOnly} className="min-w-0 border-0 p-0 m-0">
            <FormSection id="sec-dasar" icon={<Building2 className="w-5 h-5" />} title="Informasi Dasar" description="Tampil di kartu katalog dan halaman gedung.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Nama gedung"
                  required
                  className="sm:col-span-2"
                  placeholder="mis. Kost Melati Residence"
                  maxLength={80}
                  {...text("name")}
                  error={err("name")}
                  hint={slug ? `URL katalog tetap /kost/${slug} agar tautan lama tidak rusak.` : `URL katalog: /kost/${urlSlug}`}
                />
                <div className="sm:col-span-2" role="radiogroup" aria-labelledby="lbl-tipe">
                  <p id="lbl-tipe" className="text-xs font-semibold text-slate-600 mb-1.5">
                    Tipe penghuni <span className="text-red-600" aria-hidden="true">*</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {KOST_TYPES.map((t) => (
                      <RadioCard key={t} name="kost-type" value={t} checked={v.type === t} onChange={(x) => set("type", x)} className="py-3">
                        <span className="flex items-center gap-2">
                          <span className={cn("px-2 py-0.5 rounded-md text-xs font-bold", kostTypeClass(t))}>{t}</span>
                        </span>
                        <span className="block text-xs text-slate-500 mt-1">{TYPE_DESC[t]}</span>
                      </RadioCard>
                    ))}
                  </div>
                </div>
                <Input label="Area / lokasi umum" required placeholder="Suhat, Lowokwaru" {...text("area")} error={err("area")} hint="Tampil di katalog di bawah nama gedung." />
                <Input label="Jumlah lantai" required type="number" inputMode="numeric" min={1} max={20} {...text("totalFloors")} error={err("totalFloors")} />
                <Textarea label="Alamat lengkap" required rows={2} className="sm:col-span-2" placeholder="Jl. Soekarno Hatta Indah No. 12, Lowokwaru, Kota Malang" {...text("address")} error={err("address")} />
                <Textarea
                  label="Deskripsi"
                  rows={4}
                  className="sm:col-span-2"
                  maxLength={2000}
                  placeholder="Suasana, akses kampus, keunggulan gedung…"
                  {...text("description")}
                  hint={`${v.description.length}/2000 karakter`}
                />
              </div>
            </FormSection>

            <FormSection id="sec-peta" icon={<MapPin className="w-5 h-5" />} title="Lokasi Peta" description="Tempel tautan embed Google Maps, kode <iframe>, atau koordinat.">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                <Input
                  label="Tautan Google Maps embed atau koordinat"
                  placeholder="-7.9425,112.6215"
                  {...text("maps")}
                  error={err("maps") ?? (embed === null ? "Format belum dikenali. Contoh koordinat: -7.9425,112.6215" : undefined)}
                  hint="Google Maps → Bagikan → Sematkan peta, atau klik kanan titik lokasi untuk menyalin koordinat."
                />
                <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                  {embed ? (
                    <iframe title="Pratinjau peta lokasi gedung" src={embed} className="absolute inset-0 w-full h-full" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-500">
                      <MapPin className="w-7 h-7" aria-hidden="true" />
                      <span className="text-xs font-semibold">Pratinjau peta tampil di sini</span>
                    </div>
                  )}
                </div>
              </div>
            </FormSection>

            <FormSection id="sec-fasilitas" icon={<Sparkles className="w-5 h-5" />} title="Fasilitas Gedung" description="Fasilitas bersama. Fasilitas dalam kamar diatur per tipe kamar.">
              <FacilityPicker legend="Fasilitas gedung" options={BUILDING_FACILITIES} value={v.facilities} onChange={(x) => set("facilities", x)} error={err("facilities")} />
            </FormSection>

            <FormSection id="sec-foto" icon={<Camera className="w-5 h-5" />} title="Foto Gedung" description="Foto pertama menjadi sampul katalog — gunakan foto luar gedung.">
              <PhotoUploader
                label="Foto gedung"
                coverLabel="Foto Sampul (luar gedung)"
                max={10}
                value={v.photos}
                onChange={(x) => set("photos", x)}
                error={err("photos")}
                disabled={readOnly}
                onBusy={setUploading}
              />
            </FormSection>

            <FormSection id="sec-pemilik" icon={<UserRound className="w-5 h-5" />} title="Pemilik" description="Internal — tidak tampil di situs.">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nama pemilik" autoComplete="off" {...text("ownerName")} error={err("ownerName")} />
                <Input label="WhatsApp pemilik" inputMode="tel" placeholder="0812-3456-7890" {...text("ownerPhone")} error={err("ownerPhone")} hint="Disimpan dalam format 62…" />
              </div>
            </FormSection>

            <FormSection id="sec-publikasi" icon={<Globe className="w-5 h-5" />} title="Publikasi">
              <label
                className={cn(
                  "flex items-center gap-4 p-4 rounded-xl border-2 has-[:checked]:border-primary has-[:checked]:bg-primary-ultralight has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                  err("isPublished") ? "border-red-400" : "border-slate-200",
                  canPublish ? "cursor-pointer" : "cursor-not-allowed bg-slate-50",
                )}
              >
                <span className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">Tampilkan di katalog publik</span>
                  <span id="publish-hint" className="block text-xs text-slate-500 mt-0.5">
                    {canPublish
                      ? "Sebaiknya aktifkan setelah tipe kamar, kamar, dan foto lengkap. Gedung tersembunyi tetap bisa dikelola."
                      : "Bisa diaktifkan setelah gedung disimpan dan punya minimal satu tipe kamar."}
                  </span>
                </span>
                <input
                  type="checkbox"
                  role="switch"
                  className="peer sr-only"
                  checked={v.isPublished}
                  disabled={!canPublish}
                  aria-describedby="publish-hint"
                  aria-invalid={err("isPublished") ? true : undefined}
                  onChange={(e) => set("isPublished", e.target.checked)}
                />
                <span
                  aria-hidden="true"
                  className="relative w-11 h-6 shrink-0 rounded-full bg-slate-300 transition-colors peer-checked:bg-primary after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5 peer-disabled:opacity-50"
                />
              </label>
              {err("isPublished") && <p className="mt-2 text-xs text-red-600" role="alert">{err("isPublished")}</p>}
            </FormSection>
          </fieldset>

          {!readOnly && (
            <div className="sticky bottom-0 z-10 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-6 py-4 bg-white/95 backdrop-blur-md border-t border-slate-200 rounded-b-2xl">
              <div className="min-w-0 text-sm" aria-live="polite">
                {error && !error.field && <p className="text-red-700 font-semibold" role="alert">{error.text}</p>}
                {error?.field && <p className="text-red-700 font-semibold">Periksa kembali isian yang ditandai merah.</p>}
                {saved && <p className="text-emerald-700 font-semibold flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" aria-hidden="true" /> Perubahan disimpan.</p>}
              </div>
              <button type="submit" className={button("primary", "md", "sm:min-w-44")} disabled={pending || uploading} aria-busy={pending}>
                {pending || uploading ? <Spinner className="w-4 h-4" /> : <Save className="w-4 h-4" aria-hidden="true" />}
                {uploading ? "Menunggu unggahan…" : id ? "Simpan Perubahan" : "Simpan & Lanjut"}
              </button>
            </div>
          )}
        </form>

        {id && !readOnly && <DangerZone id={id} name={initial.name} roomCount={roomCount} />}
      </div>

      <aside className="space-y-4 xl:sticky xl:top-20" aria-label="Pratinjau & kelengkapan">
        <div className={card(false, "overflow-hidden")}>
          <p className="px-4 pt-4 pb-2 text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5" aria-hidden="true" /> Pratinjau kartu katalog
          </p>
          <div className="px-4 pb-4">
            <div className="relative aspect-[3/4] max-h-80 w-full rounded-xl overflow-hidden">
              <Photo src={v.photos[0]} alt={`Foto sampul ${v.name || "gedung"}`} sizes="300px" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/65 via-transparent to-black/75" />
              <span className={cn("absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25", kostTypeClass(v.type))}>{v.type}</span>
              <div className="absolute inset-x-3 bottom-3 text-white">
                <p className="font-extrabold text-lg leading-tight line-clamp-2">{v.name || "Nama gedung"}</p>
                <p className="text-xs flex items-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" aria-hidden="true" /> {v.area || "Area"}</p>
              </div>
            </div>
          </div>
        </div>
        <div className={card(false, "p-4")}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-bold text-slate-900">Kelengkapan data</p>
            <p className="text-xs font-bold text-primary tabular-nums">{doneCount}/{checklist.length}</p>
          </div>
          <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden mb-3" aria-hidden="true">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="space-y-2">
            {checklist.map((c) => (
              <li key={c.label} className={cn("flex items-center gap-2 text-sm", c.ok ? "text-slate-700" : "text-slate-500")}>
                {c.ok ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" aria-hidden="true" /> : <Circle className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />}
                {c.label}
                <span className="sr-only">{c.ok ? "(lengkap)" : "(belum)"}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}

function DangerZone({ id, name, roomCount }: { id: string; name: string; roomCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function confirm() {
    setPending(true);
    setError("");
    const r = await deleteKost(id, typed);
    setPending(false);
    if (!r.ok) return setError(r.error);
    router.push("/admin/kost");
  }

  return (
    <section aria-labelledby="zona-bahaya" className="bg-white rounded-2xl border-2 border-red-200 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <span className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0" aria-hidden="true">
        <AlertTriangle className="w-5 h-5" />
      </span>
      <div className="flex-1">
        <h2 id="zona-bahaya" className="text-base font-bold text-slate-900">Zona bahaya: hapus gedung</h2>
        <p className="text-sm text-slate-600 mt-0.5">
          {roomCount
            ? `Gedung ini masih punya ${roomCount} kamar. Hapus semua kamar terlebih dahulu (hanya kamar tanpa riwayat sewa yang bisa dihapus).`
            : "Gedung dan seluruh tipe kamarnya dihapus permanen. Tindakan ini tidak bisa dibatalkan."}
        </p>
      </div>
      <button type="button" className={button("danger", "md")} disabled={roomCount > 0} onClick={() => (setTyped(""), setError(""), setOpen(true))}>
        <Trash2 className="w-4 h-4" aria-hidden="true" /> Hapus Gedung
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Hapus gedung?" icon={<Trash2 className="w-4 h-4" />} size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-600">
            Ketik <strong className="text-slate-900">{name}</strong> untuk mengonfirmasi.
          </p>
          <Input label="Nama gedung" value={typed} onChange={(e) => setTyped(e.target.value)} error={error || undefined} autoComplete="off" data-autofocus />
          <div className="flex justify-end gap-2">
            <button type="button" className={button("neutral")} onClick={() => setOpen(false)}>Batal</button>
            <button type="button" className={button("danger")} disabled={typed.trim() !== name || pending} aria-busy={pending} onClick={confirm}>
              {pending && <Spinner className="w-4 h-4" />} Hapus Permanen
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
