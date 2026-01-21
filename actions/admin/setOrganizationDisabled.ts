"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";

export async function setOrganizationDisabled(organizationId: string, isDisabled: boolean) {
  await requirePlatformAdmin("/admin?tab=organizations");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("admin_set_organization_disabled", {
    organization_id: organizationId,
    is_disabled: isDisabled
  });

  if (error) return { ok: false as const, message: "Wijzigen is niet gelukt. Probeer het opnieuw." };
  return { ok: true as const, message: isDisabled ? "Organisatie gedeactiveerd." : "Organisatie geactiveerd." };
}

