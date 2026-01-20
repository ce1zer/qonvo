"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { initialCreateConversationState, type CreateConversationState } from "@/actions/conversations/types";

export type ScenarioOption = {
  id: string;
  name: string;
  topic: string;
};

type Step = 1 | 2;

export function StartConversationWizard({
  slug,
  scenarios,
  triggerVariant = "primary"
}: {
  slug: string;
  scenarios: ScenarioOption[];
  triggerVariant?: "primary" | "secondary";
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<CreateConversationState>(initialCreateConversationState);

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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return scenarios;
    return scenarios.filter((s) => s.name.toLowerCase().includes(q) || s.topic.toLowerCase().includes(q));
  }, [query, scenarios]);

  function reset() {
    setStep(1);
    setQuery("");
    setScenarioId("");
    setGoal("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    startTransition(async () => {
      const res = await fetch("/api/conversations/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          scenarioId,
          goal: goal.trim() ? goal : undefined
        })
      }).catch(() => null);

      if (!res) {
        setState({ ok: false, message: "Er is iets misgegaan. Probeer het opnieuw." });
        return;
      }

      const json = (await res.json().catch(() => null)) as CreateConversationState | null;
      if (!res.ok || !json) {
        setState({ ok: false, message: json?.message ?? "Er is iets misgegaan. Probeer het opnieuw." });
        return;
      }

      setState(json);
    });
  }

  const triggerClass =
    triggerVariant === "primary"
      ? "inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
      : "inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50";

  return (
    <>
      <button type="button" className={triggerClass} onClick={() => setOpen(true)}>
        Start gesprek
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-2xl overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm"
          >
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-zinc-900">Start gesprek</p>
                <p className="text-sm text-zinc-600">
                  {step === 1 ? "Kies eerst een scenario." : "Stel optioneel een doel in."}
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
                onClick={close}
              >
                Sluiten
              </button>
            </div>

            <div className="px-5 py-5">
              {scenarios.length === 0 ? (
                <div className="space-y-4 text-center">
                  <p className="text-base font-semibold text-zinc-900">Je hebt nog geen scenario’s</p>
                  <p className="text-sm text-zinc-600">
                    Maak eerst een scenario. Daarna kun je een gesprek starten en oefenen.
                  </p>
                  <div className="flex justify-center gap-3">
                    <Link
                      href={`/bedrijf/${slug}/scenarios/nieuw`}
                      className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      onClick={() => setOpen(false)}
                    >
                      Maak je eerste scenario
                    </Link>
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      onClick={close}
                    >
                      Annuleren
                    </button>
                  </div>
                </div>
              ) : step === 1 ? (
                <div className="space-y-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900">Scenario kiezen</p>
                      <p className="text-sm text-zinc-600">Zoek op naam of onderwerp.</p>
                    </div>
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-80"
                      placeholder="Bijv. boze klant…"
                    />
                  </div>

                  <div className="max-h-72 overflow-auto rounded-md border border-zinc-200">
                    {filtered.map((s) => {
                      const selected = scenarioId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          className={[
                            "w-full px-4 py-3 text-left hover:bg-zinc-50",
                            selected ? "bg-zinc-50" : ""
                          ].join(" ")}
                          onClick={() => setScenarioId(s.id)}
                        >
                          <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                          <p className="text-xs text-zinc-600">{s.topic}</p>
                        </button>
                      );
                    })}
                    {filtered.length === 0 ? (
                      <div className="px-4 py-10 text-center text-sm text-zinc-600">
                        Geen scenario’s gevonden. Pas je zoekterm aan.
                      </div>
                    ) : null}
                  </div>

                  {state.fieldErrors?.scenarioId ? (
                    <p className="text-sm text-red-600">{state.fieldErrors.scenarioId}</p>
                  ) : null}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      onClick={close}
                    >
                      Annuleren
                    </button>
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                      disabled={!scenarioId}
                      onClick={() => setStep(2)}
                    >
                      Verder
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-900" htmlFor="goal">
                      Doel (optioneel)
                    </label>
                    <textarea
                      id="goal"
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      rows={3}
                      className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                      placeholder="Bijv. De klant kalmeren en een concrete oplossing afspreken."
                    />
                    <p className="text-xs text-zinc-500">
                      Tip: schrijf één zin. Dit helpt om het gesprek doelgericht te houden.
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      onClick={() => setStep(1)}
                      disabled={isPending}
                    >
                      Terug
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                        onClick={close}
                        disabled={isPending}
                      >
                        Annuleren
                      </button>
                      <button
                        type="button"
                        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
                        onClick={submit}
                        disabled={isPending}
                      >
                        {isPending ? "Bezig..." : "Gesprek starten"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

