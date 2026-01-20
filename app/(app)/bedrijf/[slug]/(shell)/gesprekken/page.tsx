import { EmptyState } from "@/components/EmptyState";

export default async function GesprekkenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Gesprekken</h1>
        <p className="text-sm text-zinc-600">Hier vind je alle gesprekken binnen je bedrijf.</p>
      </header>

      <EmptyState
        title="Nog geen gesprekken"
        description="Start een gesprek vanuit een scenario. Daarna verschijnen je gesprekken hier, inclusief status en feedback."
        primaryAction={{ label: "Start gesprek", href: `/bedrijf/${slug}/dashboard` }}
        secondaryAction={{ label: "Bekijk scenario’s", href: `/bedrijf/${slug}/scenarios` }}
      />
    </div>
  );
}

