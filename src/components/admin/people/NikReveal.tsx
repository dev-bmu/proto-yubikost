"use client";
// NIK termasking; tampil penuh hanya lewat aksi server yang mencatat audit log (SEC-04, SEC-05).
import { useState } from "react";
import { Eye } from "lucide-react";
import { revealNik } from "@/actions/admin";
import { button, Spinner } from "@/components/ui";

export function NikReveal({ memberId, masked, allowed }: { memberId: string; masked: string; allowed: boolean }) {
  const [nik, setNik] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function reveal() {
    setPending(true);
    setError("");
    const r = await revealNik(memberId);
    setPending(false);
    if (r.ok) setNik(r.nik);
    else setError(r.error);
  }

  return (
    <div>
      <p className="font-mono tabular-nums text-slate-900" aria-live="polite">{nik || masked}</p>
      {nik ? (
        <p className="text-xs text-slate-500 mt-1">Akses NIK lengkap ini tercatat di audit log.</p>
      ) : (
        allowed && (
          <button type="button" onClick={reveal} disabled={pending} aria-busy={pending} className={button("ghost", "sm", "-ml-3 mt-1 min-h-11 sm:min-h-9")}>
            {pending ? <Spinner className="w-4 h-4" /> : <Eye className="w-4 h-4" aria-hidden="true" />}
            Lihat NIK lengkap
          </button>
        )
      )}
      {error && <p className="text-xs text-red-600 mt-1" role="alert">{error}</p>}
    </div>
  );
}
