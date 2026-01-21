import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePlatformAdminApi } from "@/lib/auth/requirePlatformAdminApi";

const BodySchema = z.object({
  organizationId: z.string().uuid(),
  isDisabled: z.boolean()
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

  const { error } = await supabase.rpc("admin_set_organization_disabled", {
    organization_id: parsed.data.organizationId,
    is_disabled: parsed.data.isDisabled
  });

  if (error) {
    const res = NextResponse.json({ ok: false, message: "Wijzigen is niet gelukt. Probeer het opnieuw." }, { status: 400 });
    applyCookies(res);
    return res;
  }

  const res = NextResponse.json(
    { ok: true, message: parsed.data.isDisabled ? "Organisatie gedeactiveerd." : "Organisatie geactiveerd." },
    { status: 200 }
  );
  applyCookies(res);
  return res;
}

