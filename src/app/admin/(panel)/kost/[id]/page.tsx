// Subpage gedung (PRD §9.3, v1.2): banner, KPI, dan tab Ringkasan | Tipe Kamar | Kamar | Penghuni | Info Gedung.
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft, CalendarClock, ChevronRight, DoorClosed, DoorOpen, ExternalLink, EyeOff, Globe, Layers, ListPlus, MapPin, Pencil,
  ReceiptText, UserCheck, Users, Wallet,
} from "lucide-react";
import { TableWrap, td, th } from "@/components/admin/kit";
import { FloorPlan } from "@/components/admin/kost/FloorPlan";
import { KostForm } from "@/components/admin/kost/KostForm";
import { KostTabs } from "@/components/admin/kost/KostTabs";
import { KpiStrip, OccupancyBar } from "@/components/admin/kost/parts";
import { RoomsTab } from "@/components/admin/kost/RoomsTab";
import { RoomTypesTab } from "@/components/admin/kost/RoomTypesTab";
import { Photo } from "@/components/media";
import { button, card, kostTypeClass, Notice, Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { BOOKING_STATUS, bookingStatusLabel } from "@/lib/constants";
import { byId } from "@/lib/db";
import { cn, formatDate, formatDateTime, formatPhone, leaseStatus, rupiah } from "@/lib/format";
import { kostAdminDetail } from "@/lib/kost-admin";
import { can } from "@/lib/perm";

const TABS = ["ringkasan", "tipe", "kamar", "penghuni", "info"] as const;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  return { title: byId("kosts", (await params).id)?.name ?? "Gedung tidak ditemukan" };
}

