import type { Metadata } from "next";
import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { AccountShell } from "@/components/boty/account-shell";
import { noIndexRobots } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Mi cuenta",
  robots: noIndexRobots,
};

export default function CuentaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-secondary/30 via-background to-background">
      <Header alwaysVisible />
      <div className="flex-1 w-full pt-[148px] pb-12 px-4 sm:px-6">
        <AccountShell>{children}</AccountShell>
      </div>
      <Footer />
    </main>
  );
}
