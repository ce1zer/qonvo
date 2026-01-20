"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";

export async function setUserRole(userId: string, role: "member" | "company_admin") {
  await requirePlatformAdmin("/admin?tab=users");
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: userId,
    new_role: role
  });

  if (error) return { ok: false as const, message: "Rol wijzigen is niet gelukt. Probeer het opnieuw." };
  return { ok: true as const, message: "Rol bijgewerkt." };
}

