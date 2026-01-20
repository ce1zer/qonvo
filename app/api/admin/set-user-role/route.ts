import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { requirePlatformAdminApi } from "@/lib/auth/requirePlatformAdminApi";

const BodySchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(["member", "company_admin"])
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

  const { error } = await supabase.rpc("admin_set_user_role", {
    target_user_id: parsed.data.userId,
    new_role: parsed.data.role
  });

  if (error) {
    const res = NextResponse.json({ ok: false, message: "Rol wijzigen is niet gelukt. Probeer het opnieuw." }, { status: 400 });
    applyCookies(res);
    return res;
  }

  const res = NextResponse.json({ ok: true, message: "Rol bijgewerkt." }, { status: 200 });
  applyCookies(res);
  return res;
}

