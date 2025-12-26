// types/chat.ts
export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  nextActions?: string[];
};
