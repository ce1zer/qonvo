import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { createSupabaseRouteClient } from "@/lib/supabase/route";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { safeInternalRedirect } from "@/lib/navigation/safeRedirect";

const SignupSchema = z.object({
  companyName: z.string().min(2),
  slug: z.string().min(2).max(64),
  email: z.string().email(),
  password: z.string().min(8),
  redirectTo: z.string().optional()
});

export async function POST(request: NextRequest) {
  const env = getSupabaseEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, message: "Registreren is nu niet mogelijk omdat de server nog niet is geconfigureerd." },
      { status: 500 }
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = SignupSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Controleer de invoer." }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Slug uniqueness (fast fail)
  const { data: existing } = await admin.from("companies").select("id").eq("slug", parsed.data.slug).maybeSingle();
  if (existing) {
    return NextResponse.json({ ok: false, message: "Deze slug is al in gebruik." }, { status: 409 });
  }

  let createdUserId: string | null = null;
  let createdCompanyId: string | null = null;

  try {
    const { data: createdUser, error: createUserError } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true
    });

    if (createUserError || !createdUser.user) {
      const msg =
        (createUserError as { code?: string } | null)?.code === "email_exists"
          ? "Er bestaat al een account met dit e-mailadres."
          : "Er is iets misgegaan. Probeer het opnieuw.";
      return NextResponse.json({ ok: false, message: msg }, { status: 400 });
    }

    createdUserId = createdUser.user.id;

    const { data: company, error: companyError } = await admin
      .from("companies")
      .insert({ name: parsed.data.companyName, slug: parsed.data.slug, credits_balance: 0 })
      .select("id, slug")
      .single();

    if (companyError || !company) {
      if ((companyError as { code?: string } | null)?.code === "23505") {
        return NextResponse.json({ ok: false, message: "Deze slug is al in gebruik." }, { status: 409 });
      }
      throw new Error("company_insert_failed");
    }

    createdCompanyId = company.id;

    const { error: profileError } = await admin.from("profiles").insert({
      user_id: createdUserId,
      company_id: createdCompanyId,
      role: "company_admin"
    });
    if (profileError) throw new Error("profile_insert_failed");

    const initialCredits = env.INITIAL_COMPANY_CREDITS ?? 100;
    const { error: creditError } = await admin.from("credit_ledger").insert({
      company_id: createdCompanyId,
      amount: initialCredits,
      reason: "initial_allocation",
      metadata: { source: "signup" },
      created_by: createdUserId
    });
    if (creditError) throw new Error("initial_credits_failed");

    const { supabase, applyCookies } = createSupabaseRouteClient(request);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password
    });

    // If sign-in fails, still created; user can login manually
    if (signInError) {
      const res = NextResponse.json(
        { ok: true, message: "Account aangemaakt. Log nu in om verder te gaan.", redirectTo: "/login" },
        { status: 200 }
      );
      applyCookies(res);
      return res;
    }

    const redirectTo = safeInternalRedirect(parsed.data.redirectTo, `/bedrijf/${company.slug}/dashboard`);
    const res = NextResponse.json({ ok: true, message: "Je account is aangemaakt.", redirectTo }, { status: 200 });
    applyCookies(res);
    return res;
  } catch {
    // Best-effort rollback
    if (createdCompanyId) await admin.from("companies").delete().eq("id", createdCompanyId);
    if (createdUserId) await admin.auth.admin.deleteUser(createdUserId);
    return NextResponse.json({ ok: false, message: "Er is iets misgegaan. Probeer het opnieuw." }, { status: 500 });
  }
}

