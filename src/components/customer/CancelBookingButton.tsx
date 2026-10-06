"use client";
// Customer membatalkan pesanan yang belum dibayar (kamar dilepas).
import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { cancelBooking } from "@/actions/customer";
import { Modal } from "@/components/Modal";
import { button, Notice, Spinner } from "@/components/ui";

export function CancelBookingButton({ id, label, size = "md", className }: { id: string; label: string; size?: "md" | "lg"; className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function confirm() {
    setBusy(true);
    setError("");
    const r = await cancelBooking(id);
    setBusy(false);
    if (!r.ok) return setError(r.error);
    setOpen(false);
    router.push("/dashboard/sewa");
    router.refresh();
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={button("neutral", size, className)}>
        <XCircle className="w-4 h-4" aria-hidden="true" /> Batalkan Pesanan
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Batalkan pesanan?" subtitle={label} icon={<XCircle className="w-4 h-4" />} size="sm">
        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-700">Kamar akan dilepas dan bisa dipesan orang lain. Anda bisa memesan kamar lain setelahnya.</p>
          {error && (
            <Notice tone="danger">
              <span role="alert">{error}</span>
            </Notice>
          )}
          <div className="flex flex-col-reverse sm:flex-row gap-2">
            <button type="button" className={button("neutral", "md", "sm:flex-1")} onClick={() => setOpen(false)}>
              Tidak
            </button>
            <button type="button" className={button("danger", "md", "sm:flex-1")} onClick={confirm} disabled={busy} aria-busy={busy}>
              {busy && <Spinner className="w-4 h-4" />} Ya, Batalkan
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