export default async function KostDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; baru?: string }>;
}) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { tab: raw, baru } = await searchParams;
  const data = kostAdminDetail(id);
  if (!data) notFound();
  const { kost, counts, types, rooms, residents, revenue, revenuePrev } = data;
  const tab = (TABS as readonly string[]).includes(raw ?? "") ? raw! : "ringkasan";
  const canManage = can(admin.role, "rooms.manage");
  const startPrice = types.length ? Math.min(...types.map((t) => t.monthlyPrice)) : 0;
  const typeName = new Map(types.map((t) => [t.id, t.name]));
  const orders = rooms.filter((r) => r.status === "RESERVED" && r.bookingStatus);
  const floors = Math.max(kost.totalFloors, 1);

  return (
    <div className="space-y-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-slate-500 -mt-1">
        <Link href="/admin/kost" className="inline-flex items-center gap-1.5 min-h-11 sm:min-h-0 font-semibold hover:text-primary">
          <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Kost &amp; Kamar
        </Link>
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
        <span className="text-slate-900 font-medium truncate max-w-xs" aria-current="page">{kost.name}</span>
      </nav>

      {baru && (
        <Notice tone="success">
          <span role="status"><strong>Gedung dibuat.</strong> Lanjutkan dengan menambah tipe kamar, lalu tambah kamar sekaligus.</span>
        </Notice>
      )}
      {!canManage && (
        <Notice tone="info">
          <strong>Mode lihat saja.</strong> Perubahan gedung, tipe, dan kamar dilakukan Super Admin, Manager, atau Operasional.
        </Notice>
      )}

      <header className="relative rounded-3xl overflow-hidden min-h-64 sm:min-h-72 flex items-end shadow-card on-purple gradient-hero">
        {kost.photos[0] && <Photo src={kost.photos[0]} alt={`Foto sampul ${kost.name}`} sizes="(min-width: 1280px) 1200px, 100vw" priority />}
        <div className="absolute inset-0 bg-gradient-to-t from-hero-deep via-hero-deep/75 to-hero-deep/10" aria-hidden="true" />
        <div className="relative w-full p-5 sm:p-8 flex flex-col lg:flex-row lg:items-end justify-between gap-5 text-white">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25", kostTypeClass(kost.type))}>{kost.type}</span>
              <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold shadow-lg shadow-black/25 text-white", kost.isPublished ? "bg-emerald-700" : "bg-slate-800")}>
                {kost.isPublished ? <Globe className="w-3.5 h-3.5" aria-hidden="true" /> : <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />}
                {kost.isPublished ? "Tampil di katalog" : "Disembunyikan"}
              </span>
              <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-white/15 border border-white/25 text-white backdrop-blur-sm">
                {kost.totalFloors || "-"} lantai · {types.length} tipe
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight mt-3">{kost.name}</h1>
            <p className="text-sm text-white mt-2 flex items-start gap-1.5 max-w-2xl">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-accent" aria-hidden="true" />
              <span><strong className="font-semibold">{kost.area}</strong> · {kost.address}</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {kost.isPublished && (
              <a href={`/kost/${kost.slug}`} target="_blank" rel="noopener" className={button("glass")}>
                Lihat di situs <ExternalLink className="w-4 h-4" aria-hidden="true" />
                <span className="sr-only">(tab baru)</span>
              </a>
            )}
            <Link href={`/admin/kost/${kost.id}?tab=info`} scroll={false} className={button("accent")}>
              <Pencil className="w-4 h-4" aria-hidden="true" /> {canManage ? "Edit Info" : "Lihat Info"}
            </Link>
          </div>
        </div>
      </header>

      <KpiStrip
        items={[
          { label: "Total Kamar", value: counts.total, icon: <DoorOpen className="w-4 h-4" /> },
          { label: "Terisi", value: counts.occupied, icon: <UserCheck className="w-4 h-4" /> },
          { label: "Dipesan", value: counts.reserved, icon: <CalendarClock className="w-4 h-4" />, tone: "warning" },
          { label: "Kosong", value: counts.available, icon: <DoorClosed className="w-4 h-4" />, tone: "success" },
          { label: "Penghuni Aktif", value: residents.length, icon: <Users className="w-4 h-4" />, tone: "slate" },
          { label: "Harga Mulai", value: startPrice ? rupiah(startPrice) : "-", icon: <Wallet className="w-4 h-4" />, tone: "slate" },
          { label: "Pendapatan Bulan Ini", value: rupiah(revenue), hint: `Bulan lalu ${rupiah(revenuePrev)}`, icon: <ReceiptText className="w-4 h-4" />, tone: "success" },
        ]}
      />

      <div>
        <KostTabs
          kostId={kost.id}
          active={tab}
          tabs={[
            { key: "ringkasan", label: "Ringkasan" },
            { key: "tipe", label: "Tipe Kamar", count: types.length },
            { key: "kamar", label: "Kamar", count: rooms.length },
            { key: "penghuni", label: "Penghuni", count: residents.length },
            { key: "info", label: "Info Gedung" },
          ]}
        />

        <div role="tabpanel" id="panel-gedung" aria-labelledby={`tab-${tab}`}>
          {tab === "ringkasan" && (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <section aria-labelledby="denah" className={card(false, "p-5 sm:p-6 xl:col-span-2")}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 id="denah" className="text-lg font-bold text-slate-900">Denah Kamar</h2>
                    <p className="text-sm text-slate-500">Lantai teratas di atas. Klik kamar untuk melihat detail.</p>
                  </div>
                  {canManage && (
                    <Link href={`/admin/kost/${kost.id}?tab=kamar`} scroll={false} className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                      <ListPlus className="w-4 h-4" aria-hidden="true" /> Kelola kamar
                    </Link>
                  )}
                </div>
                {rooms.length || types.length ? (
                  <FloorPlan kostId={kost.id} rooms={rooms} totalFloors={floors} />
                ) : (
                  <ol className="space-y-3">
                    {[
                      { n: 1, title: "Buat tipe kamar", desc: "Nama, ukuran, harga, fasilitas, dan foto. Kamar bertipe sama berbagi foto.", href: "tipe" },
                      { n: 2, title: "Tambah kamar sekaligus", desc: "Pilih tipe, lantai, lalu rentang nomor, mis. A-01 sampai A-10.", href: "kamar" },
                      { n: 3, title: "Tampilkan di katalog", desc: "Aktifkan publikasi di Info Gedung setelah data lengkap.", href: "info" },
                    ].map((s) => (
                      <li key={s.n}>
                        <Link href={`/admin/kost/${kost.id}?tab=${s.href}`} scroll={false} className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-slate-200 hover:border-primary hover:bg-primary-ultralight transition-colors">
                          <span className="w-9 h-9 rounded-full bg-primary text-white font-bold flex items-center justify-center shrink-0">{s.n}</span>
                          <span className="flex-1">
                            <span className="block font-bold text-slate-900">{s.title}</span>
                            <span className="block text-sm text-slate-500">{s.desc}</span>
                          </span>
                          <ChevronRight className="w-5 h-5 text-primary" aria-hidden="true" />
                        </Link>
                      </li>
                    ))}
                  </ol>
                )}
              </section>

              <div className="space-y-6">
                <section aria-labelledby="per-tipe" className={card(false, "p-5")}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 id="per-tipe" className="text-base font-bold text-slate-900">Per Tipe Kamar</h2>
                    <Link href={`/admin/kost/${kost.id}?tab=tipe`} scroll={false} className="text-sm font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1 min-h-11 sm:min-h-0">
                      Kelola <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                  {types.length ? (
                    <ul className="space-y-4">
                      {types.map((t) => (
                        <li key={t.id} className="flex gap-3">
                          <span className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-100">
                            <Photo src={t.photos[0]} alt={`Foto tipe ${t.name}`} sizes="56px" />
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-2">
                              <p className="font-bold text-slate-900 leading-snug min-w-0 break-words">{t.name}</p>
                              <p className="text-sm font-extrabold text-primary tabular-nums shrink-0">{rupiah(t.monthlyPrice)}</p>
                            </div>
                            <p className="text-xs text-slate-500 mb-1.5">{t.size} · {t.total} kamar</p>
                            <OccupancyBar occupied={t.occupied} reserved={t.reserved} available={t.available} />
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500 flex items-center gap-2"><Layers className="w-4 h-4" aria-hidden="true" /> Belum ada tipe kamar.</p>
                  )}
                </section>

                <section aria-labelledby="jatuh-tempo" className={card(false, "p-5")}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 id="jatuh-tempo" className="text-base font-bold text-slate-900">Jatuh Tempo Terdekat</h2>
                    <Link href={`/admin/kost/${kost.id}?tab=penghuni`} scroll={false} className="text-sm font-bold text-primary hover:text-primary-dark inline-flex items-center gap-1 min-h-11 sm:min-h-0">
                      Semua <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                  {residents.length ? (
                    <ul className="divide-y divide-slate-100">
                      {residents.slice(0, 5).map(({ member, lease, room }) => {
                        const s = leaseStatus(lease.dueDate);
                        return (
                          <li key={lease.id} className="py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <Link href={`/admin/penghuni/${member.id}`} className="font-semibold text-slate-900 hover:text-primary truncate block">{member.name}</Link>
                              <p className="text-xs text-slate-500">Kamar {room.number} · {formatDate(lease.dueDate, "short")}</p>
                            </div>
                            <Pill tone={s.tone} className="shrink-0">{s.days < 0 ? `Lewat ${-s.days} hari` : s.days === 0 ? "Hari ini" : `${s.days} hari lagi`}</Pill>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-500">Belum ada penghuni aktif di gedung ini.</p>
                  )}
                </section>
              </div>
            </div>
          )}

          {tab === "tipe" && <RoomTypesTab kostId={kost.id} types={types} rooms={rooms} totalFloors={floors} canManage={canManage} />}

          {tab === "kamar" && <RoomsTab kostId={kost.id} rooms={rooms} types={types} totalFloors={floors} canManage={canManage} />}

          {tab === "penghuni" && (
            <div className="space-y-8">
              <section aria-labelledby="sewa-aktif" className="space-y-3">
                <h2 id="sewa-aktif" className="text-lg font-bold text-slate-900">Sewa aktif <span className="text-slate-500 font-semibold">· {residents.length}</span></h2>
                <TableWrap caption={`Penghuni dengan sewa aktif di ${kost.name}`}>
                  <thead>
                    <tr>
                      {["Nama", "Kamar", "Tipe", "Check-in", "Jatuh tempo", "Biodata"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {residents.map(({ member, lease, room, profile }) => {
                      const s = leaseStatus(lease.dueDate);
                      return (
                        <tr key={lease.id} className="hover:bg-slate-50/60">
                          <td className={td}>
                            <Link href={`/admin/penghuni/${member.id}`} className="font-semibold text-primary hover:underline">{member.name}</Link>
                            <p className="text-xs text-slate-500 tabular-nums">{formatPhone(member.whatsapp)}</p>
                          </td>
                          <td className={cn(td, "font-bold text-slate-900 tabular-nums")}>{room.number}</td>
                          <td className={td}>{typeName.get(room.typeId) ?? "-"}</td>
                          <td className={cn(td, "whitespace-nowrap tabular-nums")}>{formatDate(lease.startDate, "short")}</td>
                          <td className={td}>
                            <p className="whitespace-nowrap tabular-nums">{formatDate(lease.dueDate, "short")}</p>
                            <Pill tone={s.tone} className="mt-1">{s.label}</Pill>
                          </td>
                          <td className={td}>{profile ? <Pill tone="success">Lengkap</Pill> : <Pill tone="warning">Belum</Pill>}</td>
                        </tr>
                      );
                    })}
                    {!residents.length && (
                      <tr>
                        <td colSpan={6} className={cn(td, "text-center py-10 text-slate-500")}>Belum ada penghuni dengan sewa aktif di gedung ini.</td>
                      </tr>
                    )}
                  </tbody>
                </TableWrap>
              </section>

              <section aria-labelledby="pesanan-aktif" className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <h2 id="pesanan-aktif" className="text-lg font-bold text-slate-900">Pesanan aktif <span className="text-slate-500 font-semibold">· {orders.length}</span></h2>
                  <Link href="/admin/finance/konfirmasi" className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                    Buka Konfirmasi Pembayaran <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </Link>
                </div>
                <TableWrap caption={`Pesanan menunggu pembayaran atau verifikasi di ${kost.name}`}>
                  <thead>
                    <tr>
                      {["Customer", "Kamar", "Status", "Batas bayar", "Aksi"].map((h) => <th key={h} scope="col" className={th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((r) => {
                      const b = BOOKING_STATUS[r.bookingStatus];
                      const unpaid = r.bookingStatus === "MENUNGGU_PEMBAYARAN";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60">
                          <td className={cn(td, "font-semibold text-slate-900")}>{r.memberName || "-"}</td>
                          <td className={td}>
                            <p className="font-bold text-slate-900 tabular-nums">{r.number}</p>
                            <p className="text-xs text-slate-500">{r.typeName}</p>
                          </td>
                          <td className={td}>{b ? <Pill tone={b.tone}>{bookingStatusLabel({ stage: r.bookingStage, status: r.bookingStatus })}</Pill> : "-"}</td>
                          <td className={cn(td, "whitespace-nowrap")}>{unpaid ? formatDateTime(r.bookingExpires) : "Bukti terkirim"}</td>
                          <td className={td}>
                            <Link href={`/admin/finance/konfirmasi?status=${unpaid ? "belum-bayar" : "verifikasi"}`} className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                              {unpaid ? "Lihat pesanan" : "Verifikasi"} <ChevronRight className="w-4 h-4" aria-hidden="true" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {!orders.length && (
                      <tr>
                        <td colSpan={5} className={cn(td, "text-center py-10 text-slate-500")}>Tidak ada pesanan yang menunggu pembayaran atau verifikasi.</td>
                      </tr>
                    )}
                  </tbody>
                </TableWrap>
              </section>
            </div>
          )}

          {tab === "info" && (
            <KostForm
              id={kost.id}
              slug={kost.slug}
              roomCount={rooms.length}
              typeCount={types.length}
              readOnly={!canManage}
              initial={{
                name: kost.name,
                type: kost.type,
                area: kost.area,
                address: kost.address,
                totalFloors: String(kost.totalFloors || 1),
                description: kost.description,
                maps: kost.mapsEmbed,
                facilities: kost.facilities,
                photos: kost.photos,
                ownerName: kost.ownerName,
                ownerPhone: kost.ownerPhone ? formatPhone(kost.ownerPhone) : "",
                isPublished: kost.isPublished,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
