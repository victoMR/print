import { Header } from "@/components/boty/header";
import { Footer } from "@/components/boty/footer";
import { AccountShell } from "@/components/boty/account-shell";

export default function CuentaRouteLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-secondary/30 via-background to-background">
      <Header />
      <div className="flex-1 w-full pt-28 pb-12 px-4 sm:px-6">
        <AccountShell>{children}</AccountShell>
      </div>
      <Footer />
    </main>
  );
}
