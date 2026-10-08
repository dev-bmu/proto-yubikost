"use client";
// Pembayaran dengan upload bukti (PRD §8.4, C-20, C-26, v1.2). Sewa baru (uang muka → pelunasan) & perpanjangan.
// Desktop: langkah di kiri, ringkasan tagihan sticky di kanan. Mobile: ringkasan di atas.
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, FileText, Maximize2, QrCode, RefreshCw, Trash2, Upload } from "lucide-react";
import { submitPayment } from "@/actions/customer";
import { CopyButton } from "@/components/CopyButton";
import { RadioCard } from "@/components/Field";
import { Modal } from "@/components/Modal";
import { button, card, Notice, Spinner } from "@/components/ui";
import { PACKAGES, paymentLabel } from "@/lib/constants";
import { addMonths, cn, formatDate, rupiah } from "@/lib/format";
import { waPaymentNotice } from "@/lib/wa";
import { NotifyAdmin, RentBill, Row, StepHeading, TotalRow, type RentInfo } from "./parts";

export type ChannelOption = { id: string; label: string; accountNumber: string; accountHolder: string; qrisImage: string };

type Common = { channels: ChannelOption[]; notice: { name: string; kost: string; room: string }; head: ReactNode; footer?: ReactNode };
type Props = Common &
  ({ kind: "SEWA_BARU"; bookingId: string; invoiceNumber?: string; rent: RentInfo } | { kind: "PERPANJANGAN"; monthlyPrice: number; dueDate: string });

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";
const BANK_TILE: Record<string, string> = {
  BCA: "bg-blue-700 text-white",
  Mandiri: "bg-blue-950 text-amber-300",
  BRI: "bg-blue-600 text-white",
  BNI: "bg-orange-700 text-white",
};

