"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";

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
          <Button
            key={item.href}
            asChild
            variant={active ? "secondary" : "ghost"}
            className="w-full justify-start"
          >
            <Link href={item.href}>{item.label}</Link>
          </Button>
        );
      })}
    </nav>
  );
}

