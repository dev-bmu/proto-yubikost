import Image from "next/image";
import { redirect } from "next/navigation";
import { currentAdmin } from "@/lib/session";
import { DemoBarServer } from "@/components/demo/DemoBarServer";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Masuk Admin" };

export default async function AdminLoginPage() {
  if (await currentAdmin()) redirect("/admin");
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary via-hero-mid to-hero-deep">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="gradient-hero p-6 text-white">
          <Image src="/brand/yubikost-horizontal-white.svg" alt="yubikost" width={140} height={40} className="h-10 w-auto" />
          <h1 className="mt-4 font-bold text-lg leading-tight">Admin Dashboard</h1>
          <p className="text-sm">Pengelola: Brave Brawijaya</p>
        </div>
        <LoginForm />
      </div>
      <DemoBarServer />
    </main>
  );
}
