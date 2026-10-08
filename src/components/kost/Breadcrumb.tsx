// Breadcrumb (PRD C-18; tampilan v1.3 paper/ink). Item terakhir = halaman aktif.
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/format";

export function Breadcrumb({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-2 text-sm min-w-0 text-ink-muted">
        {items.map((it, i) => (
          <li key={it.label} className={cn("flex items-center gap-2", it.href ? "shrink-0" : "min-w-0")}>
            {i > 0 && <ChevronRight className="w-4 h-4 shrink-0" aria-hidden="true" />}
            {it.href ? (
              <Link href={it.href} className="hover:text-ink hover:underline underline-offset-4 whitespace-nowrap">{it.label}</Link>
            ) : (
              <span aria-current="page" className="truncate max-w-xs font-medium text-ink">{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
