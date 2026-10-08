"use client";
// Header (PRD §5.2, v1.2; tampilan v1.3 paper/ink): logo warna + 3 menu section home (scroll-spy) + area auth.
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, KeyRound, LayoutDashboard, LogOut, Menu, UserRound, X } from "lucide-react";
import { logoutMember } from "@/actions/member";
import { useGate } from "@/components/gate/GateProvider";
import { inkBtn, lineBtn } from "@/components/landing/theme";
import { cn, firstName, initials } from "@/lib/format";

const NAV = [
  { name: "Katalog Kost", id: "katalog" },
  { name: "Cara Sewa", id: "cara-sewa" },
  { name: "Testimoni", id: "testimoni" },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { viewer, openAuth } = useGate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    setMobileOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", close);
    };
  }, [menuOpen]);

  // Di home: menu aktif mengikuti section yang sedang terlihat. Di halaman gedung: Katalog Kost.
  const [section, setSection] = useState(NAV[0].id);
  useEffect(() => {
    if (pathname !== "/") return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setSection(e.target.id)),
      { rootMargin: "-45% 0px -50% 0px" },
    );
    NAV.forEach((n) => {
      const el = document.getElementById(n.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [pathname]);
  const activeId = pathname === "/" ? section : pathname.startsWith("/kost/") ? NAV[0].id : null;
  const isActive = (id: string) => activeId === id;

  const member = viewer.kind === "member" ? viewer : null;

  async function logout() {
    await logoutMember();
    router.refresh();
  }

  return (
    <header className="on-paper sticky top-0 z-50 w-full border-b border-line bg-paper/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0" aria-label="yubikost — Beranda">
            <Image src="/brand/yubikost-horizontal.svg" alt="" width={140} height={40} className="h-8 sm:h-9 w-auto" priority />
          </Link>

          <nav aria-label="Menu utama" className="hidden md:flex items-center gap-8">
            {NAV.map((item) => {
              const active = isActive(item.id);
              return (
                <Link
                  key={item.id}
                  href={`/#${item.id}`}
                  aria-current={active ? "location" : undefined}
                  className={cn("relative py-2 text-sm transition-colors hover:text-ink", active ? "text-ink font-semibold" : "text-ink-soft font-medium")}
                >
                  {item.name}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {!member ? (
              <button type="button" onClick={() => openAuth({ tab: "masuk" })} className={cn(lineBtn, "hidden md:inline-flex min-h-10 px-4 text-sm")}>
                <UserRound className="w-4 h-4" aria-hidden="true" /> Masuk / Daftar
              </button>
            ) : (
              <>
                <Link href="/dashboard" className={cn(inkBtn, "hidden md:inline-flex min-h-10 px-4 text-sm")}>
                  <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Dashboard Saya
                </Link>
                <div className="relative hidden md:block" ref={menuRef}>
                  <button
                    type="button"
                    onClick={() => setMenuOpen((o) => !o)}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-sand"
                  >
                    <span className="w-8 h-8 rounded-full bg-ink text-paper text-xs font-bold flex items-center justify-center" aria-hidden="true">
                      {initials(member.name)}
                    </span>
                    <span className="text-sm font-semibold text-ink">{firstName(member.name)}</span>
                    <ChevronDown className="w-4 h-4 text-ink-muted" aria-hidden="true" />
                  </button>
                  {menuOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-line shadow-lg shadow-ink/10 p-1.5">
                      <p className="px-3 py-2 text-xs text-ink-muted">
                        Masuk sebagai <strong className="text-ink">{member.role === "RESIDENT" ? "Penghuni" : "Calon Penghuni"}</strong>
                      </p>
                      <Link role="menuitem" href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-soft hover:bg-sand hover:text-ink">
                        <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Dashboard Saya
                      </Link>
                      <Link role="menuitem" href="/dashboard/akun" className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-ink-soft hover:bg-sand hover:text-ink">
                        <KeyRound className="w-4 h-4" aria-hidden="true" /> Ganti Kata Sandi
                      </Link>
                      <button role="menuitem" type="button" onClick={logout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50">
                        <LogOut className="w-4 h-4" aria-hidden="true" /> Keluar
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="md:hidden p-2.5 rounded-lg hover:bg-sand text-ink"
              aria-label={mobileOpen ? "Tutup menu" : "Buka menu"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav"
            >
              {mobileOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            id="mobile-nav"
            initial={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, clipPath: "inset(0% 0% 0% 0%)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, clipPath: "inset(0% 0% 100% 0%)" }}
            transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
            className="md:hidden border-t border-line bg-paper"
          >
            <nav aria-label="Menu utama" className="px-4 py-3 space-y-1">
              {NAV.map((item) => (
                <Link
                  key={item.id}
                  href={`/#${item.id}`}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(item.id) ? "location" : undefined}
                  className={cn(
                    "block px-3 py-2.5 rounded-xl text-base",
                    isActive(item.id) ? "bg-sand text-ink font-semibold" : "text-ink-soft font-medium hover:bg-sand/60 hover:text-ink",
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-line space-y-2">
                {!member ? (
                  <button type="button" onClick={() => { setMobileOpen(false); openAuth({ tab: "masuk" }); }} className={cn(inkBtn, "w-full min-h-11 text-sm")}>
                    <UserRound className="w-4 h-4" aria-hidden="true" /> Masuk / Daftar
                  </button>
                ) : (
                  <>
                    <p className="px-3 text-sm text-ink-soft">
                      Halo, <strong className="text-ink">{firstName(member.name)}</strong>
                    </p>
                    <Link href="/dashboard" className={cn(inkBtn, "w-full min-h-11 text-sm")}>
                      <LayoutDashboard className="w-4 h-4" aria-hidden="true" /> Dashboard Saya
                    </Link>
                    <Link href="/dashboard/akun" className={cn(lineBtn, "w-full min-h-11 text-sm")}>
                      <KeyRound className="w-4 h-4" aria-hidden="true" /> Ganti Kata Sandi
                    </Link>
                    <button type="button" onClick={logout} className={cn(lineBtn, "w-full min-h-11 text-sm border-line-strong text-red-700 hover:bg-red-50 hover:text-red-700")}>
                      <LogOut className="w-4 h-4" aria-hidden="true" /> Keluar
                    </button>
                  </>
                )}
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
