import { createClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "@/lib/supabase/env";

export function createSupabaseAdminClient() {
  const env = getSupabaseEnv();
  if (!env.supabaseServiceRoleKey) {
    throw new Error(
      "Missing Supabase service role key (set SUPABASE_SERVICE_ROLE_KEY or SUPABASE_SERVICE_KEY)."
    );
  }

  // Service role bypasses RLS. Keep this client on the server only.
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

