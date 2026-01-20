"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function spendCredits(companyId: string, amount: number, reason: string, conversationId?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("spend_credits", {
    company_id: companyId,
    amount,
    reason,
    conversation_id: conversationId ?? null
  });

  if (error) throw error;
  return data as number;
}

