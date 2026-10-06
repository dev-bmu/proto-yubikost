"use client";
// Verifikasi bukti pembayaran (PRD §9.7, v1.1): Setujui / Tolak, dan batalkan pesanan belum dibayar.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CircleCheck, CircleX, XCircle } from "lucide-react";
import { approvePayment, cancelBookingAdmin, rejectPayment } from "@/actions/admin";
import { Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { button, Notice, Spinner } from "@/components/ui";
import { rupiah } from "@/lib/format";

const TOUCH = "min-h-11 sm:min-h-9";

export function PaymentActions({
  id,
  name,
  kindLabel,
  amount,
  effect,
}: {
  id: string;
  name: string;
  kindLabel: string;
  amount: number;
  /** Penjelasan efek persetujuan, mis. "Sewa aktif 15 Okt 2026 – 15 Jan 2027, akun jadi Penghuni" */
  effect: string;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);

  const open = (d: "approve" | "reject") => {
    setDialog(d);
    setReason("");
    setError(null);
  };
  const close = () => setDialog(null);
  // Baris hilang dari tab Menunggu setelah aksi, jadi hasil ditampilkan halaman lewat ?done=<id>.
  const finish = () => router.push(`/admin/pembayaran?done=${id}`);

  async function approve() {
    setPending(true);
    setError(null);
    const r = await approvePayment(id);
    if (r.ok) return finish();
    setPending(false);
    setError({ text: r.error });
  }

  async function reject(e: React.FormEvent) {
    e.preventDefault();
    if (reason.trim().length < 5) return setError({ text: "Alasan penolakan minimal 5 karakter.", field: "reason" });
    setPending(true);
    setError(null);
    const r = await rejectPayment(id, reason);
    if (r.ok) return finish();
    setPending(false);
    setError({ text: r.error, field: r.field });
  }

  const summary = (
    <dl className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-sm">
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Customer</dt><dd className="font-semibold text-slate-800">{name}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Jenis</dt><dd className="font-semibold text-slate-800">{kindLabel}</dd></div>
      <div className="flex justify-between gap-3"><dt className="text-slate-500">Nominal</dt><dd className="font-semibold text-slate-800 tabular-nums">{rupiah(amount)}</dd></div>
    </dl>
  );
  const generalError = error && !error.field && (
    <Notice tone="danger">
      <span role="alert">{error.text}</span>
    </Notice>
  );

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={button("primary", "sm", TOUCH)} onClick={() => open("approve")} aria-label={`Setujui pembayaran ${name}`}>
          <CircleCheck className="w-4 h-4" aria-hidden="true" /> Setujui
        </button>
        <button type="button" className={button("neutral", "sm", TOUCH)} onClick={() => open("reject")} aria-label={`Tolak pembayaran ${name}`}>
          <CircleX className="w-4 h-4" aria-hidden="true" /> Tolak
        </button>
      </div>

      <Modal open={dialog === "approve"} onClose={close} title="Setujui Pembayaran" subtitle="Pastikan nominal sudah masuk di mutasi rekening." icon={<CircleCheck className="w-4 h-4" />} size="sm">
        <div className="p-5 space-y-4">
          {summary}
          <p className="text-sm text-slate-700">{effect}</p>
          {generalError}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={close}>Batal</button>
            <button type="button" className={button("primary", "md", "sm:flex-[2]")} onClick={approve} disabled={pending} aria-busy={pending}>
              {pending && <Spinner className="w-4 h-4" />} Ya, Setujui
            </button>
          </div>
        </div>
      </Modal>

      <Modal open={dialog === "reject"} onClose={close} title="Tolak Bukti Pembayaran" subtitle={name} icon={<CircleX className="w-4 h-4" />}>
        <form className="p-5 space-y-4" onSubmit={reject} noValidate>
          {summary}
          <Textarea
            label="Alasan penolakan"
            required
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Contoh: Nominal transfer kurang Rp100.000"
            hint="Ditampilkan ke customer. Untuk sewa baru, customer bisa upload ulang dalam 24 jam."
            error={error?.field === "reason" ? error.text : undefined}
          />
          {generalError}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={close}>Batal</button>
            <button type="submit" className={button("danger", "md", "sm:flex-[2]")} disabled={pending} aria-busy={pending}>
              {pending && <Spinner className="w-4 h-4" />} Tolak Bukti
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function CancelBookingAdminButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const r = await cancelBookingAdmin(id);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    router.refresh();
  }

  return (
    <>
      <button type="button" className={button("neutral", "sm", TOUCH)} onClick={() => setOpen(true)} aria-label={`Batalkan pesanan ${name}`}>
        <XCircle className="w-4 h-4" aria-hidden="true" /> Batalkan
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Batalkan pesanan?" subtitle={name} icon={<XCircle className="w-4 h-4" />} size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">Pesanan dibatalkan dan kamar kembali Tersedia. Tercatat di audit log.</p>
          {error && (
            <Notice tone="danger">
              <span role="alert">{error}</span>
            </Notice>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={() => setOpen(false)}>Tidak</button>
            <button type="button" className={button("danger", "md", "sm:flex-1")} onClick={confirm} disabled={busy} aria-busy={busy}>
              {busy && <Spinner className="w-4 h-4" />} Ya, Batalkan
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
