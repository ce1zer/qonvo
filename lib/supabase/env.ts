import { z } from "zod";

const EnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  N8N_WEBHOOK_URL: z.string().url().optional(),
  N8N_WEBHOOK_SECRET: z.string().min(1).optional(),
  INITIAL_ORGANIZATION_CREDITS: z
    .string()
    .transform((v) => Number(v))
    .pipe(z.number().int().nonnegative())
    .optional()
});

export function getSupabaseEnv() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    // Intentionally throw: misconfigured env should fail loudly on the server.
    throw new Error("Invalid environment variables for Supabase.");
  }
  return parsed.data;
}

