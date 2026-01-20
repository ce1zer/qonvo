import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";

export default async function GesprekkenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  return (
    <div className="space-y-6">
      <PageHeader title="Gesprekken" description="Hier vind je alle gesprekken binnen je bedrijf." />

      <EmptyState
        title="Nog geen gesprekken"
        description="Start een gesprek vanuit een scenario. Daarna verschijnen je gesprekken hier, inclusief status en feedback."
        primaryAction={{ label: "Start gesprek", href: `/bedrijf/${slug}/dashboard` }}
        secondaryAction={{ label: "Bekijk scenario’s", href: `/bedrijf/${slug}/scenarios` }}
      />
    </div>
  );
}

