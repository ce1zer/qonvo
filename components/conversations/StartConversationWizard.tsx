"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { initialCreateConversationState, type CreateConversationState } from "@/actions/conversations/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

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
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [query, setQuery] = useState("");
  const [scenarioId, setScenarioId] = useState<string>("");
  const [goal, setGoal] = useState("");
  const [publicEmbed, setPublicEmbed] = useState(false);
  const [embedAllowedOrigins, setEmbedAllowedOrigins] = useState("");
  const [isPending, startTransition] = useTransition();

  const [state, setState] = useState<CreateConversationState>(initialCreateConversationState);

  useEffect(() => {
    if (!state.message) return;
    if (state.ok) toast.success(state.message);
    else toast.error(state.message);
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
    setPublicEmbed(false);
    setEmbedAllowedOrigins("");
  }

  function close() {
    setOpen(false);
    reset();
  }

  function submit() {
    startTransition(async () => {
      const origins = embedAllowedOrigins
        .split(/[\n,]/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10);

      const res = await fetch("/api/conversations/create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          scenarioId,
          goal: goal.trim() ? goal : undefined,
          publicEmbed: publicEmbed ? true : undefined,
          embedAllowedOrigins: origins.length > 0 ? origins : undefined
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
      if (json.ok && typeof json.redirectTo === "string" && json.redirectTo) {
        // Safari: prefer immediate router navigation over window.location.assign in an effect.
        close();
        router.push(json.redirectTo);
      }
    });
  }

  return (
    <>
      <Button variant={triggerVariant === "primary" ? "default" : "outline"} onClick={() => setOpen(true)}>
        Start gesprek
      </Button>

      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent
          className="sm:max-w-2xl"
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Start gesprek</DialogTitle>
            <p className="text-sm text-muted-foreground">{step === 1 ? "Kies eerst een scenario." : "Stel optioneel een doel in."}</p>
          </DialogHeader>

          {scenarios.length === 0 ? (
            <div className="space-y-4 text-center">
              <p className="text-base font-semibold">Je hebt nog geen scenario’s</p>
              <p className="text-sm text-muted-foreground">
                Maak eerst een scenario. Daarna kun je een gesprek starten en oefenen.
              </p>
              <div className="flex justify-center gap-3">
                <Button asChild>
                  <Link href={`/organisatie/${slug}/scenarios/nieuw`} onClick={() => setOpen(false)}>
                    Maak je eerste scenario
                  </Link>
                </Button>
                <Button type="button" variant="outline" onClick={close}>
                  Annuleren
                </Button>
              </div>
            </div>
          ) : step === 1 ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Scenario kiezen</p>
                  <p className="text-sm text-muted-foreground">Zoek op naam of onderwerp.</p>
                </div>
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="sm:w-80"
                  placeholder="Bijv. boze klant…"
                />
              </div>

              <div className="max-h-72 overflow-auto rounded-md border">
                {filtered.map((s) => {
                  const selected = scenarioId === s.id;
                  return (
                    <Button
                      key={s.id}
                      type="button"
                      variant="ghost"
                      className={["h-auto w-full justify-start rounded-none px-4 py-3 text-left", selected ? "bg-muted" : ""].join(" ")}
                      onClick={() => setScenarioId(s.id)}
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{s.name}</p>
                        <p className="text-xs text-muted-foreground">{s.topic}</p>
                      </div>
                    </Button>
                  );
                })}
                {filtered.length === 0 ? (
                  <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Geen scenario’s gevonden. Pas je zoekterm aan.
                  </div>
                ) : null}
              </div>

              {state.fieldErrors?.scenarioId ? (
                <p className="text-sm text-destructive">{state.fieldErrors.scenarioId}</p>
              ) : null}

              <DialogFooter className="sm:justify-end">
                <Button type="button" variant="outline" onClick={close}>
                  Annuleren
                </Button>
                <Button type="button" disabled={!scenarioId} onClick={() => setStep(2)}>
                  Verder
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="goal">Doel (optioneel)</Label>
                <Textarea
                  id="goal"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  rows={3}
                  placeholder="Bijv. De klant kalmeren en een concrete oplossing afspreken."
                />
                <p className="text-xs text-muted-foreground">
                  Tip: schrijf één zin. Dit helpt om het gesprek doelgericht te houden.
                </p>
              </div>

              <div className="space-y-3 rounded-lg border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="public-embed"
                    checked={publicEmbed}
                    onCheckedChange={(v) => setPublicEmbed(Boolean(v))}
                    disabled={isPending}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="public-embed">Publieke embed (geen login)</Label>
                    <p className="text-xs text-muted-foreground">
                      Maak direct een embed link voor dit gesprek. Credits worden afgeschreven van jouw organisatie.
                    </p>
                  </div>
                </div>

                {publicEmbed ? (
                  <div className="space-y-2">
                    <Label htmlFor="allowed-origins">Toegestane domeinen (optioneel)</Label>
                    <Textarea
                      id="allowed-origins"
                      value={embedAllowedOrigins}
                      onChange={(e) => setEmbedAllowedOrigins(e.target.value)}
                      rows={2}
                      placeholder={"Bijv.\nhttps://example.com\nhttps://app.example.com"}
                      disabled={isPending}
                    />
                    <p className="text-xs text-muted-foreground">
                      Laat leeg om overal toe te staan. Eén per regel of gescheiden door komma’s.
                    </p>
                  </div>
                ) : null}
              </div>

              <DialogFooter className="sm:justify-between">
                <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={isPending}>
                  Terug
                </Button>
                <div className="flex items-center gap-2">
                  <Button type="button" variant="outline" onClick={close} disabled={isPending}>
                    Annuleren
                  </Button>
                  <Button type="button" onClick={submit} disabled={isPending}>
                    {isPending ? "Bezig..." : "Gesprek starten"}
                  </Button>
                </div>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

