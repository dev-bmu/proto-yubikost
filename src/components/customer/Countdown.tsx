"use client";
// Hitung mundur batas bayar (C-20): diperbarui per menit, diumumkan sopan ke pembaca layar.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Hourglass } from "lucide-react";
import { HOLD_HOURS } from "@/lib/constants";

export function Countdown({ expiresAt, deadline }: { expiresAt: string; deadline: string }) {
  const router = useRouter();
  const [left, setLeft] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, new Date(expiresAt).getTime() - Date.now()));
    tick();
    const t = setInterval(tick, 20_000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const mins = left === null ? null : Math.ceil(left / 60_000);
  const expired = mins === 0;
  // Waktu habis: muat ulang data server agar pesanan tampil kedaluwarsa dan kamar dilepas.
  useEffect(() => {
    if (expired) router.refresh();
  }, [expired, router]);
  const pct = left === null ? 100 : Math.min(100, (left / (HOLD_HOURS * 3_600_000)) * 100);

  return (
    <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="flex items-start gap-2 text-sm text-amber-900">
          <Hourglass className="w-5 h-5 shrink-0 text-amber-700" aria-hidden="true" />
          <span>
            Bayar sebelum <strong className="font-bold">{deadline}</strong>
            <span className="block text-xs">Lewat batas, pesanan batal otomatis dan kamar dilepas.</span>
          </span>
        </p>
        <p aria-live="polite" className="flex items-center gap-1.5 text-amber-900 tabular-nums">
          {mins === null ? (
            <span className="text-sm font-semibold">Menghitung sisa waktu…</span>
          ) : mins === 0 ? (
            <span className="text-sm font-bold">Waktu pembayaran habis</span>
          ) : (
            <>
              <span className="sr-only">Sisa waktu {Math.floor(mins / 60)} jam {mins % 60} menit</span>
              <TimeBox value={Math.floor(mins / 60)} unit="jam" />
              <span className="text-lg font-extrabold" aria-hidden="true">:</span>
              <TimeBox value={mins % 60} unit="menit" />
            </>
          )}
        </p>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-amber-200/70 overflow-hidden" aria-hidden="true">
        <div className="h-full rounded-full bg-amber-500 transition-[width] duration-700" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function TimeBox({ value, unit }: { value: number; unit: string }) {
  return (
    <span className="min-w-14 px-2 py-1 rounded-xl bg-white border border-amber-200 text-center" aria-hidden="true">
      <span className="block text-xl font-extrabold leading-tight">{String(value).padStart(2, "0")}</span>
      <span className="block text-xs font-semibold">{unit}</span>
    </span>
  );
}
