// Media & fasilitas (PRD §4.7–4.8): foto dengan placeholder bermerek, ikon fasilitas satu sumber.
import Image from "next/image";
import {
  AirVent, AppWindow, Archive, Armchair, Bath, Bed, Bike, Building2, Camera, Car, CheckCircle2, CookingPot, Dumbbell, Fan,
  Flame, KeyRound, Moon, Refrigerator, Shirt, ShieldCheck, Sofa, Sun, Table, Trees, Tv, Utensils, Wifi, Wind, type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/format";

export function facilityMeta(name: string): { icon: LucideIcon; desc: string } {
  const n = name.toLowerCase();
  if (n.includes("wifi") || n.includes("internet")) return { icon: Wifi, desc: "Koneksi internet cepat & stabil" };
  if (n === "ac" || n.includes("air conditioner")) return { icon: AirVent, desc: "Pendingin ruangan siap pakai" };
  if (n.includes("kipas")) return { icon: Fan, desc: "Kipas angin di kamar" };
  if (n.includes("water heater") || n.includes("air panas")) return { icon: Flame, desc: "Air hangat 24 jam" };
  if (n.includes("kamar mandi")) return { icon: Bath, desc: "Privasi penuh di dalam kamar" };
  if (n.includes("kasur") || n.includes("bed")) return { icon: Bed, desc: "Kasur nyaman & bersih" };
  if (n.includes("lemari")) return { icon: Archive, desc: "Penyimpanan pakaian & barang" };
  if (n.includes("meja")) return { icon: Table, desc: "Meja belajar atau kerja" };
  if (n === "tv" || n.includes("televisi")) return { icon: Tv, desc: "Hiburan televisi di kamar" };
  if (n.includes("kulkas")) return { icon: Refrigerator, desc: "Kulkas di dalam kamar" };
  if (n.includes("balkon") || n.includes("rooftop")) return { icon: Sun, desc: "Area terbuka untuk bersantai" };
  if (n.includes("dapur pribadi")) return { icon: CookingPot, desc: "Dapur kecil di dalam kamar" };
  if (n.includes("dapur")) return { icon: Utensils, desc: "Akses dapur bersama" };
  if (n.includes("kursi")) return { icon: Armchair, desc: "Kursi belajar atau santai" };
  if (n.includes("jendela")) return { icon: AppWindow, desc: "Jendela menghadap luar" };
  if (n.includes("ruang tamu")) return { icon: Sofa, desc: "Ruang tamu bersama" };
  if (n.includes("jemuran")) return { icon: Wind, desc: "Area jemur pakaian" };
  if (n.includes("mushola")) return { icon: Moon, desc: "Tempat ibadah bersama" };
  if (n.includes("security") || n.includes("satpam")) return { icon: ShieldCheck, desc: "Penjaga keamanan 24 jam" };
  if (n.includes("laundry") || n.includes("cuci")) return { icon: Shirt, desc: "Layanan cuci pakaian" };
  if (n.includes("cctv")) return { icon: Camera, desc: "Pemantauan keamanan 24 jam" };
  if (n.includes("akses kartu") || n.includes("kunci")) return { icon: KeyRound, desc: "Akses masuk dengan kartu" };
  if (n.includes("parkir mobil")) return { icon: Car, desc: "Area parkir mobil" };
  if (n.includes("parkir")) return { icon: Bike, desc: "Area parkir motor aman" };
  if (n.includes("taman")) return { icon: Trees, desc: "Taman hijau bersama" };
  if (n.includes("gym")) return { icon: Dumbbell, desc: "Ruang kebugaran" };
  return { icon: CheckCircle2, desc: "Fasilitas penunjang" };
}

/** Chip fasilitas (C-02): maksimal `max` + chip "+N". */
export function FacilityChips({ items, max = 4 }: { items: string[]; max?: number }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Fasilitas">
      {items.slice(0, max).map((f) => {
        const Icon = facilityMeta(f).icon;
        return (
          <li
            key={f}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200/60"
          >
            <Icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            {f}
          </li>
        );
      })}
      {items.length > max && (
        <li className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-semibold border border-slate-200/60">
          +{items.length - max}<span className="sr-only"> fasilitas lain</span>
        </li>
      )}
    </ul>
  );
}

/** Tile fasilitas (C-04) untuk halaman gedung & detail kamar. */
export function FacilityTile({ name }: { name: string }) {
  const { icon: Icon, desc } = facilityMeta(name);
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 hover:border-primary/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-sm text-slate-900">{name}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

/**
 * Foto dengan next/image (fill). Tanpa src → placeholder bermerek, bukan foto stok (PRD §4.8).
 * Parent wajib `relative` dan punya ukuran/aspect.
 */
export function Photo({
  src,
  alt,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
  className,
  priority,
}: {
  src?: string;
  alt: string;
  sizes?: string;
  className?: string;
  priority?: boolean;
}) {
  if (!src) {
    return (
      <div className="absolute inset-0 bg-slate-100 flex flex-col items-center justify-center gap-2 text-slate-500" role="img" aria-label={`${alt} — foto segera hadir`}>
        <Building2 className="w-10 h-10" aria-hidden="true" />
        <span className="text-xs font-semibold">Foto segera hadir</span>
      </div>
    );
  }
  return <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className={cn("object-cover", className)} />;
}
