import Link from "next/link";
import { Building2 } from "lucide-react";
import { Container } from "@/components/ui";
import { inkBtn } from "@/components/landing/theme";
import { cn } from "@/lib/format";

export default function KostNotFound() {
  return (
    <Container className="py-16 sm:py-24">
      <div className="text-center py-16 px-4 bg-white rounded-3xl border border-line">
        <div className="w-16 h-16 rounded-2xl bg-sand text-ink flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Building2 className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-ink mb-2">Kost tidak ditemukan</h1>
        <p className="text-ink-muted text-sm max-w-md mx-auto mb-6">Halaman kost yang Anda cari tidak tersedia atau sudah dipindahkan.</p>
        <Link href="/#katalog" className={cn(inkBtn, "min-h-11 px-6 text-sm")}>Kembali ke Katalog Kost</Link>
      </div>
    </Container>
  );
}
