"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { useTenant } from "@/components/tenant/TenantContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SectionCard } from "@/components/app/SectionCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
      credentials: "include",
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
      <SectionCard title="Zoeken" description="Zoek op naam, onderwerp of persona.">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="sm:w-80"
          placeholder="Bijv. boze klant, feedback, winkel…"
        />
      </SectionCard>

      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[45%]">Naam</TableHead>
              <TableHead className="w-[35%]">Onderwerp</TableHead>
              <TableHead className="w-[15%] text-right">Bijgewerkt</TableHead>
              <TableHead className="w-[5%] text-right">Acties</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="min-w-0">
                  <Link href={`/bedrijf/${slug}/scenarios/${s.id}`} className="block min-w-0">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{s.persona}</p>
                  </Link>
                </TableCell>
                <TableCell className="min-w-0 truncate text-muted-foreground">{s.topic}</TableCell>
                <TableCell className="text-right text-muted-foreground">{formatDate(s.updated_at)}</TableCell>
                <TableCell className="text-right">
                  {canManageEmbed ? (
                    <Button type="button" variant="outline" size="sm" onClick={() => openEmbedForScenario(s.id)}>
                      Embedcode
                    </Button>
                  ) : null}
                </TableCell>
              </TableRow>
            ))}

            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Geen scenario’s gevonden. Pas je zoekterm aan.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <Dialog
        open={embedOpen}
        onOpenChange={(open) => {
          setEmbedOpen(open);
          if (!open) {
            setEmbedScenarioId(null);
            setEmbedToken(null);
            setEmbedLoading(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Embedcode</DialogTitle>
            <DialogDescription>Plak deze iframe in je website of leeromgeving.</DialogDescription>
          </DialogHeader>

          {embedLoading ? (
            <p className="text-sm text-muted-foreground">Embedcode ophalen…</p>
          ) : embedToken ? (
            <div className="space-y-3">
              <Textarea readOnly value={embedSnippet} className="min-h-32 font-mono text-xs" />
              <DialogFooter className="gap-2 sm:gap-0">
                <Button asChild variant="outline">
                  <Link href={`/embed/${embedToken}`} target="_blank">
                    Voorbeeld openen
                  </Link>
                </Button>
                <Button onClick={copyEmbed}>Kopiëren</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Geen embedcode beschikbaar.</p>
              {embedScenarioId ? (
                <div>
                  <Button onClick={() => openEmbedForScenario(embedScenarioId)} disabled={embedLoading}>
                    Opnieuw proberen
                  </Button>
                </div>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

