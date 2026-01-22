import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { buildN8NPayload } from "@/lib/n8n/payload";

const BodySchema = z.object({
  token: z.string().uuid(),
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
  if (code === "23514") return 402;
  if (code === "P0001" && (message ?? "").toLowerCase().includes("credit")) return 402;
  if (code === "42501") return 403;
  if (code === "22023") return 400;
  if (code === "23503") return 404;
  return 500;
}

function getIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") || "unknown";
}

function normalizeOrigin(origin: string): string {
  // Keep scheme + host + port; exact match allowlist.
  try {
    const u = new URL(origin);
    return u.origin;
  } catch {
    return origin.trim();
  }
}

export async function POST(request: Request) {
  const env = getSupabaseEnv();
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) {
    return jsonError(500, "N8N is niet geconfigureerd.");
  }

  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  const ip = getIp(request);
  const origin = request.headers.get("origin");

  const admin = createSupabaseAdminClient();

  // Validate token + conversation match + active
  const { data: tokenRow, error: tokenError } = await admin
    .from("conversation_embed_tokens")
    .select("token, conversation_id, organization_id, active")
    .eq("token", parsed.data.token)
    .eq("active", true)
    .maybeSingle();

  if (tokenError) return jsonError(500, "Embed token laden lukt niet.");
  if (!tokenRow) return jsonError(404, "Embed token niet gevonden.");
  if (tokenRow.conversation_id !== parsed.data.conversationId) return jsonError(403, "Geen toegang.");

  // Load conversation settings and scenario context
  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("id, organization_id, scenario_id, mode, status, public_embed_enabled, embed_allowed_origins")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (convError) return jsonError(500, "Gesprek laden lukt niet.");
  if (!conversation) return jsonError(404, "Gesprek niet gevonden.");
  if (conversation.status !== "active") return jsonError(409, "Dit gesprek is inactief.");
  if (!conversation.public_embed_enabled) return jsonError(403, "Deze embed is niet publiek.");
  if (conversation.organization_id !== tokenRow.organization_id) return jsonError(403, "Geen toegang.");

  // Origin allowlist (optional)
  const allowed = (conversation.embed_allowed_origins ?? []) as string[];
  if (allowed.length > 0) {
    if (!origin) return jsonError(403, "Origin ontbreekt.");
    const o = normalizeOrigin(origin);
    const normalizedAllowed = allowed.map(normalizeOrigin);
    if (!normalizedAllowed.includes(o)) return jsonError(403, "Domein niet toegestaan.");
  }

  // Rate limit: default 30/min per token+ip
  const { data: allowedByRate, error: rateError } = await admin.rpc("embed_rate_limit_hit", {
    p_token: parsed.data.token,
    p_ip: ip,
    p_max_hits: 30,
    p_window_seconds: 60
  });

  if (rateError) return jsonError(500, "Rate limiting mislukt.");
  if (!allowedByRate) return jsonError(429, "Te veel berichten. Probeer het zo nog eens.");

  const { data: organization } = await admin
    .from("organizations")
    .select("id, slug, credits_balance, is_disabled")
    .eq("id", conversation.organization_id)
    .single();

  if (!organization) return jsonError(404, "Organisatie niet gevonden.");
  if (organization.is_disabled) return jsonError(403, "Deze organisatie is gedeactiveerd.");

  // Block sending if no credits
  if ((organization.credits_balance ?? 0) <= 0) {
    return NextResponse.json(
      { ok: false, message: "Je credits zijn op. Koop credits bij om door te gaan.", creditsBalance: 0 },
      { status: 402 }
    );
  }

  const { data: scenario } = await admin
    .from("scenarios")
    .select("persona, topic, instructions, evaluation_criteria")
    .eq("id", conversation.scenario_id)
    .eq("organization_id", conversation.organization_id)
    .single();

  if (!scenario) return jsonError(404, "Scenario niet gevonden.");

  // Fetch last N messages for context (only user+assistant)
  const { data: historyRows } = await admin
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

  // Persist user message (anonymous: created_by null)
  const { error: userMsgError } = await admin.from("messages").insert({
    organization_id: conversation.organization_id,
    conversation_id: conversation.id,
    role: "user",
    input_mode: "text",
    audio_url: null,
    content: parsed.data.userMessage,
    metadata: { source: "embed" },
    created_by: null
  });
  if (userMsgError) return jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");

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
    headers: { "content-type": "application/json", authorization: `Bearer ${env.N8N_WEBHOOK_SECRET}` },
    body: JSON.stringify(payload)
  }).catch(() => null);

  if (!n8nRes || !n8nRes.ok) {
    return jsonError(502, "Er ging iets mis met de AI-verbinding. Probeer opnieuw.");
  }

  const n8nJson = await n8nRes.json().catch(() => null);
  const assistantMessage = typeof n8nJson?.assistantMessage === "string" ? n8nJson.assistantMessage : null;
  if (!assistantMessage) return jsonError(502, "Er ging iets mis met de AI-verbinding. Probeer opnieuw.");

  const debug = n8nJson?.debug ?? undefined;
  const durationMs = Date.now() - startedAt;

  // Spend 1 credit atomically (service role)
  const { data: newBalance, error: spendError } = await admin.rpc("embed_spend_credits", {
    p_organization_id: organization.id,
    p_amount: 1,
    p_reason: "chat_turn",
    p_conversation_id: conversation.id
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

  const { error: assistantInsertError } = await admin.from("messages").insert({
    organization_id: conversation.organization_id,
    conversation_id: conversation.id,
    role: "assistant",
    input_mode: "text",
    audio_url: null,
    content: assistantMessage,
    metadata: { provider: "n8n", durationMs, ...(debug ? { debug } : {}), source: "embed" },
    created_by: null
  });

  if (assistantInsertError) return jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");

  // End the conversation when the agent signals completion (👋).
  if (assistantMessage.includes("👋")) {
    const { error: endError } = await admin.from("conversations").update({ status: "inactive" }).eq("id", conversation.id);
    if (endError) {
      console.error("[embed.chat.send] failed to mark conversation inactive", { endError, conversationId: conversation.id });
    }
  }

  return NextResponse.json({ ok: true, assistantMessage, creditsBalance: newBalance as number });
}

