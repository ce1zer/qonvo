import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/auth/requirePlatformAdmin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requirePlatformAdmin("/admin");

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-zinc-900">Platformbeheer</h1>
            <p className="text-sm text-zinc-600">Alleen voor platform admins.</p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
          >
            Terug
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}

