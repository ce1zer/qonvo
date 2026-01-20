"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export function ChatComposer({
  value,
  onChange,
  onSubmit,
  onKeyDown,
  disabled,
  helperText
}: {
  value: string;
  onChange: (next: string) => void;
  onSubmit: () => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  helperText: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="space-y-2">
        <Label htmlFor="composer">Bericht</Label>
        <Textarea
          id="composer"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Typ je bericht… (Enter = verzenden, Shift+Enter = nieuwe regel)"
          className="resize-none"
          disabled={disabled}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">{helperText}</p>
          <Button
            type="button"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
          >
            {disabled ? "Bezig..." : "Versturen"}
          </Button>
        </div>
      </div>
    </div>
  );
}

