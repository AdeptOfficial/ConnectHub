import { create } from "zustand";
import { api } from "@/lib/api";
import type { Channel } from "shared";

interface ChannelState {
  channels: Map<string, Channel[]>; // spaceId -> channels
  activeChannelId: string | null;
  fetchChannels: (spaceId: string) => Promise<void>;
  createChannel: (spaceId: string, name: string) => Promise<Channel>;
  setActiveChannel: (id: string | null) => void;
  getSpaceChannels: (spaceId: string) => Channel[];
}

export const useChannelStore = create<ChannelState>((set, get) => ({
  channels: new Map(),
  activeChannelId: null,

  fetchChannels: async (spaceId: string) => {
    const channels = await api.get<Channel[]>(`/channels/space/${spaceId}`);
    set((s) => {
      const map = new Map(s.channels);
      map.set(spaceId, channels);
      return { channels: map };
    });
  },

  createChannel: async (spaceId: string, name: string) => {
    const channel = await api.post<Channel>("/channels", {
      spaceId,
      encryptedName: name,
    });
    set((s) => {
      const map = new Map(s.channels);
      const existing = map.get(spaceId) || [];
      map.set(spaceId, [...existing, channel]);
      return { channels: map, activeChannelId: channel.id };
    });
    return channel;
  },

  setActiveChannel: (id) => set({ activeChannelId: id }),

  getSpaceChannels: (spaceId: string) => {
    return get().channels.get(spaceId) || [];
  },
}));
