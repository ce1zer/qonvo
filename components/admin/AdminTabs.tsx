"use client";

import Link from "next/link";

export function AdminTabs({ active }: { active: "companies" | "users" }) {
  return (
    <div className="flex gap-2 rounded-xl border bg-card p-2 shadow-sm">
      <Link
        href="/admin?tab=companies"
        className={[
          "rounded-md px-3 py-2 text-sm font-medium",
          active === "companies" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        ].join(" ")}
      >
        Bedrijven
      </Link>
      <Link
        href="/admin?tab=users"
        className={[
          "rounded-md px-3 py-2 text-sm font-medium",
          active === "users" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        ].join(" ")}
      >
        Gebruikers
      </Link>
    </div>
  );
}

