import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScenarioForm } from "@/components/scenarios/ScenarioForm";
import { DeleteScenarioSection } from "@/components/scenarios/DeleteScenarioDialog";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";

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
      <PageHeader
        title="Scenario bewerken"
        description="Pas je scenario aan en sla op. Verwijderen kan onderaan."
        actions={
          <Button asChild variant="outline">
            <Link href={`/organisatie/${slug}/scenarios`}>Terug naar lijst</Link>
          </Button>
        }
      />

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

