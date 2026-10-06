"use client";
// Tombol salin (C-20): "Salin" → "Tersalin" 2 detik, diumumkan via aria-live.
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { button } from "@/components/ui";

export function CopyButton({ value, label = "Salin", what }: { value: string; label?: string; what?: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard diblokir: pengguna tetap bisa menyalin manual */
    }
  }
  return (
    <button type="button" onClick={copy} className={button("neutral", "sm", "min-h-11 sm:min-h-9")} aria-label={what ? `${label} ${what}` : undefined}>
      {copied ? <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" /> : <Copy className="w-4 h-4" aria-hidden="true" />}
      <span aria-live="polite">{copied ? "Tersalin" : label}</span>
    </button>
  );
}
