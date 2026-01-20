import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";
import { AppShell } from "@/components/app/AppShell";
import type { NavItem } from "@/components/app/types";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin("/admin");

  const navItems: NavItem[] = [
    { href: "/admin?tab=companies", label: "Bedrijven" },
    { href: "/admin?tab=users", label: "Gebruikers" }
  ];

  return (
    <AppShell
      sidebarSubtitle="Admin"
      sidebarTitle="Platformbeheer"
      navItems={navItems}
      topbarLeft={
        <div className="space-y-0.5">
          <p className="text-sm font-semibold">Platformbeheer</p>
          <p className="text-xs text-muted-foreground">Alleen voor platform admins.</p>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}

