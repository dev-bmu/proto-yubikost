import { CustomerShell, type CustomerNavItem } from "@/components/customer/CustomerShell";
import { DemoBarServer } from "@/components/demo/DemoBarServer";
import { formatDate, leaseStatus, todayIso } from "@/lib/format";
import { customerContext } from "@/lib/queries";
import { currentMember } from "@/lib/session";
import { waCustomerCare, waKost } from "@/lib/wa";

export const metadata = { title: { default: "Dashboard Saya", template: "%s · Dashboard | yubikost" } };

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  const member = await currentMember();
  // Belum login: biarkan customerGuard di halaman yang mengalihkan, agar URL tujuan (next) tetap utuh.
  if (!member) return children;
  const { resident, booking, profile } = customerContext(member.id)!;
  // Perlu tindakan: tagihan belum dibayar, atau sewa segera/lewat jatuh tempo tanpa bukti perpanjangan.
  const payAction =
    booking?.status === "MENUNGGU_PEMBAYARAN" || Boolean(resident && !resident.pendingPayment && leaseStatus(resident.lease.dueDate).tone !== "success");

  const items: CustomerNavItem[] = [
    { href: "/dashboard", label: "Ringkasan", icon: "home" },
    ...(resident ? [] : [{ href: "/dashboard/sewa", label: "Sewa Kamar", short: "Sewa", icon: "rooms" } as CustomerNavItem]),
    { href: "/dashboard/pembayaran", label: "Pembayaran", short: "Bayar", icon: "payments", badge: payAction ? 1 : 0 },
    ...(resident ? [{ href: "/dashboard/biodata", label: "Biodata", icon: "profile", badge: profile ? 0 : 1 } as CustomerNavItem] : []),
    { href: "/dashboard/bantuan", label: "Bantuan", icon: "help" },
    { href: "/dashboard/akun", label: "Akun", icon: "account", badge: member.mustChangePassword ? 1 : 0 },
  ];

  const place = resident
    ? `Kamar ${resident.room.number} · ${resident.kost.name}`
    : booking?.room && `Pesanan Kamar ${booking.room.number} · ${booking.kost?.name ?? ""}`;
  const helpHref = resident
    ? waCustomerCare({ name: member.name, room: resident.room.number, kost: resident.kost.name, topic: "sewa" })
    : waKost(`Halo Admin Customer Care, saya ${member.name} (calon penghuni). Saya ingin bertanya: `);

  return (
    <>
      <CustomerShell
        items={items}
        member={{ name: member.name, isResident: Boolean(resident), place: place || undefined }}
        today={formatDate(todayIso())}
        helpHref={helpHref}
      >
        {children}
      </CustomerShell>
      <DemoBarServer />
    </>
  );
}
