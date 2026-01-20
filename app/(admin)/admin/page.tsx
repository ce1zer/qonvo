import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

import { AdminTabs } from "@/components/admin/AdminTabs";
import { CompaniesTable, type AdminCompanyRow } from "@/components/admin/CompaniesTable";
import { UsersTable, type AdminUserRow } from "@/components/admin/UsersTable";

export default async function AdminPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePlatformAdmin("/admin");
  const { tab } = await searchParams;
  const active = tab === "users" ? "users" : "companies";

  const supabase = await createSupabaseServerClient();

  const { data: companies } = await supabase
    .from("companies")
    .select("id, name, slug, credits_balance, created_at, is_disabled")
    .order("created_at", { ascending: false });

  const companyRows: AdminCompanyRow[] = (
    (companies ?? []) as Array<{
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

  const { data: profiles } = await supabase.from("profiles").select("user_id, company_id, role");

  const companySlugById = new Map<string, string>();
  for (const c of companyRows) companySlugById.set(c.id, c.slug);

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
    (profiles ?? []) as Array<{ user_id: string; company_id: string | null; role: AdminUserRow["role"] }>
  ).map((p) => ({
    user_id: p.user_id,
    email: emailByUserId.get(p.user_id) ?? "—",
    role: p.role,
    company_slug: p.company_id ? companySlugById.get(p.company_id) ?? null : null
  }));

  return (
    <div className="space-y-6">
      <AdminTabs active={active} />

      {active === "companies" ? (
        <CompaniesTable companies={companyRows} />
      ) : (
        <UsersTable users={userRows} />
      )}
    </div>
  );
}

