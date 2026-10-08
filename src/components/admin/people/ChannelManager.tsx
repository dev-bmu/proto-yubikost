"use client";
// CRUD kanal pembayaran (PRD §9.8). Hanya kanal aktif yang tampil di portal.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Pencil, Plus, Trash2 } from "lucide-react";
import { deleteChannel, saveChannel } from "@/actions/admin";
import { Checkbox, Input } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { TableWrap, td, th } from "@/components/admin/kit";
import { button, Notice, Pill, Spinner } from "@/components/ui";

export type ChannelItem = {
  id: string;
  label: string;
  accountNumber: string;
  accountHolder: string;
  qrisImage: string;
  isActive: boolean;
  sortOrder: number;
  /** Kode akun Kas/Bank di Accurate (kolom EXPENSE ACCOUNT NO saat impor penerimaan). */
  accurateAccount: string;
};

type Form = Omit<ChannelItem, "id" | "sortOrder"> & { id?: string; sortOrder: string };

export function ChannelManager({ channels }: { channels: ChannelItem[] }) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [deleting, setDeleting] = useState<ChannelItem | null>(null);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);

  const nextOrder = Math.max(0, ...channels.map((c) => c.sortOrder)) + 1;
  const edit = (c?: ChannelItem) => {
    setError(null);
    setForm(
      c
        ? { ...c, sortOrder: String(c.sortOrder) }
        : { label: "", accountNumber: "", accountHolder: "", qrisImage: "", isActive: true, sortOrder: String(nextOrder), accurateAccount: "" },
    );
  };
  const set = (k: "label" | "accountNumber" | "accountHolder" | "qrisImage" | "sortOrder" | "accurateAccount") => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => f && { ...f, [k]: e.target.value });
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    setPending(true);
    setError(null);
    const r = await saveChannel({ ...form, sortOrder: Number(form.sortOrder) || 0 });
    setPending(false);
    if (!r.ok) return setError({ text: r.error, field: r.field });
    setForm(null);
    router.refresh();
  }

  async function remove() {
    if (!deleting) return;
    setPending(true);
    setError(null);
    const r = await deleteChannel(deleting.id);
    setPending(false);
    if (!r.ok) return setError({ text: r.error });
    setDeleting(null);
    router.refresh();
  }

  const generalError = error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button type="button" className={button("primary")} onClick={() => edit()}>
          <Plus className="w-4 h-4" aria-hidden="true" /> Tambah Kanal
        </button>
      </div>

      <TableWrap caption="Daftar rekening dan QRIS">
        <thead>
          <tr>
            <th scope="col" className={th}>Urutan</th>
            <th scope="col" className={th}>Label</th>
            <th scope="col" className={th}>Nomor rekening</th>
            <th scope="col" className={th}>Atas nama</th>
            <th scope="col" className={th}>QRIS</th>
            <th scope="col" className={th}>Akun Accurate</th>
            <th scope="col" className={th}>Status</th>
            <th scope="col" className={th}><span className="sr-only">Aksi</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {channels.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50/60">
              <td className={`${td} tabular-nums`}>{c.sortOrder}</td>
              <td className={`${td} font-bold text-slate-900`}>{c.label}</td>
              <td className={`${td} font-mono tabular-nums`}>{c.accountNumber || "-"}</td>
              <td className={td}>{c.accountHolder || "-"}</td>
              <td className={td}>
                {c.qrisImage ? (
                  // URL bebas dari admin → <img> biasa (next/image butuh domain terdaftar)
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.qrisImage} alt={`QRIS ${c.label}`} className="w-16 h-16 object-contain rounded-lg border border-slate-200 bg-white" />
                ) : (
                  "-"
                )}
              </td>
              <td className={`${td} font-mono tabular-nums`}>{c.accurateAccount || <span className="font-sans text-amber-700">Belum diisi</span>}</td>
              <td className={td}>{c.isActive ? <Pill tone="success">Aktif</Pill> : <Pill tone="neutral">Nonaktif</Pill>}</td>
              <td className={td}>
                <div className="flex justify-end gap-2">
                  <button type="button" className={button("neutral", "sm", "min-h-11 sm:min-h-9")} onClick={() => edit(c)} aria-label={`Ubah kanal ${c.label}`}>
                    <Pencil className="w-4 h-4" aria-hidden="true" /> Ubah
                  </button>
                  <button
                    type="button"
                    className={button("neutral", "sm", "min-h-11 sm:min-h-9 hover:border-red-600 hover:text-red-700")}
                    onClick={() => (setError(null), setDeleting(c))}
                    aria-label={`Hapus kanal ${c.label}`}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" /> Hapus
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {!channels.length && (
            <tr>
              <td colSpan={8} className={`${td} text-center py-10 text-slate-500`}>Belum ada rekening atau QRIS.</td>
            </tr>
          )}
        </tbody>
      </TableWrap>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "Ubah Kanal Pembayaran" : "Tambah Kanal Pembayaran"} icon={<CreditCard className="w-4 h-4" />}>
        {form && (
          <form className="p-5 space-y-4" onSubmit={save} noValidate>
            <Input label="Label bank / kanal" required value={form.label} onChange={set("label")} placeholder="BCA, Mandiri, QRIS" error={fieldError("label")} />
            <Input
              label="Nomor rekening"
              inputMode="numeric"
              value={form.accountNumber}
              onChange={set("accountNumber")}
              hint="Kosongkan untuk kanal QRIS saja."
              error={fieldError("accountNumber")}
            />
            <Input label="Atas nama" value={form.accountHolder} onChange={set("accountHolder")} />
            <Input
              label="URL gambar QRIS"
              inputMode="url"
              value={form.qrisImage}
              onChange={set("qrisImage")}
              placeholder="/qris-dummy.svg"
              hint="Prototype memakai URL; produksi memakai unggah gambar."
            />
            <Input
              label="Kode akun Kas/Bank di Accurate"
              value={form.accurateAccount}
              onChange={set("accurateAccount")}
              placeholder="110101"
              hint="Dipakai kolom EXPENSE ACCOUNT NO saat ekspor penerimaan penjualan. Harus sama persis dengan kode akun di Accurate."
            />
            {form.qrisImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.qrisImage} alt="Pratinjau QRIS" className="max-w-[160px] rounded-xl border border-slate-200" />
            )}
            <div className="grid grid-cols-2 gap-4 items-end">
              <Input label="Urutan tampil" type="number" min={0} value={form.sortOrder} onChange={set("sortOrder")} />
              <Checkbox
                label="Aktif (tampil di portal)"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                className="pb-3"
              />
            </div>
            {generalError}
            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={() => setForm(null)}>Batal</button>
              <button type="submit" className={button("primary", "md", "sm:flex-[2]")} disabled={pending} aria-busy={pending}>
                {pending && <Spinner className="w-4 h-4" />}
                Simpan Kanal
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal open={!!deleting} onClose={() => setDeleting(null)} title="Hapus Kanal" subtitle={deleting?.label} icon={<Trash2 className="w-4 h-4" />} size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">
            Kanal <strong className="text-slate-900">{deleting?.label}</strong> akan dihapus dan tidak tampil lagi di portal. Untuk menyembunyikan sementara, ubah menjadi Nonaktif.
          </p>
          {generalError}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={() => setDeleting(null)}>Batal</button>
            <button type="button" className={button("danger", "md", "sm:flex-[2]")} onClick={remove} disabled={pending} aria-busy={pending}>
              {pending && <Spinner className="w-4 h-4" />}
              Ya, Hapus
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
