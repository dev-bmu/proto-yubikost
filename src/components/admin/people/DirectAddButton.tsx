"use client";
// Direct Add penghuni lama (PRD §9.5): buat akun Resident + lease, kata sandi sementara tampil sekali.
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { directAdd } from "@/actions/admin";
import { Input, Select } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { button, Notice, Spinner } from "@/components/ui";
import { TempPassword } from "./TempPassword";

const EMPTY = { name: "", whatsapp: "", roomId: "", startDate: "", dueDate: "" };

export function DirectAddButton({ rooms }: { rooms: { id: string; label: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<{ text: string; field?: string; code?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<{ name: string; password: string; waUrl: string } | null>(null);

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const fieldError = (f: string) => (error?.field === f && error.code !== "EXISTS_PROSPECT" ? error.text : undefined);

  function close() {
    setOpen(false);
    setForm(EMPTY);
    setError(null);
    setResult(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.roomId) return setError({ text: "Pilih kamar.", field: "roomId" });
    if (!form.startDate) return setError({ text: "Isi tanggal mulai sewa.", field: "startDate" });
    if (!form.dueDate) return setError({ text: "Isi tanggal jatuh tempo.", field: "dueDate" });
    setPending(true);
    setError(null);
    const r = await directAdd(form);
    setPending(false);
    if (!r.ok) return setError({ text: r.error, field: r.field, code: r.code });
    setResult({ name: form.name.trim(), password: r.tempPassword, waUrl: r.waUrl });
    router.refresh();
  }

  return (
    <>
      <button type="button" className={button("primary")} onClick={() => setOpen(true)}>
        <UserPlus className="w-4 h-4" aria-hidden="true" />
        Tambah Penghuni Lama
      </button>
      <Modal
        open={open}
        onClose={close}
        title={result ? "Akun penghuni dibuat" : "Tambah Penghuni Lama"}
        subtitle={result ? "Kirim kredensial ke penghuni sekarang." : "Untuk penghuni yang sudah tinggal sebelum sistem ini berjalan."}
        icon={<UserPlus className="w-4 h-4" />}
      >
        {result ? (
          <div className="p-5 space-y-4">
            <Notice tone="success">Akun Resident, sewa aktif, dan status kamar sudah tersimpan.</Notice>
            <TempPassword name={result.name} password={result.password} waUrl={result.waUrl} />
            <button type="button" className={button("neutral", "md", "w-full")} onClick={close}>
              Selesai
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4" noValidate>
            <Input label="Nama" required value={form.name} onChange={set("name")} autoComplete="off" error={fieldError("name")} />
            <Input
              label="Nomor WhatsApp"
              required
              inputMode="tel"
              placeholder="08xx-xxxx-xxxx"
              value={form.whatsapp}
              onChange={set("whatsapp")}
              error={fieldError("whatsapp")}
            />
            <Select
              label="Kamar"
              required
              value={form.roomId}
              onChange={set("roomId")}
              hint="Kamar Tersedia, atau kamar terisi hasil impor yang belum punya akun."
              error={fieldError("roomId")}
            >
              <option value="">Pilih kamar</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </Select>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input
                label="Mulai sewa"
                type="date"
                required
                value={form.startDate}
                onChange={set("startDate")}
                hint="Boleh tanggal lampau."
                error={fieldError("startDate")}
              />
              <Input label="Jatuh tempo" type="date" required value={form.dueDate} onChange={set("dueDate")} error={fieldError("dueDate")} />
            </div>

            {error?.code === "EXISTS_PROSPECT" && (
              <Notice tone="warning">
                <span role="alert">{error.text}</span>{" "}
                <Link href="/admin/leads" className="font-bold text-primary hover:text-primary-dark underline">
                  Buka Leads untuk Assign akun yang ada
                </Link>
              </Notice>
            )}
            {error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>}

            <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
              <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={close}>
                Batal
              </button>
              <button type="submit" className={button("primary", "md", "sm:flex-[2]")} disabled={pending} aria-busy={pending}>
                {pending && <Spinner className="w-4 h-4" />}
                Buat Akun Penghuni
              </button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
