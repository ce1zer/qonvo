"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { ChatThread } from "@/components/chat/ChatThread";
import { ChatComposer } from "@/components/chat/ChatComposer";
import type { ChatMessage } from "@/components/chat/types";
import { useTenant } from "@/components/tenant/TenantContext";

function makeTempId() {
  return `tmp_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ChatPanel({
  conversationId,
  initialMessages
}: {
  conversationId: string;
  initialMessages: ChatMessage[];
}) {
  const { creditsBalance, setCreditsBalance } = useTenant();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [text, setText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  async function send(userMessage: string) {
    if (creditsBalance <= 0) {
      toast.error("Je credits zijn op. Koop credits bij om door te gaan.");
      return;
    }

    const tempId = makeTempId();
    const nowIso = new Date().toISOString();

    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "user", content: userMessage, createdAt: nowIso, status: "sending" as const }
    ]);
    setText("");
    setIsTyping(true);

    const res = await fetch("/api/chat/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ conversationId, userMessage })
    }).catch(() => null);

    if (!res || !res.ok) {
      setIsTyping(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m))
      );
      toast.error("Er ging iets mis met de AI-verbinding. Probeer opnieuw.");
      return;
    }

    const json = (await res.json().catch(() => null)) as
      | { assistantMessage?: string; creditsBalance?: number; message?: string }
      | null;

    if (res.status === 402) {
      setIsTyping(false);
      setMessages((prev) => prev.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m)));
      if (typeof json?.creditsBalance === "number") setCreditsBalance(json.creditsBalance);
      toast.error(json?.message ?? "Je credits zijn op. Koop credits bij om door te gaan.");
      return;
    }

    const assistantMessage = json?.assistantMessage;
    if (!assistantMessage) {
      setIsTyping(false);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" as const } : m))
      );
      toast.error("Er ging iets mis met de AI-verbinding. Probeer opnieuw.");
      return;
    }

    if (typeof json?.creditsBalance === "number") {
      setCreditsBalance(json.creditsBalance);
    }

    setMessages((prev) => {
      const next = prev.map((m) => (m.id === tempId ? { ...m, status: "sent" as const } : m));
      return [
        ...next,
        { id: makeTempId(), role: "assistant", content: assistantMessage, createdAt: new Date().toISOString() }
      ];
    });
    setIsTyping(false);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter") return;
    if (e.shiftKey) return;
    e.preventDefault();
    const value = text.trim();
    if (!value || isPending) return;
    startTransition(() => void send(value));
  }

  function onSubmit() {
    const value = text.trim();
    if (!value || isPending) return;
    startTransition(() => void send(value));
  }

  return (
    <div className="flex min-h-[60vh] flex-col gap-4">
      <ChatThread messages={messages} isTyping={isTyping} />
      {creditsBalance <= 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Je credits zijn op. Koop credits bij om door te gaan.
        </div>
      ) : null}
      <ChatComposer
        value={text}
        onChange={setText}
        onSubmit={onSubmit}
        onKeyDown={onKeyDown}
        disabled={isPending || creditsBalance <= 0}
        helperText={isTyping ? "AI is aan het typen…" : "Shift+Enter voor een nieuwe regel."}
      />
    </div>
  );
}

