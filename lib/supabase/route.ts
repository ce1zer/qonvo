import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseRouteClient(request: NextRequest) {
  const env = getSupabaseEnv();

  // In route handlers we must NOT use NextResponse.next(). Instead, buffer cookie mutations
  // and apply them to the final NextResponse that we return.
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(nextCookies: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.push(...nextCookies);
      }
    }
  });

  function applyCookies(response: NextResponse) {
    const isDev = process.env.NODE_ENV !== "production";
    cookiesToSet.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, {
        ...options,
        // Browsers drop Secure cookies on http://localhost. In production we keep Secure.
        secure: isDev ? false : options.secure
      });
    });

    // #region agent log
    fetch("http://127.0.0.1:7242/ingest/7011e779-7231-48bb-9f32-a1485f240e9a", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: "debug-session",
        runId: "pre-fix",
        hypothesisId: "H1",
        location: "lib/supabase/route.ts:applyCookies",
        message: "applyCookies called",
        data: {
          cookiesToSetCount: cookiesToSet.length,
          cookieNames: cookiesToSet.map((c) => c.name).slice(0, 10),
          cookieOptionSamples: cookiesToSet.slice(0, 2).map((c) => ({
            name: c.name,
            path: c.options?.path,
            domain: c.options?.domain,
            sameSite: c.options?.sameSite,
            secure: Boolean(c.options?.secure),
            httpOnly: Boolean(c.options?.httpOnly),
            maxAge: c.options?.maxAge
          })),
          anySecure: cookiesToSet.some((c) => Boolean(c.options?.secure)),
          anyHttpOnly: cookiesToSet.some((c) => Boolean(c.options?.httpOnly)),
          anySameSite: Array.from(new Set(cookiesToSet.map((c) => String(c.options?.sameSite ?? "")))).slice(0, 5)
        },
        timestamp: Date.now()
      })
    }).catch(() => {});
    // #endregion agent log
  }

  return { supabase, applyCookies };
}

