import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteClient } from "@/lib/supabase/route";

type OkResult = {
  ok: true;
  supabase: ReturnType<typeof createSupabaseRouteClient>["supabase"];
  applyCookies: ReturnType<typeof createSupabaseRouteClient>["applyCookies"];
  userId: string;
};

type ErrorResult = { ok: false; response: NextResponse };

export async function requirePlatformAdminApi(request: NextRequest): Promise<OkResult | ErrorResult> {
  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const res = NextResponse.json({ ok: false, message: "Niet ingelogd." }, { status: 401 });
    applyCookies(res);
    return { ok: false, response: res };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (error || profile?.role !== "platform_admin") {
    const res = NextResponse.json({ ok: false, message: "Geen toegang." }, { status: 403 });
    applyCookies(res);
    return { ok: false, response: res };
  }

  return { ok: true, supabase, applyCookies, userId: userData.user.id };
}

