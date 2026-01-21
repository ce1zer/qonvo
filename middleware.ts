import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail-open: if env is not configured (e.g. env.local not loaded), do not break routing.
  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const isDev = process.env.NODE_ENV !== "production";

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, {
            ...options,
            // Browsers drop Secure cookies on http://localhost. In production we keep Secure.
            secure: isDev ? false : options.secure
          });
        });
      }
    }
  });

  // Refresh session if needed (keeps auth cookies in sync).
  const { data } = await supabase.auth.getUser();

  return response;
}

export const config = {
  matcher: [
    /*
      Apply middleware to all routes except:
      - next internal assets
      - static files
    */
    "/((?!_next/static|_next/image|favicon.ico).*)"
  ]
};

