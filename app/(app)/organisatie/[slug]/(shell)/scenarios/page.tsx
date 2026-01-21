import Link from "next/link";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/EmptyState";
import { ScenariosListClient, type ScenarioListItem } from "@/components/scenarios/ScenariosListClient";
import { StartConversationWizard, type ScenarioOption } from "@/components/conversations/StartConversationWizard";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";

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
      <PageHeader
        title="Scenario’s"
        description="Maak scenario’s die trainers direct kunnen gebruiken. Houd het kort en concreet."
        actions={
          <>
            <StartConversationWizard slug={slug} scenarios={scenarioOptions} triggerVariant="secondary" />
            <Button asChild>
              <Link href={`/organisatie/${slug}/scenarios/nieuw`}>Nieuw scenario</Link>
            </Button>
          </>
        }
      />

      {error ? (
        <EmptyState
          title="Scenario’s laden lukt niet"
          description="Probeer het opnieuw. Als dit blijft gebeuren, neem contact op met support."
          primaryAction={{ label: "Naar dashboard", href: `/organisatie/${slug}/dashboard` }}
        />
      ) : items.length === 0 ? (
        <EmptyState
          title="Nog geen scenario’s"
          description="Maak je eerste scenario. Gebruik eventueel een preset, dan heb je direct een goed startpunt."
          primaryAction={{ label: "Nieuw scenario", href: `/organisatie/${slug}/scenarios/nieuw` }}
          secondaryAction={{ label: "Naar dashboard", href: `/organisatie/${slug}/dashboard` }}
        />
      ) : (
        <ScenariosListClient slug={slug} initialItems={items} />
      )}
    </div>
  );
}

