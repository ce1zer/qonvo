"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function spendCredits(organizationId: string, amount: number, reason: string, conversationId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("spend_credits", {
    organization_id: organizationId,
    amount,
    reason,
    conversation_id: conversationId ?? null
  });

  if (error) throw error;
  return data as number;
}

