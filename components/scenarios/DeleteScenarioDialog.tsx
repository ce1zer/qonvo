"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { initialScenarioActionState, type ScenarioActionState } from "@/lib/scenarios/schema";

export function DeleteScenarioSection({ slug, scenarioId }: { slug: string; scenarioId: string }) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(initialScenarioActionState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
  }, [state]);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      window.location.assign(state.redirectTo);
    }
  }, [state]);

  function onDelete() {
    startTransition(async () => {
      const res = await fetch("/api/scenarios/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, scenarioId })
      }).catch(() => null);

      if (!res) {
        setState({ ok: false, message: "Er is iets misgegaan. Probeer het opnieuw." });
        return;
      }

      const json = (await res.json().catch(() => null)) as ScenarioActionState | null;
      if (!json) {
        setState({ ok: false, message: "Er is iets misgegaan. Probeer het opnieuw." });
        return;
      }

      setState(json);
    });
  }

  return (
    <div className="rounded-lg border border-red-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-zinc-900">Verwijderen</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Dit verwijdert het scenario. Je kunt dit niet ongedaan maken.
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <details className="relative">
          <summary className="inline-flex cursor-pointer list-none items-center justify-center rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100">
            Scenario verwijderen…
          </summary>

          <div className="absolute left-0 mt-2 w-[22rem] max-w-[90vw] rounded-md border border-zinc-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-medium text-zinc-900">Weet je het zeker?</p>
            <p className="mt-1 text-sm text-zinc-600">
              Deze actie is definitief. Verwijder alleen als je zeker weet dat dit scenario niet meer nodig is.
            </p>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                onClick={(e) => {
                  const details = (e.currentTarget.closest("details") as HTMLDetailsElement | null);
                  if (details) details.open = false;
                }}
                disabled={isPending}
              >
                Annuleren
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                onClick={onDelete}
                disabled={isPending}
              >
                {isPending ? "Bezig..." : "Definitief verwijderen"}
              </button>
            </div>
          </div>
        </details>
      </div>
    </div>
  );
}

