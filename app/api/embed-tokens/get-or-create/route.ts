import { NextResponse } from "next/server";
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";

const BodySchema = z.object({
  scenarioId: z.string().uuid()
});

function jsonError(status: number, message: string) {
  return NextResponse.json({ ok: false, message }, { status });
}

function supabaseErrorCode(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "";
}

function supabaseErrorMessage(err: unknown): string {
  const msg = (err as { message?: unknown } | null)?.message;
  return typeof msg === "string" ? msg : "";
}

export async function POST(request: Request) {
  const bodyJson = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(bodyJson);
  if (!parsed.success) return jsonError(400, "Ongeldige invoer.");

  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return jsonError(401, "Niet ingelogd.");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    if (profileError) {
      console.error("[embedTokens.getOrCreate] profile lookup failed", {
        code: supabaseErrorCode(profileError),
        message: supabaseErrorMessage(profileError)
      });
    }
    return jsonError(403, "Geen toegang.");
  }

  const role = profile.role as "member" | "organization_admin" | "platform_admin";
  if (role !== "organization_admin" && role !== "platform_admin") {
    return jsonError(403, "Je hebt geen rechten om embedcodes te beheren.");
  }

  // Ensure scenario belongs to this tenant.
  const { data: scenarioRow, error: scenarioError } = await supabase
    .from("scenarios")
    .select("id")
    .eq("id", parsed.data.scenarioId)
    .eq("organization_id", profile.organization_id)
    .maybeSingle();

  if (scenarioError) {
    console.error("[embedTokens.getOrCreate] scenario lookup failed", {
      scenarioId: parsed.data.scenarioId,
      organizationId: profile.organization_id,
      code: supabaseErrorCode(scenarioError),
      message: supabaseErrorMessage(scenarioError)
    });
    return jsonError(500, "Scenario laden lukt niet. Probeer het opnieuw.");
  }
  if (!scenarioRow) return jsonError(404, "Scenario niet gevonden.");

  // Get existing active token (MVP: one active token per scenario)
  const { data: existing, error: existingError } = await supabase
    .from("embed_tokens")
    .select("token")
    .eq("scenario_id", parsed.data.scenarioId)
    .eq("organization_id", profile.organization_id)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    const code = supabaseErrorCode(existingError);
    const message = supabaseErrorMessage(existingError);
    console.error("[embedTokens.getOrCreate] existing token lookup failed", {
      scenarioId: parsed.data.scenarioId,
      organizationId: profile.organization_id,
      code,
      message
    });

    if (code === "PGRST204" || code === "42703") {
      return jsonError(
        500,
        "Embed tokens tabel/kolommen ontbreken in de database (of schema cache is verouderd). Voer migratie 006 uit en refresh de Supabase schema cache."
      );
    }

    return jsonError(500, "Embedcode ophalen lukt niet. Probeer het opnieuw.");
  }
  if (existing?.token) return NextResponse.json({ ok: true, token: existing.token }, { status: 200 });

  const { data: inserted, error: insertError } = await supabase
    .from("embed_tokens")
    .insert({
      organization_id: profile.organization_id,
      scenario_id: parsed.data.scenarioId,
      active: true,
      created_by: userData.user.id
    })
    .select("token")
    .single();

  if (insertError || !inserted) {
    if (insertError) {
      const code = supabaseErrorCode(insertError);
      const message = supabaseErrorMessage(insertError);
      console.error("[embedTokens.getOrCreate] insert failed", {
        scenarioId: parsed.data.scenarioId,
        organizationId: profile.organization_id,
        userId: userData.user.id,
        code,
        message
      });

      if (code === "PGRST204" || code === "42703") {
        return jsonError(
          500,
          "Embed tokens tabel/kolommen ontbreken in de database (of schema cache is verouderd). Voer migratie 006 uit en refresh de Supabase schema cache."
        );
      }
      if (code === "23502" && message.toLowerCase().includes("token_hash")) {
        return jsonError(
          500,
          "Je database heeft nog een oud embed_tokens schema (token_hash). Drop/recreate public.embed_tokens volgens migratie 006 en refresh de Supabase schema cache."
        );
      }
      if (code === "42501") {
        return jsonError(403, "Geen toegang om embedcodes aan te maken.");
      }
    }
    return jsonError(500, "Embedcode aanmaken lukt niet. Probeer het opnieuw.");
  }

  return NextResponse.json({ ok: true, token: inserted.token }, { status: 200 });
}

