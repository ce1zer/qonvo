"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

export function FormField({
  id,
  label,
  helperText,
  error,
  children,
  className
}: {
  id: string;
  label: string;
  helperText?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? <p className="text-xs text-destructive">{error}</p> : helperText ? <p className="text-xs text-muted-foreground">{helperText}</p> : null}
    </div>
  );
}

