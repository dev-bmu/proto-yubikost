import Link from "next/link";
import { Building2 } from "lucide-react";
import { button, Container } from "@/components/ui";

export default function KostNotFound() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-slate-800 mb-2">Kost tidak ditemukan</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto mb-6">Halaman kost yang Anda cari tidak tersedia atau sudah dipindahkan.</p>
        <Link href="/#katalog" className={button("primary", "md")}>Kembali ke Katalog Kost</Link>
      </div>
    </Container>
  );
}
