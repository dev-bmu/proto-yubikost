"use client";
// Form ganti kata sandi (PRD §8.6). Kata sandi lama disembunyikan saat wajib ganti (sandi sementara).
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { changeMemberPassword } from "@/actions/member";
import { PasswordInput } from "@/components/Field";
import { button, Notice, Spinner } from "@/components/ui";
import { NET_ERROR } from "./MenuCard";

type Errors = Partial<Record<"oldPassword" | "newPassword" | "confirm", string>>;

export function PasswordForm({ mustChange, next }: { mustChange: boolean; next: string }) {
  const router = useRouter();
  const [oldPassword, setOld] = useState("");
  const [newPassword, setNew] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const errs: Errors = {};
    if (!mustChange && !oldPassword) errs.oldPassword = "Isi kata sandi lama.";
    if (newPassword.length < 8) errs.newPassword = "Kata sandi baru minimal 8 karakter.";
    if (confirm !== newPassword) errs.confirm = "Ulangi kata sandi baru dengan isi yang sama.";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setPending(true);
    const r = await changeMemberPassword({ oldPassword, newPassword }).catch(() => ({ ok: false as const, error: NET_ERROR, field: undefined }));
    if (!r.ok) {
      setPending(false);
      if (r.field === "oldPassword" || r.field === "newPassword") setErrors({ [r.field]: r.error });
      else setFormError(r.error);
      return;
    }
    setDone(true);
    setTimeout(() => {
      router.push(next);
      router.refresh();
    }, 1200);
  }

  return (
    <>
      {/* Live region harus sudah ada sebelum isinya berubah agar diumumkan pembaca layar. */}
      <div role="status">{done && <Notice tone="success" className="mt-6">Kata sandi berhasil diganti. Mengalihkan…</Notice>}</div>
      {!done && (
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {mustChange && (
            <Notice tone="warning">Anda wajib mengganti kata sandi sementara sebelum melanjutkan.</Notice>
          )}
          {!mustChange && (
            <PasswordInput
              label="Kata sandi lama"
              required
              autoComplete="current-password"
              value={oldPassword}
              onChange={(e) => setOld(e.target.value)}
              error={errors.oldPassword}
            />
          )}
          <PasswordInput
            label="Kata sandi baru"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNew(e.target.value)}
            error={errors.newPassword}
            hint="Minimal 8 karakter."
          />
          <PasswordInput
            label="Ulangi kata sandi baru"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />
          {formError && <Notice tone="danger">{formError}</Notice>}
          <button type="submit" disabled={pending} aria-busy={pending || undefined} className={button("primary", "md", "w-full")}>
            {pending && <Spinner />}
            {pending ? "Menyimpan..." : "Simpan Kata Sandi"}
          </button>
        </form>
      )}
    </>
  );
}
