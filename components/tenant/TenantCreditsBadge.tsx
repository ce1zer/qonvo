"use client";

import { useTenant } from "@/components/tenant/TenantContext";

export function TenantCreditsBadge() {
  const { creditsBalance } = useTenant();

  const low = creditsBalance < 5;
  const empty = creditsBalance <= 0;

  return (
    <div className="hidden items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 md:flex">
      <span>
        Credits: <span className="font-medium text-zinc-900">{creditsBalance}</span>
      </span>
      {low ? (
        <span
          className={[
            "rounded-md px-2 py-0.5 text-xs font-medium",
            empty ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"
          ].join(" ")}
        >
          Bijna op
        </span>
      ) : null}
    </div>
  );
}

