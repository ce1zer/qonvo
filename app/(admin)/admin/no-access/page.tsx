import Link from "next/link";

export default function AdminNoAccessPage() {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-2xl flex-col items-center justify-center px-6 py-10 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Geen toegang</h1>
      <p className="mt-2 text-sm text-zinc-600">
        Je bent ingelogd, maar je hebt geen <span className="font-medium text-zinc-900">platform admin</span> rechten.
      </p>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Terug naar home
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Inloggen met ander account
        </Link>
      </div>
    </div>
  );
}

