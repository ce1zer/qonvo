import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Qonvo</h1>
        <p className="text-sm text-zinc-600">
          Start met een account om scenario’s te maken en gesprekken te oefenen.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Account aanmaken
        </Link>
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
        >
          Inloggen
        </Link>
      </div>
    </main>
  );
}

