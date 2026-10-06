"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/actions/admin";
import { Input, PasswordInput } from "@/components/Field";
import { button, Notice, Spinner } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const r = await loginAdmin({ email, password });
    setBusy(false);
    if (!r.ok) return setError(r.error);
    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="p-6 space-y-4" noValidate>
      {error && <Notice tone="danger">{error}</Notice>}
      <Input label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      <PasswordInput label="Kata Sandi" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      <button type="submit" disabled={busy} aria-busy={busy} className={button("primary", "lg", "w-full")}>
        {busy ? <Spinner /> : "Masuk"}
      </button>
      <p className="text-xs text-slate-500">Prototype: gunakan tombol <strong>Demo</strong> di kiri bawah untuk masuk per peran.</p>
    </form>
  );
}
