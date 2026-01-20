"use client";

import { useRef } from "react";

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
    <div className="rounded-lg border border-zinc-200 bg-white p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-zinc-900" htmlFor="composer">
          Bericht
        </label>
        <textarea
          id="composer"
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          rows={3}
          placeholder="Typ je bericht… (Enter = verzenden, Shift+Enter = nieuwe regel)"
          className="w-full resize-none rounded-md border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-zinc-400 disabled:bg-zinc-50"
          disabled={disabled}
        />

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-zinc-500">{helperText}</p>
          <button
            type="button"
            className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            onClick={onSubmit}
            disabled={disabled || !value.trim()}
          >
            {disabled ? "Bezig..." : "Versturen"}
          </button>
        </div>
      </div>
    </div>
  );
}

