"use client";

import { useTenant } from "@/components/tenant/TenantContext";
import { AccountMenu } from "@/components/tenant/AccountMenu";

export function TenantSidebarFooter() {
  const { creditsBalance } = useTenant();
  const low = creditsBalance < 5;
  const empty = creditsBalance <= 0;

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Account & credits</div>

      <div className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm">
        <span className="text-muted-foreground">
          Credits: <span className="font-medium text-foreground">{creditsBalance}</span>
        </span>
        {low ? (
          <span
            className={[
              "rounded-md px-2 py-0.5 text-xs font-medium",
              empty ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700"
            ].join(" ")}
          >
            Bijna op
          </span>
        ) : null}
      </div>

      <AccountMenu variant="ghost" className="w-full justify-start" align="start" />
    </div>
  );
}

