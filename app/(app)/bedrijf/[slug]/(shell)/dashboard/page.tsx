import Link from "next/link";

import { EmptyState } from "@/components/EmptyState";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { StartConversationWizard, type ScenarioOption } from "@/components/conversations/StartConversationWizard";

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
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-zinc-600">Kies een volgende stap om te starten.</p>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Link
          href={`/bedrijf/${slug}/scenarios`}
          className="rounded-lg border border-zinc-200 bg-white p-5 hover:bg-zinc-50"
        >
          <p className="text-sm font-medium text-zinc-900">Nieuw scenario</p>
          <p className="mt-1 text-sm text-zinc-600">
            Maak een persona, topic en beoordelingscriteria zodat je kunt oefenen.
          </p>
        </Link>

        <div className="rounded-lg border border-zinc-200 bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm font-medium text-zinc-900">Start gesprek</p>
              <p className="text-sm text-zinc-600">Kies een scenario en begin met oefenen.</p>
            </div>
            <StartConversationWizard slug={slug} scenarios={scenarioOptions} />
          </div>
        </div>
      </div>

      <EmptyState
        title="Tip: houd je flow simpel"
        description="Begin met één scenario en één gesprek. Daarna kun je uitbreiden met variaties en moeilijkheidsniveaus."
        primaryAction={{ label: "Nieuw scenario", href: `/bedrijf/${slug}/scenarios` }}
        secondaryAction={{ label: "Naar gesprekken", href: `/bedrijf/${slug}/gesprekken` }}
      />
    </div>
  );
}

