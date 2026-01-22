import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseRouteClient(request: NextRequest) {
  const env = getSupabaseEnv();

  // In route handlers we must NOT use NextResponse.next(). Instead, buffer cookie mutations
  // and apply them to the final NextResponse that we return.
  const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
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
  }

  return { supabase, applyCookies };
}

