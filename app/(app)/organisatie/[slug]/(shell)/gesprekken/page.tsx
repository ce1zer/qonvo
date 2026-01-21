import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { DataTableShell } from "@/components/app/DataTableShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function GesprekkenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/organisatie/${slug}/gesprekken`)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    redirect("/");
  }

  const { data: conversationRows, error: conversationsError } = await supabase
    .from("conversations")
    .select("id, scenario_id, status, mode, started_at")
    .eq("organization_id", profile.organization_id)
    .order("started_at", { ascending: false })
    .limit(100);

  if (conversationsError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Gesprekken" description="Hier vind je alle gesprekken binnen je organisatie." />
        <EmptyState
          title="Gesprekken laden lukt niet"
          description="Probeer het opnieuw. Als dit blijft gebeuren, neem contact op met support."
          primaryAction={{ label: "Naar dashboard", href: `/organisatie/${slug}/dashboard` }}
        />
      </div>
    );
  }

  const conversations = (conversationRows ?? []) as Array<{
    id: string;
    scenario_id: string;
    status: string;
    mode: string;
    started_at: string | null;
  }>;

  const scenarioIds = Array.from(new Set(conversations.map((c) => c.scenario_id).filter(Boolean)));
  const { data: scenarioRows } =
    scenarioIds.length > 0
      ? await supabase.from("scenarios").select("id, name, topic").in("id", scenarioIds)
      : { data: [] as Array<{ id: string; name: string; topic: string }> };

  const scenarioById = new Map((scenarioRows ?? []).map((s) => [s.id, s]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gesprekken"
        description="Hier vind je alle gesprekken binnen je organisatie."
        actions={
          <Button asChild variant="secondary">
            <Link href={`/organisatie/${slug}/dashboard`}>Start gesprek</Link>
          </Button>
        }
      />

      {conversations.length === 0 ? (
        <EmptyState
          title="Nog geen gesprekken"
          description="Start een gesprek vanuit een scenario. Daarna verschijnen je gesprekken hier, inclusief status en feedback."
          primaryAction={{ label: "Start gesprek", href: `/organisatie/${slug}/dashboard` }}
          secondaryAction={{ label: "Bekijk scenario’s", href: `/organisatie/${slug}/scenarios` }}
        />
      ) : (
        <SectionCard contentClassName="p-0">
          <DataTableShell>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scenario</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Modus</TableHead>
                  <TableHead>Gestart</TableHead>
                  <TableHead className="text-right">Actie</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((c) => {
                  const scenario = scenarioById.get(c.scenario_id);
                  const started = c.started_at ? new Date(c.started_at).toLocaleString("nl-NL") : "—";
                  const status = String(c.status ?? "");
                  const isActive = status === "active";
                  const mode = String(c.mode ?? "");
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="min-w-0">
                        <p className="truncate font-medium">{scenario?.name ?? "Scenario"}</p>
                        {scenario?.topic ? <p className="truncate text-xs text-muted-foreground">{scenario.topic}</p> : null}
                      </TableCell>
                      <TableCell>
                        <Badge variant={isActive ? "secondary" : "outline"}>{status || "—"}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{mode || "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{started}</TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/organisatie/${slug}/gesprekken/${c.id}`}>Openen</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </DataTableShell>
        </SectionCard>
      )}
    </div>
  );
}

