// Biodata wajib penghuni (PRD §8.5, v1.2): form 3 langkah bila belum diisi, tampilan hanya-baca bila sudah.
import { redirect } from "next/navigation";
import { GraduationCap, IdCard, Lock, MessageCircle, ShieldCheck, UserRound, Users, type LucideIcon } from "lucide-react";
import { PageHeader, ProgressSteps } from "@/components/customer/parts";
import { BiodataForm } from "@/components/portal/BiodataForm";
import { button, card, Pill } from "@/components/ui";
import { customerGuard } from "@/lib/customer-guard";
import { formatDate, formatPhone, maskNik } from "@/lib/format";
import { waCustomerCare } from "@/lib/wa";

export const metadata = { title: "Biodata" };

export default async function BiodataPage() {
  const ctx = await customerGuard("/dashboard/biodata", { allowNoProfile: true });
  const { resident, profile, member } = ctx;

  // Prospect belum punya biodata (PRD §8.1 butir 4).
  if (!resident) redirect("/dashboard");

  if (!profile) {
    return (
      <div className="space-y-8">
        <PageHeader icon={IdCard} title="Lengkapi Biodata">
          Selamat, sewa Kamar {resident.room.number} · {resident.kost.name} sudah aktif. Biodata wajib diisi sekali sebelum memakai menu penghuni.
        </PageHeader>
        <ProgressSteps current={4} />
        <div className="grid xl:grid-cols-[minmax(0,1fr)_300px] gap-8 items-start">
          <div className={card(false, "p-6 sm:p-8")}>
            <BiodataForm />
          </div>
          <aside className="space-y-4">
            <div className="p-5 rounded-2xl bg-primary-ultralight border border-primary/15">
              <ShieldCheck className="w-6 h-6 text-primary mb-2" aria-hidden="true" />
              <p className="font-bold text-slate-900">Data Anda aman</p>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                Biodata dan foto KTP disimpan privat dan hanya dapat dilihat oleh Anda serta admin berwenang.
              </p>
            </div>
            <div className={card(false, "p-5 text-sm text-slate-600 space-y-2")}>
              <p className="font-bold text-slate-900">Siapkan dulu</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Foto KTP yang jelas (maks 3 MB)</li>
                <li>Nama kampus atau instansi</li>
                <li>Nomor WhatsApp orang tua/wali</li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    );
  }

  const student = profile.occupation === "MAHASISWA";
  return (
    <div className="space-y-8">
      <PageHeader
        icon={IdCard}
        title="Biodata"
        actions={<Pill tone="success"><ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" /> Lengkap · {formatDate(profile.createdAt, "short")}</Pill>}
      >
        Data identitas Anda sebagai penghuni Kamar {resident.room.number} · {resident.kost.name}.
      </PageHeader>
      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <Section icon={UserRound} title="Data pribadi">
          <Item label="Nama sesuai KTP" value={profile.fullNameKtp} />
          <Item label="NIK" value={<span className="font-mono">{maskNik(profile.nik)}</span>} />
          <Item label="Alamat KTP" value={profile.ktpAddress} />
        </Section>
        <Section icon={GraduationCap} title={student ? "Akademik" : "Pekerjaan"}>
          <Item label="Status" value={student ? "Mahasiswa" : "Pekerja"} />
          <Item label={student ? "Universitas" : "Instansi"} value={profile.institution} />
          {student && <Item label="Fakultas · Program studi" value={`${profile.faculty} · ${profile.studyProgram}`} />}
        </Section>
        <Section icon={Users} title="Orang tua/wali">
          <Item label="Nama" value={profile.guardianName} />
          <Item label="Hubungan" value={profile.guardianRelation} />
          <Item label="WhatsApp (kontak darurat)" value={formatPhone(profile.guardianWhatsapp)} />
        </Section>
      </div>
      <div className={card(false, "p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4")}>
        <Lock className="w-6 h-6 text-primary shrink-0" aria-hidden="true" />
        <p className="flex-1 text-sm text-slate-600">
          Agar data identitas tidak diganti sepihak, perubahan biodata diajukan lewat Customer Care dan diproses admin.
        </p>
        <a
          href={waCustomerCare({ name: member.name, room: resident.room.number, kost: resident.kost.name, topic: "informasi kost" })}
          target="_blank"
          rel="noopener noreferrer"
          className={button("neutral", "md")}
        >
          <MessageCircle className="w-4 h-4 text-emerald-600" aria-hidden="true" /> Ajukan Perubahan
        </a>
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: LucideIcon; title: string; children: React.ReactNode }) {
  return (
    <section className={card(false, "p-5 sm:p-6")} aria-label={title}>
      <h2 className="flex items-center gap-2.5 font-bold text-slate-900 mb-4">
        <span className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        {title}
      </h2>
      <dl className="space-y-3">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-slate-500">{label}</dt>
      <dd className="text-sm font-semibold text-slate-800 break-words">{value}</dd>
    </div>
  );
}
