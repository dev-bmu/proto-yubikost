// Akun & ganti kata sandi (PRD §8.7). Wajib bila memakai kata sandi sementara (Direct Add / reset).
import { CalendarDays, KeyRound, Mail, Phone, UserRound, type LucideIcon } from "lucide-react";
import { PageHeader } from "@/components/customer/parts";
import { PasswordForm } from "@/components/portal/PasswordForm";
import { card, Pill } from "@/components/ui";
import { customerGuard } from "@/lib/customer-guard";
import { formatDate, formatPhone, initials } from "@/lib/format";

export const metadata = { title: "Akun" };

export default async function AkunPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  // Hanya path internal (cegah open redirect lewat //host atau /\host)
  const target = typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/dashboard";
  const { member, resident } = await customerGuard("/dashboard/akun", { allowMustChange: true, allowNoProfile: true });

  return (
    <div>
      <PageHeader icon={UserRound} title="Akun">Data akun hanya-baca; perubahan nama atau nomor diajukan lewat Customer Care.</PageHeader>
      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-6 items-start">
        <section className={card(false, "overflow-hidden")} aria-labelledby="profil">
          <div className="on-purple gradient-hero px-6 pt-6 pb-14 text-white">
            <p className="text-xs font-semibold text-white">Profil akun</p>
          </div>
          <div className="px-6 -mt-10">
            <span className="w-20 h-20 rounded-2xl gradient-primary text-white text-2xl font-extrabold flex items-center justify-center ring-4 ring-white shadow-lg" aria-hidden="true">
              {initials(member.name)}
            </span>
            <h2 id="profil" className="mt-3 text-xl font-extrabold text-slate-900">{member.name}</h2>
            <Pill tone={resident ? "success" : "info"} className="mt-1">{resident ? "Penghuni" : "Calon Penghuni"}</Pill>
            {resident && <p className="mt-2 text-sm text-slate-600">Kamar {resident.room.number} · {resident.kost.name}</p>}
          </div>
          <dl className="p-6 mt-2 space-y-4">
            <Item icon={Phone} label="Nomor WhatsApp" value={formatPhone(member.whatsapp)} />
            <Item icon={Mail} label="Email" value={member.email || "-"} />
            <Item icon={CalendarDays} label="Terdaftar sejak" value={formatDate(member.createdAt)} />
          </dl>
        </section>

        <section className={card(false, "p-6 sm:p-8")} aria-labelledby="sandi">
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center" aria-hidden="true">
              <KeyRound className="w-5 h-5" />
            </span>
            <div>
              <h2 id="sandi" className="text-lg font-bold text-slate-900">Ganti Kata Sandi</h2>
              <p className="text-sm text-slate-600">Gunakan minimal 8 karakter yang sulit ditebak.</p>
            </div>
          </div>
          <PasswordForm mustChange={member.mustChangePassword} next={target} />
        </section>
      </div>
    </div>
  );
}

function Item({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-3 items-center">
      <dt className="contents">
        <span className="row-span-2 w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center" aria-hidden="true">
          <Icon className="w-5 h-5" />
        </span>
        <span className="text-xs text-slate-500">{label}</span>
      </dt>
      <dd className="col-start-2 text-sm font-semibold text-slate-800 break-words">{value}</dd>
    </div>
  );
}
