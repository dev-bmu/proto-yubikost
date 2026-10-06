"use client";
// Tombol "Ajukan Sewa" — satu-satunya CTA kartu kost (PRD C-05, v1.1). Bisa dipakai dari Server Component.
import { ChevronRight } from "lucide-react";
import { button } from "@/components/ui";
import { cn } from "@/lib/format";
import { useGate } from "./GateProvider";

export function GateButton({
  slug,
  name,
  subtitle,
  size = "md",
  className,
}: {
  slug: string;
  name: string;
  subtitle?: string;
  size?: "md" | "lg";
  className?: string;
}) {
  const { requestRooms } = useGate();
  return (
    <button type="button" onClick={() => requestRooms({ slug, name, subtitle })} className={cn(button("primary", size), className)}>
      Ajukan Sewa <ChevronRight className="w-4 h-4" aria-hidden="true" />
      <span className="sr-only"> di {name}</span>
    </button>
  );
}

/** Tombol "Masuk / Daftar" untuk dipakai di halaman (mis. guard portal). */
export function AuthButton({ next, label = "Masuk / Daftar", className }: { next?: string; label?: string; className?: string }) {
  const { openAuth } = useGate();
  return (
    <button type="button" onClick={() => openAuth({ tab: "masuk", next })} className={cn(button("primary", "md"), className)}>
      {label}
    </button>
  );
}
