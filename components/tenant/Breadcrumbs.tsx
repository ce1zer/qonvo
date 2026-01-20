"use client";

import Link from "next/link";
import { useSelectedLayoutSegments } from "next/navigation";

import { useTenant } from "@/components/tenant/TenantContext";

function labelForSegment(segment: string) {
  switch (segment) {
    case "dashboard":
      return "Dashboard";
    case "scenarios":
      return "Scenario’s";
    case "gesprekken":
      return "Gesprekken";
    default:
      return segment;
  }
}

export function Breadcrumbs() {
  const { company } = useTenant();
  const segments = useSelectedLayoutSegments();
  const base = `/bedrijf/${company.slug}`;

  const items = segments.filter((s) => s !== "(shell)");

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-muted-foreground">
      <ol className="flex flex-wrap items-center gap-2">
        <li>
          <Link href={base} className="hover:text-foreground">
            {company.name}
          </Link>
        </li>
        {items.map((seg, idx) => {
          const href = `${base}/${items.slice(0, idx + 1).join("/")}`;
          return (
            <li key={href} className="flex items-center gap-2">
              <span className="text-muted-foreground/60">/</span>
              <Link href={href} className="hover:text-foreground">
                {labelForSegment(seg)}
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

