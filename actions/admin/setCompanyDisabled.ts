"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";

export async function setCompanyDisabled(companyId: string, isDisabled: boolean) {
  await requirePlatformAdmin("/admin?tab=companies");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("admin_set_company_disabled", {
    company_id: companyId,
    is_disabled: isDisabled
  });

  if (error) return { ok: false as const, message: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  return { ok: true as const, message: isDisabled ? "Bedrijf gedeactiveerd." : "Bedrijf geactiveerd." };
}

