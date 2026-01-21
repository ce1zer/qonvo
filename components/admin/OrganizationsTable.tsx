"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
import { Badge } from "@/components/ui/badge";

export type AdminOrganizationRow = {
  id: string;
  name: string;
  slug: string;
  credits_balance: number;
  created_at: string;
  is_disabled: boolean;
};

export function OrganizationsTable({ organizations }: { organizations: AdminOrganizationRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [amountById, setAmountById] = useState<Record<string, string>>({});
  const [creditsOpenForId, setCreditsOpenForId] = useState<string | null>(null);

  function setAmount(organizationId: string, value: string) {
    setAmountById((prev) => ({ ...prev, [organizationId]: value }));
  }

  const creditsDeltaForActive = useMemo(() => {
    if (!creditsOpenForId) return null;
    const raw = Number(amountById[creditsOpenForId] ?? "0");
    if (!Number.isFinite(raw) || raw <= 0) return null;
    return raw;
  }, [amountById, creditsOpenForId]);

  function onAdjust(organizationId: string, sign: 1 | -1) {
    const raw = Number(amountById[organizationId] ?? "0");
    if (!Number.isFinite(raw) || raw <= 0) {
      toast.error("Vul een geldig aantal credits in.");
      return;
    }

    const delta = raw * sign;
    startTransition(async () => {
      const res = await fetch("/api/admin/adjust-credits", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, amount: delta, reason: "admin_adjustment" })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok) {
        toast.error(json?.message ?? "Aanpassen is niet gelukt. Probeer het opnieuw.");
        return;
      }

      toast.success(json?.message ?? "Credits aangepast.");
      setCreditsOpenForId(null);
      router.refresh();
    });
  }

  function onToggleDisabled(organizationId: string, next: boolean) {
    startTransition(async () => {
      const res = await fetch("/api/admin/set-organization-disabled", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId, isDisabled: next })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok) {
        toast.error(json?.message ?? "Wijzigen is niet gelukt. Probeer het opnieuw.");
        return;
      }

      toast.success(json?.message ?? (next ? "Organisatie gedeactiveerd." : "Organisatie geactiveerd."));
      router.refresh();
    });
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Organisatie</TableHead>
          <TableHead>Slug</TableHead>
          <TableHead className="text-right">Credits</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Acties</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {organizations.map((o) => (
          <TableRow key={o.id}>
            <TableCell className="min-w-0">
              <p className="truncate font-medium">{o.name}</p>
              <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString("nl-NL")}</p>
            </TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">{o.slug}</TableCell>
            <TableCell className="text-right font-medium">{o.credits_balance}</TableCell>
            <TableCell>
              {o.is_disabled ? <Badge variant="destructive">Gedeactiveerd</Badge> : <Badge variant="secondary">Actief</Badge>}
            </TableCell>
            <TableCell className="text-right">
              <Dialog open={creditsOpenForId === o.id} onOpenChange={(open) => setCreditsOpenForId(open ? o.id : null)}>
                <AlertDialog>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isPending}>
                        Beheer
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Organisatie</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DialogTrigger asChild>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>Credits aanpassen…</DropdownMenuItem>
                      </DialogTrigger>
                      <DropdownMenuSeparator />
                      <AlertDialogTrigger asChild>
                        <DropdownMenuItem
                          onSelect={(e) => e.preventDefault()}
                          className={o.is_disabled ? "" : "text-destructive focus:text-destructive"}
                        >
                          {o.is_disabled ? "Activeer organisatie…" : "Deactiveer organisatie…"}
                        </DropdownMenuItem>
                      </AlertDialogTrigger>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Credits aanpassen</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Vul het aantal credits in en kies toevoegen of aftrekken.
                      </p>
                      <Input
                        value={amountById[o.id] ?? ""}
                        onChange={(e) => setAmount(o.id, e.target.value)}
                        placeholder="Aantal"
                        inputMode="numeric"
                        disabled={isPending}
                      />
                    </div>
                    <DialogFooter className="gap-2 sm:gap-0">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onAdjust(o.id, -1)}
                        disabled={isPending || !creditsDeltaForActive || creditsOpenForId !== o.id}
                      >
                        Aftrekken
                      </Button>
                      <Button
                        type="button"
                        onClick={() => onAdjust(o.id, 1)}
                        disabled={isPending || !creditsDeltaForActive || creditsOpenForId !== o.id}
                      >
                        Toevoegen
                      </Button>
                    </DialogFooter>
                  </DialogContent>

                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{o.is_disabled ? "Organisatie activeren?" : "Organisatie deactiveren?"}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {o.is_disabled
                          ? "Gebruikers kunnen weer inloggen en de tenant gebruiken."
                          : "Gebruikers kunnen daarna niet meer inloggen en alle tenant routes worden geblokkeerd."}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={isPending}>Annuleren</AlertDialogCancel>
                      <AlertDialogAction disabled={isPending} onClick={() => onToggleDisabled(o.id, !o.is_disabled)}>
                        {o.is_disabled ? "Activeer" : "Deactiveer"}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </Dialog>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

