"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { adjustCredits } from "@/actions/admin/adjustCredits";
import { setCompanyDisabled } from "@/actions/admin/setCompanyDisabled";

export type AdminCompanyRow = {
  id: string;
  name: string;
  slug: string;
  credits_balance: number;
  created_at: string;
  is_disabled: boolean;
};

export function CompaniesTable({ companies }: { companies: AdminCompanyRow[] }) {
  const [isPending, startTransition] = useTransition();
  const [amountById, setAmountById] = useState<Record<string, string>>({});

  function setAmount(companyId: string, value: string) {
    setAmountById((prev) => ({ ...prev, [companyId]: value }));
  }

  function onAdjust(companyId: string, sign: 1 | -1) {
    const raw = Number(amountById[companyId] ?? "0");
    if (!Number.isFinite(raw) || raw <= 0) {
      toast.error("Vul een geldig aantal credits in.");
      return;
    }

    const delta = raw * sign;
    const ok = confirm(
      sign === 1
        ? `Credits toevoegen: +${raw}. Weet je het zeker?`
        : `Credits aftrekken: -${raw}. Weet je het zeker?`
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await adjustCredits(companyId, delta, "admin_adjustment");
      if (!res.ok) toast.error(res.message);
      else {
        toast.success(res.message);
        window.location.reload();
      }
    });
  }

  function onToggleDisabled(companyId: string, next: boolean) {
    const ok = confirm(
      next ? "Bedrijf deactiveren? Gebruikers kunnen dan niet meer inloggen." : "Bedrijf activeren?"
    );
    if (!ok) return;

    startTransition(async () => {
      const res = await setCompanyDisabled(companyId, next);
      if (!res.ok) toast.error(res.message);
      else {
        toast.success(res.message);
        window.location.reload();
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
        <div className="col-span-4">Bedrijf</div>
        <div className="col-span-2">Slug</div>
        <div className="col-span-2 text-right">Credits</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2 text-right">Acties</div>
      </div>

      {companies.map((c) => (
        <div key={c.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm">
          <div className="col-span-4 min-w-0">
            <p className="truncate font-medium text-zinc-900">{c.name}</p>
            <p className="text-xs text-zinc-500">{new Date(c.created_at).toLocaleDateString("nl-NL")}</p>
          </div>

          <div className="col-span-2 font-mono text-xs text-zinc-700">{c.slug}</div>

          <div className="col-span-2 text-right font-medium text-zinc-900">{c.credits_balance}</div>

          <div className="col-span-2">
            {c.is_disabled ? (
              <span className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                Gedeactiveerd
              </span>
            ) : (
              <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                Actief
              </span>
            )}
          </div>

          <div className="col-span-2 text-right">
            <details className="relative inline-block text-left">
              <summary className="cursor-pointer list-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-900 hover:bg-zinc-50">
                Beheer
              </summary>
              <div className="absolute right-0 mt-2 w-80 rounded-md border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-zinc-900">Credits</p>
                  <div className="flex gap-2">
                    <input
                      value={amountById[c.id] ?? ""}
                      onChange={(e) => setAmount(c.id, e.target.value)}
                      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      placeholder="Aantal"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      onClick={() => onAdjust(c.id, 1)}
                      disabled={isPending}
                    >
                      +Toevoegen
                    </button>
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-50"
                      onClick={() => onAdjust(c.id, -1)}
                      disabled={isPending}
                    >
                      -Aftrekken
                    </button>
                  </div>

                  <div className="pt-2">
                    <p className="text-sm font-medium text-zinc-900">Tenant</p>
                    <button
                      type="button"
                      className={[
                        "mt-2 w-full rounded-md px-3 py-2 text-sm font-medium disabled:opacity-50",
                        c.is_disabled
                          ? "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50"
                          : "bg-red-600 text-white hover:bg-red-700"
                      ].join(" ")}
                      onClick={() => onToggleDisabled(c.id, !c.is_disabled)}
                      disabled={isPending}
                    >
                      {c.is_disabled ? "Activeer bedrijf" : "Deactiveer bedrijf"}
                    </button>
                    <p className="mt-2 text-xs text-zinc-500">
                      Deactiveren blokkeert login en toegang tot alle tenant routes.
                    </p>
                  </div>
                </div>
              </div>
            </details>
          </div>
        </div>
      ))}
    </div>
  );
}

