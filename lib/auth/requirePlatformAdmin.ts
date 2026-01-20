"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function requirePlatformAdmin(redirectTo: string = "/admin") {
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile, error } = await supabase.from("profiles").select("role").maybeSingle();
  if (error || !profile || profile.role !== "platform_admin") {
    redirect("/admin/no-access");
  }

  return { supabase, userId: userData.user.id };
}

