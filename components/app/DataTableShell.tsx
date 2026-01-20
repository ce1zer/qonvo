"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function DataTableShell({
  toolbar,
  children,
  className
}: {
  toolbar?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>
      {toolbar ? <div className="border-b px-4 py-3">{toolbar}</div> : null}
      <div className="w-full">{children}</div>
    </div>
  );
}

