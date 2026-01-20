import Link from "next/link";
import { notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantProvider } from "@/components/tenant/TenantContext";
import { ChatPanel } from "@/components/chat/ChatPanel";

function LoginRequired({ token }: { token: string }) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Inloggen vereist</h1>
      <p className="mt-2 text-sm text-zinc-600">Log in om deze chat te gebruiken.</p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/embed/${token}`)}`}
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Inloggen
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Terug naar home
        </Link>
      </div>
    </div>
  );
}

export default async function EmbedChatPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return <LoginRequired token={token} />;

  const { data: profile } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (!profile?.company_id) return <LoginRequired token={token} />;

  const { data: embedTokenRow, error: embedTokenError } = await supabase
    .from("embed_tokens")
    .select("token, company_id, scenario_id, active")
    .eq("token", token)
    .eq("active", true)
    .maybeSingle();

  // We intentionally do not reveal whether the token exists to non-tenant users.
  if (embedTokenError) return <LoginRequired token={token} />;
  if (!embedTokenRow) return <LoginRequired token={token} />;

  // Extra guard (RLS should already enforce this).
  if (embedTokenRow.company_id !== profile.company_id) return <LoginRequired token={token} />;

  const { data: company } = await supabase
    .from("companies")
    .select("id, name, slug, credits_balance, is_disabled")
    .eq("id", profile.company_id)
    .single();

  if (!company) return notFound();

  if (company.is_disabled && profile.role !== "platform_admin") {
    return (
      <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Bedrijf gedeactiveerd</h1>
        <p className="mt-2 text-sm text-zinc-600">Deze tenant is gedeactiveerd. Neem contact op met je beheerder.</p>
      </div>
    );
  }

  // Create a conversation for this embed session (text only, MVP).
  const { data: insertedConversation, error: insertError } = await supabase
    .from("conversations")
    .insert({
      company_id: profile.company_id,
      scenario_id: embedTokenRow.scenario_id,
      started_by: userData.user.id,
      status: "active",
      mode: "text",
      goal: null
    })
    .select("id")
    .single();

  if (insertError || !insertedConversation) return notFound();

  return (
    <TenantProvider
      value={{
        company: {
          id: company.id,
          name: company.name,
          slug: company.slug,
          credits_balance: company.credits_balance ?? 0
        },
        profile: {
          user_id: profile.user_id,
          company_id: profile.company_id,
          role: profile.role
        }
      }}
    >
      <div className="mx-auto w-full max-w-5xl px-4 py-8">
        <header className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
            <p className="text-sm text-zinc-600">Je bent ingelogd en kunt dit gesprek starten.</p>
          </div>
          <Link
            href={`/bedrijf/${company.slug}/dashboard`}
            className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Open app
          </Link>
        </header>

        <ChatPanel conversationId={insertedConversation.id} initialMessages={[]} />
      </div>
    </TenantProvider>
  );
}

