import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ChatPanel } from "@/components/chat/ChatPanel";
import type { ChatMessage } from "@/components/chat/types";

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
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">Gesprek</h1>
          <p className="text-sm text-zinc-600">
            Scenario: <span className="font-medium text-zinc-900">{scenario.name}</span> · Onderwerp:{" "}
            <span className="font-medium text-zinc-900">{scenario.topic}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled
            title="Binnenkort beschikbaar"
            className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-400"
          >
            🎤
          </button>
          <Link
            href={`/bedrijf/${slug}/gesprekken`}
            className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Terug naar gesprekken
          </Link>
        </div>
      </header>

      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="grid gap-2 text-sm text-zinc-700 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Status</p>
            <p className="font-medium text-zinc-900">{conversation.status}</p>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Modus</p>
            <p className="font-medium text-zinc-900">{conversation.mode}</p>
          </div>
        </div>

        {conversation.goal ? (
          <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Doel</p>
            <p className="mt-1 text-sm text-zinc-900">{conversation.goal}</p>
          </div>
        ) : null}
      </div>

      <ChatPanel conversationId={conversationId} initialMessages={initialMessages} />
    </div>
  );
}

