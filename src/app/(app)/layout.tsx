import { AppNav } from "@/components/layout/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="hero-glow flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <main className="flex-1 px-4 pb-28 pt-6 md:p-10 md:pb-10">{children}</main>
    </div>
  );
}
