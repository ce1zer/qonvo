"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { initialScenarioActionState, type ScenarioActionState } from "@/lib/scenarios/schema";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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
    <SectionCard
      title="Verwijderen"
      description="Dit verwijdert het scenario. Je kunt dit niet ongedaan maken."
      className="border-destructive/20"
      actions={
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isPending}>
              Scenario verwijderen…
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Weet je het zeker?</AlertDialogTitle>
              <AlertDialogDescription>
                Deze actie is definitief. Verwijder alleen als je zeker weet dat dit scenario niet meer nodig is.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
              <AlertDialogAction
                onClick={onDelete}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isPending ? "Bezig..." : "Definitief verwijderen"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      }
    >
      <div />
    </SectionCard>
  );
}

