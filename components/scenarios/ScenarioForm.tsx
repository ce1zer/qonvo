"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";

import {
  ScenarioUpsertSchema,
  initialScenarioActionState,
  type ScenarioActionState,
  type ScenarioUpsertInput,
  type ScenarioPresetId
} from "@/lib/scenarios/schema";
import { SCENARIO_PRESETS } from "@/components/scenarios/presets";

type Mode = "create" | "edit";

const PresetSchema = z.object({
  preset: z.string().optional()
});

export function ScenarioForm({
  mode,
  slug,
  scenarioId,
  initialValues
}: {
  mode: Mode;
  slug: string;
  scenarioId?: string;
  initialValues?: Partial<ScenarioUpsertInput>;
}) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState(initialScenarioActionState);

  const schema = useMemo(() => ScenarioUpsertSchema, []);

  const form = useForm<ScenarioUpsertInput>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      name: initialValues?.name ?? "",
      persona: initialValues?.persona ?? "",
      topic: initialValues?.topic ?? "",
      instructions: initialValues?.instructions ?? "",
      evaluationCriteria: initialValues?.evaluationCriteria ?? ""
    }
  });

  const presetForm = useForm<z.infer<typeof PresetSchema>>({
    resolver: zodResolver(PresetSchema),
    defaultValues: { preset: "" }
  });

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

  function applyPreset(presetId: ScenarioPresetId) {
    const preset = SCENARIO_PRESETS[presetId];
    if (!preset) return;

    // Only suggest a name if it's currently empty; overwrite other fields to guide the user.
    const currentName = form.getValues("name");
    if (!currentName.trim()) {
      form.setValue("name", preset.values.nameSuggestion, { shouldValidate: true, shouldDirty: true });
    }
    form.setValue("persona", preset.values.persona, { shouldValidate: true, shouldDirty: true });
    form.setValue("topic", preset.values.topic, { shouldValidate: true, shouldDirty: true });
    form.setValue("instructions", preset.values.instructions, { shouldValidate: true, shouldDirty: true });
    form.setValue("evaluationCriteria", preset.values.evaluationCriteria ?? "", {
      shouldValidate: false,
      shouldDirty: true
    });
  }

  function fieldError(name: keyof ScenarioUpsertInput) {
    return (form.formState.errors[name]?.message as string | undefined) ?? state.fieldErrors?.[String(name)];
  }

  function onSubmit(values: ScenarioUpsertInput) {
    startTransition(async () => {
      const endpoint = mode === "create" ? "/api/scenarios/create" : "/api/scenarios/update";
      const body: {
        slug: string;
        scenarioId?: string;
        name: string;
        persona: string;
        topic: string;
        instructions: string;
        evaluationCriteria: string;
      } = {
        slug,
        name: values.name,
        persona: values.persona,
        topic: values.topic,
        instructions: values.instructions,
        evaluationCriteria: values.evaluationCriteria ?? ""
      };
      if (scenarioId) body.scenarioId = scenarioId;

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
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
    <div className="space-y-5">
      {mode === "create" ? (
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900">Start met een preset (optioneel)</p>
              <p className="text-sm text-zinc-600">
                Kies een voorbeeld om sneller te beginnen. Je kunt alles daarna aanpassen.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-56"
                {...presetForm.register("preset", {
                  onChange: (e) => {
                    const value = String(e.target.value);
                    if (!value) return;
                    applyPreset(value as ScenarioPresetId);
                  }
                })}
              >
                <option value="">Kies een preset…</option>
                {Object.entries(SCENARIO_PRESETS).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="grid gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="name">
                Naam <span className="text-red-600">*</span>
              </label>
              <input
                id="name"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Bijv. Boze klant: klacht over levering"
                {...form.register("name")}
              />
              {fieldError("name") ? (
                <p className="text-xs text-red-600">{fieldError("name")}</p>
              ) : (
                <p className="text-xs text-zinc-500">Kies een naam die je later snel terugvindt.</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="persona">
                Persona <span className="text-red-600">*</span>
              </label>
              <textarea
                id="persona"
                rows={3}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Wie is de gesprekspartner? Wat is hun houding, doel en context?"
                {...form.register("persona")}
              />
              {fieldError("persona") ? (
                <p className="text-xs text-red-600">{fieldError("persona")}</p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Voorbeeld: “Je bent een boze klant omdat een belofte niet is nagekomen. Je wil een oplossing en
                  duidelijkheid.”
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="topic">
                Onderwerp <span className="text-red-600">*</span>
              </label>
              <input
                id="topic"
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Bijv. Klacht over levering"
                {...form.register("topic")}
              />
              {fieldError("topic") ? <p className="text-xs text-red-600">{fieldError("topic")}</p> : null}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="instructions">
                Instructies <span className="text-red-600">*</span>
              </label>
              <textarea
                id="instructions"
                rows={6}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Hoe moet de gesprekspartner reageren? Welke grenzen/tone of rules gelden?"
                {...form.register("instructions")}
              />
              {fieldError("instructions") ? (
                <p className="text-xs text-red-600">{fieldError("instructions")}</p>
              ) : (
                <p className="text-xs text-zinc-500">
                  Tip: schrijf concreet. Bijvoorbeeld: “Start met frustratie, reageer op empathie, geef pas na
                  doorvragen de details.”
                </p>
              )}
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium" htmlFor="evaluationCriteria">
                Beoordelingscriteria (optioneel)
              </label>
              <textarea
                id="evaluationCriteria"
                rows={4}
                className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400"
                placeholder="Waar let je op? Bijv. empathie, structuur, omgaan met bezwaren, next steps…"
                {...form.register("evaluationCriteria")}
              />
              <p className="text-xs text-zinc-500">
                Dit helpt straks bij feedback/evaluatie. Voor MVP mag dit leeg blijven.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3">
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? "Bezig..." : mode === "create" ? "Opslaan" : "Wijzigingen opslaan"}
          </button>
        </div>
      </form>
    </div>
  );
}

