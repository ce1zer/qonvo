import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { AdminTabs } from "@/components/admin/AdminTabs";
import { OrganizationsTable, type AdminOrganizationRow } from "@/components/admin/OrganizationsTable";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePlatformAdmin("/admin");
  const { tab } = await searchParams;
  const active = tab === "users" ? "users" : "organizations";

  const supabase = await createSupabaseServerClient();

  const { data: organizations } = await supabase
    .from("organizations")
    .select("id, name, slug, credits_balance, created_at, is_disabled")
    .order("created_at", { ascending: false });

  const organizationRows: AdminOrganizationRow[] = (
    (organizations ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
      credits_balance: number;
      created_at: string;
      is_disabled: boolean | null;
    }>
  ).map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    credits_balance: c.credits_balance,
    created_at: c.created_at,
    is_disabled: Boolean(c.is_disabled)
  }));

  const { data: profiles } = await supabase.from("profiles").select("user_id, organization_id, role");

  const organizationSlugById = new Map<string, string>();
  for (const o of organizationRows) organizationSlugById.set(o.id, o.slug);

  // Email lookup via Admin API (service role). If missing, show "—" and still render.
  const emailByUserId = new Map<string, string>();
  try {
    const admin = createSupabaseAdminClient();
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    for (const u of data.users ?? []) {
      if (u.id && u.email) emailByUserId.set(u.id, u.email);
    }
  } catch {
    // ignore
  }

  const userRows: AdminUserRow[] = (
    (profiles ?? []) as Array<{ user_id: string; organization_id: string | null; role: AdminUserRow["role"] }>
  ).map((p) => ({
    user_id: p.user_id,
    email: emailByUserId.get(p.user_id) ?? "—",
    role: p.role,
    organization_slug: p.organization_id ? organizationSlugById.get(p.organization_id) ?? null : null
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description={active === "organizations" ? "Beheer organisaties en credits." : "Beheer gebruikers en rollen."}
      />
      <AdminTabs active={active} />

      {active === "organizations" ? (
        <SectionCard contentClassName="p-0">
          <OrganizationsTable organizations={organizationRows} />
        </SectionCard>
      ) : (
        <SectionCard contentClassName="p-0">
          <UsersTable users={userRows} />
        </SectionCard>
      )}
    </div>
  );
}

