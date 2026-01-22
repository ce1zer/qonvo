"use client";

import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

type Review = {
  feedback?: Array<{ question: string; answer: string }>;
  feedbackSummary?: string;
  isPassed?: boolean;
};

export function ConversationReviewPanel({
  conversationId,
  initialReview
}: {
  conversationId: string;
  initialReview: Review | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [review, setReview] = useState<Review | null>(initialReview);

  useEffect(() => {
    setReview(initialReview);
  }, [initialReview]);

  function generate() {
    startTransition(async () => {
      const res = await fetch("/api/conversations/review/get-or-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ conversationId })
      }).catch(() => null);

      const json = (await res?.json().catch(() => null)) as { ok?: boolean; review?: Review; message?: string } | null;
      if (!res || !res.ok || !json?.ok) {
        toast.error(json?.message ?? "Beoordeling ophalen lukt niet.");
        return;
      }

      setReview(json.review ?? null);
      toast.success("Beoordeling bijgewerkt.");
    });
  }

  if (!review) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Nog geen beoordeling beschikbaar. Zodra het gesprek eindigt (👋) wordt de beoordeling automatisch opgehaald.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={generate} disabled={isPending}>
          {isPending ? "Bezig..." : "Genereer beoordeling"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {typeof review.isPassed === "boolean" ? (
        <p className="text-sm">
          Resultaat: <span className="font-medium">{review.isPassed ? "Voldoende" : "Onvoldoende"}</span>
        </p>
      ) : null}

      {review.feedbackSummary ? <p className="text-sm text-muted-foreground">{review.feedbackSummary}</p> : null}

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

      <div>
        <Button type="button" variant="outline" size="sm" onClick={generate} disabled={isPending}>
          {isPending ? "Bezig..." : "Ververs beoordeling"}
        </Button>
      </div>
    </div>
  );
}

