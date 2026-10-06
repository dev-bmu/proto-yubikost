"use client";
// Shell Dashboard Customer (C-24, v1.2): sidebar menempel di kiri (lg+), drawer + bottom nav di mobile.
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  BedDouble, CalendarDays, ChevronRight, CreditCard, Headset, IdCard, LayoutDashboard, LogOut, Menu, MessageCircle, Search, UserRound, X,
} from "lucide-react";
import { logoutMember } from "@/actions/member";
import { Pill } from "@/components/ui";
import { cn, firstName, initials } from "@/lib/format";

const ICONS = { home: LayoutDashboard, rooms: BedDouble, payments: CreditCard, profile: IdCard, help: Headset, account: UserRound };
const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** short = label pendek untuk bottom nav mobile */
export type CustomerNavItem = { href: string; label: string; short?: string; icon: keyof typeof ICONS; badge?: number };
export type ShellMember = { name: string; isResident: boolean; place?: string };

type Props = { items: CustomerNavItem[]; member: ShellMember; today: string; helpHref: string; children: ReactNode };

export function CustomerShell({ items, member, today, helpHref, children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);
  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  const current = items.find((i) => isActive(i.href));

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await logoutMember();
    router.push("/");
    router.refresh();
  }

  const body = (onClose?: () => void) => (
    <SidebarBody items={items} member={member} helpHref={helpHref} isActive={isActive} onLogout={logout} onClose={onClose} />
  );

  return (
    <div className="min-h-dvh bg-slate-50">
      <a
        href="#konten"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[70] focus:px-4 focus:py-2.5 focus:rounded-xl focus:bg-primary focus:text-white focus:font-semibold"
      >
        Lewati ke konten
      </a>

      <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-72 flex-col bg-white border-r border-slate-200">{body()}</aside>

      <Drawer open={open} onClose={() => setOpen(false)} returnFocus={menuRef}>
        {body(() => setOpen(false))}
      </Drawer>

      <div className="lg:pl-72 min-w-0">
        <header className="sticky top-0 z-30 h-16 bg-white/85 backdrop-blur-md border-b border-slate-200">
          <div className="h-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-3">
            <button
              ref={menuRef}
              type="button"
              onClick={() => setOpen(true)}
              aria-label="Buka menu dashboard"
              aria-expanded={open}
              aria-controls="menu-dashboard"
              className="lg:hidden -ml-1 w-11 h-11 rounded-xl flex items-center justify-center text-slate-700 hover:bg-slate-100"
            >
              <Menu className="w-6 h-6" aria-hidden="true" />
            </button>
            <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
              <ol className="flex items-center gap-1.5 text-sm min-w-0">
                <li className="hidden sm:flex items-center gap-1.5 text-slate-500">
                  <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
                  <ChevronRight className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </li>
                <li aria-current="page" className="font-bold text-slate-900 truncate">{current?.label ?? "Dashboard"}</li>
              </ol>
            </nav>
            <p className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 text-sm font-medium text-slate-600">
              <CalendarDays className="w-4 h-4 text-primary" aria-hidden="true" /> {today}
            </p>
            <Link
              href="/dashboard/akun"
              aria-label={`Akun ${member.name}`}
              className="flex items-center gap-2.5 rounded-full lg:rounded-xl lg:pr-3 hover:bg-slate-100 transition-colors"
            >
              <Avatar name={member.name} className="w-10 h-10 text-sm" />
              <span className="hidden lg:block text-sm font-bold text-slate-800">{firstName(member.name)}</span>
            </Link>
          </div>
        </header>

        <main id="konten" tabIndex={-1} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 sm:pt-8 pb-28 lg:pb-14 focus:outline-none">
          {children}
        </main>
      </div>

      <nav aria-label="Menu dashboard (bawah)" className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom)]">
        <ul className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
          {items.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("relative flex flex-col items-center justify-center gap-1 min-h-16 px-1 text-xs font-semibold", active ? "text-primary" : "text-slate-600")}
                >
                  {active && <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-primary" aria-hidden="true" />}
                  <span className={cn("relative w-10 h-7 rounded-full flex items-center justify-center", active && "bg-primary-ultralight")}>
                    <Icon className="w-5 h-5" aria-hidden="true" />
                    {item.badge ? <span className="absolute -top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-accent ring-2 ring-white" aria-hidden="true" /> : null}
                  </span>
                  <span className="truncate max-w-full">{item.short ?? item.label}</span>
                  {item.badge ? <span className="sr-only"> (perlu tindakan)</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span className={cn("rounded-full gradient-primary text-white font-bold flex items-center justify-center shrink-0", className)} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

function SidebarBody({
  items, member, helpHref, isActive, onLogout, onClose,
}: Omit<Props, "children" | "today"> & { isActive: (href: string) => boolean; onLogout: () => void; onClose?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="h-1 gradient-hero shrink-0" aria-hidden="true" />
      <div className="h-16 px-5 flex items-center justify-between gap-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-2.5">
          <Link href="/" aria-label="yubikost — Katalog Kost">
            <Image src="/brand/yubikost-horizontal.svg" alt="" width={112} height={32} className="h-8 w-auto" />
          </Link>
          <span className="px-2 py-0.5 rounded-md bg-primary-ultralight text-primary text-xs font-bold">Dashboard</span>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} aria-label="Tutup menu" className="w-11 h-11 -mr-2 rounded-xl flex items-center justify-center text-slate-600 hover:bg-slate-100">
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        <div className="p-4 rounded-2xl bg-primary-ultralight border border-primary/10">
          <div className="flex items-center gap-3">
            <Avatar name={member.name} className="w-12 h-12 text-base shadow-md shadow-primary/30" />
            <div className="min-w-0">
              <p className="font-bold text-slate-900 truncate">{member.name}</p>
              <Pill tone={member.isResident ? "success" : "info"} className="mt-1">{member.isResident ? "Penghuni" : "Calon Penghuni"}</Pill>
            </div>
          </div>
          {member.place && (
            <p className="mt-3 pt-3 border-t border-primary/10 flex items-start gap-2 text-xs font-semibold text-slate-700">
              <BedDouble className="w-4 h-4 text-primary shrink-0" aria-hidden="true" /> {member.place}
            </p>
          )}
        </div>

        <nav aria-label="Menu dashboard">
          <p className="px-3 mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">Menu</p>
          <ul className="space-y-1">
            {items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm transition-colors",
                      active ? "bg-primary-ultralight text-primary font-bold" : "font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                    )}
                  >
                    {active && <span className="absolute -left-4 top-2 bottom-2 w-1 rounded-r-full bg-primary" aria-hidden="true" />}
                    <span className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", active ? "bg-primary text-white" : "bg-slate-100 text-slate-500")}>
                      <Icon className="w-4 h-4" aria-hidden="true" />
                    </span>
                    <span className="flex-1">{item.label}</span>
                    {item.badge ? (
                      <span className="min-w-6 h-6 px-1.5 rounded-full bg-accent text-slate-950 text-xs font-bold flex items-center justify-center">
                        {item.badge}
                        <span className="sr-only"> perlu tindakan</span>
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>

      {/* pb-16 di desktop: ruang untuk tombol "Demo" prototype di pojok kiri bawah */}
      <div className="p-4 lg:pb-16 border-t border-slate-100 space-y-2 shrink-0">
        <div className="on-purple gradient-hero rounded-2xl p-4 text-white">
          <p className="flex items-center gap-2 font-bold">
            <Headset className="w-5 h-5 text-accent" aria-hidden="true" /> Butuh bantuan?
          </p>
          <p className="mt-1 text-xs text-white">Admin Customer Care siap membantu lewat WhatsApp.</p>
          <a
            href={helpHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 min-h-9 px-3 rounded-lg bg-whatsapp hover:bg-whatsapp-dark text-slate-950 text-xs font-bold"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat Customer Care
          </a>
        </div>
        <Link href="/" className="flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-primary">
          <Search className="w-4 h-4" aria-hidden="true" /> Lihat Katalog Kost
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 min-h-11 rounded-xl text-sm font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="w-4 h-4" aria-hidden="true" /> Keluar
        </button>
      </div>
    </div>
  );
}

/** Drawer menu mobile: role=dialog, fokus terkunci, Esc menutup, fokus kembali ke tombol menu (juga saat dibuka lewat sentuhan). */
function Drawer({ open, onClose, returnFocus, children }: { open: boolean; onClose: () => void; returnFocus: RefObject<HTMLElement | null>; children: ReactNode }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus(), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onCloseRef.current();
      if (e.key !== "Tab" || !panelRef.current) return;
      const els = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      returnFocus.current?.focus();
    };
  }, [open, returnFocus]);

  return (
    <AnimatePresence>
      {open && (
        <div className="lg:hidden fixed inset-0 z-[60]">
          <motion.div
            className="absolute inset-0 bg-slate-950/50"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            id="menu-dashboard"
            role="dialog"
            aria-modal="true"
            aria-label="Menu dashboard"
            className="absolute inset-y-0 left-0 w-[min(20rem,88vw)] bg-white shadow-2xl"
            initial={{ x: reduce ? 0 : "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: reduce ? 0 : "-100%" }}
            transition={reduce ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
