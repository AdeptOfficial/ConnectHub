import { create } from "zustand";
import { api } from "@/lib/api";
import type { Message, User } from "shared";

export interface MessageWithAuthor extends Message {
  author: Pick<User, "id" | "username" | "displayName" | "avatarHash">;
}

interface MessageState {
  messages: Map<string, MessageWithAuthor[]>; // channelId -> messages
  loading: boolean;
  fetchMessages: (
    channelId: string,
    before?: string
  ) => Promise<MessageWithAuthor[]>;
  addMessage: (channelId: string, message: MessageWithAuthor) => void;
  editMessage: (channelId: string, messageId: string, content: string) => Promise<void>;
  deleteMessage: (channelId: string, messageId: string) => Promise<void>;
  getChannelMessages: (channelId: string) => MessageWithAuthor[];
}

export const useMessageStore = create<MessageState>((set, get) => ({
  messages: new Map(),
  loading: false,

  fetchMessages: async (channelId, before) => {
    set({ loading: true });
    try {
      const params = new URLSearchParams();
      if (before) params.set("before", before);
      const qs = params.toString();
      const msgs = await api.get<MessageWithAuthor[]>(
        `/messages/channel/${channelId}${qs ? `?${qs}` : ""}`
      );
      set((s) => {
        const map = new Map(s.messages);
        const existing = map.get(channelId) || [];
        // Prepend older messages
        if (before) {
          map.set(channelId, [...msgs, ...existing]);
        } else {
          map.set(channelId, msgs);
        }
        return { messages: map, loading: false };
      });
      return msgs;
    } catch {
      set({ loading: false });
      return [];
    }
  },

  addMessage: (channelId, message) => {
    set((s) => {
      const map = new Map(s.messages);
      const existing = map.get(channelId) || [];
      // Avoid duplicates
      if (existing.some((m) => m.id === message.id)) return s;
      map.set(channelId, [...existing, message]);
      return { messages: map };
    });
  },

  editMessage: async (channelId, messageId, content) => {
    const updated = await api.put<Message>(`/messages/${messageId}`, {
      encryptedContent: content,
    });
    set((s) => {
      const map = new Map(s.messages);
      const existing = map.get(channelId);
      if (!existing) return s;
      map.set(
        channelId,
        existing.map((m) =>
          m.id === messageId
            ? { ...m, encryptedContent: content, editedAt: updated.editedAt }
            : m
        )
      );
      return { messages: map };
    });
  },

  deleteMessage: async (channelId, messageId) => {
    await api.delete(`/messages/${messageId}`);
    set((s) => {
      const map = new Map(s.messages);
      const existing = map.get(channelId);
      if (!existing) return s;
      map.set(
        channelId,
        existing.filter((m) => m.id !== messageId)
      );
      return { messages: map };
    });
  },

  getChannelMessages: (channelId) => {
    return get().messages.get(channelId) || [];
  },
}));
