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
import { SectionCard } from "@/components/app/SectionCard";
import { FormField } from "@/components/app/FormField";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

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
        <SectionCard
          title="Start met een preset (optioneel)"
          description="Kies een voorbeeld om sneller te beginnen. Je kunt alles daarna aanpassen."
        >
          <div className="flex items-center gap-2">
            <select
              aria-label="Preset kiezen"
              className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-72"
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
        </SectionCard>
      ) : null}

      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <SectionCard>
          <div className="grid gap-4">
            <FormField
              id="name"
              label="Naam *"
              helperText="Kies een naam die je later snel terugvindt."
              error={fieldError("name")}
            >
              <Input id="name" placeholder="Bijv. Boze klant: klacht over levering" {...form.register("name")} />
            </FormField>

            <FormField
              id="persona"
              label="Persona *"
              helperText="Voorbeeld: “Je bent een boze klant omdat een belofte niet is nagekomen. Je wil een oplossing en duidelijkheid.”"
              error={fieldError("persona")}
            >
              <Textarea
                id="persona"
                rows={3}
                placeholder="Wie is de gesprekspartner? Wat is hun houding, doel en context?"
                {...form.register("persona")}
              />
            </FormField>

            <FormField id="topic" label="Onderwerp *" error={fieldError("topic")}>
              <Input id="topic" placeholder="Bijv. Klacht over levering" {...form.register("topic")} />
            </FormField>

            <FormField
              id="instructions"
              label="Instructies *"
              helperText="Tip: schrijf concreet. Bijvoorbeeld: “Start met frustratie, reageer op empathie, geef pas na doorvragen de details.”"
              error={fieldError("instructions")}
            >
              <Textarea
                id="instructions"
                rows={6}
                placeholder="Hoe moet de gesprekspartner reageren? Welke grenzen/tone of rules gelden?"
                {...form.register("instructions")}
              />
            </FormField>

            <FormField
              id="evaluationCriteria"
              label="Beoordelingscriteria (optioneel)"
              helperText="Dit helpt straks bij feedback/evaluatie. Voor MVP mag dit leeg blijven."
            >
              <Textarea
                id="evaluationCriteria"
                rows={4}
                placeholder="Waar let je op? Bijv. empathie, structuur, omgaan met bezwaren, next steps…"
                {...form.register("evaluationCriteria")}
              />
            </FormField>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3">
          <Button
            type="submit"
            disabled={isPending || !form.formState.isValid}
          >
            {isPending ? "Bezig..." : mode === "create" ? "Opslaan" : "Wijzigingen opslaan"}
          </Button>
        </div>
      </form>
    </div>
  );
}

