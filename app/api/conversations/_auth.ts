import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ConversationManagerContext = {
  userId: string;
  organizationId: string;
  role: string;
};

export async function requireConversationManager(): Promise<
  | { ok: true; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>; ctx: ConversationManagerContext }
  | { ok: false; status: number; message: string }
> {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return { ok: false, status: 401, message: "Niet ingelogd." };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    return { ok: false, status: 403, message: "Geen toegang." };
  }

  const role = String(profile.role ?? "");
  const isManager = role === "organization_admin" || role === "platform_admin";
  if (!isManager) return { ok: false, status: 403, message: "Alleen beheerders mogen dit." };

  return { ok: true, supabase, ctx: { userId: userData.user.id, organizationId: profile.organization_id, role } };
}

