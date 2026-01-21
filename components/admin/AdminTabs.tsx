"use client";

import Link from "next/link";

export function AdminTabs({ active }: { active: "organizations" | "users" }) {
  return (
    <div className="flex gap-2 rounded-xl border bg-card p-2 shadow-sm">
      <Link
        href="/admin?tab=organizations"
        className={[
          "rounded-md px-3 py-2 text-sm font-medium",
          active === "organizations" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
        ].join(" ")}
      >
        Organisaties
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

