import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { type ScenarioActionState } from "@/lib/scenarios/schema";

const BodySchema = z.object({
  slug: z.string().min(1),
  scenarioId: z.string().uuid()
});

function jsonError(status: number, message: string) {
  const body: ScenarioActionState = { ok: false, message };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    const res = jsonError(400, "Controleer de invoer.");
    applyCookies(res);
    return res;
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const res = jsonError(401, "Niet ingelogd.");
    applyCookies(res);
    return res;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    const res = jsonError(403, "Je account is nog niet gekoppeld aan een bedrijf.");
    applyCookies(res);
    return res;
  }

  const { error } = await supabase
    .from("scenarios")
    .delete()
    .eq("id", parsed.data.scenarioId)
    .eq("company_id", profile.company_id);

  if (error) {
    const res = jsonError(500, "Verwijderen is niet gelukt. Probeer het opnieuw.");
    applyCookies(res);
    return res;
  }

  const res: ScenarioActionState = {
    ok: true,
    message: "Scenario verwijderd.",
    redirectTo: `/bedrijf/${parsed.data.slug}/scenarios`
  };
  const response = NextResponse.json(res, { status: 200 });
  applyCookies(response);
  return response;
}
