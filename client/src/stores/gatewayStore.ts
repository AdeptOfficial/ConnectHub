import { gateway } from "@/lib/gateway";
import { ServerOpcode } from "shared";
import type {
  ReadyPayload,
  MessageCreatePayload,
  TypingStartPayload,
} from "shared";
import { useAuthStore } from "./authStore";
import { useSpaceStore } from "./spaceStore";
import { useMessageStore } from "./messageStore";

// Register gateway event handlers IMMEDIATELY at module load time,
// so they're ready before any connect() call.

gateway.on(ServerOpcode.Ready, (data: ReadyPayload) => {
  useAuthStore.setState({ user: data.user });
  for (const space of data.spaces) {
    useSpaceStore.getState().addSpace(space);
  }
});

gateway.on(ServerOpcode.MessageCreate, (data: MessageCreatePayload) => {
  useMessageStore.getState().addMessage(data.message.channelId, {
    ...data.message,
    author: data.author,
  });
});

gateway.on(ServerOpcode.TypingStart, (data: TypingStartPayload) => {
  // Simple approach: store in a module-level map and expose via getter
  const key = `${data.channelId}:${data.userId}`;
  typingState.set(key, { ...data, expiresAt: Date.now() + 8000 });
});

gateway.on(ServerOpcode.InvalidSession, () => {
  useAuthStore.getState().logout();
});

// Simple typing state
const typingState = new Map<string, TypingStartPayload & { expiresAt: number }>();

export function getTypingUsers(channelId: string): TypingStartPayload[] {
  const now = Date.now();
  const result: TypingStartPayload[] = [];
  for (const [key, entry] of typingState) {
    if (entry.expiresAt < now) {
      typingState.delete(key);
      continue;
    }
    if (entry.channelId === channelId) {
      result.push(entry);
    }
  }
  return result;
}
