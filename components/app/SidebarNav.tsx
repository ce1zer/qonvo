"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { NavItem } from "@/components/app/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function isActivePath(pathname: string, href: string) {
  const hrefPath = href.split("?")[0] ?? href;
  return pathname === hrefPath || pathname.startsWith(`${hrefPath}/`);
}

export function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const active = isActivePath(pathname, item.href);
        const variant = item.disabled ? "ghost" : active ? "secondary" : "ghost";

        return (
          <Button
            key={item.href}
            asChild={!item.disabled}
            variant={variant}
            className={cn("w-full justify-start gap-2", item.disabled && "pointer-events-none opacity-50")}
          >
            {item.disabled ? (
              <span className="flex items-center gap-2">
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span>{item.label}</span>
              </span>
            ) : (
              <Link href={item.href}>
                {item.icon ? <span className="shrink-0">{item.icon}</span> : null}
                <span>{item.label}</span>
              </Link>
            )}
          </Button>
        );
      })}
    </nav>
  );
}

