"use client";
// Aksi detail penghuni (PRD §9.6): ubah jatuh tempo, akhiri sewa, reset kata sandi.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, DoorOpen, KeyRound } from "lucide-react";
import { endLease, resetMemberPassword, updateDueDate } from "@/actions/admin";
import { Input, Textarea } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { button, Notice, Spinner } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { TempPassword } from "./TempPassword";

type Lease = { id: string; startDate: string; dueDate: string; roomNumber: string; kostName: string };
type Dialog = "due" | "end" | "reset" | null;

export function ResidentActions({
  memberId,
  memberName,
  lease,
  canDue,
  canEnd,
  canReset,
}: {
  memberId: string;
  memberName: string;
  lease?: Lease;
  canDue: boolean;
  canEnd: boolean;
  canReset: boolean;
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [dueDate, setDueDate] = useState(lease?.dueDate ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [cred, setCred] = useState<{ password: string; waUrl: string } | null>(null);
  const [done, setDone] = useState("");

  function open(d: Dialog) {
    setDialog(d);
    setDueDate(lease?.dueDate ?? "");
    setReason("");
    setError(null);
    setCred(null);
  }
  const close = () => setDialog(null);
  const fieldError = (f: string) => (error?.field === f ? error.text : undefined);

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string; field?: string }>, success: string) {
    setPending(true);
    setError(null);
    const r = await action();
    setPending(false);
    if (!r.ok) return setError({ text: r.error, field: r.field });
    setDone(success);
    close();
    router.refresh();
  }

  async function reset() {
    setPending(true);
    setError(null);
    const r = await resetMemberPassword(memberId);
    setPending(false);
    if (!r.ok) return setError({ text: r.error });
    setCred({ password: r.tempPassword, waUrl: r.waUrl });
    router.refresh();
  }

  const showDue = canDue && lease;
  const showEnd = canEnd && lease;
  if (!showDue && !showEnd && !canReset) return null;

  const footer = (submitLabel: string, variant: "primary" | "danger" = "primary") => (
    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
      <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={close}>Batal</button>
      <button type="submit" className={button(variant, "md", "sm:flex-[2]")} disabled={pending} aria-busy={pending}>
        {pending && <Spinner className="w-4 h-4" />}
        {submitLabel}
      </button>
    </div>
  );
  const generalError = error && !error.field && <Notice tone="danger"><span role="alert">{error.text}</span></Notice>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {showDue && (
          <button type="button" className={button("neutral")} onClick={() => open("due")}>
            <CalendarClock className="w-4 h-4" aria-hidden="true" /> Ubah Jatuh Tempo
          </button>
        )}
        {canReset && (
          <button type="button" className={button("neutral")} onClick={() => open("reset")}>
            <KeyRound className="w-4 h-4" aria-hidden="true" /> Reset Kata Sandi
          </button>
        )}
        {showEnd && (
          <button type="button" className={button("danger")} onClick={() => open("end")}>
            <DoorOpen className="w-4 h-4" aria-hidden="true" /> Akhiri Sewa
          </button>
        )}
      </div>
      {done && <Notice tone="success"><span role="status">{done}</span></Notice>}

      {lease && (
        <Modal open={dialog === "due"} onClose={close} title="Ubah Jatuh Tempo" subtitle={`${memberName} · Kamar ${lease.roomNumber}`} icon={<CalendarClock className="w-4 h-4" />}>
          <form
            className="p-5 space-y-4"
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              if (reason.trim().length < 5) return setError({ text: "Alasan minimal 5 karakter.", field: "reason" });
              run(() => updateDueDate({ leaseId: lease.id, dueDate, reason }), `Jatuh tempo diubah menjadi ${formatDate(dueDate)}.`);
            }}
          >
            <p className="text-sm text-slate-600">
              Jatuh tempo saat ini <strong className="text-slate-900">{formatDate(lease.dueDate)}</strong>. Gunakan untuk kasus di luar paket perpanjangan.
            </p>
            <Input label="Jatuh tempo baru" type="date" required min={lease.startDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} error={fieldError("dueDate")} />
            <Textarea
              label="Alasan"
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              hint="Wajib, minimal 5 karakter. Tercatat di audit log."
              error={fieldError("reason")}
            />
            {generalError}
            {footer("Simpan Jatuh Tempo")}
          </form>
        </Modal>
      )}

      {lease && (
        <Modal open={dialog === "end"} onClose={close} title="Akhiri Sewa" subtitle={`${memberName} · Kamar ${lease.roomNumber}`} icon={<DoorOpen className="w-4 h-4" />} size="sm">
          <form
            className="p-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(() => endLease(lease.id), `Sewa Kamar ${lease.roomNumber} diakhiri. Akun kembali menjadi Prospect.`);
            }}
          >
            <p className="text-sm text-slate-700">Tindakan ini tidak dapat dibatalkan dan akan:</p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1">
              <li>Mengubah sewa menjadi Berakhir.</li>
              <li>Mengubah Kamar {lease.roomNumber} · {lease.kostName} menjadi Tersedia.</li>
              <li>Mengembalikan akun {memberName} menjadi Prospect (menu penghuni di Dashboard tertutup).</li>
              <li>Menolak otomatis permintaan perpanjangan yang masih menunggu.</li>
            </ul>
            {generalError}
            {footer("Ya, Akhiri Sewa", "danger")}
          </form>
        </Modal>
      )}

      <Modal open={dialog === "reset"} onClose={close} title="Reset Kata Sandi" subtitle={memberName} icon={<KeyRound className="w-4 h-4" />}>
        {cred ? (
          <div className="p-5 space-y-4">
            <TempPassword name={memberName} password={cred.password} waUrl={cred.waUrl} />
            <button type="button" className={button("neutral", "md", "w-full")} onClick={close}>Selesai</button>
          </div>
        ) : (
          <form
            className="p-5 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              reset();
            }}
          >
            <p className="text-sm text-slate-700">
              Kata sandi lama tidak berlaku lagi. Sistem membuat kata sandi sementara 10 karakter dan penghuni wajib menggantinya saat masuk.
            </p>
            {generalError}
            {footer("Buat Kata Sandi Sementara")}
          </form>
        )}
      </Modal>
    </div>
  );
}
