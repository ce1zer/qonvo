"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SidebarNav({
  baseHref
}: {
  baseHref: string;
}) {
  const pathname = usePathname();

  const items = [
    { href: `${baseHref}/dashboard`, label: "Dashboard" },
    { href: `${baseHref}/scenarios`, label: "Scenario’s" },
    { href: `${baseHref}/gesprekken`, label: "Gesprekken" }
  ];

  return (
    <nav className="space-y-1 text-sm">
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "block rounded-md px-3 py-2",
              active
                ? "bg-zinc-100 text-zinc-900"
                : "text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900"
            ].join(" ")}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

