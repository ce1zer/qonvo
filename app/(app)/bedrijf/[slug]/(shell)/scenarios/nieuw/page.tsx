import Link from "next/link";

import { ScenarioForm } from "@/components/scenarios/ScenarioForm";

export default async function NewScenarioPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Nieuw scenario</h1>
          <p className="text-sm text-zinc-600">
            Gebruik een preset of schrijf zelf. Focus op realistische context en concrete instructies.
          </p>
        </div>

        <Link
          href={`/bedrijf/${slug}/scenarios`}
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Terug naar lijst
        </Link>
      </header>

      <ScenarioForm mode="create" slug={slug} />
    </div>
  );
}

