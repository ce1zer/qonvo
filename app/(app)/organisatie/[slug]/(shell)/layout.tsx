import { headers } from "next/headers";
import { redirect, notFound } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TenantProvider, type TenantOrganization, type TenantProfile } from "@/components/tenant/TenantContext";
import { Breadcrumbs } from "@/components/tenant/Breadcrumbs";
import { TenantSidebarFooter } from "@/components/tenant/TenantSidebarFooter";
import { AppShell } from "@/components/app/AppShell";
import type { NavItem } from "@/components/app/types";

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
    redirect(`/login?redirectTo=${encodeURIComponent(`/organisatie/${requestedSlug}/dashboard`)}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("user_id, organization_id, role")
    .eq("user_id", userData.user.id)
    .maybeSingle();

  if (profileError || !profile?.organization_id) {
    // The user exists but is not assigned to an organization yet.
    redirect("/");
  }

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, credits_balance, is_disabled")
    .eq("id", profile.organization_id)
    .single();

  if (organizationError || !organization) notFound();

  if (organization.is_disabled && profile.role !== "platform_admin") {
    return (
      <div className="min-h-screen bg-zinc-50">
        <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center gap-4 px-6 py-10">
          <h1 className="text-2xl font-semibold tracking-tight">Organisatie gedeactiveerd</h1>
          <p className="text-sm text-zinc-600">
            Je hebt geen toegang omdat deze organisatie is gedeactiveerd. Neem contact op met je beheerder.
          </p>
        </main>
      </div>
    );
  }

  const canonicalSlug = normalizeSlug(organization.slug);
  if (requestedSlug !== canonicalSlug) {
    const pathname = await getRequestPathnameFallback();
    // Replace only the tenant slug portion, preserving the remainder if we can.
    if (pathname.startsWith(`/organisatie/${requestedSlug}`)) {
      redirect(pathname.replace(`/organisatie/${requestedSlug}`, `/organisatie/${organization.slug}`));
    }
    redirect(`/organisatie/${organization.slug}/dashboard`);
  }

  const ctxValue = {
    organization: organization as unknown as TenantOrganization,
    profile: profile as unknown as TenantProfile
  };

  const base = `/organisatie/${organization.slug}`;
  const navItems: NavItem[] = [
    { href: `${base}/dashboard`, label: "Dashboard" },
    { href: `${base}/scenarios`, label: "Scenario’s" },
    { href: `${base}/gesprekken`, label: "Gesprekken" }
  ];

  return (
    <TenantProvider value={ctxValue}>
      <AppShell
        sidebarSubtitle="Organisatie"
        sidebarTitle={organization.name}
        navItems={navItems}
        sidebarFooter={<TenantSidebarFooter />}
        topbarLeft={<Breadcrumbs />}
      >
        {children}
      </AppShell>
    </TenantProvider>
  );
}

