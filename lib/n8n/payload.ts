export type N8NChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};

export type N8NScenario = {
  persona: string;
  topic: string;
  instructions: string;
  evaluation: string | null;
};

/**
 * Build the payload we POST to n8n.
 *
 * We intentionally include TWO shapes:
 * 1) Canonical structured payload: organization/scenario/history/userMessage (preferred)
 * 2) Backwards-compatible keys for older n8n templates (responseType/message/subject/persona/instructions/sessionID)
 *
 * This keeps the app stable while you iterate on n8n workflows.
 */
export function buildN8NPayload({
  conversationId,
  organization,
  scenario,
  mode,
  userMessage,
  history
}: {
  conversationId: string;
  organization: { id: string; slug: string };
  scenario: N8NScenario;
  mode: "text" | "voice";
  userMessage: string;
  history: N8NChatHistoryItem[];
}) {
  return {
    // Backwards-compatible fields for existing n8n workflows:
    responseType: "conversation" as const,
    sessionID: conversationId,
    message: userMessage,
    subject: scenario.topic,
    persona: scenario.persona,
    instructions: scenario.instructions,

    // Current structured payload (preferred):
    conversationId,
    organization,
    scenario,
    mode,
    userMessage,
    history,

    // Convenience: single string for workflows expecting a "messages" blob.
    messages: history
      .map((m) => `${m.role === "user" ? "Verkoper" : "AI"}: ${m.content}`)
      .concat([`Verkoper: ${userMessage}`])
      .join("\n")
  };
}

