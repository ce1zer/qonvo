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
    .select("id, organization_id")
    .eq("id", parsed.data.conversationId)
    .maybeSingle();

  if (convError) return jsonError(500, "Gesprek laden lukt niet.");
  if (!conv) return jsonError(404, "Gesprek niet gevonden.");
  if (conv.organization_id !== auth.ctx.organizationId && auth.ctx.role !== "platform_admin") {
    return jsonError(403, "Geen toegang.");
  }

  const { error: delError } = await admin.from("conversations").delete().eq("id", parsed.data.conversationId);
  if (delError) return jsonError(500, "Verwijderen lukt niet. Probeer het opnieuw.");

  return NextResponse.json({ ok: true, message: "Verwijderd." }, { status: 200 });
}

