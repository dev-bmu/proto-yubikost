import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, IdCard, MessageCircle } from "lucide-react";
import { TableWrap, td, th } from "@/components/admin/kit";
import { NikReveal } from "@/components/admin/people/NikReveal";
import { ResidentActions } from "@/components/admin/people/ResidentActions";
import { button, card, Notice, Pill } from "@/components/ui";
import { requireAdmin } from "@/lib/admin-guard";
import { PAYMENT_KIND_LABEL, PAYMENT_STATUS, paymentRef } from "@/lib/constants";
import { all } from "@/lib/db";
import { formatDate, formatPhone, leaseStatus, maskNik, rupiah } from "@/lib/format";
import { can } from "@/lib/perm";
import { residentDetail } from "@/lib/queries";
import { waChat } from "@/lib/wa";

export const metadata = { title: "Detail Penghuni" };

const SOURCE_LABEL: Record<string, string> = {
  catalog: "Daftar mandiri (katalog)",
  direct_add: "Direct Add (penghuni lama)",
};

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 mt-0.5 break-words">{children || "-"}</dd>
    </div>
  );
}

export default async function PenghuniDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const data = residentDetail(id);
  if (!data) notFound();
  const { member, profile, leases, payments } = data;
  const active = leases.find((l) => l.status === "ACTIVE");
  const adminName = new Map(all("admins").map((a) => [a.id, a.name]));
  const canKtp = can(admin.role, "residents.ktp");
  const occupation = profile?.occupation ? profile.occupation.charAt(0) + profile.occupation.slice(1).toLowerCase() : "";

  return (
    <div className="space-y-6">
      <Link href="/admin/penghuni" className={button("ghost", "sm", "-ml-3 min-h-11 sm:min-h-9")}>
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Kembali ke Penghuni
      </Link>

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{member.name}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {active?.room && active.kost ? `Kamar ${active.room.number} · ${active.kost.name}` : "Tidak ada sewa aktif"}
          </p>
        </div>
        <ResidentActions
          memberId={member.id}
          memberName={member.name}
          lease={
            active && {
              id: active.id,
              startDate: active.startDate,
              dueDate: active.dueDate,
              roomNumber: active.room?.number ?? "-",
              kostName: active.kost?.name ?? "-",
            }
          }
          canDue={can(admin.role, "renewals.verify")}
          canEnd={can(admin.role, "lease.end")}
          canReset={can(admin.role, "members.reset")}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <section className={card(false, "p-5 space-y-4")} aria-labelledby="identitas">
          <h2 id="identitas" className="font-bold text-slate-900">Akun</h2>
          <dl className="space-y-3">
            <Item label="Nama">{member.name}</Item>
            <Item label="WhatsApp">
              <span className="flex flex-wrap items-center gap-2">
                <span className="tabular-nums">{formatPhone(member.whatsapp)}</span>
                <a href={waChat(member.whatsapp)} target="_blank" rel="noopener noreferrer" className={button("whatsapp", "sm", "min-h-11 sm:min-h-9")} aria-label={`Chat WhatsApp ${member.name}`}>
                  <MessageCircle className="w-4 h-4" aria-hidden="true" /> Chat
                </a>
              </span>
            </Item>
            <Item label="Email">{member.email}</Item>
            <Item label="Peran">
              <Pill tone={member.role === "RESIDENT" ? "success" : "neutral"}>{member.role === "RESIDENT" ? "Resident" : "Prospect"}</Pill>
            </Item>
            <Item label="Sumber akun">{SOURCE_LABEL[member.source] ?? member.source}</Item>
            <Item label="Kata sandi">
              {member.mustChangePassword ? <Pill tone="warning">Wajib ganti kata sandi</Pill> : <Pill tone="neutral">Sudah diganti</Pill>}
            </Item>
            <Item label="Terdaftar">{formatDate(member.createdAt)}</Item>
          </dl>
        </section>

        <section className={card(false, "p-5 space-y-4 lg:col-span-2")} aria-labelledby="biodata">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="biodata" className="font-bold text-slate-900">Biodata</h2>
            {profile && canKtp && (
              <a href={`/admin/ktp/${member.id}`} target="_blank" rel="noopener noreferrer" className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                <IdCard className="w-4 h-4" aria-hidden="true" /> Lihat Foto KTP
                <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="sr-only">(tab baru, tercatat di audit log)</span>
              </a>
            )}
          </div>
          {profile && !canKtp ? (
            // PRD §3.3: biodata lengkap & KTP hanya untuk SUPER_ADMIN, MANAGER, OPERATIONAL, LEGAL — data tidak dikirim ke peran lain
            <>
              <dl className="grid sm:grid-cols-2 gap-4">
                <Item label="Status biodata"><Pill tone="success">Lengkap</Pill></Item>
                <Item label="Pekerjaan">{occupation}</Item>
                <Item label="Institusi">{profile.institution}</Item>
              </dl>
              <Notice tone="info">Biodata lengkap (NIK, alamat KTP, kontak wali) hanya dapat dilihat peran Super Admin, Manager, Operasional, dan Legal.</Notice>
            </>
          ) : profile ? (
            <dl className="grid sm:grid-cols-2 gap-4">
              <Item label="Nama sesuai KTP">{profile.fullNameKtp}</Item>
              <Item label="NIK">
                <NikReveal memberId={member.id} masked={maskNik(profile.nik)} allowed={canKtp} />
              </Item>
              <div className="sm:col-span-2">
                <Item label="Alamat sesuai KTP">{profile.ktpAddress}</Item>
              </div>
              <Item label="Pekerjaan">{occupation}</Item>
              <Item label="Institusi">{profile.institution}</Item>
              <Item label="Fakultas">{profile.faculty}</Item>
              <Item label="Program studi">{profile.studyProgram}</Item>
              <Item label="Nama wali">
                {profile.guardianName}
                {profile.guardianRelation && <span className="text-slate-500"> ({profile.guardianRelation})</span>}
              </Item>
              <Item label="WhatsApp wali">{profile.guardianWhatsapp && formatPhone(profile.guardianWhatsapp)}</Item>
              <Item label="Persetujuan data">{formatDate(profile.consentAt)}</Item>
            </dl>
          ) : (
            <Notice tone="warning">
              Penghuni belum melengkapi biodata. Menu penghuni di Dashboard Customer tertahan sampai biodata dan foto KTP diisi.
            </Notice>
          )}
        </section>
      </div>

      <section aria-labelledby="riwayat-sewa" className="space-y-3">
        <h2 id="riwayat-sewa" className="font-bold text-slate-900">Riwayat sewa</h2>
        <TableWrap caption="Riwayat sewa penghuni">
          <thead>
            <tr>
              <th scope="col" className={th}>Kamar &amp; Kost</th>
              <th scope="col" className={th}>Mulai</th>
              <th scope="col" className={th}>Jatuh tempo</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Dibuat oleh</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leases.map((l) => {
              const due = leaseStatus(l.dueDate);
              return (
                <tr key={l.id}>
                  <td className={td}>
                    <p className="font-semibold text-slate-800">Kamar {l.room?.number ?? "-"}</p>
                    <p className="text-xs text-slate-500">{l.kost?.name ?? "-"}</p>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(l.startDate, "short")}</td>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(l.dueDate, "short")}</td>
                  <td className={td}>
                    {l.status === "ACTIVE" ? (
                      <Pill tone={due.tone}>{due.label}</Pill>
                    ) : (
                      <>
                        <Pill tone="neutral">Berakhir</Pill>
                        {l.endedAt && <p className="text-xs text-slate-500 mt-1">{formatDate(l.endedAt, "short")}</p>}
                      </>
                    )}
                  </td>
                  <td className={td}>{adminName.get(l.createdBy) ?? (l.createdBy || "-")}</td>
                </tr>
              );
            })}
            {!leases.length && (
              <tr>
                <td colSpan={5} className={`${td} text-center py-8 text-slate-500`}>Belum pernah menyewa.</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </section>

      <section aria-labelledby="riwayat-perpanjangan" className="space-y-3">
        <h2 id="riwayat-perpanjangan" className="font-bold text-slate-900">Riwayat pembayaran</h2>
        <TableWrap caption="Riwayat pembayaran (sewa baru & perpanjangan)">
          <thead>
            <tr>
              <th scope="col" className={th}>Dibuat</th>
              <th scope="col" className={th}>Jenis · Paket</th>
              <th scope="col" className={th}>Nominal</th>
              <th scope="col" className={th}>Kode ref</th>
              <th scope="col" className={th}>Status</th>
              <th scope="col" className={th}>Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((r) => {
              const s = PAYMENT_STATUS[r.status] ?? { label: r.status, tone: "neutral" as const };
              return (
                <tr key={r.id}>
                  <td className={`${td} whitespace-nowrap`}>{formatDate(r.createdAt, "short")}</td>
                  <td className={td}>{PAYMENT_KIND_LABEL[r.kind] ?? r.kind} · {r.months} bulan</td>
                  <td className={`${td} tabular-nums whitespace-nowrap`}>{rupiah(r.amount)}</td>
                  <td className={`${td} font-mono`}>{paymentRef(r.id)}</td>
                  <td className={td}>
                    <Pill tone={s.tone}>{s.label}</Pill>
                    {r.verifiedBy && (
                      <p className="text-xs text-slate-500 mt-1">
                        {adminName.get(r.verifiedBy) ?? r.verifiedBy} · {formatDate(r.verifiedAt, "short")}
                      </p>
                    )}
                  </td>
                  <td className={td}>{r.note || "-"}</td>
                </tr>
              );
            })}
            {!payments.length && (
              <tr>
                <td colSpan={6} className={`${td} text-center py-8 text-slate-500`}>Belum ada pembayaran.</td>
              </tr>
            )}
          </tbody>
        </TableWrap>
      </section>
    </div>
  );
}
