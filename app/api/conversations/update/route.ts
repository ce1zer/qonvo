import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireConversationManager } from "@/app/api/conversations/_auth";

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  goal: z.string().trim().max(500).nullable().optional(),
  publicEmbedEnabled: z.boolean().optional(),
  embedAllowedOrigins: z.array(z.string().min(1)).max(10).nullable().optional(),
  status: z.enum(["active", "inactive"]).nullable().optional(),
  mode: z.enum(["text", "voice"]).nullable().optional()
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

export async function POST(request: Request) {
  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  const auth = await requireConversationManager();
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const admin = createSupabaseAdminClient();

  // Ensure tenant ownership
  const { data: conv, error: convError } = await admin
    .from("conversations")
    .select("id, organization_id, public_embed_enabled")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (convError) return jsonError(500, "Gesprek laden lukt niet.");
  if (!conv) return jsonError(404, "Gesprek niet gevonden.");
  if (conv.organization_id !== auth.ctx.organizationId && auth.ctx.role !== "platform_admin") {
    return jsonError(403, "Geen toegang.");
  }

  const updatePatch: Record<string, unknown> = {};
  if (parsed.data.goal !== undefined) updatePatch.goal = parsed.data.goal;
  if (parsed.data.publicEmbedEnabled !== undefined) updatePatch.public_embed_enabled = parsed.data.publicEmbedEnabled;
  if (parsed.data.embedAllowedOrigins !== undefined) {
    updatePatch.embed_allowed_origins =
      parsed.data.embedAllowedOrigins && parsed.data.embedAllowedOrigins.length > 0 ? parsed.data.embedAllowedOrigins : null;
  }
  if (parsed.data.status !== undefined) updatePatch.status = parsed.data.status;
  if (parsed.data.mode !== undefined) updatePatch.mode = parsed.data.mode;

  const { error: updateError } = await admin
    .from("conversations")
    .update(updatePatch)
    .eq("id", parsed.data.conversationId)
    .eq("organization_id", conv.organization_id);

  if (updateError) {
    console.error("[conversations.update] update failed", { updateError, conversationId: parsed.data.conversationId });
    return NextResponse.json(
      { ok: false, message: "Opslaan lukt niet. Probeer het opnieuw.", dbError: dbErrorPayload(updateError) },
      { status: 500 }
    );
  }

  // If public embed is enabled, ensure an active token exists.
  if (parsed.data.publicEmbedEnabled === true) {
    const { data: existing } = await admin
      .from("conversation_embed_tokens")
      .select("token")
      .eq("conversation_id", parsed.data.conversationId)
      .eq("active", true)
      .maybeSingle();

    if (!existing?.token) {
      await admin.from("conversation_embed_tokens").insert({
        conversation_id: parsed.data.conversationId,
        organization_id: conv.organization_id,
        active: true,
        created_by: auth.ctx.userId
      });
    }
  }

  return NextResponse.json({ ok: true, message: "Opgeslagen." }, { status: 200 });
}

