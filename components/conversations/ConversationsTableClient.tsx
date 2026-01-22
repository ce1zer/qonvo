"use client";

import Link from "next/link";

import { DataTableShell } from "@/components/app/DataTableShell";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConversationActionsMenu } from "@/components/conversations/ConversationActionsMenu";

export type ConversationsListItem = {
  id: string;
  scenario: { name: string; topic: string } | null;
  status: string;
  mode: string;
  startedAt: string | null;
  updatedAt: string | null;
  goal: string | null;
  publicEmbedEnabled: boolean;
  embedAllowedOrigins: string[] | null;
  embedToken: string | null;
};

export function ConversationsTableClient({
  slug,
  conversations,
  canManage
}: {
  slug: string;
  conversations: ConversationsListItem[];
  canManage: boolean;
}) {
  return (
    <DataTableShell>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scenario</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Modus</TableHead>
            <TableHead>Laatst bijgewerkt</TableHead>
            <TableHead className="text-right">Acties</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((c) => {
            const updated = c.updatedAt ? new Date(c.updatedAt).toLocaleString("nl-NL") : "—";
            const isActive = c.status === "active";
            return (
              <TableRow key={c.id}>
                <TableCell className="min-w-0">
                  <p className="truncate font-medium">{c.scenario?.name ?? "Scenario"}</p>
                  {c.scenario?.topic ? <p className="truncate text-xs text-muted-foreground">{c.scenario.topic}</p> : null}
                </TableCell>
                <TableCell>
                  <Badge variant={isActive ? "secondary" : "outline"}>{c.status || "—"}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.mode || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{updated}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/organisatie/${slug}/gesprekken/${c.id}`}>Openen</Link>
                    </Button>
                    {canManage ? (
                      <ConversationActionsMenu slug={slug} conversation={c} />
                    ) : (
                      <span className="sr-only">Acties</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </DataTableShell>
  );
}

