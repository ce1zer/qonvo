import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePlatformAdminApi } from "@/lib/auth/requirePlatformAdminApi";

const BodySchema = z.object({
  companyId: z.string().uuid(),
  amount: z.number().int(),
  reason: z.string().min(1).max(200)
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, message: "Controleer de invoer." }, { status: 400 });
  }

  const admin = await requirePlatformAdminApi(request);
  if (!admin.ok) return admin.response;

  const { supabase, applyCookies } = admin;

  const { data, error } = await supabase.rpc("admin_adjust_credits", {
    company_id: parsed.data.companyId,
    amount: parsed.data.amount,
    reason: parsed.data.reason
  });

  if (error) {
    const code = String((error as { code?: string } | null)?.code ?? "");
    const msg =
      code === "23514" ? "Onvoldoende credits om af te trekken." : "Aanpassen is niet gelukt. Probeer het opnieuw.";
    const res = NextResponse.json({ ok: false, message: msg }, { status: 400 });
    applyCookies(res);
    return res;
  }

  const res = NextResponse.json(
    { ok: true, message: "Credits aangepast.", creditsBalance: data as number },
    { status: 200 }
  );
  applyCookies(res);
  return res;
}

