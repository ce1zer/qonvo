import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatMessage } from "@/components/chat/types";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { Input } from "@/components/ui/input";
import { ConversationHeaderActions } from "@/components/conversations/ConversationHeaderActions";

export default async function ConversationChatPage({
  params
}: {
  params: Promise<{ slug: string; conversationId: string }>;
}) {
  const { slug, conversationId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, scenario_id, status, mode, started_at, goal, public_embed_enabled, embed_allowed_origins")
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

  const { data: embedTokenRow } = await supabase
    .from("conversation_embed_tokens")
    .select("token, active")
    .eq("conversation_id", conversationId)
    .eq("active", true)
    .maybeSingle();

  const embedUrl = embedTokenRow?.token ? `/embed/${embedTokenRow.token}` : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gesprek"
        description={`Scenario: ${scenario.name} · Onderwerp: ${scenario.topic}`}
        actions={
          <>
            <ConversationHeaderActions
              slug={slug}
              conversationId={conversationId}
              status={String(conversation.status ?? "active")}
              mode={String(conversation.mode ?? "text")}
              goal={conversation.goal ?? null}
              publicEmbedEnabled={Boolean(conversation.public_embed_enabled)}
              embedAllowedOrigins={(conversation.embed_allowed_origins ?? null) as string[] | null}
              embedToken={embedTokenRow?.token ?? null}
            />
          </>
        }
      />

      {conversation.public_embed_enabled && embedUrl ? (
        <SectionCard
          title="Embed (publiek)"
          description="Deze chat is toegankelijk zonder login. Credits worden afgeschreven van jouw organisatie."
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Embed URL</p>
              <Input readOnly value={embedUrl} />
              <p className="text-xs text-muted-foreground">
                Gebruik deze URL in een iframe. Tip: stel “Toegestane domeinen” in bij het starten van het gesprek.
              </p>
            </div>
          </div>
        </SectionCard>
      ) : null}

      <ChatPanel conversationId={conversationId} initialMessages={initialMessages} />
    </div>
  );
}

