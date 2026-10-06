"use client";
// Modal Masuk/Daftar (PRD §7.2).
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock, ShieldCheck } from "lucide-react";
import { loginMember, registerMember } from "@/actions/member";
import { Modal } from "@/components/Modal";
import { Checkbox, Input, PasswordInput } from "@/components/Field";
import { button, Notice, Spinner } from "@/components/ui";
import { cn } from "@/lib/format";
import { waForgot } from "@/lib/wa";
import type { KostIntent } from "./GateProvider";

export type AuthTab = "masuk" | "daftar";
type Errors = Partial<Record<"name" | "whatsapp" | "email" | "password" | "consent", string>> & { form?: string };

export function AuthModal({
  open,
  tab,
  intent,
  onTabChange,
  onClose,
  onSuccess,
}: {
  open: boolean;
  tab: AuthTab;
  intent?: KostIntent;
  onTabChange: (tab: AuthTab) => void;
  onClose: () => void;
  onSuccess: (r: { mustChangePassword: boolean }) => void;
}) {
  const [form, setForm] = useState({ name: "", whatsapp: "", email: "", password: "", consent: false });
  const [errors, setErrors] = useState<Errors>({});
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setErrors({});
      setInfo("");
    }
  }, [open, tab]);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: k === "consent" ? e.target.checked : e.target.value }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErrors({});
    setInfo("");
    try {
      if (tab === "masuk") {
        const r = await loginMember({ whatsapp: form.whatsapp, password: form.password });
        if (r.ok) return onSuccess(r);
        setErrors({ form: r.error });
      } else {
        const r = await registerMember(form);
        if (r.ok) return onSuccess({ mustChangePassword: false });
        if (r.code === "EXISTS") {
          onTabChange("masuk");
          setInfo(r.error);
          return;
        }
        setErrors(r.field ? { [r.field]: r.error } : { form: r.error });
      }
    } catch {
      setErrors({ form: "Terjadi gangguan. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const withIntent = Boolean(intent);
  const cta = tab === "masuk" ? (withIntent ? "Masuk & Ajukan Sewa" : "Masuk") : withIntent ? "Daftar & Ajukan Sewa" : "Daftar";

  return (
    <Modal
      open={open}
      onClose={onClose}
      icon={<Lock className="w-4 h-4" />}
      title={withIntent ? "Masuk untuk mengajukan sewa" : tab === "masuk" ? "Masuk ke akun Brave" : "Daftar akun Brave"}
      subtitle={intent ? `${intent.name}${intent.subtitle ? ` · ${intent.subtitle}` : ""}` : "Calon penghuni & penghuni kost Brave"}
    >
      <div className="p-5 space-y-4">
        <div role="tablist" aria-label="Pilih Masuk atau Daftar" className="grid grid-cols-2 p-1 rounded-xl bg-slate-100">
          {(["masuk", "daftar"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => onTabChange(t)}
              className={cn(
                "py-2 rounded-lg text-sm font-semibold transition-all",
                tab === t ? "bg-white shadow-sm text-primary font-bold" : "text-slate-600 hover:text-slate-900",
              )}
            >
              {t === "masuk" ? "Masuk" : "Daftar"}
            </button>
          ))}
        </div>

        {info && <Notice tone="info">{info}</Notice>}
        {errors.form && <Notice tone="danger">{errors.form}</Notice>}

        <form onSubmit={submit} className="space-y-4" noValidate>
          {tab === "daftar" && (
            <Input label="Nama Lengkap" required autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} data-autofocus />
          )}
          <Input
            label="Nomor WhatsApp"
            required
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="08xx-xxxx-xxxx"
            value={form.whatsapp}
            onChange={set("whatsapp")}
            error={errors.whatsapp}
            {...(tab === "masuk" ? { "data-autofocus": true } : {})}
          />
          {tab === "daftar" && (
            <Input label="Email" type="email" autoComplete="email" hint="Opsional" value={form.email} onChange={set("email")} error={errors.email} />
          )}
          <PasswordInput
            label="Kata Sandi"
            required
            autoComplete={tab === "masuk" ? "current-password" : "new-password"}
            hint={tab === "daftar" ? "Minimal 8 karakter" : undefined}
            value={form.password}
            onChange={set("password")}
            error={errors.password}
          />
          {tab === "daftar" && (
            <Checkbox
              checked={form.consent}
              onChange={set("consent")}
              error={errors.consent}
              label={
                <>
                  Saya menyetujui{" "}
                  <Link href="/terms" target="_blank" className="text-primary font-semibold underline">Syarat & Ketentuan</Link> dan{" "}
                  <Link href="/privacy" target="_blank" className="text-primary font-semibold underline">Kebijakan Privasi</Link>.
                </>
              }
            />
          )}
          <button type="submit" disabled={busy} aria-busy={busy} className={button("primary", "lg", "w-full")}>
            {busy ? <Spinner /> : cta}
          </button>
        </form>

        {tab === "masuk" && (
          <p className="text-sm text-slate-600">
            Lupa kata sandi?{" "}
            <a href={waForgot(form.whatsapp)} target="_blank" rel="noopener noreferrer" className="text-primary font-semibold underline">
              Hubungi Admin Kost
            </a>
          </p>
        )}
        <p className="flex items-center gap-1.5 text-xs text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
          Data Anda aman & tidak dibagikan ke pihak ketiga.
        </p>
      </div>
    </Modal>
  );
}
