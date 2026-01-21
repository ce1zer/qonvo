import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StartConversationWizard, type ScenarioOption } from "@/components/conversations/StartConversationWizard";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";

export default async function TenantDashboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: scenarios } = await supabase.from("scenarios").select("id, name, topic").order("updated_at", {
    ascending: false
  });
  const scenarioOptions: ScenarioOption[] = (scenarios ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    topic: s.topic
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description="Kies een volgende stap om te starten." />

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Nieuw scenario"
          description="Maak een persona, topic en beoordelingscriteria zodat je kunt oefenen."
          actions={
            <Link href={`/organisatie/${slug}/scenarios`} className="text-sm font-medium underline underline-offset-4">
              Openen
            </Link>
          }
        >
          <div />
        </SectionCard>

        <SectionCard
          title="Start gesprek"
          description="Kies een scenario en begin met oefenen."
          actions={<StartConversationWizard slug={slug} scenarios={scenarioOptions} />}
        >
          <div />
        </SectionCard>
      </div>

      <EmptyState
        title="Tip: houd je flow simpel"
        description="Begin met één scenario en één gesprek. Daarna kun je uitbreiden met variaties en moeilijkheidsniveaus."
        primaryAction={{ label: "Nieuw scenario", href: `/organisatie/${slug}/scenarios` }}
        secondaryAction={{ label: "Naar gesprekken", href: `/organisatie/${slug}/gesprekken` }}
      />
    </div>
  );
}

