"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

type Review = {
  feedback?: Array<{ question: string; answer: string }>;
  feedbackSummary?: string;
  isPassed?: boolean;
  // Allow any additional fields from n8n review JSON
  [key: string]: unknown;
};

export function ConversationReviewPanel({
  conversationId,
  initialReview,
  isInactive
}: {
  conversationId: string;
  initialReview: Review | null;
  isInactive: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState<Review | null>(initialReview);

  useEffect(() => {
    setReview(initialReview);
  }, [initialReview]);

  useEffect(() => {
    if (!isInactive) return;
    if (review) return;
    // Auto-pull review once the conversation is inactive.
    startTransition(async () => {
      const res = await fetch("/api/conversations/review/get-or-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; review?: Review; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        // Don't spam errors; just show a single toast and allow refresh to retry.
        toast.error(json?.message ?? "Beoordeling ophalen lukt niet.");
        return;
      }

      setReview(json.review ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInactive, conversationId]);

  if (!review) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {isInactive
            ? "Beoordeling wordt berekend…"
            : "Beoordeling verschijnt automatisch zodra het gesprek is afgelopen (👋)."}
        </p>
      </div>
    );
  }

  const rawJson = (() => {
    try {
      return JSON.stringify(review, null, 2);
    } catch {
      return "";
    }
  })();

  const extraEntries = Object.entries(review).filter(
    ([k]) => k !== "feedback" && k !== "feedbackSummary" && k !== "isPassed"
  );

  return (
    <div className="space-y-4">
      {typeof review.isPassed === "boolean" ? (
        <p className="text-sm">
          Resultaat: <span className="font-medium">{review.isPassed ? "Voldoende" : "Onvoldoende"}</span>
        </p>
      ) : null}

      {review.feedbackSummary ? <p className="text-sm text-muted-foreground">{review.feedbackSummary}</p> : null}

      {extraEntries.length > 0 ? (
        <div className="rounded-lg border bg-background p-3">
          <p className="text-sm font-medium">Extra output</p>
          <div className="mt-2 space-y-2">
            {extraEntries.map(([k, v]) => (
              <div key={k} className="text-sm">
                <span className="font-medium">{k}:</span>{" "}
                <span className="text-muted-foreground">
                  {typeof v === "string" ? v : v === null ? "null" : typeof v === "boolean" ? String(v) : JSON.stringify(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {Array.isArray(review.feedback) && review.feedback.length > 0 ? (
        <div className="space-y-3">
          {review.feedback.map((f, idx) => (
            <div key={idx} className="rounded-lg border bg-background p-3">
              <p className="text-sm font-medium">{f.question}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Always show full raw JSON so nothing is hidden */}
      <details className="rounded-lg border bg-background p-3">
        <summary className="cursor-pointer text-sm font-medium">Volledige output (JSON)</summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-xs leading-relaxed">
          {rawJson || "—"}
        </pre>
      </details>

      {isPending ? <p className="text-xs text-muted-foreground">Bezig met ophalen…</p> : null}
    </div>
  );
}

