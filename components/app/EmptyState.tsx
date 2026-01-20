"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

export function EmptyState({
  icon,
  title,
  description,
  primaryAction,
  secondaryAction
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  primaryAction?: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
}) {
  return (
    <div className="rounded-xl border bg-card p-10 shadow-sm">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        {icon ? <div className="mb-4 text-muted-foreground">{icon}</div> : null}
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}

        {primaryAction || secondaryAction ? (
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            {primaryAction ? (
              <Button asChild>
                <Link href={primaryAction.href}>{primaryAction.label}</Link>
              </Button>
            ) : null}
            {secondaryAction ? (
              <Button asChild variant="outline">
                <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

