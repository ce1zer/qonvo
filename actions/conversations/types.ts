export type CreateConversationState = {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
  conversationId?: string;
};

export const initialCreateConversationState: CreateConversationState = { ok: false, message: "" };

