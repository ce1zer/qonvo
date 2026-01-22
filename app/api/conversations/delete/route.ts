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

  // Defensive delete order: depending on the DB FK setup, conversations might not cascade.
  // We delete known dependents first to prevent FK violations.
  const conversationId = parsed.data.conversationId;

  const { error: messagesDeleteError } = await admin.from("messages").delete().eq("conversation_id", conversationId);
  if (messagesDeleteError) {
    console.error("[conversations.delete] messages delete failed", { messagesDeleteError, conversationId });
    return NextResponse.json(
      { ok: false, message: "Verwijderen lukt niet (berichten).", dbError: dbErrorPayload(messagesDeleteError) },
      { status: 500 }
    );
  }

  const { error: tokensDeleteError } = await admin
    .from("conversation_embed_tokens")
    .delete()
    .eq("conversation_id", conversationId);
  if (tokensDeleteError) {
    console.error("[conversations.delete] embed tokens delete failed", { tokensDeleteError, conversationId });
    return NextResponse.json(
      { ok: false, message: "Verwijderen lukt niet (embed tokens).", dbError: dbErrorPayload(tokensDeleteError) },
      { status: 500 }
    );
  }

  // If credit_ledger has a FK to conversations, remove related rows so the conversation can be deleted.
  const { error: ledgerDeleteError } = await admin.from("credit_ledger").delete().eq("conversation_id", conversationId);
  if (ledgerDeleteError) {
    // Best-effort: only fail if it blocks deletion later. Log for debugging.
    console.error("[conversations.delete] credit ledger delete failed", { ledgerDeleteError, conversationId });
  }

  const { error: delError } = await admin.from("conversations").delete().eq("id", conversationId);
  if (delError) {
    console.error("[conversations.delete] conversation delete failed", { delError, conversationId });
    return NextResponse.json(
      { ok: false, message: "Verwijderen lukt niet. Probeer het opnieuw.", dbError: dbErrorPayload(delError) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, message: "Verwijderd." }, { status: 200 });
}

