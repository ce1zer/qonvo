import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { zodToDutchFieldErrors, type ScenarioActionState } from "@/lib/scenarios/schema";

const BodySchema = z.object({
  slug: z.string().min(1),
  scenarioId: z.string().uuid(),
  name: z.string().min(1),
  persona: z.string().min(1),
  topic: z.string().min(1),
  instructions: z.string().min(1),
  evaluationCriteria: z.string().optional()
});

function jsonError(status: number, message: string, fieldErrors?: Record<string, string>) {
  const body: ScenarioActionState = { ok: false, message, fieldErrors };
  return NextResponse.json(body, { status });
}

export async function POST(request: NextRequest) {
  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) {
    return jsonError(400, "Controleer de invoer.", zodToDutchFieldErrors(parsed.error));
  }

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    const res = jsonError(401, "Niet ingelogd.");
    applyCookies(res);
    return res;
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    const res = jsonError(403, "Je account is nog niet gekoppeld aan een organisatie.");
    applyCookies(res);
    return res;
  }

  const { error } = await supabase
    .from("scenarios")
    .update({
      name: parsed.data.name,
      persona: parsed.data.persona,
      topic: parsed.data.topic,
      instructions: parsed.data.instructions,
      evaluation_criteria: parsed.data.evaluationCriteria ?? ""
    })
    .eq("id", parsed.data.scenarioId)
    .eq("organization_id", profile.organization_id);

  if (error) {
    const res = jsonError(500, "Opslaan is niet gelukt. Probeer het opnieuw.");
    applyCookies(res);
    return res;
  }

  const res: ScenarioActionState = {
    ok: true,
    message: "Scenario opgeslagen.",
    scenarioId: parsed.data.scenarioId,
    redirectTo: `/organisatie/${parsed.data.slug}/scenarios`
  };
  const response = NextResponse.json(res, { status: 200 });
  applyCookies(response);
  return response;
}
