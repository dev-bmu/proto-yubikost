import { AdminShell, type NavItem } from "@/components/admin/AdminShell";
import { DemoBarServer } from "@/components/demo/DemoBarServer";
import { requireAdmin } from "@/lib/admin-guard";
import { all } from "@/lib/db";
import { can, ROLE_LABEL, type AdminRole } from "@/lib/perm";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const pendingPayments = all("payments").filter((p) => p.status === "MENUNGGU_VERIFIKASI").length;
  const prospects = new Set(all("members").filter((m) => m.role === "PROSPECT").map((m) => m.id));
  const newLeads = all("inquiries").filter((i) => i.status === "NEW" && prospects.has(i.memberId)).length;

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: "dashboard" },
    { href: "/admin/kost", label: "Kost & Kamar", icon: "catalog" },
    ...(can(admin.role, "leads.manage") ? [{ href: "/admin/leads", label: "Leads", icon: "leads", badge: newLeads } as NavItem] : []),
    { href: "/admin/penghuni", label: "Penghuni", icon: "residents" },
    ...(can(admin.role, "finance.view") ? [{
      href: "/admin/finance",
      label: "Finance",
      icon: "finance",
      children: [
        { href: "/admin/finance/konfirmasi", label: "Konfirmasi Pembayaran", badge: pendingPayments },
        { href: "/admin/finance/transaksi", label: "Data Transaksi" },
        ...(can(admin.role, "finance.export") ? [{ href: "/admin/finance/accurate", label: "Ekspor Accurate" }] : []),
      ],
    } as NavItem] : []),
    ...(can(admin.role, "channels.manage") ? [{ href: "/admin/rekening", label: "Rekening & QRIS", icon: "channels" } as NavItem] : []),
    ...(can(admin.role, "audit.view") ? [{ href: "/admin/audit", label: "Audit Log", icon: "audit" } as NavItem] : []),
  ];

  return (
    <>
      <AdminShell items={items} admin={{ name: admin.name, roleLabel: ROLE_LABEL[admin.role as AdminRole] ?? admin.role }}>
        {children}
      </AdminShell>
      <DemoBarServer />
    </>
  );
}
