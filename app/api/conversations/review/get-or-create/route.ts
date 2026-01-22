import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";

const BodySchema = z.object({
  conversationId: z.string().uuid()
});

const ReviewSchema = z.object({
  feedback: z
    .array(
      z.object({
        question: z.string(),
        answer: z.string()
      })
    )
    .default([]),
  feedbackSummary: z.string().default(""),
  isPassed: z.boolean().default(false)
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const env = getSupabaseEnv();
  if (!env.N8N_WEBHOOK_URL || !env.N8N_WEBHOOK_SECRET) {
    return jsonError(500, "N8N is niet geconfigureerd.");
  }

  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError(401, "Niet ingelogd.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) return jsonError(403, "Geen toegang.");

  const admin = createSupabaseAdminClient();

  // Ensure tenant ownership
  const { data: conversation, error: convError } = await admin
    .from("conversations")
    .select("id, organization_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (convError) return jsonError(500, "Gesprek laden lukt niet.");
  if (!conversation) return jsonError(404, "Gesprek niet gevonden.");
  if (conversation.organization_id !== profile.organization_id && profile.role !== "platform_admin") {
    return jsonError(403, "Geen toegang.");
  }

  // Return existing review if present
  const { data: existingReview, error: existingError } = await admin
    .from("conversation_reviews")
    .select("id, review_json, feedback_summary, is_passed, created_at")
    .eq("conversation_id", parsed.data.conversationId)
    .maybeSingle();

  if (existingError) return jsonError(500, "Beoordeling laden lukt niet.");
  if (existingReview?.review_json) {
    return NextResponse.json(
      {
        ok: true,
        review: existingReview.review_json,
        feedbackSummary: existingReview.feedback_summary ?? null,
        isPassed: existingReview.is_passed ?? null,
        createdAt: existingReview.created_at ?? null
      },
      { status: 200 }
    );
  }

  // Build a messages blob for the review prompt
  const { data: messageRows, error: messagesError } = await admin
    .from("messages")
    .select("role, content, created_at")
    .eq("conversation_id", parsed.data.conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(500);

  if (messagesError) return jsonError(500, "Berichten laden lukt niet.");

  const messagesBlob =
    (messageRows ?? [])
      .map((m) => `${m.role === "user" ? "Verkoper" : "AI"}: ${m.content}`)
      .join("\n") || "";

  const payload = {
    // This is what your n8n Switch node keys off:
    responseType: "review",
    sessionID: parsed.data.conversationId,
    // Used by your review agent node (`text: {{$json.messages}}`):
    messages: messagesBlob,
    // Keep a few compatible fields (harmless if unused):
    message: "",
    conversationId: parsed.data.conversationId
  };

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
  const raw = n8nJson?.assistantMessage;

  let reviewObj: unknown = null;
  if (typeof raw === "string") {
    reviewObj = JSON.parse(raw);
  } else if (raw && typeof raw === "object") {
    reviewObj = raw;
  } else {
    return jsonError(502, "Beoordeling is leeg of ongeldig.");
  }

  const reviewParsed = ReviewSchema.safeParse(reviewObj);
  if (!reviewParsed.success) {
    return jsonError(502, "Beoordeling heeft een ongeldig formaat.");
  }

  const review = reviewParsed.data;

  // Upsert to avoid duplicates on retries
  const { error: upsertError } = await admin.from("conversation_reviews").upsert(
    {
      conversation_id: parsed.data.conversationId,
      organization_id: conversation.organization_id,
      review_json: reviewObj,
      feedback_summary: review.feedbackSummary ?? null,
      is_passed: typeof review.isPassed === "boolean" ? review.isPassed : null
    },
    { onConflict: "conversation_id" }
  );

  if (upsertError) return jsonError(500, "Beoordeling opslaan lukt niet.");

  return NextResponse.json(
    {
      ok: true,
      review: reviewObj,
      feedbackSummary: review.feedbackSummary ?? null,
      isPassed: typeof review.isPassed === "boolean" ? review.isPassed : null
    },
    { status: 200 }
  );
}

