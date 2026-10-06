"use client";
// Form biodata 3 langkah (PRD §8.2) dengan Stepper (C-19). State di klien, dikirim sekali di langkah 3.
import { useEffect, useRef, useState, type DragEvent, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ImageUp } from "lucide-react";
import { submitProfile } from "@/actions/portal";
import { Checkbox, Input, RadioCard, Select, Textarea } from "@/components/Field";
import { button, Notice, Spinner } from "@/components/ui";
import { PROFILE_RELATIONS } from "@/lib/constants";
import { cn, normalizePhone } from "@/lib/format";
import { NET_ERROR } from "./MenuCard";

const STEPS = ["Data Pribadi", "Akademik/Pekerjaan", "Orang Tua/Wali"];
const STEP_OF: Record<string, number> = {
  fullNameKtp: 0, nik: 0, ktpAddress: 0, ktpPhoto: 0,
  occupation: 1, institution: 1, faculty: 1, studyProgram: 1,
  guardianName: 2, guardianWhatsapp: 2, guardianRelation: 2, consent: 2,
};
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_KTP = 3 * 1024 * 1024;

type Values = {
  fullNameKtp: string; nik: string; ktpAddress: string; occupation: string; institution: string;
  faculty: string; studyProgram: string; guardianName: string; guardianWhatsapp: string; guardianRelation: string;
};
type Errors = Partial<Record<keyof Values | "ktpPhoto" | "consent", string>>;

function fileError(f: File) {
  if (!IMAGE_TYPES.includes(f.type)) return "Foto KTP harus JPG, PNG, atau WEBP.";
  if (f.size > MAX_KTP) return "Ukuran foto KTP maksimal 3 MB.";
  return "";
}

function validate(step: number, v: Values, file: File | null, consent: boolean): Errors {
  const e: Errors = {};
  const len = (s: string) => s.trim().length;
  if (step === 0) {
    if (len(v.fullNameKtp) < 3 || len(v.fullNameKtp) > 100) e.fullNameKtp = "Nama sesuai KTP 3–100 karakter.";
    if (!/^\d{16}$/.test(v.nik)) e.nik = "NIK harus 16 digit angka.";
    if (len(v.ktpAddress) < 10) e.ktpAddress = "Alamat KTP minimal 10 karakter.";
    if (!file) e.ktpPhoto = "Unggah foto KTP.";
    else if (fileError(file)) e.ktpPhoto = fileError(file);
  } else if (step === 1) {
    if (!v.occupation) e.occupation = "Pilih status Mahasiswa atau Pekerja.";
    if (len(v.institution) < 2) e.institution = v.occupation === "PEKERJA" ? "Isi nama instansi." : "Isi nama universitas.";
    if (v.occupation === "MAHASISWA" && !len(v.faculty)) e.faculty = "Isi fakultas.";
    if (v.occupation === "MAHASISWA" && !len(v.studyProgram)) e.studyProgram = "Isi program studi.";
  } else {
    if (len(v.guardianName) < 3) e.guardianName = "Nama orang tua/wali minimal 3 karakter.";
    if (!normalizePhone(v.guardianWhatsapp)) e.guardianWhatsapp = "Nomor WhatsApp tidak valid. Contoh: 0812-3456-7890.";
    if (!v.guardianRelation) e.guardianRelation = "Pilih hubungan keluarga.";
    if (!consent) e.consent = "Centang persetujuan pengolahan data pribadi.";
  }
  return e;
}

