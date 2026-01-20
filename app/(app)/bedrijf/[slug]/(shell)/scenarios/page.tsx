import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { ScenariosListClient, type ScenarioListItem } from "@/components/scenarios/ScenariosListClient";
import { StartConversationWizard, type ScenarioOption } from "@/components/conversations/StartConversationWizard";

export default async function ScenariosPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: scenarios, error } = await supabase
    .from("scenarios")
    .select("id, name, persona, topic, updated_at, created_at")
    .order("updated_at", { ascending: false });

  const items: ScenarioListItem[] = (scenarios ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    persona: s.persona,
    topic: s.topic,
    updated_at: s.updated_at ?? s.created_at
  }));

  const scenarioOptions: ScenarioOption[] = (scenarios ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    topic: s.topic
  }));

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Scenario’s</h1>
          <p className="text-sm text-zinc-600">
            Maak scenario’s die trainers direct kunnen gebruiken. Houd het kort en concreet.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <StartConversationWizard slug={slug} scenarios={scenarioOptions} triggerVariant="secondary" />
          <Link
            href={`/bedrijf/${slug}/scenarios/nieuw`}
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Nieuw scenario
          </Link>
        </div>
      </header>

      {error ? (
        <EmptyState
          title="Scenario’s laden lukt niet"
          description="Probeer het opnieuw. Als dit blijft gebeuren, neem contact op met support."
          primaryAction={{ label: "Naar dashboard", href: `/bedrijf/${slug}/dashboard` }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nog geen scenario’s"
          description="Maak je eerste scenario. Gebruik eventueel een preset, dan heb je direct een goed startpunt."
          primaryAction={{ label: "Nieuw scenario", href: `/bedrijf/${slug}/scenarios/nieuw` }}
          secondaryAction={{ label: "Naar dashboard", href: `/bedrijf/${slug}/dashboard` }}
        />
      ) : (
        <ScenariosListClient slug={slug} initialItems={items} />
      )}
    </div>
  );
}

