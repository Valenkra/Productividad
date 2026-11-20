"use client";

import { BarChart3, ListChecks, Sprout, Timer, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

const ICONS: Record<(typeof NAV_ITEMS)[number]["href"], LucideIcon> = {
  "/focus": Timer,
  "/tasks": ListChecks,
  "/garden": Sprout,
  "/history": BarChart3,
};

/** Barra de pestañas fija abajo (diseño 2b). */
export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t-2 border-line bg-white px-3 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-2.5"
    >
      <ul className="grid grid-cols-4">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          const Icon = ICONS[href];
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors ${
                  active ? "text-accent" : "text-muted"
                }`}
              >
                <Icon size={24} strokeWidth={2.2} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