export function BiodataForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [v, setV] = useState<Values>({
    fullNameKtp: "", nik: "", ktpAddress: "", occupation: "", institution: "",
    faculty: "", studyProgram: "", guardianName: "", guardianWhatsapp: "", guardianRelation: "",
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const firstRender = useRef(true);

  // Pindah langkah → fokus ke judul langkah agar pembaca layar mengikuti.
  useEffect(() => {
    if (firstRender.current) firstRender.current = false;
    else headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (!file) return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (k: keyof Values) => (val: string) => {
    setV((s) => ({ ...s, [k]: val }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };
  const bind = (k: keyof Values) => ({
    value: v[k],
    error: errors[k],
    onChange: (e: { target: { value: string } }) => set(k)(e.target.value),
    // Validasi saat blur (C-03), hanya bila sudah diisi agar tab-through tidak memunculkan error.
    onBlur: () => v[k].trim() && setErrors((s) => ({ ...s, [k]: validate(step, v, file, consent)[k] })),
  });

  function pickFile(f: File | undefined) {
    if (!f) return;
    const err = fileError(f);
    setErrors((e) => ({ ...e, ktpPhoto: err || undefined }));
    if (!err) setFile(f);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    pickFile(e.dataTransfer.files[0]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    const errs = validate(step, v, file, consent);
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    if (step < STEPS.length - 1) return setStep(step + 1);

    const fd = new FormData();
    for (const [k, val] of Object.entries(v)) fd.append(k, val);
    fd.append("ktpPhoto", file!);
    fd.append("consent", "on");
    setPending(true);
    const r = await submitProfile(fd).catch(() => ({ ok: false as const, error: NET_ERROR, field: undefined }));
    setPending(false);
    if (r.ok) {
      router.push("/dashboard");
      router.refresh();
      return;
    }
    if (r.field && r.field in STEP_OF) {
      setErrors({ [r.field]: r.error });
      setStep(STEP_OF[r.field]!);
    } else setFormError(r.error);
  }

  const isStudent = v.occupation === "MAHASISWA";

  return (
    <form ref={formRef} onSubmit={onSubmit} noValidate>
      <ol aria-label="Langkah pengisian biodata" className="flex items-center mb-8">
        {STEPS.map((label, i) => (
          <li key={label} className={cn("flex items-center", i < STEPS.length - 1 && "flex-1")} aria-current={i === step ? "step" : undefined}>
            <span
              aria-hidden="true"
              className={cn(
                "w-8 h-8 rounded-full text-sm font-bold flex items-center justify-center shrink-0",
                i < step ? "bg-primary text-white" : i === step ? "bg-primary text-white ring-4 ring-primary/20" : "bg-slate-100 text-slate-500",
              )}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </span>
            <span className={cn("ml-2 text-xs font-semibold", i === step ? "text-slate-900" : "sr-only sm:not-sr-only text-slate-500")}>
              <span className="sr-only">Langkah {i + 1}: </span>
              {label}
              {i < step && <span className="sr-only"> (selesai)</span>}
            </span>
            {i < STEPS.length - 1 && <span aria-hidden="true" className={cn("flex-1 h-0.5 mx-3 min-w-4", i < step ? "bg-primary" : "bg-slate-200")} />}
          </li>
        ))}
      </ol>

      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold text-slate-900 mb-5 focus:outline-none">
        {STEPS[step]}
      </h2>

      {step === 0 && (
        <div className="space-y-4">
          <Input label="Nama Lengkap (sesuai KTP)" required autoComplete="name" maxLength={100} {...bind("fullNameKtp")} />
          <Input
            label="NIK"
            required
            inputMode="numeric"
            maxLength={16}
            hint="16 digit angka sesuai KTP."
            {...bind("nik")}
            onChange={(e) => set("nik")(e.target.value.replace(/\D/g, ""))}
            // maxLength memotong tempelan "3507 0145 ..." sebelum spasi dibuang; ambil digitnya dulu.
            onPaste={(e) => {
              e.preventDefault();
              set("nik")(e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 16));
            }}
          />
          <Textarea label="Alamat KTP" required rows={3} {...bind("ktpAddress")} />

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
            className="rounded-2xl has-[input:focus-visible]:ring-2 has-[input:focus-visible]:ring-primary/40"
          >
            <p id="ktp-label" className="block text-xs font-semibold text-slate-600 mb-1.5">
              Foto KTP <span className="text-red-600" aria-hidden="true">*</span>
            </p>
            <input
              ref={fileRef}
              id="ktp-input"
              type="file"
              accept={IMAGE_TYPES.join(",")}
              className="sr-only"
              tabIndex={file ? -1 : 0}
              aria-labelledby="ktp-label"
              aria-describedby="ktp-msg"
              aria-invalid={errors.ktpPhoto ? true : undefined}
              aria-required
              onChange={(e) => {
                pickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {file && preview ? (
              <div className="flex items-center gap-4 p-3 rounded-2xl border border-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau blob lokal */}
                <img src={preview} alt="Pratinjau foto KTP yang dipilih" className="w-28 h-20 object-cover rounded-lg border border-slate-200" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 truncate">{file.name}</p>
                  <p className="text-xs text-slate-500 tabular-nums">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button type="button" onClick={() => fileRef.current?.click()} className={button("neutral", "sm", "min-h-11 sm:min-h-9")}>
                  Ganti<span className="sr-only"> foto KTP</span>
                </button>
              </div>
            ) : (
              <label
                htmlFor="ktp-input"
                className={cn(
                  "block border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors hover:border-primary",
                  errors.ktpPhoto ? "border-red-500" : "border-slate-300",
                )}
              >
                <ImageUp className="w-8 h-8 mx-auto text-primary mb-2" aria-hidden="true" />
                <span className="block text-sm font-semibold text-slate-800">Klik untuk unggah atau seret foto ke sini</span>
              </label>
            )}
            <p id="ktp-msg" className={cn("mt-1 text-xs", errors.ktpPhoto ? "text-red-600" : "text-slate-500")} role={errors.ktpPhoto ? "alert" : undefined}>
              {errors.ktpPhoto ?? "JPG/PNG/WEBP maks 3 MB, disimpan privat."}
            </p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <fieldset>
            <legend className="block text-xs font-semibold text-slate-600 mb-1.5">
              Status <span className="text-red-600" aria-hidden="true">*</span>
            </legend>
            <div className="grid grid-cols-2 gap-3">
              <RadioCard name="occupation" value="MAHASISWA" checked={isStudent} onChange={set("occupation")}>
                <span className="font-semibold text-slate-800 text-sm">Mahasiswa</span>
              </RadioCard>
              <RadioCard name="occupation" value="PEKERJA" checked={v.occupation === "PEKERJA"} onChange={set("occupation")}>
                <span className="font-semibold text-slate-800 text-sm">Pekerja</span>
              </RadioCard>
            </div>
            {errors.occupation && <p className="mt-1 text-xs text-red-600" role="alert">{errors.occupation}</p>}
          </fieldset>
          <Input
            label={isStudent ? "Nama Universitas" : v.occupation === "PEKERJA" ? "Nama Instansi/Perusahaan" : "Nama Universitas / Instansi"}
            required
            maxLength={120}
            {...bind("institution")}
          />
          {isStudent && (
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Fakultas" required maxLength={100} {...bind("faculty")} />
              <Input label="Program Studi" required maxLength={100} {...bind("studyProgram")} />
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <Input label="Nama Orang Tua/Wali" required maxLength={100} {...bind("guardianName")} />
          <Input
            label="Nomor WhatsApp Orang Tua/Wali"
            required
            type="tel"
            inputMode="tel"
            autoComplete="off"
            placeholder="0812-3456-7890"
            hint="Dipakai sebagai kontak darurat. Tidak boleh sama dengan nomor Anda."
            {...bind("guardianWhatsapp")}
          />
          <Select label="Hubungan Keluarga" required {...bind("guardianRelation")}>
            <option value="">Pilih hubungan</option>
            {PROFILE_RELATIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </Select>
          <Checkbox
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              setErrors((s) => ({ ...s, consent: undefined }));
            }}
            error={errors.consent}
            label={
              <>
                Saya menyetujui pengolahan data pribadi sesuai{" "}
                <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2 hover:text-primary-dark">
                  Kebijakan Privasi<span className="sr-only"> (membuka tab baru)</span>
                </Link>
                .
              </>
            }
          />
        </div>
      )}

      {formError && <Notice tone="danger" className="mt-5">{formError}</Notice>}

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className={button("neutral", "md")} disabled={pending}>
            Kembali
          </button>
        ) : (
          <span />
        )}
        <button type="submit" className={button("primary", "md", "sm:min-w-40")} disabled={pending} aria-busy={pending || undefined}>
          {pending && <Spinner />}
          {step < STEPS.length - 1 ? "Lanjut" : pending ? "Menyimpan..." : "Simpan Biodata"}
        </button>
      </div>
    </form>
  );
}
