"use client";
// Shell admin (C-23): sidebar slate-900 dengan aksen ungu-kuning, top bar, menu sesuai izin.
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BedDouble, Building2, CreditCard, ExternalLink, LayoutDashboard, LogOut, Menu, ReceiptText, ScrollText, UserPlus, Users, X,
} from "lucide-react";
import { logoutAdmin } from "@/actions/admin";
import { cn } from "@/lib/format";

const ICONS = {
  dashboard: LayoutDashboard,
  rooms: BedDouble,
  leads: UserPlus,
  residents: Users,
  renewals: ReceiptText,
  channels: CreditCard,
  catalog: Building2,
  audit: ScrollText,
};

export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; badge?: number };

export function AdminShell({
  items,
  admin,
  children,
}: {
  items: NavItem[];
  admin: { name: string; roleLabel: string };
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/"));

  async function logout() {
    await logoutAdmin();
    router.push("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Menu admin" className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
      {items.map((item) => {
        const Icon = ICONS[item.icon];
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
              active ? "bg-primary text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white",
            )}
          >
            <Icon className={cn("w-5 h-5 shrink-0", active ? "text-accent" : "")} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.badge ? (
              <span className="min-w-6 h-6 px-1.5 rounded-full bg-accent text-slate-950 text-xs font-bold flex items-center justify-center">
                {item.badge}
                <span className="sr-only"> menunggu</span>
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="h-16 flex items-center gap-2.5 px-4 border-b border-slate-800">
      <Image src="/brand/yubikost-horizontal-white.svg" alt="yubikost" width={112} height={32} className="h-8 w-auto" />
      <span className="px-2 py-0.5 rounded-md bg-white/10 text-accent text-xs font-bold">Admin</span>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-100">
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-slate-900 sticky top-0 h-screen">
        {brand}
        {nav}
      </aside>

      {open && (
        <div className="lg:hidden fixed inset-0 z-[60] flex" role="dialog" aria-modal="true" aria-label="Menu admin">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} aria-hidden="true" />
          <aside className="relative w-72 max-w-[85vw] flex flex-col bg-slate-900">
            <div className="flex items-center justify-between pr-2">
              {brand}
              <button type="button" onClick={() => setOpen(false)} className="p-2.5 rounded-lg text-slate-300 hover:bg-slate-800" aria-label="Tutup menu">
                <X className="w-5 h-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 sticky top-0 z-40 bg-white border-b border-slate-200 flex items-center justify-between gap-3 px-4 sm:px-6">
          <button type="button" onClick={() => setOpen(true)} className="lg:hidden p-2.5 rounded-lg hover:bg-slate-100 text-slate-700" aria-label="Buka menu admin">
            <Menu className="w-5 h-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2 sm:gap-4">
            <Link href="/" target="_blank" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-primary">
              Lihat situs <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div className="text-right leading-tight">
              <p className="text-sm font-bold text-slate-900">{admin.name}</p>
              <p className="text-xs text-primary font-semibold">{admin.roleLabel}</p>
            </div>
            <button type="button" onClick={logout} className="p-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-700" aria-label="Keluar dari admin">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </header>
        <main id="konten" className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
