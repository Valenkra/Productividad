import { AppNav } from "@/components/layout/app-nav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AppNav />
      <main className="flex-1 p-4 pb-20 md:p-8 md:pb-8">{children}</main>
    </div>
  );
}
