// Server wrapper: menyiapkan daftar akun demo dari TSV untuk <DemoBar>.
import { all } from "@/lib/db";
import { ROLE_LABEL, type AdminRole } from "@/lib/perm";
import { BOOKING_STATUS } from "@/lib/constants";
import { activeBookingOfMember, activeLeaseOfMember, profileOf } from "@/lib/queries";
import { leaseStatus } from "@/lib/format";
import { DemoBar } from "./DemoBar";

export function DemoBarServer() {
  // Akun hasil generator data (mbr-g*/mbr-l*) disembunyikan agar panel tetap ringkas.
  const members = all("members").filter((m) => !/^mbr-[gl]\d/.test(m.id)).map((m) => {
    const booking = activeBookingOfMember(m.id);
    let note = booking ? `Calon Penghuni · pesanan ${BOOKING_STATUS[booking.status]?.label.toLowerCase()}` : "Calon Penghuni (Prospect)";
    if (m.role === "RESIDENT") {
      const lease = activeLeaseOfMember(m.id);
      const parts = ["Penghuni"];
      if (lease) parts.push(leaseStatus(lease.dueDate).label);
      if (!profileOf(m.id)) parts.push("biodata belum diisi");
      if (m.mustChangePassword) parts.push("wajib ganti sandi");
      note = parts.join(" · ");
    }
    return { id: m.id, name: m.name, note, href: "/dashboard" };
  });
  const admins = all("admins").map((a) => ({ id: a.id, name: a.name, note: `${ROLE_LABEL[a.role as AdminRole] ?? a.role} · ${a.email}`, href: "/admin" }));
  return <DemoBar members={members} admins={admins} />;
}
