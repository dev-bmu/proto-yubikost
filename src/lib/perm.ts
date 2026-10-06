// Matriks izin admin — PRD §3.3 (usulan). Dipakai UI (sembunyikan tombol) dan server action (tolak).
export const ADMIN_ROLES = ["SUPER_ADMIN", "MANAGER", "OPERATIONAL", "MARKETING", "FINANCE", "LEGAL"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export type Permission =
  | "rooms.manage"
  | "leads.manage"
  | "leads.assign"
  | "residents.add"
  | "lease.end"
  | "renewals.verify"
  | "payments.verify"
  | "residents.ktp"
  | "channels.manage"
  | "members.reset"
  | "audit.view";

const MATRIX: Record<Permission, AdminRole[]> = {
  "rooms.manage": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL"],
  "leads.manage": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL", "MARKETING"],
  "leads.assign": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL"],
  "residents.add": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL"],
  "lease.end": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL"],
  "renewals.verify": ["SUPER_ADMIN", "MANAGER", "FINANCE"],
  "payments.verify": ["SUPER_ADMIN", "MANAGER", "FINANCE"],
  "residents.ktp": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL", "LEGAL"],
  "channels.manage": ["SUPER_ADMIN", "FINANCE"],
  "members.reset": ["SUPER_ADMIN", "MANAGER", "OPERATIONAL"],
  "audit.view": ["SUPER_ADMIN", "MANAGER"],
};

export const can = (role: string, perm: Permission) => (MATRIX[perm] as string[]).includes(role);

export const ROLE_LABEL: Record<AdminRole, string> = {
  SUPER_ADMIN: "Super Admin",
  MANAGER: "Manager",
  OPERATIONAL: "Operasional",
  MARKETING: "Marketing",
  FINANCE: "Finance",
  LEGAL: "Legal",
};
