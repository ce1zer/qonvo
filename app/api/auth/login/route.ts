import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { safeInternalRedirect } from "@/lib/navigation/safeRedirect";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  redirectTo: z.string().optional()
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = LoginSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Controleer de invoer." }, { status: 400 });
  }

  const { supabase, applyCookies } = createSupabaseRouteClient(request);

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (signInError) {
    const res = NextResponse.json({ ok: false, message: "Onjuiste inloggegevens." }, { status: 400 });
    applyCookies(res);
    return res;
  }

  const userId = signInData.user?.id ?? null;
  if (!userId) {
    const res = NextResponse.json({ ok: false, message: "Inloggen is niet gelukt. Probeer het opnieuw." }, { status: 500 });
    applyCookies(res);
    return res;
  }

  const { data: profile } = await supabase.from("profiles").select("company_id").eq("user_id", userId).maybeSingle();
  if (!profile?.company_id) {
    const res = NextResponse.json(
      {
        ok: false,
        message: "Je account is nog niet gekoppeld aan een bedrijf. Neem contact op met je beheerder."
      },
      { status: 403 }
    );
    applyCookies(res);
    return res;
  }

  const { data: company } = await supabase.from("companies").select("slug, is_disabled").eq("id", profile.company_id).single();
  if (!company) {
    const res = NextResponse.json({ ok: false, message: "Bedrijf niet gevonden." }, { status: 404 });
    applyCookies(res);
    return res;
  }

  if (company.is_disabled) {
    await supabase.auth.signOut();
    const res = NextResponse.json(
      { ok: false, message: "Dit bedrijf is gedeactiveerd. Neem contact op met je beheerder." },
      { status: 403 }
    );
    applyCookies(res);
    return res;
  }

  const redirectTo = safeInternalRedirect(parsed.data.redirectTo, `/bedrijf/${company.slug}/dashboard`);
  const res = NextResponse.json({ ok: true, message: "Welkom terug.", redirectTo }, { status: 200 });
  applyCookies(res);
  return res;
}

