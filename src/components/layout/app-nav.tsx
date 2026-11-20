"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PlantIllustration } from "@/features/garden/plant-illustration";
import { NAV_ITEMS } from "./nav-items";

export function AppNav() {
  const pathname = usePathname();
  return (
    <div className="fixed inset-x-3 bottom-3 z-10 rounded-full border border-border bg-surface/90 p-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_12px_32px_-12px_rgba(58,95,55,0.5)] backdrop-blur md:static md:inset-auto md:w-60 md:shrink-0 md:rounded-none md:border-0 md:border-r md:bg-transparent md:p-6 md:shadow-none md:backdrop-blur-none">
      <Link
        href="/dashboard"
        className="mb-6 hidden items-center gap-2 px-2 md:flex"
        aria-label="Focus Garden, inicio"
      >
        <PlantIllustration stage={5} size={34} />
        <span className="font-display text-xl font-semibold tracking-tight">
          Focus Garden
        </span>
      </Link>
      <nav aria-label="Principal">
        <ul className="flex md:flex-col md:gap-1">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <li key={href} className="flex-1 md:flex-none">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center justify-center rounded-full px-1 text-[0.7rem] transition-colors md:justify-start md:px-4 md:text-sm ${
                    active
                      ? "bg-leaf-strong font-semibold text-white"
                      : "text-muted hover:bg-surface hover:text-foreground"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
