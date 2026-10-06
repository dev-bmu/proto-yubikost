"use client";
// Field form (C-03): label terhubung, error via aria-describedby/aria-invalid, helper text.
import { useId, useState, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/format";

const base =
  "w-full min-h-11 px-3 py-2.5 rounded-xl border bg-white text-sm text-slate-900 placeholder:text-slate-500 focus:outline-none focus:ring-2 transition-all disabled:bg-slate-100 disabled:text-slate-500";
const ok = "border-slate-200 focus:ring-primary/30 focus:border-primary";
const bad = "border-red-500 focus:ring-red-500/30 focus:border-red-500";

type Common = { label: string; error?: string; hint?: string; required?: boolean; className?: string };

function Wrap({ id, label, error, hint, required, className, children }: Common & { id: string; children: ReactNode }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-xs font-semibold text-slate-600 mb-1.5">
        {label} {required && <span className="text-red-600" aria-hidden="true">*</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-msg`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>
      ) : hint ? (
        <p id={`${id}-msg`} className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

const aria = (id: string, c: Common) => ({
  id,
  "aria-invalid": c.error ? true : undefined,
  "aria-describedby": c.error || c.hint ? `${id}-msg` : undefined,
  "aria-required": c.required || undefined,
});

export function Input({ label, error, hint, required, className, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const c = { label, error, hint, required };
  return (
    <Wrap id={id} {...c} className={className}>
      <input {...rest} {...aria(id, c)} className={cn(base, error ? bad : ok)} />
    </Wrap>
  );
}

export function PasswordInput({ label, error, hint, required, className, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const [show, setShow] = useState(false);
  const c = { label, error, hint, required };
  return (
    <Wrap id={id} {...c} className={className}>
      <div className="relative">
        <input {...rest} {...aria(id, c)} type={show ? "text" : "password"} className={cn(base, "pr-11", error ? bad : ok)} />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-lg text-slate-500 hover:text-primary"
          aria-label={show ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Wrap>
  );
}

export function Select({ label, error, hint, required, className, children, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  const c = { label, error, hint, required };
  return (
    <Wrap id={id} {...c} className={className}>
      <select {...rest} {...aria(id, c)} className={cn(base, error ? bad : ok)}>
        {children}
      </select>
    </Wrap>
  );
}

export function Textarea({ label, error, hint, required, className, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  const c = { label, error, hint, required };
  return (
    <Wrap id={id} {...c} className={className}>
      <textarea {...rest} {...aria(id, c)} className={cn(base, "resize-none", error ? bad : ok)} />
    </Wrap>
  );
}

/** Checkbox persetujuan dengan label kaya (tautan). */
export function Checkbox({
  label,
  error,
  className,
  ...rest
}: { label: ReactNode; error?: string; className?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <div className={className}>
      <div className="flex items-start gap-2.5">
        <input
          {...rest}
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-msg` : undefined}
          className="mt-0.5 w-4 h-4 shrink-0 accent-primary"
        />
        <label htmlFor={id} className="text-sm text-slate-600 leading-snug">{label}</label>
      </div>
      {error && <p id={`${id}-msg`} className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
    </div>
  );
}

/** Radio card (paket sewa, status pekerjaan) — has-[:checked] (C-03). */
export function RadioCard({
  name,
  value,
  checked,
  onChange,
  children,
  className,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      className={cn(
        "flex items-center gap-3 p-4 rounded-xl border-2 border-slate-200 cursor-pointer transition-colors hover:border-primary/40",
        "has-[:checked]:border-primary has-[:checked]:bg-primary-ultralight has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/40",
        className,
      )}
    >
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} className="w-4 h-4 accent-primary shrink-0" />
      <span className="flex-1 min-w-0">{children}</span>
    </label>
  );
}
