import Link from "next/link";

import { ScenarioForm } from "@/components/scenarios/ScenarioForm";
import { PageHeader } from "@/components/app/PageHeader";
import { Button } from "@/components/ui/button";

export default async function NewScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Nieuw scenario"
        description="Gebruik een preset of schrijf zelf. Focus op realistische context en concrete instructies."
        actions={
          <Button asChild variant="outline">
            <Link href={`/bedrijf/${slug}/scenarios`}>Terug naar lijst</Link>
          </Button>
        }
      />

      <ScenarioForm mode="create" slug={slug} />
    </div>
  );
}

