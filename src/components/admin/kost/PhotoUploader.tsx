"use client";
// Upload foto gedung / tipe kamar (C-03 varian galeri): drag & drop atau klik, unggah per file lewat uploadPhoto,
// pratinjau, urutkan (geser kiri/kanan), hapus. value = daftar URL tersimpan; foto pertama = sampul.
import { useEffect, useId, useRef, useState, type DragEvent } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, ImagePlus, Trash2, X } from "lucide-react";
import { uploadPhoto } from "@/actions/media";
import { Photo } from "@/components/media";
import { Spinner } from "@/components/ui";
import { cn } from "@/lib/format";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 3 * 1024 * 1024;

type Pending = { key: string; name: string; preview: string; file?: File; error?: string };

export function PhotoUploader({
  value,
  onChange,
  max,
  label,
  coverLabel = "Sampul",
  hint,
  error,
  disabled = false,
  onBusy,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  max: number;
  label: string;
  coverLabel?: string;
  hint?: string;
  error?: string;
  /** Mode lihat saja: tanpa area unggah (drop tetap aktif walau di dalam fieldset disabled). */
  disabled?: boolean;
  /** true selama masih ada file diunggah — parent menahan tombol simpan agar foto tidak hilang. */
  onBusy?: (busy: boolean) => void;
}) {
  const id = useId();
  const [pending, setPending] = useState<Pending[]>([]);
  const [drag, setDrag] = useState(false);
  // Sumber kebenaran saat beberapa file selesai berurutan sebelum parent render ulang
  const latest = useRef(value);
  latest.current = value;
  // Antrean: file diunggah satu per satu walau ditambahkan saat unggahan lain berjalan
  const queue = useRef(Promise.resolve());
  const seq = useRef(0);

  const queued = pending.filter((p) => !p.error).length;
  const room = disabled ? 0 : max - value.length - queued;
  const busyRef = useRef(onBusy);
  busyRef.current = onBusy;
  useEffect(() => busyRef.current?.(queued > 0), [queued]);
  useEffect(() => () => busyRef.current?.(false), []);

  const commit = (next: string[]) => {
    latest.current = next;
    onChange(next);
  };

  async function upload(item: Pending) {
    const form = new FormData();
    form.append("file", item.file!);
    const r = await uploadPhoto(form).catch(() => ({ ok: false as const, error: "Koneksi terputus. Coba lagi." }));
    if (r.ok) {
      commit([...latest.current, r.url].slice(0, max));
      URL.revokeObjectURL(item.preview);
      setPending((list) => list.filter((p) => p.key !== item.key));
    } else {
      setPending((list) => list.map((p) => (p.key === item.key ? { ...p, file: undefined, error: r.error } : p)));
    }
  }

  function add(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    const fresh: Pending[] = [];
    let slots = room;
    for (const file of list) {
      const key = String(++seq.current);
      const preview = URL.createObjectURL(file);
      let err = "";
      if (!TYPES.includes(file.type)) err = "Format harus JPG, PNG, atau WEBP.";
      else if (file.size > MAX_BYTES) err = `Ukuran ${(file.size / 1024 / 1024).toFixed(1)} MB melebihi 3 MB.`;
      else if (slots <= 0) err = `Batas ${max} foto tercapai.`;
      if (!err) slots--;
      fresh.push({ key, name: file.name, preview, file: err ? undefined : file, error: err || undefined });
    }
    setPending((p) => [...p, ...fresh]);
    for (const item of fresh.filter((p) => !p.error)) queue.current = queue.current.then(() => upload(item));
  }

  function dismiss(key: string) {
    setPending((list) => {
      const item = list.find((p) => p.key === key);
      if (item) URL.revokeObjectURL(item.preview);
      return list.filter((p) => p.key !== key);
    });
  }

  const move = (i: number, d: -1 | 1) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d]!, next[i]!];
    commit(next);
  };

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    if (room > 0) add(e.dataTransfer.files);
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2 mb-2">
        <p id={`${id}-label`} className="text-xs font-semibold text-slate-600">{label}</p>
        <p className="text-xs text-slate-500 tabular-nums" aria-live="polite">{value.length}/{max} foto</p>
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3" aria-labelledby={`${id}-label`}>
        {value.map((url, i) => (
          <li key={url} className={cn("rounded-xl overflow-hidden border bg-white flex flex-col", i === 0 ? "border-accent ring-2 ring-accent/40" : "border-slate-200")}>
            <div className="relative aspect-[4/3] bg-slate-100">
              <Photo src={url} alt={`Foto ${i + 1}${i === 0 ? ` – ${coverLabel}` : ""}`} sizes="240px" />
              {i === 0 ? (
                <span className="absolute top-2 left-2 right-2 w-fit px-2 py-1 rounded-lg bg-accent text-slate-950 text-xs font-bold leading-tight shadow-lg shadow-black/25">{coverLabel}</span>
              ) : (
                <span className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-slate-900/80 text-white text-xs font-bold tabular-nums">{i + 1}</span>
              )}
            </div>
            {/* Kontrol di bawah foto (bukan menutupi foto); target sentuh 44px di mobile */}
            <div className="flex items-center justify-between gap-1 p-1 border-t border-slate-100">
              <div className="flex gap-1">
                <IconBtn label={`Geser foto ${i + 1} ke kiri`} disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowLeft className="w-4 h-4" />
                </IconBtn>
                <IconBtn label={`Geser foto ${i + 1} ke kanan`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                  <ArrowRight className="w-4 h-4" />
                </IconBtn>
              </div>
              <IconBtn label={`Hapus foto ${i + 1}`} danger onClick={() => commit(value.filter((_, j) => j !== i))}>
                <Trash2 className="w-4 h-4" />
              </IconBtn>
            </div>
          </li>
        ))}

        {pending.map((p) => (
          <li
            key={p.key}
            className={cn("relative min-h-32 rounded-xl overflow-hidden border", p.error ? "border-red-300 bg-red-50" : "border-slate-200 bg-slate-100")}
          >
            {p.error ? (
              <div className="absolute inset-0 p-3 flex flex-col justify-center gap-1 text-red-700" role="alert">
                <AlertCircle className="w-5 h-5" aria-hidden="true" />
                <p className="text-xs font-bold truncate" title={p.name}>{p.name}</p>
                <p className="text-xs leading-snug">{p.error}</p>
                <button
                  type="button"
                  onClick={() => dismiss(p.key)}
                  className="absolute top-1 right-1 w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center hover:bg-red-100"
                  aria-label={`Tutup pesan error ${p.name}`}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                {/* Pratinjau blob lokal — next/image tidak mendukung blob: */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" className="absolute inset-0 w-full h-full object-cover opacity-50" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/40 text-primary" role="status">
                  <Spinner />
                  <span className="text-xs font-bold text-slate-900">Mengunggah…</span>
                  <span className="sr-only">{p.name}</span>
                </div>
              </>
            )}
          </li>
        ))}

        {room > 0 && (
          <li className={value.length + pending.length === 0 ? "col-span-full" : ""}>
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={onDrop}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1.5 text-center h-full rounded-xl border-2 border-dashed cursor-pointer transition-colors p-4",
                value.length + pending.length === 0 ? "min-h-40" : "min-h-32",
                "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50",
                drag ? "border-primary bg-primary-ultralight" : "border-slate-300 bg-slate-50 hover:border-primary hover:bg-primary-ultralight",
                error && "border-red-400",
              )}
            >
              <input
                type="file"
                accept={TYPES.join(",")}
                multiple
                className="sr-only"
                aria-describedby={`${id}-hint`}
                aria-invalid={error ? true : undefined}
                onChange={(e) => {
                  if (e.target.files) add(e.target.files);
                  e.target.value = "";
                }}
              />
              <ImagePlus className="w-7 h-7 text-primary" aria-hidden="true" />
              <span className="text-sm text-slate-700">
                Tarik foto ke sini atau <span className="font-bold text-primary underline underline-offset-2">pilih file</span>
              </span>
              <span className="text-xs text-slate-500">Sisa {room} foto</span>
            </label>
          </li>
        )}
      </ul>

      <p id={`${id}-hint`} className={cn("mt-2 text-xs", error ? "text-red-600" : "text-slate-500")} role={error ? "alert" : undefined}>
        {error ?? hint ?? (disabled ? (value.length ? "" : "Belum ada foto.") : "JPG, PNG, atau WEBP · maksimal 3 MB per foto. Bisa memilih beberapa file sekaligus.")}
      </p>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-11 h-11 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-slate-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-700",
        danger ? "hover:bg-red-50 hover:text-red-700" : "hover:bg-primary/10 hover:text-primary",
      )}
    >
      {children}
    </button>
  );
}
