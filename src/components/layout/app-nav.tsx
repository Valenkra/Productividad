"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "./nav-items";

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Principal"
      className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] md:static md:w-52 md:border-t-0 md:border-r md:p-4 md:pb-4"
    >
      <ul className="flex md:flex-col md:gap-1">
        {NAV_ITEMS.map(({ href, label }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href} className="flex-1 md:flex-none">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center justify-center rounded-lg px-2 text-xs md:justify-start md:px-3 md:text-sm ${
                  active
                    ? "font-semibold text-leaf-strong underline underline-offset-4"
                    : "text-muted"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
