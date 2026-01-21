import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CreateConversationState } from "@/actions/conversations/types";

const BodySchema = z.object({
  slug: z.string().min(1),
  scenarioId: z.string().uuid(),
  goal: z.string().trim().max(500).optional(),
  publicEmbed: z.boolean().optional(),
  embedAllowedOrigins: z.array(z.string().min(1)).max(10).optional()
});

function jsonError(status: number, message: string, fieldErrors?: Record<string, string>) {
  const body: CreateConversationState = { ok: false, message, fieldErrors };
  return NextResponse.json(body, { status });
}

export async function POST(request: Request) {
  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] = issue.message;
    }
    return jsonError(400, "Controleer de invoer.", fieldErrors);
  }

  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError(401, "Niet ingelogd.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    if (profileError) console.error("[conversations.create] profile lookup failed", { profileError });
    return jsonError(403, "Je account is nog niet gekoppeld aan een organisatie.");
  }

  // Ensure the scenario belongs to this tenant (never trust client scenarioId)
  const { data: scenarioRow, error: scenarioError } = await supabase
    .from("scenarios")
    .select("id")
    .eq("id", parsed.data.scenarioId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (scenarioError) {
    console.error("[conversations.create] scenario lookup failed", { scenarioError });
    return jsonError(500, "Scenario laden lukt niet. Probeer het opnieuw.");
  }

  if (!scenarioRow) {
    return jsonError(404, "Scenario niet gevonden.");
  }

  const { data: inserted, error: insertError } = await supabase
    .from("conversations")
    .insert({
      organization_id: profile.organization_id,
      scenario_id: parsed.data.scenarioId,
      started_by: userData.user.id,
      status: "active",
      mode: "text",
      goal: parsed.data.goal ?? null,
      public_embed_enabled: Boolean(parsed.data.publicEmbed),
      embed_allowed_origins: (parsed.data.embedAllowedOrigins ?? []).length > 0 ? parsed.data.embedAllowedOrigins : null
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    if (insertError) console.error("[conversations.create] insert failed", { insertError });
    // Common case: missing INSERT policy / RLS violation
    const code = String((insertError as { code?: string } | null)?.code ?? "");
    if (code === "42501") {
      return jsonError(403, "Geen toegang om een gesprek te starten.");
    }
    if (code === "PGRST204") {
      // PostgREST schema cache is stale or the column is missing in the database.
      return jsonError(
        500,
        "De database is nog niet bijgewerkt (kolom ontbreekt). Voer de migratie uit en refresh de schema cache in Supabase."
      );
    }
    return jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");
  }

  if (parsed.data.publicEmbed) {
    try {
      const admin = createSupabaseAdminClient();
      await admin.from("conversation_embed_tokens").insert({
        conversation_id: inserted.id,
        organization_id: profile.organization_id,
        active: true,
        created_by: userData.user.id
      });
    } catch {
      // Best-effort: conversation exists; user can re-enable/regenerate later.
    }
  }

  const res: CreateConversationState = {
    ok: true,
    message: "Gesprek gestart.",
    conversationId: inserted.id,
    redirectTo: `/organisatie/${parsed.data.slug}/gesprekken/${inserted.id}`
  };
  return NextResponse.json(res, { status: 200 });
}

