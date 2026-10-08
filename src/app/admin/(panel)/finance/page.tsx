import { redirect } from "next/navigation";

// Menu Finance tidak punya halaman sendiri; buka sub-menu pertama.
export default function FinancePage() {
  redirect("/admin/finance/konfirmasi");
}
