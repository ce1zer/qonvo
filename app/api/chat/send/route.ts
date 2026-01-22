import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { buildN8NPayload } from "@/lib/n8n/payload";

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  userMessage: z.string().trim().min(1).max(4000)
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

function dbErrorPayload(error: unknown) {
  const e = error as { code?: string; message?: string; details?: string | null; hint?: string | null };
  if (process.env.NODE_ENV === "production") return undefined;
  return {
    code: e?.code ?? null,
    message: e?.message ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null
  };
}

function mapSpendErrorToStatus(code?: string, message?: string) {
  // 402 only when it's truly "no credits"/negative balance guard from DB side.
  if (code === "23514") return 402; // check violation (often used for non-negative guard)
  if (code === "P0001" && (message ?? "").toLowerCase().includes("credit")) return 402; // raised exception
  if (code === "42501") return 403; // forbidden
  if (code === "22023") return 400; // invalid parameter
  if (code === "23503") return 404; // org not found (FK-ish / custom)
  return 500;
}

export async function POST(request: Request) {
  const env = getSupabaseEnv();
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) {
    return jsonError(500, "N8N is niet geconfigureerd.");
  }

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError(401, "Niet ingelogd.");

  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  // Tenant context
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .maybeSingle();

  if (profileError || !profile?.organization_id) return jsonError(403, "Geen toegang.");

  // Conversation must belong to the user's organization (tenant check)
  const { data: conversation, error: convError } = await supabase
    .from("conversations")
    .select("id, organization_id, scenario_id, mode, status")
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", profile.organization_id)
    .single();

  if (convError || !conversation) return jsonError(404, "Gesprek niet gevonden.");
  if (conversation.status !== "active") return jsonError(409, "Dit gesprek is inactief.");

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, slug, credits_balance")
    .eq("id", profile.organization_id)
    .single();

  if (organizationError || !organization) return jsonError(404, "Organisatie niet gevonden.");

  // Block sending if no credits
  if ((organization.credits_balance ?? 0) <= 0) {
    return NextResponse.json(
      {
        ok: false,
        message: "Je credits zijn op. Koop credits bij om door te gaan.",
        creditsBalance: 0
      },
      { status: 402 }
    );
  }

  const { data: scenario, error: scenarioError } = await supabase
    .from("scenarios")
    .select("persona, topic, instructions, evaluation_criteria")
    .eq("id", conversation.scenario_id)
    .eq("organization_id", profile.organization_id)
    .single();

  if (scenarioError || !scenario) return jsonError(404, "Scenario niet gevonden.");

  // Fetch last N messages for context (only user+assistant)
  const { data: historyRows } = await supabase
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversation.id)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: false })
    .limit(10);

  const history = (historyRows ?? [])
    .slice()
    .reverse()
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
      createdAt: m.created_at
    }));

  // Persist user message first (append-only)
  const { data: userMsgRow, error: userMsgError } = await supabase
    .from("messages")
    .insert({
      organization_id: profile.organization_id,
      conversation_id: conversation.id,
      role: "user",
      input_mode: "text",
      audio_url: null,
      content: parsed.data.userMessage,
      metadata: {},
      created_by: userData.user.id
    })
    .select("id, created_at")
    .single();

  if (userMsgError || !userMsgRow) return jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");

  const payload = buildN8NPayload({
    conversationId: conversation.id,
    organization: { id: organization.id, slug: organization.slug },
    scenario: {
      persona: scenario.persona,
      topic: scenario.topic,
      instructions: scenario.instructions,
      evaluation: scenario.evaluation_criteria ?? null
    },
    mode: (conversation.mode as "text" | "voice") ?? ("text" as const),
    userMessage: parsed.data.userMessage,
    history
  });

  const startedAt = Date.now();
  const n8nRes = await fetch(env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${env.N8N_WEBHOOK_SECRET}`
    },
    body: JSON.stringify(payload)
  }).catch(() => null);

  if (!n8nRes || !n8nRes.ok) {
    return jsonError(502, "Er ging iets mis met de AI-verbinding. Probeer opnieuw.");
  }

  const n8nJson = await n8nRes.json().catch(() => null);
  const assistantMessage = typeof n8nJson?.assistantMessage === "string" ? n8nJson.assistantMessage : null;
  if (!assistantMessage) {
    return jsonError(502, "Er ging iets mis met de AI-verbinding. Probeer opnieuw.");
  }

  const debug = n8nJson?.debug ?? undefined;
  const durationMs = Date.now() - startedAt;

  // Spend 1 credit atomically (ledger + non-negative guard)
  // We do this after we have the assistant reply. If a concurrent request consumed the last credit,
  // the RPC will fail and we block the turn.
  const { data: newBalance, error: spendError } = await supabase.rpc("spend_credits", {
    organization_id: organization.id,
    amount: 1,
    reason: "chat_turn",
    conversation_id: conversation.id
  });

  if (spendError) {
    const status = mapSpendErrorToStatus(spendError.code, spendError.message);
    return NextResponse.json(
      {
        ok: false,
        message:
          status === 402
            ? "Je credits zijn op. Koop credits bij om door te gaan."
            : "Credits afschrijven is niet gelukt. Probeer het opnieuw.",
        creditsBalance: organization.credits_balance ?? 0,
        dbError: dbErrorPayload(spendError)
      },
      { status }
    );
  }

  const { error: assistantInsertError } = await supabase.from("messages").insert({
    organization_id: profile.organization_id,
    conversation_id: conversation.id,
    role: "assistant",
    input_mode: "text",
    audio_url: null,
    content: assistantMessage,
    metadata: {
      provider: "n8n",
      durationMs,
      ...(debug ? { debug } : {})
    },
    created_by: null
  });

  if (assistantInsertError) {
    return jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");
  }

  // End the conversation when the agent signals completion (👋).
  if (assistantMessage.includes("👋")) {
    const { error: endError } = await supabase
      .from("conversations")
      .update({ status: "inactive" })
      .eq("id", conversation.id)
      .eq("organization_id", profile.organization_id);
    if (endError) {
      console.error("[chat.send] failed to mark conversation inactive", { endError, conversationId: conversation.id });
    }
  }

  return NextResponse.json({
    ok: true,
    assistantMessage,
    creditsBalance: newBalance
  });
}

