"use client";
// Gatekeeper (PRD §7, v1.1): "Ajukan Sewa" → Guest: modal Masuk/Daftar → Dashboard Customer;
// Member: langsung ke /dashboard/sewa?kost=<slug>. Daftar kamar hanya tampil di dashboard (setelah login).
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { Viewer } from "@/lib/session";
import { AuthModal, type AuthTab } from "./AuthModal";

export type KostIntent = { slug: string; name: string; subtitle?: string };

type Gate = {
  viewer: Viewer;
  /** Buka modal auth. Setelah berhasil: ke `next`, ke halaman sewa kost `intent`, atau ke /dashboard. */
  openAuth: (opts?: { tab?: AuthTab; intent?: KostIntent; next?: string }) => void;
  /** Tombol "Ajukan Sewa" di kartu kost & halaman gedung. */
  requestRooms: (intent: KostIntent) => void;
};

const GateContext = createContext<Gate | null>(null);

export function useGate() {
  const ctx = useContext(GateContext);
  if (!ctx) throw new Error("useGate harus di dalam <GateProvider>");
  return ctx;
}

const sewaUrl = (slug: string) => `/dashboard/sewa?kost=${encodeURIComponent(slug)}`;
/** Hanya path internal (cegah open redirect lewat ?next=//host). */
const safeNext = (next?: string | null) => (next && /^\/(?![/\\])/.test(next) ? next : undefined);

export function GateProvider({ viewer, children }: { viewer: Viewer; children: ReactNode }) {
  const router = useRouter();
  const [auth, setAuth] = useState<{ open: boolean; tab: AuthTab; intent?: KostIntent; next?: string }>({ open: false, tab: "masuk" });

  const openAuth: Gate["openAuth"] = useCallback((opts = {}) => {
    setAuth({ open: true, tab: opts.tab ?? "masuk", intent: opts.intent, next: safeNext(opts.next) });
  }, []);

  const requestRooms = useCallback(
    (intent: KostIntent) => {
      if (viewer.kind === "member") router.push(sewaUrl(intent.slug));
      else openAuth({ tab: "masuk", intent });
    },
    [viewer.kind, openAuth, router],
  );

  // ?auth=masuk|daftar&next=/dashboard — dipakai tautan kredensial WA & guard dashboard
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("auth");
    if (tab !== "masuk" && tab !== "daftar") return;
    const next = safeNext(params.get("next"));
    params.delete("auth");
    params.delete("next");
    const qs = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (qs ? `?${qs}` : ""));
    if (viewer.kind === "member") router.push(next ?? "/dashboard");
    else setAuth({ open: true, tab, next });
  }, [viewer.kind, router]);

  // Wajib ganti sandi ditangani guard dashboard (redirect ke /dashboard/akun).
  const onAuthSuccess = () => {
    setAuth((a) => ({ ...a, open: false }));
    router.push(auth.next ?? (auth.intent ? sewaUrl(auth.intent.slug) : "/dashboard"));
  };

  return (
    <GateContext.Provider value={{ viewer, openAuth, requestRooms }}>
      {children}
      <AuthModal
        open={auth.open}
        tab={auth.tab}
        intent={auth.intent}
        onTabChange={(tab) => setAuth((a) => ({ ...a, tab }))}
        onClose={() => setAuth((a) => ({ ...a, open: false }))}
        onSuccess={onAuthSuccess}
      />
    </GateContext.Provider>
  );
}
