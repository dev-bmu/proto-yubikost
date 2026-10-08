import { DemoBarServer } from "@/components/demo/DemoBarServer";
import { Footer } from "@/components/Footer";
import { GateProvider } from "@/components/gate/GateProvider";
import { Navbar } from "@/components/Navbar";
import { currentViewer } from "@/lib/session";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const viewer = await currentViewer();
  return (
    <GateProvider viewer={viewer}>
      <a href="#konten" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:px-4 focus:py-2 focus:rounded-lg focus:bg-white focus:text-ink focus:font-bold">
        Lewati ke konten
      </a>
      <Navbar />
      <main id="konten" className="flex-grow">{children}</main>
      <Footer />
      <DemoBarServer />
    </GateProvider>
  );
}
