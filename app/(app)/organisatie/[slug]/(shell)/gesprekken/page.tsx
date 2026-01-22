import Link from "next/link";
import { redirect } from "next/navigation";

import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ConversationsTableClient, type ConversationsListItem } from "@/components/conversations/ConversationsTableClient";

export default async function GesprekkenPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/organisatie/${slug}/gesprekken`)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    redirect("/");
  }

  const { data: conversationRows, error: conversationsError } = await supabase
    .from("conversations")
    // Show all conversations, including ones with 0 messages.
    // We still fetch the latest message timestamp (if any) to display "Laatst bijgewerkt".
    .select(
      "id, scenario_id, status, mode, started_at, goal, public_embed_enabled, embed_allowed_origins, scenarios(name, topic), messages(created_at)"
    )
    .eq("organization_id", profile.organization_id)
    .order("created_at", { foreignTable: "messages", ascending: false })
    .limit(1, { foreignTable: "messages" })
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

  const conversationIds = (conversationRows ?? []).map((c) => c.id).filter(Boolean) as string[];
  const { data: embedTokenRows } =
    conversationIds.length > 0
      ? await supabase
          .from("conversation_embed_tokens")
          .select("token, conversation_id, active")
          .in("conversation_id", conversationIds)
          .eq("active", true)
      : { data: [] as Array<{ token: string; conversation_id: string; active: boolean }> };

  const tokenByConversationId = new Map((embedTokenRows ?? []).map((r) => [r.conversation_id, r.token]));

  const conversations: ConversationsListItem[] = (conversationRows ?? []).map((c) => {
    const lastMessageAt = (c as { messages?: Array<{ created_at: string }> | null }).messages?.[0]?.created_at ?? null;
    const updatedAtIso = lastMessageAt ?? (c as { started_at: string | null }).started_at ?? null;
    const scenariosRaw = (c as unknown as { scenarios?: unknown }).scenarios;
    const scenario =
      (Array.isArray(scenariosRaw) ? (scenariosRaw[0] as unknown) : scenariosRaw) as { name: string; topic: string } | null | undefined;
    return {
      id: c.id,
      scenario: scenario ?? null,
      status: String((c as { status?: string | null }).status ?? ""),
      mode: String((c as { mode?: string | null }).mode ?? ""),
      startedAt: (c as { started_at: string | null }).started_at ?? null,
      updatedAt: updatedAtIso,
      goal: (c as { goal?: string | null }).goal ?? null,
      publicEmbedEnabled: Boolean((c as { public_embed_enabled?: boolean | null }).public_embed_enabled),
      embedAllowedOrigins: (c as { embed_allowed_origins?: string[] | null }).embed_allowed_origins ?? null,
      embedToken: tokenByConversationId.get(c.id) ?? null
    };
  });

  const canManage = profile.role === "organization_admin" || profile.role === "platform_admin";

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
          description="Start een gesprek vanuit een scenario. Daarna verschijnen je gesprekken hier."
          primaryAction={{ label: "Start gesprek", href: `/organisatie/${slug}/dashboard` }}
          secondaryAction={{ label: "Bekijk scenario’s", href: `/organisatie/${slug}/scenarios` }}
        />
      ) : (
        <SectionCard contentClassName="p-0">
          <ConversationsTableClient slug={slug} conversations={conversations} canManage={canManage} />
        </SectionCard>
      )}
    </div>
  );
}