export function PaymentForm(props: Props) {
  const router = useRouter();
  const [months, setMonths] = useState<number>(PACKAGES[0]); // paket perpanjangan
  const [channelId, setChannelId] = useState(props.channels[0]?.id ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [drag, setDrag] = useState(false);
  const [zoom, setZoom] = useState(false);
  const [error, setError] = useState<{ text: string; field?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<{ ref: string; amount: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sewa baru: tahap & nominal dari server (uang muka, atau sisa tagihan saat pelunasan). Perpanjangan: sewa × paket.
  const total = props.kind === "SEWA_BARU" ? props.rent.due : props.monthlyPrice * months;
  const label = props.kind === "SEWA_BARU" ? paymentLabel({ kind: props.kind, stage: props.rent.stage, dpPct: props.rent.dpPct }) : "Perpanjangan";
  const channel = props.channels.find((c) => c.id === channelId);
  const step = (n: number) => (props.kind === "PERPANJANGAN" ? n + 1 : n);

  useEffect(() => {
    if (!file || file.type === "application/pdf") return setPreview("");
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pick(f: File | undefined) {
    setError(null);
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type)) return setError({ text: "File harus JPG, PNG, WEBP, atau PDF.", field: "proof" });
    if (f.size > 3 * 1024 * 1024) return setError({ text: "Ukuran file melebihi 3 MB.", field: "proof" });
    setFile(f);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!channelId) return setError({ text: "Pilih rekening/QRIS yang Anda pakai.", field: "channelId" });
    if (!file) return setError({ text: "Upload foto atau PDF bukti transfer.", field: "proof" });
    const form = new FormData();
    form.set("kind", props.kind);
    if (props.kind === "SEWA_BARU") form.set("bookingId", props.bookingId);
    else form.set("months", String(months));
    form.set("channelId", channelId);
    form.set("proof", file);
    setBusy(true);
    setError(null);
    const r = await submitPayment(form).catch(() => ({ ok: false as const, error: "Gagal terhubung ke server. Coba lagi.", field: undefined }));
    setBusy(false);
    if (!r.ok) return setError({ text: r.error, field: r.field });
    setSent({ ref: r.ref, amount: r.amount });
    router.refresh();
  }

  if (sent) {
    return (
      <div className={card(false, "p-8 sm:p-10 text-center max-w-xl mx-auto")} role="status">
        <span className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <CheckCircle2 className="w-9 h-9" />
        </span>
        <h2 className="text-xl font-extrabold text-slate-900">Bukti {label.toLowerCase()} terkirim</h2>
        <p className="mt-2 text-sm text-slate-600">
          Ref <span className="font-mono font-bold text-slate-900">{sent.ref}</span> · {rupiah(sent.amount)}. Admin memverifikasi maksimal 1 hari kerja; status bisa
          dipantau di halaman ini.
        </p>
        <div className="mt-3">
          <NotifyAdmin href={waPaymentNotice({ ...props.notice, kind: label.toLowerCase(), amount: sent.amount, ref: sent.ref })} />
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="grid xl:grid-cols-[minmax(0,1fr)_360px] gap-8 items-start">
      <aside className="xl:order-last xl:sticky xl:top-24 space-y-4" aria-label="Ringkasan tagihan">
        <div className={card(false, "overflow-hidden")}>
          <div className="p-5 border-b border-slate-100">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">Ringkasan tagihan</p>
            {props.head}
          </div>
          <dl className="p-5 space-y-2">
            {props.kind === "SEWA_BARU" ? (
              <>
                {props.invoiceNumber && <Row label="No. faktur" value={<span className="font-mono text-xs">{props.invoiceNumber}</span>} />}
                <RentBill info={props.rent} />
              </>
            ) : (
              <>
                <Row label={`Perpanjangan ${months} × ${rupiah(props.monthlyPrice)}`} value={rupiah(total)} />
                <Row label="Berlaku s/d" value={formatDate(addMonths(props.dueDate, months))} />
                <TotalRow value={total} />
              </>
            )}
          </dl>
        </div>
        {props.footer}
      </aside>

      <div className="space-y-6 min-w-0">
        {props.kind === "PERPANJANGAN" && (
          <fieldset className={card(false, "p-5 sm:p-6")}>
            <legend className="sr-only">Paket perpanjangan</legend>
            <StepHeading n={1} title="Pilih paket perpanjangan">Masa berlaku dihitung dari jatuh tempo saat ini, {formatDate(props.dueDate)}.</StepHeading>
            <div className="grid sm:grid-cols-2 gap-3">
              {PACKAGES.map((n) => (
                <RadioCard key={n} name="months" value={String(n)} checked={months === n} onChange={() => setMonths(n)}>
                  <span className="block font-bold text-slate-900">{n} Bulan</span>
                  <span className="block text-lg font-extrabold text-primary tabular-nums">{rupiah(props.monthlyPrice * n)}</span>
                  <span className="block text-xs text-slate-500">Berlaku s/d {formatDate(addMonths(props.dueDate, n))}</span>
                </RadioCard>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className={card(false, "p-5 sm:p-6")}>
          <legend className="sr-only">Rekening atau QRIS tujuan</legend>
          <StepHeading n={step(1)} title={`Transfer ${rupiah(total)}`}>Pilih kanal yang Anda pakai agar admin mudah mencocokkan mutasi.</StepHeading>
          {props.channels.length === 0 ? (
            <Notice tone="neutral">Kanal pembayaran belum tersedia. Hubungi Customer Care.</Notice>
          ) : (
            <div className="space-y-3">
              {props.channels.map((c) => (
                <RadioCard key={c.id} name="channelId" value={c.id} checked={channelId === c.id} onChange={setChannelId}>
                  <span className="flex flex-wrap items-center gap-3">
                    <span
                      className={cn("w-20 h-11 rounded-lg flex items-center justify-center text-sm font-extrabold tracking-wide shrink-0", c.qrisImage ? "bg-slate-900 text-white" : BANK_TILE[c.label] ?? "bg-primary text-white")}
                      aria-hidden="true"
                    >
                      {c.qrisImage ? <QrCode className="w-6 h-6" /> : c.label}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-slate-900">{c.qrisImage ? "QRIS" : `Transfer ${c.label}`}</span>
                      {c.accountNumber ? (
                        <span className="block font-mono text-base tabular-nums text-slate-800 break-all">{c.accountNumber}</span>
                      ) : (
                        <span className="block text-xs text-slate-600">Bayar dari m-banking atau e-wallet apa pun</span>
                      )}
                      <span className="block text-xs text-slate-500">a.n. {c.accountHolder}</span>
                    </span>
                    {c.accountNumber && <CopyButton value={c.accountNumber} what={`nomor rekening ${c.label}`} />}
                  </span>
                </RadioCard>
              ))}
            </div>
          )}
          {channel?.qrisImage && (
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center gap-5">
              {/* eslint-disable-next-line @next/next/no-img-element -- gambar QRIS dari admin */}
              <img src={channel.qrisImage} alt={`Kode QRIS ${channel.accountHolder}`} className="w-44 h-44 rounded-xl border border-slate-200 bg-white p-2" />
              <div className="text-center sm:text-left">
                <p className="font-bold text-slate-900">Pindai kode QRIS</p>
                <p className="mt-1 text-sm text-slate-600">Buka aplikasi m-banking atau e-wallet, pindai kode, lalu bayar tepat {rupiah(total)}.</p>
                <button type="button" onClick={() => setZoom(true)} className={button("neutral", "md", "mt-3")}>
                  <Maximize2 className="w-4 h-4" aria-hidden="true" /> Perbesar QRIS
                </button>
              </div>
            </div>
          )}
          {error?.field === "channelId" && <p className="mt-2 text-xs text-red-600" role="alert">{error.text}</p>}
        </fieldset>

        <div className={card(false, "p-5 sm:p-6")}>
          <StepHeading n={step(2)} title="Upload bukti transfer">Foto layar atau PDF bukti transfer. Disimpan privat, hanya dibuka admin keuangan.</StepHeading>
          <input
            ref={inputRef}
            id="proof"
            type="file"
            accept={ACCEPT}
            className="peer sr-only"
            tabIndex={file ? -1 : 0}
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
            aria-invalid={error?.field === "proof" || undefined}
            aria-describedby="proof-msg"
          />
          {file ? (
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              {preview ? (
                <div className="bg-slate-50 p-4 flex justify-center">
                  {/* eslint-disable-next-line @next/next/no-img-element -- pratinjau lokal (blob URL) */}
                  <img src={preview} alt="Pratinjau bukti transfer" className="max-h-72 rounded-xl border border-slate-200" />
                </div>
              ) : null}
              <div className="p-3 flex flex-wrap items-center gap-3 border-t border-slate-200 first:border-t-0">
                <span className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
                  <FileText className="w-5 h-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-slate-800 truncate">{file.name}</span>
                  <span className="block text-xs text-slate-500 tabular-nums">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </span>
                <button type="button" className={button("neutral", "sm", "min-h-11 sm:min-h-9")} onClick={() => inputRef.current?.click()}>
                  <RefreshCw className="w-4 h-4" aria-hidden="true" /> Ganti
                </button>
                <button type="button" className={button("ghost", "sm", "min-h-11 sm:min-h-9 text-red-700 hover:text-red-800 hover:bg-red-50")} onClick={() => setFile(null)}>
                  <Trash2 className="w-4 h-4" aria-hidden="true" /> Hapus
                </button>
              </div>
            </div>
          ) : (
            <label
              htmlFor="proof"
              onDragOver={(e) => {
                e.preventDefault();
                setDrag(true);
              }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                pick(e.dataTransfer.files[0]);
              }}
              className={cn(
                "flex flex-col items-center justify-center gap-3 px-6 py-10 sm:py-12 rounded-2xl border-2 border-dashed text-center cursor-pointer transition-colors",
                "peer-focus-visible:ring-2 peer-focus-visible:ring-primary/40",
                drag ? "border-primary bg-primary-ultralight" : error?.field === "proof" ? "border-red-500 bg-red-50" : "border-slate-300 hover:border-primary hover:bg-primary-ultralight/60",
              )}
            >
              <span className="w-14 h-14 rounded-2xl gradient-primary text-white flex items-center justify-center shadow-lg shadow-primary/25" aria-hidden="true">
                <Upload className="w-7 h-7" />
              </span>
              <span className="text-sm sm:text-base text-slate-700">
                Tarik file ke sini atau <span className="font-bold text-primary underline underline-offset-2">pilih file</span>
              </span>
              <span className="text-xs text-slate-500">JPG, PNG, WEBP, atau PDF · maksimal 3 MB</span>
            </label>
          )}
          <p id="proof-msg" className={cn("mt-2 text-xs", error?.field === "proof" ? "text-red-600" : "sr-only")} role={error?.field === "proof" ? "alert" : undefined}>
            {error?.field === "proof" ? error.text : "JPG, PNG, WEBP, atau PDF, maksimal 3 MB."}
          </p>
        </div>

        {error && !["proof", "channelId", "months"].includes(error.field ?? "") && (
          <Notice tone="danger">
            <span role="alert">{error.text}</span>
          </Notice>
        )}

        <div>
          <button type="submit" disabled={busy} aria-busy={busy} className={button("primary", "lg", "w-full")}>
            {busy ? <Spinner /> : <Upload className="w-5 h-5" aria-hidden="true" />} Kirim Bukti {label} · {rupiah(total)}
          </button>
          {busy && (
            <div className="mt-3 h-1.5 rounded-full bg-primary/15 overflow-hidden" aria-hidden="true">
              <div className="h-full w-1/2 rounded-full bg-primary animate-pulse" />
            </div>
          )}
          <p className="mt-3 text-xs text-slate-500 text-center">Admin memverifikasi maksimal 1 hari kerja. Status dapat dipantau di halaman ini.</p>
        </div>
      </div>

      <Modal open={zoom} onClose={() => setZoom(false)} title="Kode QRIS" subtitle={channel?.accountHolder} icon={<QrCode className="w-4 h-4" />}>
        {channel?.qrisImage && (
          <div className="p-5">
            {/* eslint-disable-next-line @next/next/no-img-element -- gambar QRIS dari admin */}
            <img src={channel.qrisImage} alt={`Kode QRIS ${channel.accountHolder}`} className="w-full rounded-xl border border-slate-200" />
            <p className="mt-3 text-sm text-slate-600">Pindai dengan aplikasi bank atau e-wallet, lalu bayar {rupiah(total)}.</p>
          </div>
        )}
      </Modal>
    </form>
  );
}
