"use client";
// Counter statistik landing (PRD C-17): mulai saat terlihat, 2,2 s, sekali. Nilai akhir selalu terbaca screen reader.
import { useEffect, useRef, useState } from "react";
import { animate, useInView, useReducedMotion } from "framer-motion";

export function CountUp({ value, suffix = "" }: { value: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const reduce = useReducedMotion();
  // HTML server berisi nilai akhir (tanpa JS tetap benar); di klien direset ke 0 sampai terlihat.
  const [n, setN] = useState(value);

  useEffect(() => {
    if (reduce) return setN(value);
    if (!inView) return setN(0);
    const ctrl = animate(0, value, { duration: 2.2, ease: [0.215, 0.61, 0.355, 1], onUpdate: (v) => setN(Math.round(v)) });
    return () => ctrl.stop();
  }, [inView, reduce, value]);

  const fmt = (x: number) => x.toLocaleString("id-ID") + suffix;
  return (
    <>
      <span ref={ref} aria-hidden="true" className="tabular-nums">{fmt(n)}</span>
      <span className="sr-only">{fmt(value)}</span>
    </>
  );
}
