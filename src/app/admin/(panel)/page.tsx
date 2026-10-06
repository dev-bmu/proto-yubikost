// Dashboard admin (PRD §9.2) — KPI + chart; semua mengikuti filter gedung & periode. Angka absolut, tanpa persentase okupansi.
import type { ReactNode } from "react";
import Link from "next/link";
import {
  AlertTriangle, CalendarClock, CheckCircle2, ChevronRight, Clock, DoorClosed, DoorOpen, FileClock, Minus, PartyPopper,
  TrendingDown, TrendingUp, UserCheck, UserPlus, Users, Wallet, XCircle, type LucideIcon,
} from "lucide-react";
import { ChartCard, ChartEmpty } from "@/components/admin/charts/ChartCard";
import { Donut, GroupedColumns, HBarStack, Sparkline, StackedColumns } from "@/components/admin/charts/charts";
import { SERIES, STATUS, TRACK } from "@/components/admin/charts/palette";
import { juta } from "@/components/admin/charts/scale";
import { PageHeader, TableWrap, td, th } from "@/components/admin/kit";
import { KostFilter } from "@/components/admin/ops/KostFilter";
import { Select } from "@/components/Field";
import { Pill, button, card, kostTypeClass } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { dashboardData, PERIODS } from "@/lib/analytics";
import { all } from "@/lib/db";
import { cn, formatDate, initials, rupiah } from "@/lib/format";
import { can } from "@/lib/perm";

const compactRp = (n: number) => (n >= 1e6 ? `Rp ${juta(n)}` : rupiah(n));
const total = (xs: number[]) => xs.reduce((s, x) => s + x, 0);

