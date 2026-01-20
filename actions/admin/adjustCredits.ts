"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";

export async function adjustCredits(companyId: string, amount: number, reason: string) {
  await requirePlatformAdmin("/admin?tab=companies");
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.rpc("admin_adjust_credits", {
    company_id: companyId,
    amount,
    reason
  });

  if (error) {
    // Most important UX case: insufficient credits when subtracting (trigger/constraint should fail)
    const code = String((error as { code?: string } | null)?.code ?? "");
    if (code === "23514") {
      return { ok: false as const, message: "Onvoldoende credits om af te trekken." };
    }
    return { ok: false as const, message: "Aanpassen is niet gelukt. Probeer het opnieuw." };
  }

  return { ok: true as const, message: "Credits aangepast.", creditsBalance: data as number };
}

