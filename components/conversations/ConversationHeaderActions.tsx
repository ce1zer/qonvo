"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Settings, Trash2 } from "lucide-react";

import { useTenant } from "@/components/tenant/TenantContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  slug: string;
  conversationId: string;
  status: string;
  mode: string;
  goal: string | null;
  publicEmbedEnabled: boolean;
  embedAllowedOrigins: string[] | null;
  embedToken: string | null;
};

function normalizeOriginsInput(value: string): string[] {
  return value
    .split(/[\n,]/g)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
}

export function ConversationHeaderActions(props: Props) {
  const router = useRouter();
  const { profile } = useTenant();
  const canManage = profile.role === "organization_admin" || profile.role === "platform_admin";

  const [isPending, startTransition] = useTransition();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [embedOpen, setEmbedOpen] = useState(false);
  const [embedLink, setEmbedLink] = useState<string | null>(null);

  const [goal, setGoal] = useState(props.goal ?? "");
  const [publicEmbedEnabled, setPublicEmbedEnabled] = useState(Boolean(props.publicEmbedEnabled));
  const [embedAllowedOrigins, setEmbedAllowedOrigins] = useState((props.embedAllowedOrigins ?? []).join("\n"));
  const [status, setStatus] = useState((props.status as "active" | "inactive") ?? "active");
  const [mode, setMode] = useState((props.mode as "text" | "voice") ?? "text");

  const embedUrl = useMemo(() => {
    if (!props.embedToken) return null;
    if (typeof window === "undefined") return null;
    return `${window.location.origin}/embed/${props.embedToken}`;
  }, [props.embedToken]);

  async function ensureEmbedUrl(): Promise<string | null> {
    if (!publicEmbedEnabled) {
      toast.error("Publieke embed staat uit voor dit gesprek.");
      return null;
    }

    let token = props.embedToken;
    if (!token) {
      const res = await fetch("/api/conversations/embed-token/get-or-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: props.conversationId })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; token?: string; message?: string } | null;
      if (!res || !res.ok || !json?.ok || !json?.token) {
        toast.error(json?.message ?? "Embed link ophalen lukt niet.");
        return null;
      }
      token = json.token;
      router.refresh();
    }

    return `${window.location.origin}/embed/${token}`;
  }

  function onOpenEmbed() {
    startTransition(async () => {
      try {
        if (!publicEmbedEnabled) return;
        setEmbedOpen(true);
        // Pre-fill from existing token if we have it.
        if (embedUrl) setEmbedLink(embedUrl);
        const url = await ensureEmbedUrl();
        if (url) setEmbedLink(url);
      } catch {
        toast.error("Embed link ophalen lukt niet. Probeer het opnieuw.");
      }
    });
  }

  function onCopyEmbedLink() {
    startTransition(async () => {
      try {
        const url = embedLink ?? embedUrl ?? (await ensureEmbedUrl());
        if (!url) return;
        await navigator.clipboard.writeText(url);
        toast.success("Link gekopieerd.");
      } catch {
        toast.error("Kopiëren lukt niet. Controleer je browser permissies.");
      }
    });
  }

  function onSaveSettings() {
    startTransition(async () => {
      const origins = normalizeOriginsInput(embedAllowedOrigins);
      const res = await fetch("/api/conversations/update", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          conversationId: props.conversationId,
          goal: goal.trim() ? goal.trim() : null,
          publicEmbedEnabled,
          embedAllowedOrigins: origins.length > 0 ? origins : null,
          status,
          mode
        })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        toast.error(json?.message ?? "Opslaan lukt niet. Probeer het opnieuw.");
        return;
      }

      toast.success("Instellingen opgeslagen.");
      setSettingsOpen(false);
      router.refresh();
    });
  }

  function onDeleteConversation() {
    startTransition(async () => {
      const res = await fetch("/api/conversations/delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId: props.conversationId })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        toast.error(json?.message ?? "Verwijderen lukt niet. Probeer het opnieuw.");
        return;
      }

      toast.success("Gesprek verwijderd.");
      // After delete, return to list.
      router.push(`/organisatie/${props.slug}/gesprekken`);
      router.refresh();
    });
  }

  if (!canManage) return null;

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={onOpenEmbed}
          disabled={isPending || !publicEmbedEnabled}
          aria-label="Embed link"
          title={publicEmbedEnabled ? "Embed link delen/kopiëren" : "Publieke embed staat uit"}
        >
          <Link2 className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setSettingsOpen(true)}
          disabled={isPending}
          aria-label="Instellingen bewerken"
          title="Instellingen"
        >
          <Settings className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setConfirmDeleteOpen(true)}
          disabled={isPending}
          aria-label="Gesprek verwijderen"
          title="Verwijderen"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <Dialog open={embedOpen} onOpenChange={setEmbedOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Embed link</DialogTitle>
            <DialogDescription>Deel deze link of gebruik hem in een iframe.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2">
            <Input readOnly value={embedLink ?? ""} placeholder="Embed link ophalen…" className="font-mono text-xs" />
            <Button type="button" size="sm" onClick={onCopyEmbedLink} disabled={isPending || !embedLink}>
              Kopieer link
            </Button>
          </div>
          <div className="text-xs text-muted-foreground">
            Tip: stel “Toegestane domeinen” in bij Instellingen om misbruik te voorkomen.
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Instellingen</DialogTitle>
            <DialogDescription>Bewerk doel, embed, status en modus.</DialogDescription>
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
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")} disabled={isPending}>
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Actief</SelectItem>
                  <SelectItem value="inactive">Inactief</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mode">Modus</Label>
              <Select value={mode} onValueChange={(v) => setMode(v as "text" | "voice")} disabled={isPending}>
                <SelectTrigger id="mode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Tekst</SelectItem>
                  <SelectItem value="voice">Voice</SelectItem>
                </SelectContent>
              </Select>
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
                  <p className="text-xs text-muted-foreground">Maak een embed link voor dit gesprek.</p>
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
                  {embedUrl ? <p className="text-xs text-muted-foreground">Huidige embed: {embedUrl}</p> : null}
                </div>
              ) : null}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setSettingsOpen(false)} disabled={isPending}>
              Annuleren
            </Button>
            <Button type="button" onClick={onSaveSettings} disabled={isPending}>
              {isPending ? "Bezig..." : "Opslaan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Gesprek verwijderen?</AlertDialogTitle>
            <AlertDialogDescription>
              Dit verwijdert het gesprek en bijbehorende berichten. Deze actie kan niet ongedaan worden gemaakt.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
            <AlertDialogAction disabled={isPending} onClick={onDeleteConversation}>
              Verwijderen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

