"use client";

import Link from "next/link";

export function AdminTabs({ active }: { active: "companies" | "users" }) {
  const tabClass = (isActive: boolean) =>
    [
      "rounded-md px-3 py-2 text-sm font-medium",
      isActive ? "bg-zinc-900 text-white" : "text-zinc-700 hover:bg-zinc-100"
    ].join(" ");

  return (
    <div className="flex gap-2 rounded-lg border border-zinc-200 bg-white p-2">
      <Link href="/admin?tab=companies" className={tabClass(active === "companies")}>
        Bedrijven
      </Link>
      <Link href="/admin?tab=users" className={tabClass(active === "users")}>
        Gebruikers
      </Link>
    </div>
  );
}

