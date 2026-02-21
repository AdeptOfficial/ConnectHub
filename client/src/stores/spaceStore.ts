import { create } from "zustand";
import { api } from "@/lib/api";
import type { Space } from "shared";

interface SpaceState {
  spaces: Space[];
  activeSpaceId: string | null;
  loading: boolean;
  fetchSpaces: () => Promise<void>;
  createSpace: (encryptedConfig: string) => Promise<Space>;
  setActiveSpace: (id: string | null) => void;
  addSpace: (space: Space) => void;
}

export const useSpaceStore = create<SpaceState>((set, get) => ({
  spaces: [],
  activeSpaceId: null,
  loading: false,

  fetchSpaces: async () => {
    set({ loading: true });
    try {
      const spaces = await api.get<Space[]>("/spaces");
      set({ spaces, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  createSpace: async (encryptedConfig: string) => {
    const res = await api.post<Space & { defaultChannelId: string }>(
      "/spaces",
      { encryptedConfig }
    );
    const space: Space = {
      id: res.id,
      ownerId: res.ownerId,
      encryptedConfig: res.encryptedConfig,
      historyVisibility: res.historyVisibility,
      leaseTtl: res.leaseTtl,
      createdAt: res.createdAt,
    };
    set((s) => ({ spaces: [...s.spaces, space] }));
    return space;
  },

  setActiveSpace: (id) => set({ activeSpaceId: id }),

  addSpace: (space) =>
    set((s) => {
      if (s.spaces.find((sp) => sp.id === space.id)) return s;
      return { spaces: [...s.spaces, space] };
    }),
}));
