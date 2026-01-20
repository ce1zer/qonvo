import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatMessage } from "@/components/chat/types";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";

export default async function ConversationChatPage({
  params
}: {
  params: Promise<{ slug: string; conversationId: string }>;
}) {
  const { slug, conversationId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, scenario_id, status, mode, started_at, goal")
    .eq("id", conversationId)
    .single();

  if (convError || !conversation) notFound();

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .select("id, name, topic")
    .eq("id", conversation.scenario_id)
    .single();

  if (scenarioError || !scenario) notFound();

  const { data: messagesRows } = await supabase
    .from("messages")
    .select("id, role, content, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(200);

  const initialMessages: ChatMessage[] = (messagesRows ?? []).map((m) => ({
    id: m.id,
    role: m.role as "user" | "assistant",
    content: m.content,
    createdAt: m.created_at
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gesprek"
        description={`Scenario: ${scenario.name} · Onderwerp: ${scenario.topic}`}
        actions={
          <>
            <Button type="button" variant="outline" size="icon" disabled aria-label="Binnenkort beschikbaar" title="Binnenkort beschikbaar">
              <span aria-hidden>🎤</span>
            </Button>
            <Button asChild variant="outline">
              <Link href={`/bedrijf/${slug}/gesprekken`}>Terug naar gesprekken</Link>
            </Button>
          </>
        }
      />

      <SectionCard>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</p>
            <p className="text-sm font-medium">{conversation.status}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Modus</p>
            <p className="text-sm font-medium">{conversation.mode}</p>
          </div>
        </div>

        {conversation.goal ? (
          <div className="space-y-1">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Doel</p>
            <p className="text-sm">{conversation.goal}</p>
          </div>
        ) : null}
      </SectionCard>

      <ChatPanel conversationId={conversationId} initialMessages={initialMessages} />
    </div>
  );
}

