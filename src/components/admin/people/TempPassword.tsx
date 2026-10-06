// Kata sandi sementara ditampilkan SEKALI (PRD §9.5): kotak kode + Salin + Kirim via WhatsApp (WA-CRED).
import { MessageCircle, TriangleAlert } from "lucide-react";
import { CopyButton } from "@/components/CopyButton";
import { button, Notice } from "@/components/ui";

export function TempPassword({ name, password, waUrl }: { name: string; password: string; waUrl: string }) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-700">
        Kata sandi sementara untuk <strong className="text-slate-900">{name}</strong>:
      </p>
      <div className="flex items-center justify-between gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <code className="font-mono text-lg font-bold tracking-wider text-slate-900 select-all break-all">{password}</code>
        <CopyButton value={password} what="kata sandi sementara" />
      </div>
      <a href={waUrl} target="_blank" rel="noopener noreferrer" className={button("whatsapp", "md", "w-full")}>
        <MessageCircle className="w-5 h-5" aria-hidden="true" />
        Kirim via WhatsApp
      </a>
      <Notice tone="warning" className="flex gap-2">
        <TriangleAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
        <span>Kata sandi tidak akan ditampilkan lagi. Salin atau kirim sekarang sebelum menutup dialog ini.</span>
      </Notice>
    </div>
  );
}
