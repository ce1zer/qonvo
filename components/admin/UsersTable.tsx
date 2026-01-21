"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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

export type AdminUserRow = {
  user_id: string;
  email: string;
  role: "member" | "organization_admin" | "platform_admin";
  organization_slug: string | null;
};

export function UsersTable({ users }: { users: AdminUserRow[] }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [confirm, setConfirm] = useState<
    null | { userId: string; current: AdminUserRow["role"]; next: "member" | "organization_admin" }
  >(
    null
  );

  function onChangeRole(userId: string, current: AdminUserRow["role"], next: "member" | "organization_admin") {
    if (current === "platform_admin") {
      toast.error("Platform admins kun je hier niet aanpassen.");
      return;
    }

    setConfirm({ userId, current, next });
  }

  function doChangeRole(userId: string, next: "member" | "organization_admin") {
    startTransition(async () => {
      const res = await fetch("/api/admin/set-user-role", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, role: next })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; message?: string } | null;
      if (!res || !res.ok) {
        toast.error(json?.message ?? "Rol wijzigen is niet gelukt. Probeer het opnieuw.");
        return;
      }

      toast.success(json?.message ?? "Rol bijgewerkt.");
      setConfirm(null);
      router.refresh();
    });
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>E-mail</TableHead>
            <TableHead>User ID</TableHead>
            <TableHead>Organisatie</TableHead>
            <TableHead className="text-right">Rol</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.user_id}>
              <TableCell className="min-w-0 truncate">{u.email}</TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{u.user_id}</TableCell>
              <TableCell className="text-muted-foreground">{u.organization_slug ?? "—"}</TableCell>
              <TableCell className="text-right">
                {u.role === "platform_admin" ? (
                  <Badge variant="secondary">Platform admin</Badge>
                ) : (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isPending}>
                        {u.role === "member" ? "Lid" : "Organisatiebeheerder"}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuLabel>Rol</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onChangeRole(u.user_id, u.role, "member")}>
                        Lid
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onChangeRole(u.user_id, u.role, "organization_admin")}>
                        Organisatiebeheerder
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={Boolean(confirm)} onOpenChange={(open) => setConfirm(open ? confirm : null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rol wijzigen?</AlertDialogTitle>
            <AlertDialogDescription>
              Wijzig rol naar “{confirm?.next === "member" ? "Lid" : "Organisatiebeheerder"}”.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} onClick={() => setConfirm(null)}>
              Annuleren
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={isPending || !confirm}
              onClick={() => confirm && doChangeRole(confirm.userId, confirm.next)}
            >
              Bevestigen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

