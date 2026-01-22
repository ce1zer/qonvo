"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreHorizontal } from "lucide-react";

import type { ConversationsListItem } from "@/components/conversations/ConversationsTableClient";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

function normalizeOriginsInput(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

async function copyToClipboard(text: string) {
  await navigator.clipboard.writeText(text);
}

export function ConversationActionsMenu({
  slug,
  conversation
}: {
  slug: string;
  conversation: ConversationsListItem;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [editOpen, setEditOpen] = useState(false);
  const [goal, setGoal] = useState(conversation.goal ?? "");
  const [publicEmbedEnabled, setPublicEmbedEnabled] = useState(Boolean(conversation.publicEmbedEnabled));
  const [embedAllowedOrigins, setEmbedAllowedOrigins] = useState(
    (conversation.embedAllowedOrigins ?? []).join("\n")
  );
  const [status, setStatus] = useState(conversation.status ?? "");
  const [mode, setMode] = useState(conversation.mode ?? "");

  const embedUrl = useMemo(() => {
    if (!conversation.embedToken) return null;
    return `${typeof window !== "undefined" ? window.location.origin : ""}/embed/${conversation.embedToken}`;
  }, [conversation.embedToken]);

  function onSave() {
    startTransition(async () => {
      const origins = normalizeOriginsInput(embedAllowedOrigins);
      const res = await fetch("/api/conversations/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: conversation.id,
          goal: goal.trim() ? goal.trim() : null,
          publicEmbedEnabled,
          embedAllowedOrigins: origins.length > 0 ? origins : null,
          status: status.trim() ? status.trim() : null,
          mode: mode.trim() ? mode.trim() : null
        })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        toast.error(json?.message ?? "Opslaan lukt niet. Probeer het opnieuw.");
        return;
      }

      toast.success("Instellingen opgeslagen.");
      setEditOpen(false);
      router.refresh();
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await fetch("/api/conversations/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: conversation.id })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        toast.error(json?.message ?? "Verwijderen lukt niet. Probeer het opnieuw.");
        return;
      }

      toast.success("Gesprek verwijderd.");
      router.refresh();
    });
  }

  async function onCopyEmbed() {
    try {
      if (!conversation.publicEmbedEnabled) {
        toast.error("Publieke embed staat uit voor dit gesprek.");
        return;
      }

      let token = conversation.embedToken;
      if (!token) {
        const res = await fetch("/api/conversations/embed-token/get-or-create", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ conversationId: conversation.id })
        }).catch(() => null);

        const json = (await res?.json().catch(() => null)) as { ok?: boolean; token?: string; message?: string } | null;
        if (!res || !res.ok || !json?.ok || !json?.token) {
          toast.error(json?.message ?? "Embed link ophalen lukt niet.");
          return;
        }
        token = json.token;
      }

      const url = `${window.location.origin}/embed/${token}`;
      await copyToClipboard(url);
      toast.success("Embed link gekopieerd.");
      router.refresh();
    } catch {
      toast.error("Kopiëren lukt niet. Controleer je browser permissies.");
    }
  }

  const canCopyEmbed = conversation.publicEmbedEnabled;
  const embedLabel = conversation.embedToken ? "Embed link kopiëren" : "Embed link ophalen…";

  return (
    <Dialog open={editOpen} onOpenChange={setEditOpen}>
      <AlertDialog>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="Meer acties" disabled={isPending}>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Gesprek</DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Instellingen bewerken…</DropdownMenuItem>
            </DialogTrigger>

            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                void onCopyEmbed();
              }}
              disabled={!canCopyEmbed}
            >
              {embedLabel}
            </DropdownMenuItem>

            <DropdownMenuSeparator />
            <AlertDialogTrigger asChild>
              <DropdownMenuItem
                onSelect={(e) => e.preventDefault()}
                className="text-destructive focus:text-destructive"
              >
                Gesprek verwijderen…
              </DropdownMenuItem>
            </AlertDialogTrigger>
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Instellingen</DialogTitle>
            <p className="text-sm text-muted-foreground">Bewerk doel, embed, status en modus.</p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Doel</Label>
              <Textarea
                id="goal"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                rows={3}
                placeholder="Bijv. de klant kalmeren en een afspraak maken."
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Input
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="Bijv. active / closed"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Modus</Label>
              <Input
                id="mode"
                value={mode}
                onChange={(e) => setMode(e.target.value)}
                placeholder="text / voice"
                disabled={isPending}
              />
              <p className="text-xs text-muted-foreground">Toegestane waarden: text, voice.</p>
            </div>

            <div className="space-y-3 rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <Checkbox
                  id="public-embed"
                  checked={publicEmbedEnabled}
                  onCheckedChange={(v) => setPublicEmbedEnabled(Boolean(v))}
                  disabled={isPending}
                />
                <div className="space-y-1">
                  <Label htmlFor="public-embed">Publieke embed (geen login)</Label>
                  <p className="text-xs text-muted-foreground">
                    Als dit aan staat kun je een embed link kopiëren vanuit het overzicht.
                  </p>
                </div>
              </div>

              {publicEmbedEnabled ? (
                <div className="space-y-2">
                  <Label htmlFor="allowed-origins">Toegestane domeinen (optioneel)</Label>
                  <Textarea
                    id="allowed-origins"
                    value={embedAllowedOrigins}
                    onChange={(e) => setEmbedAllowedOrigins(e.target.value)}
                    rows={2}
                    placeholder={"Bijv.\nhttps://example.com\nhttps://app.example.com"}
                    disabled={isPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Eén per regel of gescheiden door komma’s. Laat leeg om overal toe te staan.
                  </p>
                  {embedUrl ? (
                    <p className="text-xs text-muted-foreground">Huidige embed: {embedUrl}</p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
              Annuleren
            </Button>
            <Button type="button" onClick={onSave} disabled={isPending}>
              {isPending ? "Bezig..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesprek verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert het gesprek en bijbehorende berichten. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={onDelete}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

