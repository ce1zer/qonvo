"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useTenant } from "@/components/tenant/TenantContext";

export type ScenarioListItem = {
  id: string;
  name: string;
  persona: string;
  topic: string;
  updated_at: string;
};

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", { day: "2-digit", month: "short", year: "numeric" }).format(
      new Date(iso)
    );
  } catch {
    return "";
  }
}

export function ScenariosListClient({ slug, initialItems }: { slug: string; initialItems: ScenarioListItem[] }) {
  const { profile } = useTenant();
  const [query, setQuery] = useState("");
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedLoading, setEmbedLoading] = useState(false);
  const [embedScenarioId, setEmbedScenarioId] = useState<string | null>(null);
  const [embedToken, setEmbedToken] = useState<string | null>(null);

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialItems;
    return initialItems.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.topic.toLowerCase().includes(q) ||
        s.persona.toLowerCase().includes(q)
      );
    });
  }, [query, initialItems]);

  const canManageEmbed = profile.role === "company_admin" || profile.role === "platform_admin";

  const embedSnippet = useMemo(() => {
    if (!embedToken) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `<iframe src="${origin}/embed/${embedToken}" style="width:100%;height:700px;border:1px solid #e4e4e7;border-radius:12px;" allow="clipboard-write"></iframe>`;
  }, [embedToken]);

  async function openEmbedForScenario(scenarioId: string) {
    if (!canManageEmbed) return;
    setEmbedScenarioId(scenarioId);
    setEmbedToken(null);
    setEmbedOpen(true);
    setEmbedLoading(true);

    const res = await fetch("/api/embed-tokens/get-or-create", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenarioId })
    }).catch(() => null);

    if (!res || !res.ok) {
      setEmbedLoading(false);
      const json = res ? ((await res.json().catch(() => null)) as { message?: string } | null) : null;
      toast.error(json?.message ?? "Embedcode ophalen lukt niet. Probeer het opnieuw.");
      return;
    }

    const json = (await res.json().catch(() => null)) as { ok?: boolean; token?: string; message?: string } | null;
    const token = typeof json?.token === "string" ? json.token : null;
    if (!token) {
      setEmbedLoading(false);
      toast.error(json?.message ?? "Embedcode ophalen lukt niet. Probeer het opnieuw.");
      return;
    }

    setEmbedToken(token);
    setEmbedLoading(false);
  }

  async function copyEmbed() {
    if (!embedSnippet) return;
    try {
      await navigator.clipboard.writeText(embedSnippet);
      toast.success("Embedcode gekopieerd.");
    } catch {
      toast.error("Kopiëren lukt niet. Selecteer en kopieer handmatig.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-zinc-200 bg-white p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-zinc-900">Zoeken</p>
            <p className="text-sm text-zinc-600">Zoek op naam, onderwerp of persona.</p>
          </div>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 sm:w-80"
            placeholder="Bijv. boze klant, feedback, winkel…"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div className="grid grid-cols-12 gap-2 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-xs font-medium uppercase tracking-wide text-zinc-500">
          <div className="col-span-5">Naam</div>
          <div className="col-span-4">Onderwerp</div>
          <div className="col-span-2 text-right">Bijgewerkt</div>
          <div className="col-span-1 text-right">Acties</div>
        </div>

        {items.map((s) => (
          <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-zinc-50">
            <div className="col-span-5 min-w-0">
              <Link href={`/bedrijf/${slug}/scenarios/${s.id}`} className="block min-w-0">
                <p className="truncate font-medium text-zinc-900">{s.name}</p>
                <p className="truncate text-xs text-zinc-600">{s.persona}</p>
              </Link>
            </div>
            <div className="col-span-4 min-w-0 truncate text-zinc-700">{s.topic}</div>
            <div className="col-span-2 text-right text-zinc-600">{formatDate(s.updated_at)}</div>
            <div className="col-span-1 flex justify-end">
              {canManageEmbed ? (
                <button
                  type="button"
                  className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-xs font-medium text-zinc-900 hover:bg-zinc-50"
                  onClick={() => openEmbedForScenario(s.id)}
                >
                  Embedcode
                </button>
              ) : null}
            </div>
          </div>
        ))}

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-zinc-600">
            Geen scenario’s gevonden. Pas je zoekterm aan.
          </div>
        ) : null}
      </div>

      {embedOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-lg">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-200 p-4">
              <div className="space-y-1">
                <p className="text-sm font-semibold text-zinc-900">Embedcode</p>
                <p className="text-sm text-zinc-600">Plak deze iframe in je website of leeromgeving.</p>
              </div>
              <button
                type="button"
                className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                onClick={() => {
                  setEmbedOpen(false);
                  setEmbedScenarioId(null);
                  setEmbedToken(null);
                  setEmbedLoading(false);
                }}
              >
                Sluiten
              </button>
            </div>

            <div className="space-y-3 p-4">
              {embedLoading ? (
                <p className="text-sm text-zinc-600">Embedcode ophalen…</p>
              ) : embedToken ? (
                <>
                  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
                    <pre className="overflow-auto whitespace-pre-wrap text-xs text-zinc-900">{embedSnippet}</pre>
                  </div>
                  <div className="flex items-center justify-end gap-2">
                    <Link
                      href={`/embed/${embedToken}`}
                      className="rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50"
                      target="_blank"
                    >
                      Voorbeeld openen
                    </Link>
                    <button
                      type="button"
                      className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      onClick={copyEmbed}
                    >
                      Kopiëren
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-600">Geen embedcode beschikbaar.</p>
                  {embedScenarioId ? (
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
                      onClick={() => openEmbedForScenario(embedScenarioId)}
                    >
                      Opnieuw proberen
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

