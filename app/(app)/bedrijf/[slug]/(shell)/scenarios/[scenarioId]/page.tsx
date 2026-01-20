import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScenarioForm } from "@/components/scenarios/ScenarioForm";
import { DeleteScenarioSection } from "@/components/scenarios/DeleteScenarioDialog";

export default async function EditScenarioPage({
  params
}: {
  params: Promise<{ slug: string; scenarioId: string }>;
}) {
  const { slug, scenarioId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: scenario, error } = await supabase
    .from("scenarios")
    .select("id, name, persona, topic, instructions, evaluation_criteria")
    .eq("id", scenarioId)
    .single();

  if (error || !scenario) notFound();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Scenario bewerken</h1>
          <p className="text-sm text-zinc-600">Pas je scenario aan en sla op. Verwijderen kan onderaan.</p>
        </div>

        <Link
          href={`/bedrijf/${slug}/scenarios`}
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Terug naar lijst
        </Link>
      </header>

      <ScenarioForm
        mode="edit"
        slug={slug}
        scenarioId={scenarioId}
        initialValues={{
          name: scenario.name,
          persona: scenario.persona,
          topic: scenario.topic,
          instructions: scenario.instructions,
          evaluationCriteria: scenario.evaluation_criteria ?? ""
        }}
      />

      <DeleteScenarioSection slug={slug} scenarioId={scenarioId} />
    </div>
  );
}

