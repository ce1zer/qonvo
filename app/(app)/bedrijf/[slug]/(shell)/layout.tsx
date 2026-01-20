import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantProvider, type TenantCompany, type TenantProfile } from "@/components/tenant/TenantContext";
import { Breadcrumbs } from "@/components/tenant/Breadcrumbs";
import { SidebarNav } from "@/components/tenant/SidebarNav";
import { TenantCreditsBadge } from "@/components/tenant/TenantCreditsBadge";
import { AccountMenu } from "@/components/tenant/AccountMenu";

function normalizeSlug(slug: string) {
  return slug.trim().toLowerCase();
}

async function getRequestPathnameFallback() {
  // Best-effort extraction of the pathname for “preserve remainder” redirects.
  // In some runtimes, Next provides useful headers; otherwise we fall back to an empty string.
  const h = await headers();
  const nextUrl = h.get("next-url") ?? h.get("x-next-url") ?? "";
  if (nextUrl.startsWith("/")) return nextUrl;
  return "";
}

export default async function TenantShellLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const requestedSlug = normalizeSlug(slug);

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/bedrijf/${requestedSlug}/dashboard`)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, company_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.company_id) {
    // The user exists but is not assigned to a company yet.
    redirect("/");
  }

  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id, name, slug, credits_balance, is_disabled")
    .eq("id", profile.company_id)
    .single();

  if (companyError || !company) notFound();

  if (company.is_disabled && profile.role !== "platform_admin") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Bedrijf gedeactiveerd</h1>
          <p className="text-sm text-zinc-600">
            Je hebt geen toegang omdat dit bedrijf is gedeactiveerd. Neem contact op met je beheerder.
          </p>
        </main>
      </div>
    );
  }

  const canonicalSlug = normalizeSlug(company.slug);
  if (requestedSlug !== canonicalSlug) {
    const pathname = await getRequestPathnameFallback();
    // Replace only the tenant slug portion, preserving the remainder if we can.
    if (pathname.startsWith(`/bedrijf/${requestedSlug}`)) {
      redirect(pathname.replace(`/bedrijf/${requestedSlug}`, `/bedrijf/${company.slug}`));
    }
    redirect(`/bedrijf/${company.slug}/dashboard`);
  }

  const ctxValue = {
    company: company as unknown as TenantCompany,
    profile: profile as unknown as TenantProfile
  };

  const base = `/bedrijf/${company.slug}`;

  return (
    <TenantProvider value={ctxValue}>
      <div className="min-h-screen bg-zinc-50">
        <div className="mx-auto flex min-h-screen max-w-6xl">
          <aside className="hidden w-64 flex-col gap-6 border-r border-zinc-200 bg-white p-5 md:flex">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Bedrijf</p>
              <p className="text-sm font-semibold text-zinc-900">{company.name}</p>
            </div>

            <nav className="space-y-1 text-sm">
              <SidebarNav baseHref={base} />
            </nav>

            <div className="mt-auto text-xs text-zinc-500">Qonvo</div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/90 backdrop-blur">
              <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
                <div className="min-w-0">
                  <Breadcrumbs />
                </div>

                <div className="flex items-center gap-3">
                  <TenantCreditsBadge />
                  <AccountMenu />
                </div>
              </div>
            </header>

            <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
          </div>
        </div>
      </div>
    </TenantProvider>
  );
}

