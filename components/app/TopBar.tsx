"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function TopBar({
  left,
  right,
  className
}: {
  left?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <div className="min-w-0">{left}</div>
      <div className="flex items-center gap-2">{right}</div>
    </div>
  );
}

