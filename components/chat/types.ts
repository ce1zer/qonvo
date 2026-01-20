export type ChatRole = "user" | "assistant" | "system";

export type ChatMessage = {
  id: string;
  role: Exclude<ChatRole, "system">;
  content: string;
  createdAt: string; // ISO string
  inputMode?: "text" | "voice";
  audioUrl?: string | null;
  status?: "sending" | "sent" | "failed";
};

