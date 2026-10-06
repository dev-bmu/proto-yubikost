"use client";
// Panel demo prototype: login satu klik sebagai member/admin dan reset data TSV. Tidak ada di produksi.
import { useState } from "react";
import { useRouter } from "next/navigation";
import { FlaskConical, RotateCcw, X } from "lucide-react";
import { demoLogin, resetDemoData } from "@/actions/demo";
import { cn } from "@/lib/format";

export type DemoAccount = { id: string; name: string; note: string; href: string };

export function DemoBar({ members, admins }: { members: DemoAccount[]; admins: DemoAccount[] }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function login(kind: "member" | "admin", id: string, href: string) {
    setBusy(true);
    await demoLogin(kind, id);
    setBusy(false);
    setOpen(false);
    router.push(href);
    router.refresh();
  }

  async function reset() {
    if (!confirm("Reset semua data dummy ke kondisi awal? Perubahan selama demo akan hilang.")) return;
    setBusy(true);
    await resetDemoData();
    setBusy(false);
    setOpen(false);
    router.push("/");
    router.refresh();
  }

  return (
    <div className="fixed right-3 bottom-24 lg:bottom-4 z-[55] print:hidden flex flex-col items-end">
      {open && (
        <div className="mb-2 w-[min(22rem,calc(100vw-1.5rem))] max-h-[70dvh] overflow-y-auto rounded-2xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700 p-4 text-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold">Mode Demo Prototype</p>
            <button type="button" onClick={() => setOpen(false)} aria-label="Tutup panel demo" className="p-1.5 rounded-lg hover:bg-slate-800">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-slate-300 mb-3">
            Semua kata sandi akun demo: <code className="px-1.5 py-0.5 rounded bg-slate-800 text-accent">demo1234</code>
          </p>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Member (Portal / Gatekeeper)</p>
          <ul className="space-y-1 mb-4">
            {members.map((m) => (
              <li key={m.id}>
                <button type="button" disabled={busy} onClick={() => login("member", m.id, m.href)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  <span className="font-semibold">{m.name}</span>
                  <span className="block text-xs text-slate-400">{m.note}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">Admin (per peran)</p>
          <ul className="space-y-1 mb-4">
            {admins.map((a) => (
              <li key={a.id}>
                <button type="button" disabled={busy} onClick={() => login("admin", a.id, a.href)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 disabled:opacity-50">
                  <span className="font-semibold">{a.name}</span>
                  <span className="block text-xs text-slate-400">{a.note}</span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy} onClick={reset} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 font-semibold disabled:opacity-50">
            <RotateCcw className="w-4 h-4" aria-hidden="true" /> Reset data dummy
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("flex items-center gap-2 px-3.5 py-2 rounded-full bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 hover:bg-slate-800")}
      >
        <FlaskConical className="w-4 h-4 text-accent" aria-hidden="true" /> Demo
      </button>
    </div>
  );
}
