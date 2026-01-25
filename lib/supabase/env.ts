import { z } from "zod";

const EnvSchema = z.object({
  // We support both the "NEXT_PUBLIC_*" naming (used in local dev)
  // and the common Vercel/Supabase naming without the prefix.
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_KEY: z.string().min(1).optional(),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
  INITIAL_ORGANIZATION_CREDITS: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().nonnegative())
    .optional()
}).superRefine((val, ctx) => {
  const url = val.NEXT_PUBLIC_SUPABASE_URL ?? val.SUPABASE_URL;
  const anon = val.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? val.SUPABASE_ANON_KEY;

  if (!url) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXT_PUBLIC_SUPABASE_URL"],
      message: "Missing Supabase URL (set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL)."
    });
  }

  if (!anon) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["NEXT_PUBLIC_SUPABASE_ANON_KEY"],
      message: "Missing Supabase anon key (set NEXT_PUBLIC_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY)."
    });
  }
});

export function getSupabaseEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const flattened = parsed.error.flatten();
    const details = Object.entries(flattened.fieldErrors)
      .flatMap(([key, msgs]) => (msgs ?? []).map((m) => `${key}: ${m}`))
      .join("\n");
    // Intentionally throw: misconfigured env should fail loudly on the server/build.
    throw new Error(`Invalid environment variables for Supabase.\n${details}`);
  }

  const supabaseUrl = parsed.data.NEXT_PUBLIC_SUPABASE_URL ?? parsed.data.SUPABASE_URL;
  const supabaseAnonKey = parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? parsed.data.SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey =
    parsed.data.SUPABASE_SERVICE_ROLE_KEY ?? parsed.data.SUPABASE_SERVICE_KEY;

  // superRefine guarantees these exist, but keep runtime safety.
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Invalid environment variables for Supabase.");
  }

  return { ...parsed.data, supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

