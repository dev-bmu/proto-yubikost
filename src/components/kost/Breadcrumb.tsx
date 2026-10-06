// Breadcrumb (PRD C-18): varian putih & ungu. Item terakhir = halaman aktif.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

export function Breadcrumb({ items, onPurple = false }: { items: { label: string; href?: string }[]; onPurple?: boolean }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className={cn("flex items-center gap-2 text-sm min-w-0", onPurple ? "text-white" : "text-slate-500")}>
        {items.map((it, i) => (
          <li key={it.label} className={cn("flex items-center gap-2", it.href ? "shrink-0" : "min-w-0")}>
            {i > 0 && <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
            {it.href ? (
              <Link href={it.href} className="hover:underline whitespace-nowrap">{it.label}</Link>
            ) : (
              <span aria-current="page" className={cn("truncate max-w-xs", onPurple ? "font-semibold" : "font-medium text-slate-900")}>
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
