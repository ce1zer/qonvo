"use client";

import { useEffect, useMemo, useRef } from "react";

import type { ChatMessage } from "@/components/chat/types";

function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("nl-NL", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function ChatThread({
  messages,
  isTyping
}: {
  messages: ChatMessage[];
  isTyping: boolean;
}) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const grouped = useMemo(() => messages, [messages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [grouped.length, isTyping]);

  return (
    <div className="flex-1 overflow-auto rounded-lg border border-zinc-200 bg-white p-4">
      <div className="space-y-3">
        {grouped.map((m) => {
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={["flex", isUser ? "justify-end" : "justify-start"].join(" ")}>
              <div
                className={[
                  "max-w-[85%] rounded-2xl px-4 py-2 text-sm leading-relaxed",
                  isUser ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-900"
                ].join(" ")}
              >
                <div className="whitespace-pre-wrap">{m.content}</div>
                <div className={["mt-1 text-xs", isUser ? "text-white/70" : "text-zinc-500"].join(" ")}>
                  {formatTime(m.createdAt)}
                  {m.status === "sending" ? " · verzenden..." : null}
                  {m.status === "failed" ? " · mislukt" : null}
                </div>
              </div>
            </div>
          );
        })}

        {isTyping ? (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-zinc-100 px-4 py-2 text-sm text-zinc-700">
              <span className="text-zinc-500">AI typt…</span>
            </div>
          </div>
        ) : null}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