function Kpi({ icon: Icon, label, value, sub, href, tone = "primary", title, compact, children }: {
  icon: LucideIcon; label: string; value: ReactNode; sub?: ReactNode; href?: string;
  tone?: "primary" | "success" | "warning" | "danger"; title?: string; compact?: boolean; children?: ReactNode;
}) {
  // Tile ikon C-22
  const tones = {
    primary: "bg-primary/10 text-primary",
    success: "bg-emerald-100 text-emerald-700",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
  };
  const body = (
    <>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-slate-500">{label}</p>
        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl sm:h-10 sm:w-10", tones[tone])} aria-hidden="true">
          <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
        </span>
      </div>
      {/* compact: nilai rupiah panjang tetap muat di tile sempit (ponsel & lg 4 kolom) */}
      <p
        className={cn("mt-1 whitespace-nowrap font-extrabold tracking-tight tabular-nums text-slate-900", compact ? "text-xl sm:text-2xl lg:text-xl xl:text-3xl" : "text-2xl sm:text-3xl")}
        title={title}
      >
        {value}
      </p>
      {sub && (
        <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
          <div className="min-w-0 flex-1">{sub}</div>
          {href && <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-primary" aria-hidden="true" />}
        </div>
      )}
      {children}
    </>
  );
  return href ? (
    <Link href={href} className={card(true, "group block p-4 sm:p-5")}>{body}</Link>
  ) : (
    <div className={card(false, "p-4 sm:p-5")}>{body}</div>
  );
}

/** "Lewat 3 hari" / "4 hari lagi" — versi ringkas leaseStatus untuk daftar sempit. */
const dueText = (days: number) => (days < 0 ? `Lewat ${-days} hari` : days === 0 ? "Hari ini" : `${days} hari lagi`);

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ kost?: string; periode?: string }> }) {
  const { role } = await requireAdmin();
  const { kost, periode } = await searchParams;
  const kosts = all("kosts").map(({ id, name }) => ({ id, name }));
  const kostId = kosts.some((k) => k.id === kost) ? kost : undefined;
  const kostName = kosts.find((k) => k.id === kostId)?.name;
  const months = PERIODS.find((p) => String(p) === periode) ?? 6;
  const periodLabel = `${months} bulan terakhir`;
  const d = dashboardData(kostId, months);
  const { kpi } = d;
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const delta = kpi.revenueNow - kpi.revenuePrev;
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  // Warna seri per PRD §4.2.8 (urutan tetap: seri 1 → 2)
  const revSeries = [{ name: "Sewa baru", color: SERIES[0] }, { name: "Perpanjangan", color: SERIES[1] }];
  const revTotals = d.revenue.map((r) => r.baru + r.perpanjangan);
  const occSeries = [{ name: "Terisi", color: SERIES[0] }, { name: "Dipesan", color: SERIES[1] }, { name: "Kosong", color: TRACK }];
  const leadSeries = [{ name: "Pendaftar baru", color: SERIES[0] }, { name: "Jadi penghuni", color: SERIES[1] }];
  const ps = d.paymentStatus;
  const pay = "/admin/pembayaran?status=";
  const statusItems = [
    { name: "Disetujui", value: ps.approved, color: STATUS.good, icon: CheckCircle2, text: "text-emerald-700", href: `${pay}riwayat` },
    { name: "Menunggu verifikasi", value: ps.pending, color: STATUS.warning, icon: Clock, text: "text-amber-700", href: `${pay}verifikasi` },
    { name: "Ditolak", value: ps.rejected, color: STATUS.critical, icon: XCircle, text: "text-red-700", href: `${pay}riwayat` },
  ];
  const dueTotal = total(d.dueWeeks.map((w) => w.count));
  const roomsHref = kostId ? `/admin/kost/${kostId}` : "/admin/kost";
  const canLeads = can(role, "leads.manage");

  // Tiap butir hanya untuk role yang berhak menindaklanjuti (PRD §9.2)
  const todos = [
    { show: canLeads, href: "/admin/leads", icon: UserPlus, label: "Lead baru", hint: "belum dihubungi", count: d.todos.newLeads },
    { show: can(role, "payments.verify"), href: `${pay}verifikasi`, icon: FileClock, label: "Bukti pembayaran", hint: "menunggu verifikasi", count: d.todos.pendingProofs },
    { show: can(role, "payments.verify") || can(role, "leads.assign"), href: `${pay}belum-bayar`, icon: Wallet, label: "Belum dibayar", hint: "pesanan menunggu pembayaran customer", count: d.todos.unpaid },
    { show: true, href: "/admin/penghuni", icon: CalendarClock, label: "Jatuh tempo", hint: "≤ 14 hari atau sudah lewat", count: d.todos.dueSoon },
  ].filter((t) => t.show);
  const todoCount = total(todos.map((t) => t.count));
  const sumCol = (k: "total" | "occupied" | "reserved" | "residents" | "revenue") => total(d.perKost.map((r) => r[k]));

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={<>{today} · {kostName ?? "Semua gedung"} · data sistem real-time</>}
      />

      <KostFilter action="/admin" kosts={kosts} value={kostId ?? ""} allowAll>
        <Select label="Periode" name="periode" defaultValue={String(months)} className="min-w-0 flex-1 sm:w-52 sm:flex-none">
          {PERIODS.map((p) => (
            <option key={p} value={p}>{p} bulan terakhir</option>
          ))}
        </Select>
      </KostFilter>

      <section aria-labelledby="kpi-heading" className="mb-6">
        <h2 id="kpi-heading" className="sr-only">Ringkasan angka</h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi icon={DoorOpen} label="Total kamar" value={kpi.total} href={roomsHref} sub={`di ${kpi.kostCount} gedung`} />
          <Kpi icon={UserCheck} label="Terisi" value={kpi.occupied} href={roomsHref} sub="kamar berpenghuni" />
          <Kpi icon={DoorClosed} label="Kosong" value={kpi.available} href={roomsHref} tone="success" sub={kpi.reserved ? `+ ${kpi.reserved} sedang dipesan` : "tidak ada yang dipesan"} />
          <Kpi icon={Users} label="Penghuni aktif" value={kpi.residents} href="/admin/penghuni" sub="sewa berjalan" />
          <Kpi
            icon={Wallet}
            label="Pendapatan bulan ini"
            tone="success"
            href={`${pay}riwayat`}
            value={<><span className="mr-1 text-base font-bold text-slate-500">Rp</span>{kpi.revenueNow >= 1e6 ? juta(kpi.revenueNow) : kpi.revenueNow.toLocaleString("id-ID")}</>}
            title={rupiah(kpi.revenueNow)}
            compact={kpi.revenueNow >= 1000}
            sub={
              <>
                <span className={cn("whitespace-nowrap font-semibold", delta > 0 ? "text-emerald-700" : delta < 0 ? "text-red-700" : "text-slate-600")}>
                  <DeltaIcon className="mr-0.5 inline h-3.5 w-3.5 align-[-2px]" aria-hidden="true" />
                  {delta === 0 ? "sama" : `${delta > 0 ? "naik" : "turun"} ${compactRp(Math.abs(delta))}`}
                </span>{" "}
                {delta === 0 ? "dengan" : "dari"} <span className="whitespace-nowrap">{kpi.prevLabel}</span>
              </>
            }
          >
            <div className="mt-2"><Sparkline values={revTotals} color={SERIES[0]} /></div>
          </Kpi>
          <Kpi
            icon={FileClock}
            label="Bukti menunggu verifikasi"
            value={kpi.pendingProofs}
            href={`${pay}verifikasi`}
            tone="warning"
            sub={kpi.pendingProofs ? "perlu dicek Finance" : "antrean kosong"}
          />
          <Kpi icon={UserPlus} label="Lead baru (30 hari)" value={kpi.newLeads30} href={canLeads ? "/admin/leads" : undefined} sub="pendaftar akun baru" />
          <Kpi
            icon={CalendarClock}
            label="Jatuh tempo ≤ 14 hari"
            value={kpi.dueSoon}
            href="/admin/penghuni"
            tone={kpi.overdue ? "danger" : "warning"}
            sub={kpi.overdue ? `termasuk ${kpi.overdue} lewat jatuh tempo` : "penghuni aktif"}
          />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-3">
        <ChartCard
          title="Pendapatan terverifikasi per bulan"
          subtitle={`Bukti disetujui, menurut tanggal verifikasi · ${periodLabel} · Rp juta`}
          legend={revSeries.map((s, i) => ({ ...s, value: compactRp(total(d.revenue.map((r) => (i ? r.perpanjangan : r.baru)))) }))}
          className="xl:col-span-2"
          aside={
            <div>
              <p className="text-xs text-slate-500">Total periode</p>
              <p className="text-lg font-extrabold text-slate-900">{rupiah(total(revTotals))}</p>
            </div>
          }
          table={{
            head: ["Bulan", "Sewa baru", "Perpanjangan", "Total"],
            rows: d.revenue.map((r, i) => [r.title, rupiah(r.baru), rupiah(r.perpanjangan), rupiah(revTotals[i])]),
          }}
        >
          {total(revTotals) ? (
            <StackedColumns
              categories={d.revenue.map((r) => r.label)}
              titles={d.revenue.map((r) => r.title)}
              series={revSeries}
              values={d.revenue.map((r) => [r.baru, r.perpanjangan])}
              unit="rupiah"
            />
          ) : (
            <ChartEmpty>Belum ada pembayaran terverifikasi pada periode ini.</ChartEmpty>
          )}
        </ChartCard>

        <section aria-labelledby="todo-heading" className={card(false, "min-w-0 p-5 sm:p-6")}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 id="todo-heading" className="text-base font-bold text-slate-900">Butuh tindakan</h2>
              <p className="mt-0.5 text-sm text-slate-500">{kostName ?? "Semua gedung"}</p>
            </div>
            <Pill tone={todoCount ? "warning" : "success"} className="tabular-nums">{todoCount ? `${todoCount} item` : "Beres"}</Pill>
          </div>
          {todoCount === 0 && (
            <p className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
              <PartyPopper className="h-4 w-4 shrink-0" aria-hidden="true" /> Tidak ada pekerjaan tertunda.
            </p>
          )}
          <ul className="mt-4 space-y-2">
            {todos.map(({ href, icon: Icon, label, hint, count }) => (
              <li key={href}>
                <Link href={href} className="group flex min-h-14 items-center gap-3 rounded-xl border border-slate-200/80 p-3 transition-colors hover:border-primary/40 hover:bg-primary-ultralight">
                  <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", count ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-500")} aria-hidden="true">
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1 leading-snug">
                    <span className="block text-sm font-semibold text-slate-800">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                  <span className={cn("min-w-8 rounded-full px-2 py-0.5 text-center text-sm font-bold tabular-nums", count ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600")}>{count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <ChartCard
          title="Leads & konversi per bulan"
          subtitle={`Pendaftar baru vs penghuni yang mulai sewa · ${periodLabel}`}
          legend={leadSeries.map((s, i) => ({ ...s, value: String(total(d.leads.map((l) => (i ? l.converted : l.prospects)))) }))}
          className="xl:col-span-2"
          table={{ head: ["Bulan", "Pendaftar baru", "Jadi penghuni"], rows: d.leads.map((l) => [l.title, l.prospects, l.converted]) }}
        >
          {total(d.leads.map((l) => l.prospects + l.converted)) ? (
            <GroupedColumns
              categories={d.leads.map((l) => l.label)}
              titles={d.leads.map((l) => l.title)}
              series={leadSeries}
              values={d.leads.map((l) => [l.prospects, l.converted])}
              unit="count"
            />
          ) : (
            <ChartEmpty>Belum ada pendaftar atau penghuni baru pada periode ini.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard
          title="Status pembayaran"
          subtitle={`Bukti yang dikirim · ${periodLabel}`}
          table={{ head: ["Status", "Jumlah bukti"], rows: statusItems.map((s) => [s.name, s.value]) }}
        >
          <div className="flex flex-col items-center gap-5 sm:flex-row xl:flex-col">
            <Donut items={statusItems.map(({ name, value, color }) => ({ name, value, color }))} caption="bukti" />
            {/* Legenda berangka; tiap baris membuka tab Pembayaran terkait (§9.7) */}
            <ul className="w-full space-y-2">
              {statusItems.map((s) => (
                <li key={s.name}>
                  <Link href={s.href} className="group flex min-h-11 items-center gap-2.5 rounded-xl bg-slate-50 px-3 py-2.5 transition-colors hover:bg-primary-ultralight">
                    <span className="h-3 w-3 shrink-0 rounded-[3px]" style={{ background: s.color }} aria-hidden="true" />
                    <s.icon className={cn("h-4 w-4 shrink-0", s.text)} aria-hidden="true" />
                    <span className="flex-1 text-sm text-slate-700">{s.name}</span>
                    <span className="text-sm font-bold tabular-nums text-slate-900">{s.value}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-primary" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </ChartCard>

        <ChartCard
          title={kostId ? "Okupansi per tipe kamar" : "Okupansi per gedung"}
          subtitle={kostId ? `${kostName} · jumlah kamar saat ini` : "Jumlah kamar saat ini · klik nama gedung untuk mengelola"}
          legend={occSeries.map((s, i) => ({ ...s, value: String(total(d.occupancy.map((o) => [o.occupied, o.reserved, o.free][i]))) }))}
          className="xl:col-span-3"
          table={{
            head: [kostId ? "Tipe kamar" : "Gedung", "Terisi", "Dipesan", "Kosong (belum dipesan)", "Total"],
            rows: d.occupancy.map((o) => [o.name, o.occupied, o.reserved, o.free, o.total]),
          }}
        >
          {d.occupancy.length ? (
            <HBarStack rows={d.occupancy.map((o) => ({ id: o.id, name: o.name, href: o.href, values: [o.occupied, o.reserved, o.free] }))} series={occSeries} />
          ) : (
            <ChartEmpty>Gedung ini belum memiliki tipe kamar.</ChartEmpty>
          )}
        </ChartCard>

        <ChartCard
          title="Jatuh tempo 30 hari ke depan"
          subtitle="Penghuni aktif per minggu (mulai hari ini) dan 5 jatuh tempo terdekat"
          className="xl:col-span-3"
          table={{ head: ["Minggu", "Penghuni"], rows: d.dueWeeks.map((w) => [w.title, w.count]) }}
        >
          <div className="grid flex-1 gap-6 lg:grid-cols-2 lg:gap-8">
            <div className="flex min-w-0 flex-col">
              {kpi.overdue > 0 && (
                <p className="mb-3 flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">
                  <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {kpi.overdue} penghuni sudah lewat jatuh tempo
                </p>
              )}
              {dueTotal ? (
                <StackedColumns
                  categories={d.dueWeeks.map((w) => w.label)}
                  titles={d.dueWeeks.map((w) => w.title)}
                  series={[{ name: "penghuni jatuh tempo", color: SERIES[0] }]}
                  values={d.dueWeeks.map((w) => [w.count])}
                  unit="count"
                  height={160}
                />
              ) : (
                <ChartEmpty>Tidak ada jatuh tempo dalam 30 hari ke depan.</ChartEmpty>
              )}
            </div>
            {d.dueList.length > 0 && (
              <div className="min-w-0">
                <h3 className="mb-1 text-sm font-bold text-slate-900">Paling dekat</h3>
                <ul className="divide-y divide-slate-100">
                  {d.dueList.map((r) => (
                    <li key={r.leaseId}>
                      <Link href={`/admin/penghuni/${r.memberId}`} className="-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-slate-50">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary" aria-hidden="true">
                          {initials(r.name)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{r.name}</span>
                          <span className="block truncate text-xs text-slate-500">{r.room} · {r.kost}</span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-xs font-semibold text-slate-700">{formatDate(r.dueDate, "short")}</span>
                          <Pill tone={r.status.tone} className="mt-0.5">{dueText(r.status.days)}</Pill>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ChartCard>

        <section aria-labelledby="gedung-heading" className="min-w-0 xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2 id="gedung-heading" className="text-base font-bold text-slate-900">Ringkasan per gedung</h2>
              <p className="text-sm text-slate-500">Angka kamar saat ini · pendapatan {periodLabel}</p>
            </div>
            <Link href="/admin/kost" className={button("ghost", "md")}>Kelola kost <ChevronRight className="h-4 w-4" aria-hidden="true" /></Link>
          </div>
          <TableWrap caption="Ringkasan kamar, penghuni, dan pendapatan per gedung kost">
            <thead>
              <tr>
                <th scope="col" className={th}>Gedung</th>
                <th scope="col" className={th}>Tipe</th>
                <th scope="col" className={cn(th, "text-right")}>Total</th>
                <th scope="col" className={cn(th, "text-right")}>Terisi</th>
                <th scope="col" className={cn(th, "text-right")}>Kosong</th>
                <th scope="col" className={cn(th, "text-right")}>Dipesan</th>
                <th scope="col" className={cn(th, "text-right")}>Penghuni</th>
                <th scope="col" className={cn(th, "text-right")}>Pendapatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {d.perKost.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50">
                  <td className={td}>
                    <Link href={`/admin/kost/${k.id}`} className="font-semibold text-slate-900 hover:text-primary hover:underline">{k.name}</Link>
                    {!k.isPublished && <Pill tone="neutral" className="ml-2">Draf</Pill>}
                  </td>
                  <td className={td}>
                    <span className={cn("inline-block rounded-md px-2 py-0.5 text-xs font-bold", kostTypeClass(k.type))}>{k.type}</span>
                  </td>
                  <td className={cn(td, "text-right tabular-nums")}>{k.total}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{k.occupied}</td>
                  <td className={cn(td, "text-right font-semibold tabular-nums text-slate-900")}>{k.total - k.occupied}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{k.reserved}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{k.residents}</td>
                  <td className={cn(td, "text-right tabular-nums")}>{rupiah(k.revenue)}</td>
                </tr>
              ))}
            </tbody>
            {d.perKost.length > 1 && (
              <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                <tr>
                  <th scope="row" colSpan={2} className={cn(td, "text-left font-bold text-slate-900")}>Total</th>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{sumCol("total")}</td>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{sumCol("occupied")}</td>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{sumCol("total") - sumCol("occupied")}</td>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{sumCol("reserved")}</td>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{sumCol("residents")}</td>
                  <td className={cn(td, "text-right font-bold tabular-nums text-slate-900")}>{rupiah(sumCol("revenue"))}</td>
                </tr>
              </tfoot>
            )}
          </TableWrap>
        </section>
      </div>
    </>
  );
}
