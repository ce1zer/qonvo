import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { requireConversationManager } from "@/app/api/conversations/_auth";

const BodySchema = z.object({
  conversationId: z.string().uuid()
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  const auth = await requireConversationManager();
  if (!auth.ok) return jsonError(auth.status, auth.message);

  const admin = createSupabaseAdminClient();

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
  if (!conv.public_embed_enabled) return jsonError(400, "Publieke embed staat uit voor dit gesprek.");

  const { data: existing, error: tokenError } = await admin
    .from("conversation_embed_tokens")
    .select("token")
    .eq("conversation_id", parsed.data.conversationId)
    .eq("active", true)
    .maybeSingle();

  if (tokenError) return jsonError(500, "Embed token laden lukt niet.");
  if (existing?.token) return NextResponse.json({ ok: true, token: existing.token }, { status: 200 });

  const { data: inserted, error: insertError } = await admin
    .from("conversation_embed_tokens")
    .insert({
      conversation_id: parsed.data.conversationId,
      organization_id: conv.organization_id,
      active: true,
      created_by: auth.ctx.userId
    })
    .select("token")
    .single();

  if (insertError || !inserted?.token) return jsonError(500, "Embed token maken lukt niet.");

  return NextResponse.json({ ok: true, token: inserted.token }, { status: 200 });
}

